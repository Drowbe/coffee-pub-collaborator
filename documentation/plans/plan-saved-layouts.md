# Saved Layouts Plan

**Audience:** Thomas, who decides what a saved layout holds, who may save one and whether one can be a space's default, and the sessions that build it: server-development (`server/store.js`, `server/index.js`, a new check) and experience-design (`public/canvas.js`, `public/space.js`, `public/space-settings.js`, a new pure `public/layouts.js`, `public/style.css`, `tools/check-canvas.mjs`, `tools/check-nav.mjs`).

**Status:** approved by Thomas, 2026-10-03, answering all nine of the draft's questions as recommended (decisions 1 to 9); nothing built yet. From GitHub #161 (Thomas, 2026-10-02): the space bar's **Layout** menu "should let people save the current layout under a name and load it again later. For example, "Planning" with the Calendar, To-do and Planner docked, or "Game night" with the conference large and chat floating." [plan-layout-menu](plan-layout-menu.md) deferred it here ("Saved layouts (later)"). It has to fit #156 (a limit on docked modules by the window's width), which comes before it in the Now column; its plan is [plan-docked-limit](plan-docked-limit.md), approved 2026-10-03.

## What it is today

- **The remembered layout** is in the browser only, one per space per browser: `localStorage` key `app.canvas.<space id>` (`STORE_KEY` and `storeKey()` in `public/canvas.js`). It holds `__open` (the open module ids in column order), `__snap` (`all`, `pitch`, `before`) and a record per module id: `mode` (`dock`, `float` or `window`), `dockW` (docked width in pixels), `box` (floating box in pixels), `snap`, `cell`, `placed`, `layout` (`user` or `auto`) and `win` (a pop-out window's size). `snapshot()` writes `__open` on every change; `remember()` writes a module's record. An aside remembers nothing; a guest's remembered layout is never used (`whatOpens()` in `public/opens-with.js`).
- **What opens on entering** (`restore()` in `canvas.js`, `whatOpens()`; [plan-entering](plan-entering.md), decisions 4 and 5): a fresh request to open one object, else the person's remembered `__open`, else the space's **Opens with** (`opensWith` on the space record, a list of at most 20 module ids, set by an owner through `PATCH /api/spaces/:id`, `requireOwner`), else the environment's `spaceDefaults.opensWith`, else the chat and every module on in the space. Opens with is a list of modules only: no modes, sizes or places. The space list's **Open with** popover writes the person's own `__open` (`setJoinModules()`).
- **The geometry is in pixels.** Docked columns are pixel widths, squeezed in step when they do not fit (`syncDock()`; the flexible column, the conference when docked, keeps at least 280 px). Floating boxes are pixels, clamped onto the screen (`clampBox()`). Snapped modules keep cells and the box they were put in, relative to the grid (`placed`), and `resettle()` in `public/snap-grid.js` re-places them when the pitch changes. Nothing is stored relative to the canvas's size.
- **The Layout panel** (`#modules-menu`) has two sections: **Show** (rewritten by `update()` in `canvas.js`) and **Arrange** (`#modules-menu-arrange`, written once by `space.js`: Dock all, Clean up, Snap to a grid, Grid size). On a narrow canvas Arrange is hidden; on a phone there is no Layout button at all (plan-layout-menu, decision 6).
- **Menus.** `host.menu.show` is the module SDK's menu and draws inside a module's frame; the space bar is the host's own chrome, so it cannot call it. The host's equivalent, with the same look and the same one-open-at-once rule, is `openHostMenu()` in `public/host-menu.js` (used by the **…**). This plan uses `openHostMenu()`, not `host.menu.show`.
- **Server.** Nothing about layouts is stored on the server. A space's moderators are members with the per-space `moderator` flag (`store.spaceFlags()`); today they may change the space's module settings (`settingsPlace()` in `server/index.js`) but not Opens with.
- **#156** (open; planned in [plan-docked-limit](plan-docked-limit.md)): at 760 px with six modules docked the chat column is pushed off screen. Thomas's direction: limit how many modules can be docked by the window's width; floating stays free. A saved layout loaded on a smaller window meets exactly this case, so both must use one rule.

## Decisions

The issue fixes the aim: save the current layout under a name and load it again from the Layout menu. Thomas, 2026-10-03, answering the draft's nine questions:

1. **Personal plus shared.** Each person saves their own layouts, and shared layouts everyone in the space can load. It covers "Game night" for the whole group and "Planning" for one person.
2. **Personal layouts are kept on the server,** on the person's account, so they follow the person to another computer, as plan-entering decision 13 chose for what a person has seen. The remembered layout stays in the browser.
3. **Shared layouts are saved by owners, the admin and that space's moderators.** Guests load shared layouts but never save; setting the default stays with owners, as Opens with does today.
4. **An owner marks one shared layout as the space's default,** which also sets Opens with to its modules and opens it with its places on a first visit, so nothing that reads Opens with changes.
5. **A load closes the modules the layout doesn't name,** except the conference while the person is on the call: a layout looks the same each time and never hangs up the call.
6. **Floating boxes are saved as fractions of the canvas;** docked widths stay pixels, snapped modules are re-settled at the saved pitch, and docked modules go through #156's limit.
7. **A Layouts section** in the Layout panel, after Arrange: rows that load in one press, a **…** per row through `openHostMenu()`, an inline Save form.
8. **Limits:** 10 personal layouts per person per space, 10 shared per space, names up to 40 characters, unique in their list.
9. **The conference's own view** (grid, strip, focus, spotlight) is not saved; it stays the conference toolbar's. Its size is saved either way.

## The contract

### What a layout holds

A layout belongs to one space. Stored shape (the server checks it, the page builds it):

```json
{
  "id": "l3f9a2c",
  "name": "Game night",
  "by": "<user key>",
  "at": "2026-10-03T18:00:00.000Z",
  "modules": [
    { "id": "conference", "mode": "dock" },
    { "id": "chat", "mode": "float", "box": { "x": 0.70, "y": 0.05, "w": 0.27, "h": 0.60 }, "snap": false },
    { "id": "calendar", "mode": "dock", "dockW": 360 }
  ],
  "snap": { "all": false, "pitch": 130 }
}
```

- `modules`: the open modules, in column order (docked first, in their columns' order, then floating, in the order they were opened). The first entry is a phone's first tab.
- `mode`: `dock` or `float`. A module in its own window is saved as the mode it had on the canvas before (its remembered `mode`, else `dock` where it can dock); windows are not reopened by a load.
- `dockW`: a docked module's width in pixels, as today. Left out for the flexible column (the conference when docked): its size is what the others leave it, so "the conference large" is the other columns being narrow.
- `box`: a floating module's box as fractions of the canvas (0 to 1), so it scales to another window. `snap`: whether this module snaps.
- `snap`: the canvas-level switch and the grid's pitch in pixels (50 to 320, as `SNAP_PITCH`).
- Not saved: the conference's own view (grid, strip, focus, spotlight), a module's own state (its objects, its scroll, its filters), pop-out windows, Full screen.

### Saving and loading

- **Save** reads the canvas as it is (`captureLayout()` in `canvas.js`, using a pure `layoutOf(modules, area)` in `public/layouts.js`) and sends it with a name.
- **Load** (`loadLayout(layout)` in `canvas.js`; not `applyLayout`, which is already `space.js`'s window-width handler):
  1. Works out what can open: each id that `canOpenHere(id)` allows. Ids that are off in the space, not installed, or that this person cannot read are left out, and the panel says so in one line, for example "Map isn't on in this space, so it was left out." The stored layout is not changed, so it comes back whole when the module is on again.
  2. Closes the open modules the layout does not name, **except the conference while this person is on the call** (closing it would hang up; it stays where it is).
  3. Opens or moves the rest to their modes, in order; docked widths from `dockW` (clamped as `clampDock()` does); floating boxes scaled to the canvas from the fractions, then kept at least `MIN_W` by `MIN_H` and on screen (`clampBox()`); snapped ones settled onto the grid at the saved pitch from the scaled box, without overlaps, by `resettle()`; the canvas-level snap switch set as saved.
  4. Runs the docked modules through #156's fit (`fitDock()` in [plan-docked-limit](plan-docked-limit.md)), exactly as a window resize would. Until #156 is built, `syncDock()`'s squeeze applies, as today.
  5. Becomes this person's remembered layout for the space (`__open` and the module records in `app.canvas.<space id>`), so a reload keeps it. One click, no confirm, no undo.
- On a narrow canvas (below 640 px) a load opens the layout's modules and shows the first as the view; modes and places are kept for a wider window. Phones have no Layout button (plan-layout-menu, decision 6), so a phone meets a saved layout only as a space's default.
- An aside has no layouts: no Layouts section and no routes.

### Who may do what

| | Save, rename, replace, delete their own | Load the space's shared layouts | Save, rename, replace, delete shared layouts | Set the space's default layout |
|---|---|---|---|---|
| Admin, owner | yes | yes | yes | yes |
| Moderator (of that space) | yes | yes | yes | no |
| Member | yes | yes | no | no |
| Guest | no | yes | no | no |

A shared layout may be changed or deleted by anyone allowed to save shared layouts, not only the person who saved it.

### Storage and routes (server-development)

- **File:** `layouts.json` in the environment's data folder, written as the other JSON files are: `{ "spaces": { "<space id>": { "shared": [layout], "people": { "<user key>": [layout] } } } }`. A personal layout follows its person to any browser. `store.removeSpace()` drops the space's entry; `store.removeUser()` drops the person's layouts in every space. The environment's export and the host console's backup carry the file (check it).
- **The space record** gains an optional `defaultLayout` (a shared layout's id), absent while not set, cleaned like `opensWith`.
- **Limits:** 10 personal layouts per person per space, 10 shared per space; a name of 1 to 40 characters, trimmed, unique within its list regardless of case; at most 20 entries in `modules` (the same id rule and count as `opensWith`), each id listed once; fractions between 0 and 1; `dockW` 160 to 2000; `pitch` 50 to 320. Anything else is refused whole, with a sentence saying what.
- **Routes,** all under a space the person is a member of, or holds the guest link for (guests: `GET` only, shared only):
  - `GET /api/spaces/:id/layouts` → `200 { mine: [layout], shared: [layout], defaultLayout: id | null, canShare, canSetDefault }`. A guest gets `mine: []`. 404 for no such space, 403 for not a member.
  - `POST /api/spaces/:id/layouts` with `{ name, shared: boolean, modules, snap }` → `201 { layout }`. 400 for a bad shape; 403 for `shared` without the right, or a guest; 409 when the name is taken in that list (`{ error, id }` of the one with that name, so the page can offer to replace it); 409 when the list is at its limit ("You have 10 saved layouts here. Delete one first.").
  - `PUT /api/spaces/:id/layouts/:layoutId` with any of `{ name, modules, snap }` → `200 { layout }` (rename, or replace with the current canvas). 403, 404, 409 as above.
  - `DELETE /api/spaces/:id/layouts/:layoutId` → `204`. Deleting the default clears `defaultLayout`; `opensWith` stays as it was.
  - `PATCH /api/spaces/:id` (owner, as today) takes `defaultLayout: id | null`. Setting it also sets `opensWith` to the layout's module ids (so the space list's popover, the Opens with summary and the environment template code keep working from one list); `null` clears `defaultLayout` and leaves `opensWith`. Replacing the default layout's modules through `PUT` updates `opensWith` the same way. Changing `opensWith` by hand in space settings clears `defaultLayout`.
- **No migration.** The file and the field are new and optional; the browser's `app.canvas.<space id>` keys are unchanged and keep their meaning (the remembered layout). No stored key is renamed.

### The default layout and Opens with

- An owner (or the admin) marks one shared layout as the space's default. A first visit (no remembered `__open`) then opens that layout, modes and places included, through the same `loadLayout()`; for a guest, every visit. A remembered layout still wins after the first visit (plan-entering, decision 5).
- `whatOpens()` keeps its order; `restore()` asks for the default layout when `whatOpens()` answers from the space's own list and `defaultLayout` is set, and places the modules by it. `GET /api/modules/for-space` adds `defaultLayout` (the whole layout, or null) beside `opensWith`.
- Space settings' **Opens with** shows, above its switches, "Opens with the layout <name>" while a default is set, with **Stop using it** (clears `defaultLayout`, keeps the switches as they are). Flipping a switch there clears the default.

### The Layout panel (experience-design)

- **A third section, Layouts,** after Arrange (`#modules-menu-layouts`, heading id `modules-menu-layouts-heading`, `role="group"`, the same look as the other two). Written by `space.js`, refreshed from `GET /api/spaces/:id/layouts` when the panel opens and after each change; never rewritten by `update()`. Hidden on a narrow canvas, as Arrange is.
- **Rows:** the shared layouts first, under a small **Shared** label (the default marked "Default"), then the person's own. Each row is a button with the layout's name: a press loads it, and the panel stays open. Beside it a **…** button (`aria-label` "More for <name>") opens `openHostMenu()` with **Replace with this layout**, **Rename**, **Delete**, and, for an owner on a shared layout, **Make default** or **Stop using as default**. A person sees the **…** only on layouts they may change. **Delete** asks once, in the menu's own confirm row ("Delete Game night?").
- **Save:** a **Save this layout** button opens an inline form in the section (the panel is a popover, not a menu, so it may hold a field): **Name**, and for those who may share, a **For everyone in this <space word>** switch (off by default), then **Save** and **Cancel**. Enter saves, Escape cancels back to the button. A taken name says "There is already a layout called Game night." with **Replace it**. Rename uses the same field in place.
- **Empty:** "No saved layouts yet." above **Save this layout**. A guest with no shared layouts sees no Layouts section.
- **Words:** "Layouts", "Shared", "Default", "Save this layout", "Name", "For everyone in this <space word>", "Save", "Cancel", "Replace with this layout", "Rename", "Delete", "Make default", "Stop using as default", and the one-line notes above. The panel's button keeps the environment's `layout` verb.
- **Keys:** Tab moves through the section in order; Up and Down move between the rows; Enter or Space loads; Escape closes the open form, else the panel. No new shortcut.

### #156 and this plan

- #156 is built first. Its fit (`fitDock()` in `public/snap-grid.js`, [plan-docked-limit](plan-docked-limit.md), deciding which docked modules a canvas width can hold) is what step 4 of a load calls, so a layout saved on a wide screen opens sensibly on a small one, and a default layout does the same on a first visit.
- Saving records what is docked even beyond what a smaller window could hold: the layout is the intent; each window fits it on load.

## Left to build, in order

1. **The store and the routes** (server-development). `layouts.json`, the shape check (`cleanLayout()`, pure), the limits, the four routes, the clean-up on `removeSpace()` and `removeUser()`, the export carrying the file. Checked by a new `tools/check-layouts.mjs` (in `npm run check`).
2. **Capture and load** (experience-design; after #156). `public/layouts.js` with the pure `layoutOf()` and `placeLayout(layout, area, canOpen)` (fractions to pixels, clamping, which ids are left out); `captureLayout()` and `loadLayout()` on the canvas, keeping the conference while on the call, writing the remembered layout. Checked by new cases in `tools/check-canvas.mjs`.
3. **The Layouts section** (experience-design). Rows, the **…** through `openHostMenu()`, the Save and Rename form, the notes, the keys. Checked by `tools/check-nav.mjs` (the section's ids, not rewritten by `update()`, hidden on a narrow canvas).
4. **The default layout** (server-development, then experience-design). `defaultLayout` on the space, kept in step with `opensWith`; `GET /api/modules/for-space` carries it; `restore()` uses it on a first visit; space settings' line and **Stop using it**; **Make default** in the row's menu. Checked by `tools/check-layouts.mjs` and `tools/check-canvas.mjs`.

Documentation after each step is content-manager's: [architecture-canvas](../architecture/architecture-canvas.md) ("Remembered layouts" and a new "Saved layouts"), [architecture-navigation](../architecture/architecture-navigation.md) (the Layout panel), the API document (the routes and `defaultLayout`), the user guide's space bar, the CHANGELOG.

## Verify

- **Step 1.** `tools/check-layouts.mjs` against a throwaway server (`DATA_DIR=/tmp/<name>`): each route's codes for an owner, a moderator, a member and a guest; the limits and the 409s; a space or a person removed taking their layouts; a bad shape refused whole. Live with curl.
- **Step 2.** `tools/check-canvas.mjs`: `layoutOf()` then `placeLayout()` at the same size gives the same boxes; at half the width every box is inside and at least the smallest size; snapped modules do not overlap; an id that cannot open is left out and reported. Live in headless Chromium with the faked LiveKit at 1600, 1280 and 800 px: save at 1600, load at 800; docked, floating and snapped modules where expected; a reload keeping the loaded layout.
- **Step 3.** `tools/check-nav.mjs`, then live in headless Chromium: save, rename, replace, delete; a shared layout seen by a second member and not changeable by them; a guest seeing only shared ones; the keyboard through the section; at 390 px no Layout button and nothing changed.
- **Step 4.** The checks, then live: an owner makes a layout the default; a new member's first visit opens it with its places; a second visit opens their own; space settings shows the line and **Stop using it** works; changing Opens with by hand clears it.
- **Needs a real call:** loading a layout while on the call keeps the call and the conference, and its tiles re-fit; loading one that floats the conference small and then large. Not checked here: a real screen reader, Firefox, Safari, a real phone opening a default layout.

## What is not decided

Nothing for this plan: Thomas answered its nine questions (decisions 1 to 9). #156's plan, [plan-docked-limit](plan-docked-limit.md), is agreed (2026-10-03); step 2 needs its step 1 built. Left for later, not asked now: layouts usable in every space of an environment, layouts an environment template ships, and a phone loading a layout from the header's menu.
