# Docked Limit Plan

**Audience:** Thomas, who decides how many modules a window can hold docked and what happens to the rest, and the session that builds it: experience-design (`public/snap-grid.js`, `public/canvas.js`, `public/space.js`, `public/style.css`, `tools/check-canvas.mjs`). No server change.

**Status:** approved by Thomas, 2026-10-03, taking all five of the draft's recommendations and its three own choices (decisions 1 to 8); nothing built yet. From GitHub #156, found by QA on 2026-10-02: at a window 760 px wide with six modules docked, the docked columns overflow, the chat column is pushed off screen and its message box shrinks to about 20 px. Thomas: "perhaps we add some rigor around number of panels [docked modules] based on a user's viewport? This would not be an option in floating mode." The issue adds that it applies to each person's own canvas only, that a space's Opens with must still open sensibly on a small window, and that phones are unaffected. [plan-saved-layouts](plan-saved-layouts.md) (approved 2026-10-03) runs a loaded layout's docked modules through this plan's rule, so the rule is one pure function both use.

## What it is today

- **Columns.** Each docked module is a column of the canvas's grid, in `order`: the conference (`order: -1`), the chat (`0`), then installed modules in the order they were docked, reorderable by dragging a titlebar (`wireReorder()`). `syncDock()` in `public/canvas.js` writes `--canvas-cols`: one flexible column (`minmax(0, 1fr)`), the conference when it is docked (`flex: true`), else the first docked module; the others are fixed widths. See [architecture-canvas](../architecture/architecture-canvas.md), "The grid".
- **Widths.** A fixed column's width is its remembered `dockW` (the chat's is `prefs.chatWidth`), clamped by `clampDock()` to between `DOCK_MIN` (240 px) and 60% of the canvas. The flexible column keeps at least `VIDEO_MIN` (280 px).
- **The squeeze.** When the fixed columns together are wider than the canvas less 280 px, `syncDock()` shrinks them in step, but never below 160 px each. `settleDock()` and `takeWidthFromOthers()` use the same 160 px floor. Nothing limits how many columns there are, so past a point the floor wins and the grid overflows: at 760 px the fixed columns may have 480 px, and five of them at 160 px need 800. That is #156.
- **No limit on docking.** `openModule()` docks whatever `preferredMode()` says (the remembered `mode`, else dock); a titlebar's Dock button, a module's own window coming back (`open(id, 'dock')`), `dockAll()`, `restore()` and the snap switch going off (its `__snap.before`) all dock without asking whether the columns fit.
- **Narrow.** Below 640 px (`isNarrow()`, set by `applyLayout()` in `public/space.js`) there are no columns: one view at a time, chosen by the tab bar, and `syncDock()` removes `--canvas-cols`. A narrow popped-out window is the same.
- **Floating** modules are boxes in the floating layer, free or snapped, and take no column. A module in its own window takes none either.
- **Notes.** The Layout panel has no line for a short message; the space page's `say()` writes into a given element and clears it after 3 seconds.

## Decisions

The issue fixes the aim: limit how many modules can be docked by the width of the person's window, leaving floating free. Thomas, 2026-10-03, approving the draft's recommendations and its own choices:

1. **The rule:** every fixed column at least 240 px and the flexible one at least 280 px, so a window holds `1 + floor((width - 280) / 240)` columns (3 at 760 px, 5 at 1280 px, 7 at 1920 px). It follows the widths the canvas already uses and grows smoothly with the window.
2. **The conference and the chat always keep their columns;** installed modules give way from the right end. #156 is the chat being pushed off.
3. **Docking one too many:** the new module floats and docks by itself when the window is wide enough, with a one-line note. Nothing the person had in place moves, and the new module is still open.
4. **The window shrinks:** the extra columns float from the right end and dock again by themselves when the window grows, so resizing back gives the same layout and a saved layout loads the same way.
5. **Dock all** docks what fits, in column order; the rest float and wait, with a note of how many.
6. **Dragging or resizing a waiting module** makes it floating for good.
7. **The note** is one line at the end of the Layout panel's Arrange section.
8. **No note** on entering or on a window resize: the change is in front of the person.

## The contract

