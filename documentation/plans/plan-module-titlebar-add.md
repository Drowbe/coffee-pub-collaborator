# Module Titlebar Add Plan: one "+" in the titlebar, and a status bar at the bottom of every module window

**Audience:** Thomas, who decides; experience-design and server-development, who build it (the window chrome in
`public/module-host.js`, `public/canvas.js`, `public/module.js` and `public/sdk/host.js`, then each bundled module).

**Status:** Drafted 2026-10-13 while Thomas was away, so every choice he has not made is written as an assumed
default under "Assumed, for Thomas to confirm". Nothing is built. The request, in Thomas's words, from a screenshot
of Research and the Planner side by side: "We are killing all of the toolbar buttons at the bottom of each window. We
will move the 'add' into a single icon at the top with a context menu. The toolbar at the bottom will become a slim,
fixed height 'status' bar. We can move things like item counts, selected day info, etc. to the status bar. We need to
be smart about it. We will also move the big buttons like 'add a place' and 'Add event' into the titlebar like the
above."

## What it is today

A module window has four zones ([architecture-module-window](../architecture/architecture-module-window.md)):
titlebar (`host.header.set`), toolbar under it (`host.toolbar.set`: tabs, filters, progress), content, and the
**action bar** along the bottom (`host.bar.set`, drawn by `drawModuleBar` in `public/module-host.js`). What Thomas
calls "the toolbar at the bottom" is the action bar, `host.bar.set`; the toolbar under the titlebar is not part of
this plan and stays as it is.

Docked, the action bar is a cell in the canvas's shared bottom row (`.dock-bar`, `--bar-control-h` 38 px), lined up
with the call's controls and the chat box ([architecture-canvas](../architecture/architecture-canvas.md)); floating
it is `.module-floating-bar`; popped out and on a module's own page it is `#module-bar` (`public/module.js`).
What each module puts there now:

| Module | `bar.set` today | In-body add today |
|---|---|---|
| Research | Add a note (primary), Add a link, Add a photo | none |
| Planner (`travel`) | Add plan (primary), Flight, Hotel, Restaurant, Note | the day's "+" menu (`host.menu.show`), the joint and gap "+" |
| Calendar | Add event | `#add` "Add event", shown only where the bar is not (a destination part) |
| To-do | New todo | `#add` "Add task", the same rule |
| Polls | New poll | `#add` "New poll", the same rule |
| Places | a quick-add field, "Add a place: name, or paste coordinates or a map link" | "Add a place" in `#part-head` (beside the map) and in the empty state |
| Maps | a quick-add field that is **the map's search**, and "+" Add a place: click the map | `#ctrl-add` on the map, as a destination part |
| Assistant, Stream | nothing | nothing |

The titlebar today reads icon, name, the module's own icons (`[data-header-custom]`), "...", then the dock, float,
window and pop-out buttons, then close (`moduleHeader` in `public/canvas.js`; `wireTitlebar` in `public/module.js`
for a popped-out window). Being built now, outside this plan: Dock/Window and Pop out move into the "...", and the
shared menu (`public/host-menu.js` with `public/menu-flyout.js`, and its copy in `host.menu.show`) gains categories
that fly out beside their row, or drill in on a phone.

There is no SDK version number today. Bundled modules run in the page with the host's own SDK, and the server injects
the current SDK inline into an uploaded module's page, so every module always runs the current SDK; modules detect a
feature by its presence (`if (host.bar)`).

## Decisions

1. **No buttons along the bottom.** The action bar goes from every module window. Its reason: the bottom row of
   buttons repeats what a single add can do, and costs height in every window.
2. **One "+" in the titlebar opens the module's adds.** It is a single icon with a menu, the menu built from the
   module's own add actions.
3. **The big in-body add buttons move into the titlebar** ("Add a place", "Add event" and the like).
4. **The bottom becomes a slim, fixed-height status bar**, for things like counts and the selected day's
   information, chosen with care per module ("be smart about it").
5. **The titlebar reads icon, name, the module's own tools, "...", close** (decided earlier today); Dock/Window and
   Pop out live in the "...".
6. **The Planner's day menu becomes categories with flyouts** (being built now); the "+" uses the same categories.
7. **The space's own status strip (phase progress) is a different thing**, planned separately; not here.

