# Unified Layout Plan

**Audience:** Thomas, who decides the model, the rules and the order; experience-design, which builds the SDK's drawing and each module's move; server-development, which builds the check and the manifest field; quality-assurance, which measures each move with `check-conformance`.

**Status:** draft for Thomas, 2026-10-22. From Thomas, the same day: a unified design system means layout most of all, not only colour and fonts. Modules share title bars, status bars, content containers, tab strips and toolbars, and what is inside them (cards, lists, tables, forms); "system" does not mean each builder figures it out their own way. Modules must compose from shared, host-owned components and must not be able to hand-draw the shared things.

## What it is today

The host already draws part of the window: the title bar (`.mod-header`, with `host.header.set` buttons and the `host.add.set` "+"), the status line (`host.status.set`) and a toolbar row (`host.toolbar.set`, in `public/module-host.js` and `public/module-chrome.js`). `system.css` has the approved look for all of it (modulechrome, tabs, cards and rows, tables, fields and forms blocks), and `check-conformance` measures the bands in a browser. But no bundled module calls `host.toolbar.set`. Instead, Calendar, Polls and To-do draw a `header.bar` of their own under the host's title bar; Research draws `.rs-head` and its own `.sdk-toolbar`; Places draws its own `.sdk-toolbar` and `.part-head`; the Planner draws a `.trip` header with its own status words. Where the host has no window (a destination's part, a dashboard widget) the SDK calls answer `false` and the API document tells the module to draw the controls itself. Cards, rows and forms use the shared classes, but each module writes the markup and then restyles it.

### The audit

Read from `modules/*/src` by a script that sorts each CSS rule by its selector and counts the HTML elements and script class assignments that draw each family. Each cell is own CSS lines / markup sites the module writes (sites include markup that uses the shared classes, because the module still lays it out). Approximate; read as code only.

| Module | Title row | Toolbar | Tab strip | Status | Content box | Card | List, row | Table | Form | Domain CSS |
|---|---|---|---|---|---|---|---|---|---|---|
| Assistant | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 9 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 6 |
| Budget | 3 / 2 | 0 / 2 | 0 / 0 | 0 / 0 | 9 | 5 / 23 | 15 / 21 | 5 / 4 | 1 / 53 | 35 |
| Calendar | 5 / 5 | 2 / 2 | 0 / 0 | 0 / 0 | 9 | 0 / 0 | 11 / 8 | 0 / 0 | 1 / 53 | 68 |
| Maps | 0 / 3 | 6 / 4 | 0 / 0 | 0 / 0 | 23 | 0 / 0 | 14 / 7 | 0 / 0 | 2 / 3 | 51 |
| Places | 3 / 5 | 0 / 5 | 0 / 0 | 4 / 3 | 9 | 1 / 11 | 22 / 19 | 3 / 2 | 30 / 57 | 20 |
| Polls | 1 / 1 | 3 / 5 | 0 / 0 | 0 / 0 | 8 | 3 / 4 | 13 / 6 | 0 / 0 | 7 / 33 | 25 |
| Research | 2 / 3 | 5 / 8 | 0 / 0 | 0 / 0 | 11 | 37 / 8 | 12 / 7 | 0 / 0 | 15 / 52 | 13 |
| Stream | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 2 | 1 / 2 | 5 / 4 | 0 / 0 | 0 / 1 | 29 |
| To-do | 1 / 1 | 7 / 5 | 0 / 0 | 0 / 0 | 9 | 0 / 0 | 22 / 15 | 0 / 0 | 4 / 35 | 21 |
| Planner (`travel`) | 7 / 5 | 8 / 7 | 0 / 13 | 5 / 4 | 29 | 56 / 118 | 60 / 56 | 10 / 0 | 21 / 314 | 130 |
| **All** | **22 / 25** | **31 / 38** | **0 / 13** | **9 / 7** | **118** | **103 / 166** | **174 / 143** | **18 / 6** | **81 / 601** | **398** |