### The rule (a pure function)

In `public/snap-grid.js`, beside `MIN_W` and the grid's arithmetic, so `tools/check-canvas.mjs` can run it and [plan-saved-layouts](plan-saved-layouts.md)'s load (its step 4) calls the same thing:

- `DOCK_MIN = 240` (a fixed column's least width, moved here from `canvas.js`), `FLEX_MIN = 280` (the flexible column's least width, today's `VIDEO_MIN`), `NARROW = 640`.
- `dockLimit(width)`: how many columns a canvas `width` px wide holds. Below `NARROW`, no limit (the tab bar shows one at a time). Otherwise `1 + Math.floor((width - FLEX_MIN) / DOCK_MIN)`: the flexible column at its least plus as many fixed columns at their least as fit. For example 640 px holds 2, 760 px holds 3, 1000 px holds 4, 1280 px holds 5, 1600 px holds 6 and 1920 px holds 7.
- `fitDock(width, columns)`: `columns` is every module that wants a column, in column order, each `{ id, width, flex, keep }` (`flex` for the conference, `keep` for the conference and the chat). Answers `{ docked, waiting, widths }`:
  - `docked`: the ids that get a column now, in column order. Chosen in this order until the limit: the flexible column, then the conference and the chat, then the others from left to right. Below `NARROW`, every id.
  - `waiting`: the rest, in column order. They want a column and have none at this width.
  - `widths`: each docked fixed column's width to show. Its own width while they fit; past that they shrink in step, none below `DOCK_MIN`. Under the limit that always fits, so the 160 px floor goes.
- Pure: no DOM, the same answer for the same input.

### Docked, waiting and the remembered layout

- A module's remembered `mode` stays what the person chose. `fitDock()` decides, each time the columns change or the canvas is resized, which of the modules that chose dock get a column now.
- A **waiting** module is shown floating, with its remembered `box` if it has one (clamped onto the canvas), else placed by `tidyBoxes()` around the other floating modules. Its remembered `mode` stays `dock`, so it docks again by itself, in its old place in the column order, as soon as the canvas is wide enough. On the canvas it is `mod.waiting = true`.
- Its titlebar's Dock button is shown unavailable (`aria-disabled="true"`), titled "Docks when the window is wide enough". Dragging or resizing a waiting module makes it floating by the person's choice: its remembered `mode` becomes `float` and it stops waiting.
- `syncDock()` builds the columns from `fitDock()`'s `docked` and `widths`; `settleDock()` and `takeWidthFromOthers()` use the `DOCK_MIN` floor. Every path that docks goes through it: `openModule()`, a titlebar's Dock, `open(id, 'dock')` from a module's own window, `dockAll()`, `restore()`, the snap switch going off, the canvas popping out or back (`canvasPopped()`), and a window resize (the `resize` handler `bindDoc()` adds, in whichever window the canvas is in).

### Docking one too many

- Opening a module that would dock, or docking one, when the columns are full: it gets the newest place in the column order, so it is the one that waits. It opens or stays floating, and the Layout panel's note says "The window is too narrow for another column, so Calendar is floating. It docks when the window is wide enough." (the module's name as this environment shows it).
- The conference and the chat always get a column when they dock (`keep`): if the columns are full, the rightmost installed module waits instead, and the note names it.
- A floating module's Dock button is unavailable while the columns are full, titled "The window is too narrow for another column", so a press never stores a dock it cannot show.
- Opening on entering (`restore()`, including a space's Opens with and a default layout) says nothing: the waiting modules are simply floating.

### The window shrinks or grows

- On every resize, `fitDock()` runs again. Columns past the new limit wait, from the right end of the column order, never the conference or the chat. They float where they last floated, else tidily.
- When the window grows, waiting modules dock again, left to right, as the width allows. No note either way: the change is in front of the person.
- The person's remembered layout does not change with the window, so a reload at another size fits again from the same layout.

### Dock all

- `dockAll()` docks every floating module that can dock, as today, but through `fitDock()`: what fits gets a column, in column order; the rest wait. It answers how many docked and how many wait.
- When some wait, the panel's note says "3 docked. 2 stay floating until the window is wide enough." Its title stays "Dock every floating <module word> beside the call".

### The note

- One line at the end of the Layout panel's Arrange section: `#modules-menu-note`, `role="status"`, empty and hidden when there is nothing to say. Written by `space.js` (through a `createCanvas({ onNote })` callback for what `canvas.js` decides), cleared after a few seconds as `say()` does, and cleared when the panel closes. [plan-saved-layouts](plan-saved-layouts.md)'s "left out" line uses the same element.

### What it leaves alone

- **Floating.** Floating modules, free or snapped, are never counted and never limited. With the canvas-level snap on, everything that can float floats, so nothing waits. Turning snap off docks the modules in `__snap.before` through `fitDock()`.
- **Windows.** A module in its own window takes no column and is not counted.
- **Phones.** Below 640 px, a phone or a narrow popped-out window, there is no limit: the tab bar shows one view at a time, and nothing waits. Remembered `mode`s are untouched, so widening the window fits again.
- **Each person's own canvas.** Nothing is stored on the server; another person's window size changes nothing for anyone else.
- **Widths.** A remembered `dockW` is never rewritten by the squeeze; it is shown again when the window is wide enough.

### Words

"The window is too narrow for another column, so <name> is floating. It docks when the window is wide enough.", "<n> docked. <m> stay floating until the window is wide enough.", "Docks when the window is wide enough", "The window is too narrow for another column".

## Left to build, in order

All experience-design. Documentation after each step is content-manager's: [architecture-canvas](../architecture/architecture-canvas.md) ("When the columns do not fit", "Docked and floating"), [architecture-navigation](../architecture/architecture-navigation.md) (the Layout panel's note), the user guide's space bar, the CHANGELOG.

