# Space Status Strip Plan: phase progress and needs-action, in the secondary bar

**Audience:** Thomas, who decides and confirms the assumptions below; experience-design, which builds the strip, the moved chip, the list and the space items; server-development, which builds the attention store and its checks.

**Status:** partly built, 2026-10-14. Steps 1 to 4 built (the strip, the attention store, the count and its list, Polls reporting). Step 5, space items, is not built. Changed since drafting: the strip is a 44 px journey bar with a sentence, not 28 px ([plan-space-story-strip](plan-space-story-strip.md)); the chip has no caret; the bands are filled with the phase colours and their coloured borders were dropped; the chip is no longer in the top bar. On 2026-10-14 the strip's days to go became one countdown chip ("35 days to Trip", "1 day to Trip", "Trip starts today", hidden once the main phase is under way), its sentence lost the "· Trip in N days" tail, and phase icons stay in narrow bands and show in the phase sheet and Set up ([plan-space-story-strip](plan-space-story-strip.md)). Open: #283 (modules are not told when a phase changes; the Calendar polls every 30 seconds).

**Status when drafted:** drafted 2026-10-13 by product-planner with Thomas away; nothing here is built. Each step is a try build (one builder, one pass, its own checks, a patch version bump for each module it changes, the app working after it). Thomas asked: "Perhaps the best use of the secondary bar is for progress and other potential notifications? Thoughts?" The project manager proposed a slim status strip; Thomas said "yes" to planning it and to moving the phase chip out of the top bar into it. Input: #256 (the chip loses space first), #210 (stages and progress in the title bar), #12 (action required, [plan-object-status](plan-object-status.md)), #250 (notifications outside the app, not in scope), #204 (a Boss for every space). Not to be confused with the status bar at the foot of each module window ([plan-module-titlebar-add](plan-module-titlebar-add.md), `host.status.set`); that one is per module, this one is per space.

## What it is today