So: 9 modules draw a band the host should draw (95 markup sites), and about 400 lines of module CSS restyle shared content. The 398 domain lines are mostly real domain content (map pins, the calendar grid, the Planner's timeline) and some unsorted rules the check will have to place.

## Proposal (for Thomas to decide)

**1. The window is the host's.** A module declares, the host draws: the title bar (manifest name and icon, `host.header.set`, `host.add.set`), one toolbar row (`host.toolbar.set`, with the tab strip as its `tabs` item), the status line (`host.status.set`) and the content slot with its padding. A module supplies only what goes in the slot. The same calls work in a sandboxed frame and in the page, since the host draws outside both. Wherever a module is drawn (window, popped out, its own page, a destination's part) the host draws the bands; the calls stop answering `false` there. `host.toolbar.set` gains the items the modules now hand-draw: `search` (Maps, Places), `chips` (Calendar's and Places' filters, folding into a menu when narrow), and `title` (Calendar's period title next to its back and forward buttons). `host.ui.viewSwitch` always goes into the toolbar; its `element` option goes. The manifest gains `"content": "flush"` for a module whose content fills the slot edge to edge (Maps, Stream).

**2. Shared content: a markup contract first, builders where they pay.** Lean: cards, rows and forms keep the module's `<template>` markup but only with the shared classes and slots (`sdk-card-banded`, `sdk-row`, `sdk-form`), and module CSS may not touch them; this is the smallest step, since the markup already uses them. Tables get a builder (`host.ui.table({ columns, rows })`): only 6 sites, and a table is easy to draw wrong. The alternative, builders for everything (`host.ui.card(data)`), is cleaner for a buyer writing a module but means rewriting about 900 sites first; it can follow family by family if Thomas wants it.

**3. What stays the module's.** Domain content the system has no component for: the calendar grid, the map and its pins, the Planner's timeline, Budget's chart, the Stream's keyed view. The rule: a module may lay out its own domain content, inside the slot; it may not draw a band, set the slot's padding, or give a card, row, table, field, chip, button or tab its own look. A new domain part is an exception discussed with Thomas first, as the design system already says.

**4. Enforcement: `tools/check-module-layout.mjs`, in `npm run check`.** It reads every module's CSS, HTML and scripts and fails when:
- module CSS has a selector naming a shared class (`.sdk-*`, `.btn`, `.mod-*`, `.tb-*`) or a bare `header`, `h1`, `h2`, `table`, `input`, `select`, `textarea`;
- module CSS sets `padding`, `margin`, `height` or `min-height` on `html`, `body`, `.app` or the slot;
- module CSS sets `border`, `border-radius`, `box-shadow`, `background` or `padding` on a rule not in the domain allow-list (`tools/check-module-layout-allow.json`, each entry a module, a selector and Thomas's reason);
- module markup or a script draws a band (`.sdk-toolbar`, `.sdk-titlebar`, `.sdk-status*`, `.sdk-tab*`, a `<header>` outside a card's head) or a table.

`check-conformance` keeps measuring the bands and gains the content measures (card band, row height, the slot's padding) per module. `build-module.mjs` runs the same check, so a buyer's module fails the same way.

**5. Delete as it goes.** Each module's own band markup, its CSS and its `.app.narrow` band rules; `host.ui.viewSwitch`'s `element`; the "keep your own add there" and "draw the controls in the page" advice in the SDK comments and `api-module-sdk.md`; each module's restyling of shared classes. No old path stays. The check's list of not-yet-moved modules shrinks with each slice and is deleted when empty.

## Left to build, in order

Each slice is one fast build, bumps every module it changes, and leaves `npm run check` passing.

| # | Slice | Modules | Size | Who |
|---|---|---|---|---|
| 1 | Toolbar items `search`, `chips`, `title`; host bands in a destination's part and a module's own page; `"content": "flush"`; the check, with every module on the not-yet-moved list | none | M | experience-design (SDK), server-development (check, manifest) |
| 2 | Window anatomy: Calendar (its `.bar` and filters to the toolbar) and Maps (search to the toolbar, flush slot) | Calendar, Maps | M | experience-design |
| 3 to 9 | The same, one module a slice: To-do, Polls, Research, Places, Budget, the Planner, then Stream and Assistant together | one each | S (the Planner M) | experience-design |
| 10 | Rows: module CSS off `sdk-row`; check on for rows | all with rows | M | experience-design |
| 11 | Cards: the same | Research, Planner, Budget, Places | M | experience-design |
| 12 | Forms: the same; `viewSwitch`'s `element` deleted | all | M | experience-design |
| 13 | Tables: `host.ui.table`, Budget and Places onto it | Budget, Places | S | experience-design |

The SDK and the API document change with slices 1, 12 and 13 (content-manager writes `api-module-sdk.md` and each `CONTRACT.md` from the builders' reports). Dashboard widgets (`*-widget.*`) are not in these slices.

## Verify

Each slice: `npm run check` (the new check and `check-conformance` with Chromium), and screenshots at 1280 light and 390 dark of each changed module docked, floating, popped out, on its own page and as a destination's part. Nothing here needs a real LiveKit call; the Stream's keyed view in OBS does.

## Open questions

1. **Bands everywhere?** Recommendation: yes, the host draws the bands in a destination's part and a module's own page too, so no module ever has a reason to draw one. Widgets stay out for now.
2. **Markup contract or builders for content?** Recommendation: the markup contract for cards, rows and forms now, a builder for tables only; builders for the rest later if Thomas wants them.
3. **How strict is the domain allow-list?** Recommendation: each entry a selector with Thomas's reason, as `check-spacing-allow.json` does, and no property allowed at all on a shared class.
4. **One toolbar row or two?** Recommendation: one; filters are a `chips` item that folds into a menu when the row is narrow (Calendar has back, today, forward, title, switch and filters today).
5. **An uploaded module that breaks the rules?** Recommendation: `build-module.mjs` fails it; the server shows a warning on the Modules page but still installs it, until Thomas decides to refuse.
6. **Does the "+" stay a titlebar button for every module?** Recommendation: yes, as built (`plan-module-titlebar-add`); Calendar's "Add event" button goes into it.

Questions 1, 2 and 4 block slice 1; 3 blocks the check; 5 and 6 do not block.