1. **The rule.** `DOCK_MIN`, `FLEX_MIN`, `NARROW`, `dockLimit()` and `fitDock()` in `public/snap-grid.js`; `canvas.js` imports `DOCK_MIN` from there. No behaviour changes yet. Checked by new cases in `tools/check-canvas.mjs`.
2. **The fit on the canvas.** `syncDock()`, `settleDock()` and `takeWidthFromOthers()` on `fitDock()` and the 240 px floor; waiting modules floating and docking again; every docking path and the resize through it; a waiting module's titlebar; a drag or resize making it floating by choice. This alone fixes #156 at 760 px.
3. **Docking one too many, Dock all and the note.** The conference and the chat taking a column from the rightmost installed module; the Dock button unavailable when full; `dockAll()`'s counts; `#modules-menu-note` and `onNote`.

## Verify

- **Step 1.** `tools/check-canvas.mjs`: `dockLimit()` at 639, 640, 760, 1000, 1280 and 1920 px; `fitDock()` with six columns at 760 px docks the conference, the chat and the leftmost installed module and leaves three waiting; the conference and the chat are never waiting while the width is 640 px or more; below 640 px nothing waits; the docked widths add up to no more than the width less 280 and none is under 240; the order of `docked` is the column order; with the conference not docked, the first column is flexible.
- **Step 2.** Live in headless Chromium with the faked LiveKit: six modules docked at 1600 px, then the window at 1280, 1000, 760 and 700 px: every column on screen, the chat's message box at least 240 px wide, the extras floating and on screen; back to 1600 px, the same six docked in their old order and widths; a reload at 760 px fits the same way; a waiting module dragged stays floating after widening; snap on and off; a popped-out canvas resized. At 390 px the tab bar as before, nothing waiting.
- **Step 3.** Live in headless Chromium: at 1000 px with four docked, opening a fifth from Show leaves it floating with the note; the Dock button unavailable on a floating module; docking the chat when full sends the rightmost installed module to wait; Dock all with five floating at 1000 px gives the note's counts; the note read by the panel's `role="status"`.
- **Needs a real call:** the conference's tiles re-fitting as columns fold and come back while on the call; the conference floating with modules docked. Not checked here: a real screen reader, Firefox, Safari, a real phone, a real popped-out window (the test browser blocks popups).

## What is not decided

Nothing for this plan: Thomas approved it whole (decisions 1 to 8). [plan-saved-layouts](plan-saved-layouts.md) step 2 builds on step 1 here.
