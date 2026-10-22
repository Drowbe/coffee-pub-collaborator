# The design system pages

Three pages live here.

- `index.html` is the Legacy inventory: what the product looks like now, component by component. It loads nothing that starts with `proposed`.
- `proposed.html` is Proposed: only what Thomas has decided, one family at a time. All 26 families are decided (the last 18 on 2026-10-21). This page becomes the design system; the Legacy inventory stays a separate page until the migration ends. A family is one part of the
  system, such as Buttons, Fields and forms, Typography, Tabs and view switches, or Colour.
- `prototype.html` is the Prototype: whole screens of the product as it draws them (the Workspace, the call beside the chat, a dialog,
  a confirm, the Planner, Home, Manage), so a component is judged where it is used. See "The Prototype page" below.

## How the Proposed page is put together

Each family has its own files, so two people can work on two families without touching the same file.

| File | What it holds |
| --- | --- |
| `proposed.html` | The page. It names no family. |
| `proposed.js` | The page engine: the menu, the example frames, the Dark/Light, fonts (Today's or Proposed) and width switches, the forced hover, focus and pressed states, and the list of families still to decide. |
| `proposed.css` | Only the rules more than one family uses (the button height tokens). |
| `proposed-families.json` | The list of families, in the order they are drawn. |
| `proposed-<id>.js` | One family: it draws its examples and registers itself. |
| `proposed-<id>.css` | One family: its rules, all under `.ds-proposed`. |

Each family is checked by `tools/check-design-system-<id>.mjs`, listed in `tools/check-design-system-families.json`.
`tools/check-design-system.mjs` is the shared runner.

## The families

One entry each in `proposed-families.json`, in the order they are drawn. Each is also in
`tools/check-design-system-families.json`; the check fails if the two lists differ.

- `colour`: Colour
- `buttons`: Buttons
- `fields`: Fields and forms
- `typography`: Typography
- `tabs`: Tabs and view switches
- `chips`: Chips, badges and counts
- `cards`: Cards, panels and rows
- `menus`: Menus and popovers
- `foundations`: Foundations (spacing, elevation, the one scrim, radius, motion, icons, layout)
- `calendar`: Calendar cells
- `markers`: Markers
- `days`: Day cards and day chips
- `tables`: Tables and Manage lists
- `dialogs`: Dialogs and sheets
- `tooltips`: Tooltips
- `states`: Empty, loading and error states (owns the one skeleton, `.sdk-skel`)
- `toasts`: Toasts and banners
- `modulechrome`: Module window
- `chat`: Chat
- `journey`: Journey bar
- `tabbar`: Phone bottom bar
- `links`: Links
- `pickers`: Pickers
- `progress`: Progress bars and meters
- `avatars`: Avatars and portraits
- `choices`: Choice rows

A class has one owner. A family may use another family's class (Tables draws its loading bars with the States skeleton) but
never defines it again.

## Families draw on demand

The page draws a family's example frames only when it is needed: when it is picked in the menu, named in the address
(`proposed.html#buttons`), or scrolled to within about 1200px of the screen. Until then a family is its heading and a loading
line. This keeps the page quick to open (about 280 frames in all). `window.DS_PROPOSED.renderAll()` draws every family and
resolves when every frame has loaded; the checks call it before they measure. A family needs nothing to take part: its
`render(api)` is simply called later.

## Add a family

1. Write `proposed-<id>.js`. Copy the top of `proposed-tabs.js`: it registers with
   `window.DS_PROPOSED.families.push({ id, covers, group, name, status, words, render })`. `render(api)` returns the
   family's block. Draw examples with `api.makeFrame('app', html, { proposed: true, title, css: PM_CSS + YOUR_CSS })`.
2. Write `proposed-<id>.css`. Every rule starts with `.ds-proposed`. Colours are theme tokens; radii are `--radius-*` tokens.
3. Add one line to `proposed-families.json`: `{ "id": "<id>", "js": "proposed-<id>.js", "css": "proposed-<id>.css" }`.
   Add `"frames": false` only if the rules are for the page itself and must not go into the example frames (Colour does this).
4. Write `tools/check-design-system-<id>.mjs` and add `"<id>"` to `tools/check-design-system-families.json`. It exports `id`,
   and may export `todayOnly` (classes of today's markup the family draws as they are), `staticChecks(ctx)` (the files)
   and `browserChecks(b)` (measurements in the page). Copy `check-design-system-tabs.mjs`.
5. If the family was listed under "Today only" in `proposed.js`, take its name out of that list
   (the check fails if a name is both a drawn family and on that list, or if a name left there does not say "Today only").

You edit no shared file except those two lists and, if needed, the list of Today-only names. The snapshot tool and the page both
read `proposed-families.json`, so the hosted copy gets the new files without another edit.

## Check it

- `node tools/check-design-system.mjs` runs every check (it opens a real browser; set `DS_TIMING=1` to see how long each family's check takes).
- `node tools/check-names.mjs` checks the words. A new `proposed-<id>.js` that names modules needs an entry in
  `tools/check-names-allow.json`, as the other family files have.

## The hosted copy

`TODAY_URL=https://... PAGE=proposed OUT=/tmp/dsP node tools/design-system-snapshot.mjs` builds a folder with the page, the fonts and every
file the manifest names. It also writes the list into `index.html`, so the folder works when opened from a disk.

## The Prototype page

`prototype.html` (in the app: `/design-system/prototype.html`) lists the screens on the left and shows one at a time, in a frame at
its own width and height. The switches on top: the width (the widths that screen was captured at: 1280 and 390, and 1600 for the
Workspace, where all four modules dock), **Dark** or **Light**, the theme (the three shipped themes), **Fit** (scaled to the column) or
**100%**, and **Measure**. The address keeps the choice (`prototype.html#workspace?w=1280&mode=light&theme=calming-teal&measure=1`).

**Measure** outlines every box that draws something (a fill, an edge or padding) with its height and padding in px: `38 · 8 12` is
38px tall, 8px above and below, 12px left and right. A box whose top padding differs from its bottom, or its left from its right, is
dashed and its label shows all four (top right bottom left) on red. Boxes side by side in one row whose heights differ are marked `≠`.
Point at anything for its full numbers (size, padding, border, margin, gap, font). A box under another one (a column under a floating
window) is left out. The counts are shown under the screen's name.

**Each screen is the product's own markup.** `tools/prototype-build.mjs` starts the screenshot tool's throwaway server with its travel
seed (`tools/shots.mjs`, `tools/shots-seed.mjs`), opens each screen in headless Chromium, drives it into its state (a layout, a tab,
an open dialog) and writes the rendered DOM as it stands: the modules' shadow roots as declarative shadow roots, the Calendar's page
in its frame as a file of its own, scripts and `on*` attributes removed, field values, scroll positions and open dialogs and popovers
kept as attributes for `prototype-frame.js` to put back. Nothing is drawn again by hand.

**Refresh** with one command: `node tools/prototype-build.mjs` (about a minute; `--only=workspace,home` rebuilds some, `--list` names
them). Then commit `public/design-system/prototype/`. The screens link the product's own stylesheets (`style.css`, `sdk/system.css`,
the fonts and icons), and a module's shadow root reads `sdk/host.css` and `sdk/system.css` from the product when the screen opens, so
an edit to those files shows on the Prototype at the next reload, with no rebuild. What needs a rebuild: a change of markup, of what a
script draws, or of a module's own CSS (kept per build in `prototype/styles/`).

| File | What it holds |
| --- | --- |
| `prototype.html`, `prototype.js`, `prototype.css` | The page: the list, the frame and the switches. |
| `prototype-frame.js` | The only script a screen runs: puts back what markup does not keep, answers the switches, draws Measure. |
| `prototype/screens/*.htm` | The screens, one file per screen and width (`-f1` is the page in a frame inside it). Generated. |
| `prototype/styles/*.txt` | A module's own CSS as its shadow root carried it. Generated. |
| `prototype/themes/*.css` | The three shipped themes, both modes each, written by `server/theme-css.js`. Generated. |
| `prototype/assets/*` | Pictures the server made (avatars, the icon). Generated. |
| `prototype/screens.js` | The list of screens the page reads. Generated. |

The generated screens are `.htm` and the module CSS `.txt` on purpose: they are captured output, so the code checks (`check-names`,
`check-syntax`) do not read them as source; their source is checked where it lives. Add a screen by adding a row to `SCREENS` in
`tools/prototype-build.mjs` (the same step format as `tools/shots-screens.json`).

What it cannot show: a real call (there is no LiveKit server here; the call is the screenshot tool's stand-in, connected with
nobody in it), and Maps' map (no map files in the seed: Maps shows its "not set up" state with its search).

`node tools/check-prototype.mjs` builds the screens into a folder of its own and checks, in headless Chromium, that every screen at
every width loads with no console error and no missing file, follows Light and each theme, and that Measure draws labels with numbers.
`--no-build` checks the committed screens; `--look=<folder>` also writes a picture of each screen at 1x and 2x, dark and light.

The review copy: `PAGE=prototype OUT=/tmp/dsT node tools/design-system-snapshot.mjs` builds a folder with the page, the screens and the
product files they read, laid out as the app serves them; serve the folder with any static server and open `design-system/prototype.html`
(its `index.html` leads there). A screen reads its stylesheets with `fetch`, so it needs to be served, not opened from a disk.
