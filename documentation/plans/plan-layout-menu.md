# Layout Menu Plan

**Audience:** Thomas, who decides what the space bar's **Layout** menu holds and what stays in the bar, and the session that builds it: experience-design (`public/space.js`, `public/canvas.js`, `public/switch-list.js`, `public/nav-bar.js`, `public/style.css`, `tools/check-nav.mjs`, `tools/check-canvas.mjs`). No server change.

**Status:** approved by Thomas, 2026-10-02; building after the rename lands. He answered the plan's five questions the same day (decisions 4 to 8). From Thomas, 2026-10-02: the space bar's "Modules ▾" button is renamed **"Layout ▾"**, with a **Show** heading over the module switches, "which would scale to our future changes" (being built now, separately). Earlier he asked for "a **Clean Up** button that rearranges the modules on the canvas, and a way to choose and save layouts" (the TODO's "For later"), and [plan-nav](plan-nav.md) left open "whether the layout choice (docked, floating, snap) grows into one layout menu rather than several buttons". This plan answers that: Dock all, the snap switch and its grid slider, and a future **Clean up** move from the space bar's right zone into the Layout menu. Saving and loading layouts is GitHub #161, kept out of this plan (see "Saved layouts (later)").

## What it is today

- **The Layout button** (being renamed from Modules; in the working tree as this is written) is the space bar's left zone's first tool, `module-chooser` (`public/space.js`): the button `#modules-toggle`, reading the environment's `layout` verb (`verb('layout')`, default "Layout", `VERBS` in `public/words.js` and `server/words.js`), and its list `#modules-menu`. `update()` in `public/canvas.js` rewrites the list's whole content on every change: a **Show** heading (`#modules-menu-show`) and a `.module-chooser-section` group of switches (`switchListHtml()` and `wireSwitchList()` in `public/switch-list.js`: Space or Enter flips, Up, Down, Home and End move). It opens under its button, stays open while switches are flipped, and closes on the button, Escape or a click elsewhere. It carries the unread count. It never folds.
- **The right zone** (`.subnav-tools`), registered in `public/space.js` in group `space`: Dock all (`dock-all`, order 1), the snap switch (`snap-all`, order 2), the grid slider (`snap-size`, order 3, an `element` tool shown only while snap is on), Full screen (`fullscreen-toggle`, 11), Pop out (`popout`, 12), Pull participants back (`recall-button`, 51), Rejoin call (`rejoin-call`, 52); then a module's own tools (`host.nav.set`, 101 to 998), the **…** (`subnav-more`, 998) and Leave (`leave-space`, 999).
- **What they drive** (`public/canvas.js`): `dockAll()` turns the canvas-level snap off and docks every floating module that can dock (not on a narrow canvas, not one in its own window); `snapAll(on)`, `snapAllOn()`, `setSnapPitch(px, { preview })` and `snapPitchRange()` run the grid, remembered with the space's layout (`__snap.all`, `__snap.pitch`). `syncSnapBar()` in `space.js` keeps the switch and the slider in step. Each floating module also has its own snap button on its titlebar (`data-snap`). The grid's tiling (`applySnapLayout()`, `tileFresh()`) already places modules so none overlap; there is no Clean up.
- **The fold** (`foldSteps()` in `public/nav-bar.js`): the right zone folds into the **…** in the order Pop out, Full screen, a module's own tools, the snap switch with its slider, Dock all, Rejoin call, Pull participants back. In the **…** menu the snap switch is a checkbox entry and the slider has no entry.
- **Phones** (640 px and below, a narrow pop-out included): the space bar is the tab bar, `#modules-menu` becomes the tabs (`subnav-modules`) and the Layout button is not drawn. A module fills the screen there, with no floating and no window (`style.css` hides `[data-mode]` and `[data-popout]`), and at 560 px and below the stylesheet hides Dock all, the snap switch and the slider. The right zone keeps Leave.
- **Keys** (`onKey()` in `space.js`): M, V, D, C, L (cycles the conference's own view: grid, strip, focus, spotlight), R, S, F (Full screen), 1 to 6. Nothing opens the Layout menu.

Two things to keep apart: the conference has its own "layout" (its grid, strip, focus and spotlight views, the L key, its toolbar's picker). That is the conference module's, in its own bar ([plan-canvas](plan-canvas.md): "layout live[s] in the conference pane's bar"), and this plan leaves it there. Related issues: #156 (limit docked modules by the window's width, which may change what Dock all can do on a small window) and #160 (the space bar below 641 px).

## Decisions

Thomas, 2026-10-02, and earlier where dated.

1. **The Modules button is the Layout button,** "Layout ▾", with a **Show** heading over the module switches, "which would scale to our future changes". Built separately (the word is the environment's `layout` verb); this plan builds on it.
2. **A Clean up button** that tidies the modules on the canvas, and **a way to choose and save layouts**, are wanted (the TODO's "For later", before 2026-10-02).
3. **Saving and loading layouts is its own issue,** #161, planned later.

Thomas, 2026-10-02, answering the plan's questions and approving it.

4. **Two sections, Show then Arrange.** Arrange holds Dock all, Clean up, the snap switch and the grid size.
5. **Full screen and Pop out stay in the right zone,** with Pull participants back, Rejoin call, a module's own tools, the **…** and Leave.
6. **No Layout on phones.** No Layout button and nothing in the header's menu: the tab bar is Show, and a phone has nothing to arrange.
7. **Clean up tidies floating modules,** as set out under "Clean up" below, and is built as step 2.
8. **No key** opens the menu; L stays the conference's view.

## The contract

### The menu

- **The button** stays `#modules-toggle` in `module-chooser`, the left zone's first tool, `fold: false` as now, with its unread count. `aria-controls` names the whole panel.
- **The panel** is a popover under the button, as the list is today: not a `role="menu"` (a menu cannot hold a slider), but a labelled group with a heading per section. It stays open while things are changed in it; the button, Escape or a click elsewhere closes it, and focus goes back to the button.
- **Sections, in order** (decision 4):
  1. **Show:** the module switches, as built by decision 1 (the heading `#modules-menu-show` and its group, its rows and keys unchanged).
  2. **Arrange:** **Dock all**, then **Clean up** (once built), then **Snap to a grid**, a switch, and under it, only while snap is on, **Grid size**, the slider.
- **The controls keep their ids** (`dock-all`, `snap-all`, `snap-size`) and their behaviour: Dock all calls `canvas.dockAll()`; the switch calls `canvas.snapAll()`; the slider previews on `input` and saves on `change`, as now. The snap switch is a real checkbox with `role="switch"` (the `switchRowHtml()` look), not a toggle button. Dock all and Clean up are buttons with an icon and their word. `syncSnapBar()` updates the switch and the slider in the panel instead of `nav.setActive()`.
- **The Arrange section is not rebuilt by `update()`.** Today `update()` rewrites all of `#modules-menu`; it must rewrite only the Show section and leave Arrange in place (Arrange as its own element after it, with its own heading id and `role="group"`, the same look as Show's), so a slider being dragged or a focused button is never replaced under the pointer or the keyboard. Arrange is markup `space.js` writes once and wires, as it wires the bar's tools today.
- **Words:** "Dock all" (title "Dock every floating <module word> beside the call", as now), "Clean up" (title "Tidy the floating <module word, plural>"), "Snap to a grid", "Grid size". The headings "Show" and "Arrange".
- **When Arrange has nothing to do:** on a narrow canvas (below 640 px wide, `isNarrow()`), where nothing docks, the Arrange section is not drawn.

### Clean up (decision 7)

- Acts on floating modules only, on this canvas, in this window. Docked modules and modules in their own window are left alone.
- With snap on: re-tiles every floating module on the grid so none overlap, the way turning snap on tiles fresh ones (`tileFresh()`), keeping each module's size in cells where it fits.
- With snap off: moves every floating module fully onto the canvas and apart, keeping each one's size where it fits and shrinking only what cannot fit, in the order they were opened.
- Remembered in this person's layout for the space, as a drag is. One click, no confirm, no undo.
- The placing is a pure function beside the grid's (`public/snap-grid.js`, for example `tidyBoxes(boxes, area)`) so `tools/check-canvas.mjs` can hold it.

### What stays in the right zone (decision 5)

Full screen, Pop out, Pull participants back, Rejoin call, a module's own tools, the **…** and Leave, in today's order. Full screen and Pop out move the whole app, not the canvas, and Full screen has its F key; the aside's two are call actions; a module's tools stay where plan-two-zone-nav put them.

### The registry and the SDK

- `space.js` stops registering `dock-all`, `snap-all` and `snap-size` with the registry. Nothing else in `nav-bar.js` changes: `foldSteps()`, `foldCount()` and `fitWidth()` keep their code.
- **The fold** gets shorter: Pop out, Full screen, a module's own tools, Rejoin call, Pull participants back. The right zone is narrower with nothing folded, so Online keeps its names longer before anything folds, and the **…** shows less often. The **…** menu loses the snap and Dock all entries.
- The 560 px rule in `style.css` that hides `#dock-all`, `#snap-all` and `#snap-size` goes with them.
- **No SDK change.** Modules cannot add to the Layout menu; a module's titlebar snap button stays as it is; `host.nav.set` is unchanged.

### Phones (decision 6)

No Layout button, as today: the tab bar is the Show section, and a module fills the screen, so there is nothing to arrange. Nothing moves into the header's menu (the **Menu** button). A narrow pop-out follows #160.

### Keys (decision 8)

No new shortcut: L stays the conference's view. In the panel, Tab moves through it in order (the switches, Dock all, Clean up, the snap switch, the slider); Up, Down, Home and End move between the Show switches as now; the slider takes its own arrow keys; Space and Enter flip a switch or press a button; Escape closes the panel and returns to the button. Pressing a control does not close the panel. Opened from the keyboard, focus goes to the first switch, as now.

### The checks

- `tools/check-nav.mjs`: `space.js` registers no `dock-all`, `snap-all` or `snap-size`; the left zone's `module-chooser` holds them; the 560 px rule no longer names them; the existing `foldSteps()` cases are unchanged (they use their own lists).
- `tools/check-canvas.mjs`: Clean up's pure placing, with snap on and off: no two boxes overlap, every box is inside the area, a box that fits keeps its size, many boxes on a small area all stay inside.

## Left to build, in order

All experience-design. Documentation after each step is content-manager's: [architecture-navigation](../architecture/architecture-navigation.md) (the module chooser, the right zone's table, the fold's order), [architecture-canvas](../architecture/architecture-canvas.md) (Clean up), the user guide's space bar, the CHANGELOG.

1. **The Arrange section.** `update()` limited to the Show section; Dock all, the snap switch and the grid slider move from the right zone into the Layout panel under an Arrange heading, after Show; their registrations and the 560 px rule go; `syncSnapBar()` drives the panel; the panel's keys; the check-nav cases. Needs decision 1's rename to have landed.
2. **Clean up.** The pure placing in `snap-grid.js`, `cleanUp()` on the canvas, the button in Arrange between Dock all and the snap switch, the check-canvas cases.

## Verify

- **Step 1.** Checked by `tools/check-nav.mjs`. Live in headless Chromium with the faked LiveKit, at 1280, 1000, 800, 700 and 390 px: the panel's two sections in order; Dock all docking floating modules; the snap switch on, the slider showing and resizing the grid, the switch off; the state the same in the panel after a reload; the right zone without the three tools and folding in the shorter order; Online keeping its names at a width where it used to shrink; the keyboard through the panel, Escape back to the button, the slider by arrow keys; at 390 px the tab bar as before and no Arrange anywhere; a popped-out window's bar.
- **Step 2.** Checked by `tools/check-canvas.mjs`. Live in headless Chromium: four modules floating on top of each other, Clean up, none overlapping and all on screen, with snap on and off; a reload keeping the tidy places; docked modules and one in its own window untouched.
- **Needs a real call:** Clean up with the conference floating and its tiles live (the tiles re-fit to the new size). Not checked here: a real screen reader, Firefox, Safari, a real phone, a real popped-out window (the test browser blocks popups).

## Saved layouts (later)

GitHub #161: save the canvas as a named layout and load it again from the Layout menu. Not part of this plan; its own plan settles:

- **Per person or per space:** each person's own, or can an owner save one everyone in the space can load?
- **What is saved:** which modules are open; docked or floating; positions and sizes; snap and the grid's size; the conference's size.
- **Names:** naming, renaming, deleting, and how many.
- **The space's "Opens with":** can a saved layout become what a first visit opens ([plan-entering](plan-entering.md), decisions 4 and 5), and how it sits beside each person's remembered layout (`__open`).

#161 also asks about phones and about modules a layout names that are off in the space or that the person cannot read.

## What is not decided

Nothing for this plan: Thomas answered its five questions (decisions 4 to 8). The words ("Arrange", "Clean up", "Snap to a grid", "Grid size") and the panel being a popover rather than a menu are the plan's choices, which he may still overrule. Saved layouts wait on their own plan (#161).