## The contract

### The "+" (Add)

- **SDK.** `host.add.set(entries)` returns a promise of `true` when the host drew a "+", `false` where it did not (a
  destination part, which has no titlebar and no page bar). A pick sends `host.on('add', ({ id }) => ...)`.
- **Entries.** A leaf is `{ id, label, icon?, tint?, hint?, disabled? }`. A category is `{ label, icon?, items: [leaf...] }`
  (one level only). `{ divider: true }` separates runs. Labels up to 40 characters; at most 8 top-level entries, 12 per
  category, 40 leaves in all; the host drops the rest. A category with one leaf is drawn as that leaf. An empty list
  (or a person who may not add) removes the "+".
- **One action or several.** Exactly one leaf and no categories: the "+" runs it at once; its tooltip and
  `aria-label` are the leaf's label ("Add event"). Anything more: the "+" opens the menu (`openHostMenu`, with the
  shared categories and flyouts), its tooltip and `aria-label` "Add", `aria-haspopup="menu"`, `aria-expanded`.
- **Where it sits.** In the titlebar: icon, name, the module's own tools (`header.set`), **"+"**, "...", close. The
  "+" and close never fold; when the titlebar is narrow, the module's own tools fold into the "..." first. Drawn with
  the "..."'s look (`drawMoreButton`'s size), icon `plus`, in the module's tint; 44 px wide on a phone like the other
  titlebar buttons.
- **On a module's own page** (not popped out, so no titlebar) the "+" is registered into the page bar through the nav
  registry (`renderPageBar`, `nav.register`, right zone), not drawn anew. Popped out, it is in the window's own
  titlebar (`#module-titlebar`, `public/module.js`).
- **Focus.** The `add` event joins `bar`, `toolbar`, `header` and `nav` in the host's `opener` list
  (`public/module-host.js`), so focus goes back to the "+" when the editor it opened closes.
- **In-body buttons.** Where `add.set` resolves `true`, the module hides its in-body add (`#add`, `#part-head`,
  `#ctrl-add`), the way `barHosted` and `hosted` work today. Where it resolves `false` (a destination part) the
  in-body add stays. The in-place adds that belong to a spot (the Planner's day, joint and gap "+", Places' empty
  state) stay; they add *there*.

What each module's "+" holds:

| Module | "+" | Notes |
|---|---|---|
| Research | Note, Link, Photo (three leaves, a menu) | Photo opens the file chooser, as the bar does now |
| Planner | Travel (flyout of the journey kinds), Stay, Eat and drink (flyout), See and do (flyout), Note | the same categories as the day menu; adds to the selected day (`defaultDay()`); markers stay in the day menu |
| Calendar | Add event (runs at once) | on the selected day |
| To-do | Add task (runs at once) | the bar's "New todo" becomes "Add task", the in-body word |
| Polls | New poll (runs at once) | |
| Places | Add a place (runs at once) | opens the Add a place editor; see Maps and Places below |
| Maps | Add a place: click the map (runs at once, a toggle) | the status bar says "Click the map to add a place" while it is on |
| Assistant, Stream | no "+" | |

**Maps and Places lose a text field.** Maps' search is the bar's quick-add field today, and Places' quick-add
searches by name or takes pasted coordinates or a link. Assumed: Maps draws its own search field over the map, top
left (no new SDK item type), and Places' editor's first field takes what the quick-add took, through the same
`readEntry`.

### The status bar

- **SDK.** `host.status.set(items)` returns `true` where drawn, `false` in a destination part. An item is
  `{ text, icon?, chip?, title?, quiet?, end? }`: `text` up to 60 characters; `chip: true` draws it as a small pill
  (a filter, a kind); `title` is its tooltip (else its text); `quiet: true` keeps it out of what a screen reader
  hears (a ticking "Updated 2 min ago"); `end: true` puts it at the right end (at most one). At most 4 items. The
  host puts a dim "·" between items. Read-only: nothing in it is a button.
- **Height and look.** Fixed at `--status-bar-h: 24px` (a new token beside `--module-header-h`), `--text-dim` text at
  12 px, a 1 px `--border` top line, the window's own background, no colour of its own. On a phone, the same 24 px plus
  `env(safe-area-inset-bottom)`.