- **The chip** is a left-zone element tool of the top bar (`phase-chip`, `public/space.js` 1424 to 1507): `chipWords()` and `timelineOf()` from `public/phases.js`, opening the sheet (`openPhaseSheet` in `public/phase-sheet.js`, which also has `bandShares` and `todayPercent`). Its `fit(avail)` (`chipFit`) gives label, then dot, then nothing. `fitRight` in `public/nav-bar.js` puts every left-zone fit tool at `fit(0)` before fitting the favorites, so the chip's words go first; `tools/check-nav.mjs` 638 pins that ("the chip is not fitted first"). That is #256.
- **The secondary bar** (`.subnav`, `nav.attach('secondary', subnav)`, `space.js` 43) is empty wider than a phone and hides itself (`style.css` 1637); it is also hidden for any view other than the Workspace (1630) and in an aside (561). On a phone the same element is the tab bar at the foot of the page.
- **Notifications:** `host.notify` writes to the bell (`/api/notifications`, its stream); a new one shows as a toast for 9 seconds (`showToast` in `public/brand.js`).
- **Needs action:** nothing in the host. Object status (#12) is approved but not built. The Polls widget lists open polls the viewer has not voted in; the Planner's Decisions view lists open linked objects (`openDecisions()`); To-do has open tasks. Each stays inside its module.

## Decisions

Thomas, 2026-10-13.

1. **The secondary bar becomes a status strip** for progress and notices. Reason: the row is empty and kept in the code; progress belongs to the space, not to the crowded top bar.
2. **The phase chip moves out of the top bar into the strip.** Reason: it ends the squeeze in #256.
3. **When the top bar runs out of room, the favorites drop first.**
4. **Phases are one contiguous timeline from the template, with dates set in the phase sheet; in phase 1 they only inform.** The strip opens nothing but the sheet for phases.
5. **One line only; the layout does not jump:** the strip shows whenever the space has phases.
6. **Save and Cancel in a bar locked to the bottom** for any edit surface (the shared action bar); the strip edits nothing itself.

## The contract

**When it shows.** In a space whose template has phases, for a member, moderator, owner or the admin: always, on every view (Workspace, Calendar, Map). In a space without phases: hidden until the first attention count above zero arrives, then shown for the rest of the visit. Never in an aside, for a guest, or while Home shows over the space.

**What it shows, one line, left to right.** The chip, keeping `#phase-chip` and its button, dot and words ("Booking · day 2 of 3"), `aria-haspopup="dialog"`, opening the sheet. Then the track: one segment per dated band, widths from `bandShares`, the current band filled, a today marker at `todayPercent`, `aria-hidden` (the words carry it); clicking it opens the sheet. Then, at the right, the attention count ("2 need action"), shown only above zero. A space item (below) takes the track's place while it holds. Nothing else is registered on the strip; a module may not place tools on it.

**Where and how high.** Wider than a phone: the `.subnav` row, the chip and track an element tool of the `secondary` bar's left zone, the count of its right zone; `style.css` keeps the row in every view when the strip has content. Fixed height `--status-strip-h: 28px` (a new token); the row is drawn the moment the space's record loads, not when words arrive. Narrow: the track shrinks to a least of 48 px, then hides; the chip keeps its label. The top bar loses the chip; Set up keeps its Phases tab; the favorites give way before anything folds.

**Attention, the contract.** In the SDK: `host.attention.set({ count, label, items })` and `host.attention.clear()`. `count` 0 to 99; `label` at most 40 characters ("polls to vote in"); `items` at most 20 of `{ title, object? }`, `object` an object reference the host can open (`host.objects.open`). The host names no module: it sums every module's count for this person in this space. The server keeps each module's last report: `PUT /api/spaces/:id/attention/:module` (requires `write` in that module there; 400 with a sentence for a bad shape) and `GET /api/spaces/:id/attention` (this person's, `{ modules: [{ module, name, count, label, items, at }], total }`), stored per space, person and module in `DATA_DIR`. A report older than 7 days is dropped. The words: "1 needs action", "N need action".

**The list.** Pressing the count opens the shared menu (`host-menu.js`, as Layout's menu) anchored to it: one section per module (its name), its `label`, then its items; choosing one opens the object, or the module when there is no object. Keyboard: Enter or Space opens; arrows move; Escape returns focus to the count.

**The first source:** Polls reports the open polls in this space the person has not voted in, as its widget already counts them, when it runs in the space and after each vote. Nothing else reports in phase 1. When #12 lands, the Planner reports its action-required objects through the same call.

**Which channel holds what** (Thomas, 2026-10-13). **Toasts** are transient, in-the-moment confirmations (saved, deleted, copied) and stay exactly as they are. **The bell** holds durable events that are not immediate (a trip starting soon, a to-do added, an @mention while you were away), and its toasts and history are unchanged. **The strip** holds durable items specific to this space (phase progress, "2 need action") and nothing else. The strip never replaces a toast or a bell notification, and never shows a confirmation such as "Saved".

**Space items.** Besides the chip and the count, the strip shows at most one durable item for this space in the track's place, for example "Booking starts tomorrow" from the phases. An item stays until what it says is no longer so (the phase starts, the count reaches zero); nothing in the strip clears itself on a timer, and passing events are never shown there. Out-of-app notification (#250) is separate and not in scope.

**Phone.** A one-line strip under the top row, the same element moved there by `placeSubnav()` (the `.subnav` is the tab bar on a phone): the chip's dot and short words, the count, a 2 px track along its foot. The top row loses the chip. A space item shows in the same line.

**Accessibility.** The strip is `role="region"` with `aria-label` "Status"; the chip's words and the count sit in one `role="status"` (polite) element that changes only when the phase, the day or the count changes. A space item is read in the same region when it appears or changes, not again while it holds. The count and the chip are buttons in tab order after the top bar.

## Left to build, in order

1. **First: the strip with progress, and the chip moved** (experience-design). `space.js`: register `phase-chip` on the `secondary` bar's left zone, with the track beside it; drop its `fit` there (the track shrinks instead); hide on asides, guests, Home, no phases. `style.css`: the 28 px row in every view while it has content, the phone's line under the top row, the old `.topbar .phase-chip` phone rules moved. `nav-bar.js`: nothing structural; `fitRight` no longer has a chip to shrink, so the favorites give way first. `check-nav.mjs`: the chip's registration (205, 209, 1047, 1051, 1729), line 638 replaced by "the chip is not in the top bar", the phone CSS (1897). The app works with no attention or space items.
2. **The attention store** (server-development). The two routes, the store, the 7-day drop, the `write` rule; a new `tools/check-attention.mjs` in `npm run check` on a throwaway server.
3. **The count and its list** (experience-design). `host.attention.set` and `clear` in `public/sdk/host.js` and the module host; the count in the strip, the shared menu list, the strip shown in a space without phases once a count arrives.
4. **Polls reports** (experience-design). Polls calls `host.attention.set`; Polls to 1.15.2 in `module.json` and `tools/module-versions.json`.
5. **Space items** (experience-design). The one durable item for this space in the track's place (the phases' "Booking starts tomorrow" first), shown while it holds and gone when it no longer does; no timer, no merge, no Quiet. `showToast` and the bell are not touched: toasts stay confirmations, the bell stays the place for durable events.

## Verify

- **A try builder checks:** `npm run check` (with `check-names`' two root cases as known), and live in headless Chromium at 1280, 1000, 700 and 390 px with the stand-in LiveKit: the strip present before and after the words load (no jump), the chip gone from the top bar, three favorites keeping their room at 1000 px, a guest and an aside with no strip; step 2 with curl (a member allowed, a guest refused, a bad shape 400); steps 3 and 4 with two accounts (an unvoted poll counts, voting clears it, the list opens the poll); step 5 a space item appearing the day before a phase starts and leaving when it starts, and saving something still giving a toast, never a line in the strip.
- **Only Thomas, on a real server with LiveKit:** the strip during a real call and with the column, pop-out carrying the strip, a real phone (the line under the top row with the tab bar below), a real screen reader hearing the status once and not chattering, Firefox and Safari.

## Risks

- **`space.js` and `nav-bar.js`**: the chip's registration, its fit and the favorites' `fitRight` are pinned in `check-nav.mjs`; step 1 must change those pins, not loosen them.
- **The phone**: `.subnav` is the tab bar there, so the strip is a moved element, not the registry's bar; pop-out moves the header between windows and the strip must follow.
- **A stale or missing count** reads as "nothing needs action". The store keeps the last report, but a module that has not run since a change shows the old number.
- **Channels drifting**: a later change could route a confirmation or a bell event into the strip because the row is handy. The strip takes only durable, space-specific items; a check in step 5 holds that `showToast` and the bell's path do not write to it.

## Assumed, for Thomas to confirm

1. The strip shows on every view, not only the Workspace, because progress is the space's.
2. A space without phases shows the strip only once something needs action, and keeps it for the visit, so it appears once and never jumps back.
3. The chip has no fit in the strip; the track gives way instead.
4. The phone gets a line under the top row, not the menu: progress is the point and the menu hides it.
5. The server keeps each module's last count per person; the alternative (counts only while the module runs) would show nothing until a module is opened.
6. Polls is the only source in phase 1; To-do's due tasks and the Planner's open Decisions wait for #12.
7. *Replaced 2026-10-13 by Thomas's channels (see "Which channel holds what").* The strip holds only durable items for this space, each kept until it is resolved; toasts stay as they are for confirmations, and the bell keeps durable events that are not immediate. The one item at a time, and the phases as its first source, are the plan's own assumption.
8. Owner, moderator and member see the same count; the Boss (#204) gets nothing extra until that is decided.
9. Height 28 px, a new token.

## What is not decided

- Whether a module's object-added events ("Ann added a hotel") should be sent by the Planner through `host.notify`, which reaches the bell of everyone in the space.
- Whether a moderator or owner sees a count for others (#204).
- Whether the strip takes over the top bar's breadcrumb or space name on a phone.