- **Docked**, it is the last thing in the module's own column (`.mod-content`), not a cell in the canvas's shared
  bottom row; the row keeps only the call's controls and the chat box.
- **Nothing set** (Assistant, Stream, an older module): no status bar; the content fills the window.
- **Overflow.** One line, never wraps. Items keep their order; the last one before the `end` item is truncated with
  an ellipsis first, then the one before it. Each item's `title` keeps its full text, and the bar's own `title` is
  every item's text joined.
- **Accessibility.** The bar is `role="region"` with `aria-label` "<module name> status". A separate visually
  hidden `aria-live="polite"` node gets the non-quiet text only after 1.5 s without a change, never on the first draw,
  and only when the text differs from what was last announced, so scrolling days or typing in a filter does not
  chatter.
- **Diffing.** `status.set` with the same items as last time draws nothing (the host compares), so a module may call
  it on every render.

What each bundled module shows (useful; and what is left out as noise):

| Module | Status | Left out |
|---|---|---|
| Research | "12 of 40", chip with the filter when not All ("Links", "Tag: hotels"), "Importing 3 of 10" during an import | per-kind counts, who added what |
| Planner, Days | "Day 6 of 26 · Wed 14 Oct · 3 stops · $240" for the selected day (money only when the trip has amounts) | trip dates and travellers (already in the body's header) |
| Planner, Decisions / Bookings / Money | "3 open" / "4 of 9 booked" / "$1,240 of $3,000" | |
| Calendar | the selected day: "Wed 14 Oct · 3 events"; chip "2 kinds hidden" when markers are off | the period's total |
| To-do | "5 open · 2 due today · 1 overdue", chip with the filter | completed all-time |
| Polls | "2 open · 1 waiting for your vote" | vote totals |
| Places | "18 places", chip with whose; the selected place's kind ("Restaurant") | places without a location |
| Maps | "12 places shown"; "5 found" after a search; "Click the map to add a place" while adding | zoom, cursor position |
| Assistant, Stream | nothing | |

### Compatibility

- `host.bar.set` stays in the SDK, as the legacy call. Until the last step it draws the old action bar for any module
  still calling it, so no step leaves a module without its adds.
- From the last step, the host folds a `bar.set` list into the "+": each item becomes a leaf (`primary` first, the
  rest in order), sending the module's old `bar` event `{ id }`; a `quickadd` item becomes a leaf sending
  `{ id, value: '' }` (which opens an empty editor in every bundled module that had one). A module that calls both
  `add.set` and `bar.set` gets `add.set`'s list only. Nothing is drawn at the bottom for it.
- `host.toolbar.set` and `host.header.set` do not change. Their buttons stay where they are.
- No version number: modules detect `host.add` and `host.status`, as they detect `host.bar` today. The change is
  recorded in `api-module-sdk.md` and the CHANGELOG.
- A framed (uploaded) module asked to open a file chooser from the "+" may be refused by the browser for want of a
  user gesture inside the frame, as it already is from the action bar; no bundled module runs in a frame.

## Left to build, in order

Every step is a try build: one builder, one pass, its own checks, a patch version bump for each module it changes, the
app working at the end.

1. **First: the SDK and the window chrome, with the fallback** (experience-design). `host.add.set`, `host.status.set`
   and the `add` event in `public/sdk/host.js`; the handlers, the "+" drawing and its menu, the status bar, its live
   node and debounce in `public/module-host.js`; the "+" slot and the status element in `moduleHeader`,
   `openModuleFloating`, `openModuleDocked` and `moveModule` (moved like the toolbar, not rebuilt) in
   `public/canvas.js`; `--status-bar-h` and the styles in `public/style.css` and `public/sdk/host.css`. `bar.set`
   keeps drawing the old bar. No module changes, no bump.
2. **Research and the Planner** (experience-design). `modules/research/src/research.js`,
   `modules/travel/src/travel.js` (and its `.html` and `.css` where the in-body adds hide): `add.set` and
   `status.set`, `bar.set` removed. Bump Research and Planner.
3. **Calendar, To-do and Polls** (experience-design). The one-leaf "+", `#add` hidden where hosted, statuses. Bump all
   three.
4. **Places and Maps** (experience-design). The "+", Maps' own search field over the map, Places' editor taking the
   quick-add's text, statuses. Bump both.
5. **Phone and popped out** (experience-design). The "+" in `#module-titlebar` and in the page bar on a module's own
   page (`public/module.js`), the status bar replacing `#module-bar` there, the phone sizes and the safe area.
6. **The old bar goes** (experience-design). `drawModuleBar`, `.dock-bar`, `.module-floating-bar`, `#module-bar`,
   `has-bar` and their styles removed; `bar.set` becomes the fold into the "+"; `tools/check-buttons.mjs` stops
   requiring the host-drawn action bar to use `.action-btn`; a new case in `tools/check-module-window.mjs` that no
   bundled module calls `host.bar.set`.

## Verify

- **Step 1, by a tool.** A case in `tools/check-module-host.mjs` (or a new `tools/check-module-status.mjs` in
  `npm run check`) running the handlers on a stand-in page: one leaf runs at once with its label as tooltip, several
  open the menu, the caps, a repeated `status.set` draws nothing, the debounce announces once after 1.5 s and never a
  `quiet` item, truncation keeps the `end` item, `false` in a destination part. `npm run check` passes.
- **Steps 2 to 4, by a tool and by hand on the local server.** Each module's adds open the same editors as before;
  the in-body add is hidden on the canvas and shown in its destination part; the status text matches the table;
  docking, floating and back keep the "+" and status (a `moveModule` case). `npm run check`, and the module's own
  check (`check-travel.mjs` and the like).
- **Step 5, by hand.** At 640 px and below, and in a popped-out window: the "+" works, categories drill in, the status
  bar stays one line above the safe area.
- **Step 6, by a tool.** A stand-in module calling only `bar.set` gets its items in the "+"; a quick-add item sends
  an empty value; `npm run check` passes.
- **Only Thomas, on a real server:** how the titlebar reads with tools, "+", "...", close at real window widths; the
  docked layout without the shared bottom row cells beside a live call; a screen reader hearing the status; the
  Planner and Research on a real phone. No LiveKit call is needed for any of this, but the docked layout beside a
  live call cannot be seen locally.

## Risks

- **Maps' search and Places' quick-add live in the bar.** Removing the bar before step 4 lands would take them away;
  the order keeps the bar until step 6.
- **Uploaded and third-party modules** depend on the fold; a quick-add with no text is a weaker form of what they had.
- **Hotkeys and drop targets.** None are bound to the bar's buttons in the code read; the drop target is the content.
  A builder re-checks in each step.
- **Checks that pin the old bar:** `tools/check-buttons.mjs` (the action bar on `.action-btn`), and the canvas's
  "one control height" rule for the shared bottom row (`--bar-control-h`, `--bar-h`).
- **The two builds now in flight** (the "..." taking Dock/Window and Pop out; menu flyouts). Step 1 needs both landed.

## Assumed, for Thomas to confirm

1. The call is a new `host.status.set`, not an extension of `host.toolbar.set` or `host.bar.set`.
2. The status bar is 24 px, read-only (no clickable chips), hidden when a module sets nothing.
3. Docked, the status bar sits in the module's own column, so module windows no longer line up with the call's
   controls and the chat box in the shared bottom row.
4. The "+" is hidden for someone who may not add, not shown disabled.
5. In-body adds stay only in destination parts and where they add to a spot (a day, a joint, an empty state).
6. Maps' search becomes a field over the map; Places' editor takes the quick-add's text.
7. The Planner's "+" has no markers (they stay in the day menu), and its first category is called "Travel" (the kind
   picker calls the group "Getting there"; the day-menu build decides the word, and the "+" follows it).
8. To-do's add reads "Add task".
9. No SDK version number; feature detection.
10. The statuses in the table above.

## What is not decided

- Whether the status bar should ever hold a control (a "Show these days" link, a filter reset). Assumed no; it would
  need touch sizes the 24 px height does not allow.
- Whether `host.toolbar.set` should gain a `type: 'search'` for Maps, Places and Research
  ([architecture-module-window](../architecture/architecture-module-window.md), "What is not built yet"), instead of
  each drawing its own field. Not blocking.
