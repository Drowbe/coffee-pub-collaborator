# Unified Layout Plan

**Audience:** Thomas, who decides the model, the rules and the order; experience-design, which builds the SDK's drawing and each module's move; server-development, which builds the check and the manifest field; quality-assurance, which measures each move with `check-conformance`.

**Status:** approved by Thomas 2026-10-22. Slices 1 to 9 (the bands) are built, as the module frame (`createModuleFrame`, `95bd664` to `01862e9`; see the progress note below). Slices 10 to 13 (the content builders: lists, cards, tables, forms) are not built, and come after the real-time steps 1 to 6 of [plan-realtime-optional-livekit](plan-realtime-optional-livekit.md) (Thomas, 2026-10-26). From Thomas, the same day: a unified design system means layout most of all, not only colour and fonts. Modules share title bars, status bars, content containers, tab strips and toolbars, and what is inside them (cards, lists, tables, forms); "system" does not mean each builder figures it out their own way. Modules must compose from shared, host-owned components and must not be able to hand-draw the shared things.

## Progress

Built, and described in [architecture-module-window](../architecture/architecture-module-window.md) and [api-module-sdk](../api/api-module-sdk.md): every module window (canvas windows docked and floating, a module's own page and its popped-out window, a destination's page, the composite, and the built-in Chat and call bands) is drawn by `createModuleFrame`. `host.toolbar.set` has `search`, `chips` (shown as groups in one Filters menu with counts and **Clear filters**) and `title`; `host.header.set` actions have a placement (the bar or the menu); the standard actions are the host's; the SDK calls answer `true` everywhere except a dashboard widget; `"content": "flush"` is in the manifest. Bundled modules were mapped onto the frame: Budget, Calendar, Places, Polls, Research and To-do changed (their filters are Filters groups); the Planner, Maps, Stream and Assistant needed no change. `tools/check-module-layout.mjs` fails a module that styles an `mf-` class or draws a band, and `check-conformance` measures the frame.

Not built: `host.ui.list`, `host.ui.card`, `host.ui.table` and `host.ui.form` (slices 10 to 13), so modules still write their own card, row, table and form markup. Differences from this plan as written: the toolbar's `progress`, `slider` and `separator` items and the status item's `chip` were removed rather than kept; the filters are always one Filters button (the plan said they fold into a menu only when the row is narrow). The "What it is today" and "Left to build" sections below are the plan as approved, not the current state, for slices 1 to 9.

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

## Decisions

Thomas, 2026-10-22.

1. **Bands everywhere.** The host draws the bands wherever a module is drawn: a docked or floating window, popped out, a module's own page and a destination's part. Dashboard widgets come later and are not in these slices. Reason: then no module ever has a reason to draw a band.
2. **Builders for everything.** The host draws cards, rows and lists, forms and fields, and tables from data. The SDK gets declarative builders (`host.ui.card`, `host.ui.list`, `host.ui.form`, `host.ui.table`), each with a clear data shape (see the appendix), and modules do not write markup for them. This overrides the earlier lean toward a markup contract. Reason: only builders make it impossible to draw these things wrongly.
3. **One toolbar row.** The tab strip, the search and the filter chips all go in it. The filters fold into a menu when the row is narrow.
4. **A strict check.** Each exception in the allow-list is a selector with Thomas's reason. No property at all is allowed on a shared class. The counts only fall.
5. **An uploaded module that breaks the rules.** `build-module.mjs` fails it. The server warns on the Modules page but still installs it, until Thomas decides to refuse.
6. **The "+" stays a titlebar button** for every module, as built (`plan-module-titlebar-add`). Calendar's "Add event" button goes into it.

## The contract

**The window is the host's.** A module declares, the host draws: the title bar (manifest name and icon, `host.header.set`, `host.add.set`), one toolbar row (`host.toolbar.set`, with the tab strip as its `tabs` item), the status line (`host.status.set`) and the content slot with its padding. A module supplies only what goes in the slot. The same calls work in a sandboxed frame and in the page, since the host draws outside both. In a destination's part and on a module's own page the calls stop answering `false`.

- `host.toolbar.set` gains the items the modules now hand-draw: `search` (Maps, Places), `chips` (Calendar's and Places' filters; they fold into a menu when the row is narrow) and `title` (Calendar's period title next to its back and forward buttons).
- `host.ui.viewSwitch` always goes into the toolbar; its `element` option goes.
- The manifest gains `"content": "flush"` for a module whose content fills the slot edge to edge (Maps, Stream).

**Content is drawn by builders.** The host draws a card, a list, a form and a table from the data a module passes; the module supplies the data and the handlers, never the markup or the CSS. The builders return an element the module puts in its slot (or a handle to update it). Their shapes are in the appendix.

**What stays the module's.** Domain content the system has no component for: the calendar grid, the map and its pins, the Planner's timeline, Budget's chart, the Stream's keyed view. A module may lay out its own domain content inside the slot. It may not draw a band, set the slot's padding, or give a card, row, table, field, chip, button or tab its own look. A new domain part is an exception discussed with Thomas first.

**Enforcement: `tools/check-module-layout.mjs`, in `npm run check`.** It reads every module's CSS, HTML and scripts and fails when:

- module CSS has a selector naming a shared class (`.sdk-*`, `.btn`, `.mod-*`, `.tb-*`) or a bare `header`, `h1`, `h2`, `table`, `input`, `select`, `textarea`; no property is allowed on a shared class;
- module CSS sets `padding`, `margin`, `height` or `min-height` on `html`, `body`, `.app` or the slot;
- module CSS sets `border`, `border-radius`, `box-shadow`, `background` or `padding` on a rule not in the domain allow-list (`tools/check-module-layout-allow.json`, each entry a module, a selector and Thomas's reason);
- module markup or a script draws a band (`.sdk-toolbar`, `.sdk-titlebar`, `.sdk-status*`, `.sdk-tab*`, a `<header>` outside a card's head), or draws a card, row, form field or table by hand once its family has moved.

The counts of not-yet-moved markup sites and CSS lines are recorded per module and may only fall. `check-conformance` keeps measuring the bands and gains the content measures (card band, row height, the slot's padding) per module. `build-module.mjs` runs the same check, so an uploaded module fails the same way when built. The server only warns when it installs one.

**Delete as it goes.** Each module's own band markup, its CSS and its `.app.narrow` band rules; `host.ui.viewSwitch`'s `element`; the "keep your own add there" and "draw the controls in the page" advice in the SDK comments and `api-module-sdk.md`; every module's markup and CSS for a family once it is on that family's builder. No old path stays. The check's list of not-yet-moved modules shrinks with each slice and is deleted when empty.

## Left to build, in order

Each slice is one build, bumps every module it changes, and leaves `npm run check` passing.

| # | Slice | Modules | Size | Who |
|---|---|---|---|---|
| 1 | Toolbar items `search`, `chips`, `title`; host bands in a destination's part and a module's own page; `"content": "flush"`; the check, with every module on the not-yet-moved list; the warning on the Modules page | none | M | experience-design (SDK), server-development (check, manifest, warning) |
| 2 | Window anatomy: Calendar (its `.bar` and filters to the toolbar, "Add event" into the "+") and Maps (search to the toolbar, flush slot) | Calendar, Maps | M | experience-design |
| 3 to 9 | The same, one module a slice: To-do, Polls, Research, Places, Budget, the Planner, then Stream and Assistant together | one each | S (the Planner M) | experience-design |
| 10 | Lists and rows: `host.ui.list`; every module moves onto it and loses its row markup and CSS | all 9 with rows | L | experience-design |
| 11 | Cards: `host.ui.card`; the same | Planner, Research, Budget, Places, Polls, Stream | L | experience-design |
| 12 | Tables: `host.ui.table`; the same | Budget, Places, Planner | S | experience-design |
| 13 | Forms and fields: `host.ui.form`; the same; `viewSwitch`'s `element` is already gone | all 9 with forms | XL | experience-design |

**Sizes, honestly.** The audit counts markup the module writes: 143 row sites, 166 card sites, 6 table sites and 601 form sites (81 own CSS lines), so slice 13 is by far the largest; the Planner alone has 314 of the form sites and 118 of the card sites. Slices 10 and 11 each touch most modules and need behaviours such as selection, drag, inline edit and empty states in their data shapes, so each is large even though it is smaller than forms.

**Order for visible consistency fastest.** Build slices 10 to 13 in this order: lists first (every module has them, so Thomas sees the most change), then cards (the Planner and Research stand out most), then tables (six sites, a quick win), and forms last, because they are the biggest and the riskiest. Forms are built as 13a (the builder, with Polls and To-do, the smallest form users), 13b (Budget, Calendar, Places, Research, Maps, Stream) and 13c (the Planner, 314 sites, on its own). Each of 13a to 13c ends with `npm run check` passing.

**Transitional fallback.** If a family cannot be built in one slice, the markup contract is allowed for that family's remaining modules, and only as a stop on the way: the module keeps its `<template>` markup but uses only the shared classes and slots (`sdk-card-banded`, `sdk-row`, `sdk-form`), module CSS may not touch them, and the check counts those sites so they can only fall. The likely candidates, in order: forms for the Planner (13c), forms for Places and Research, cards for the Planner. Each use is listed in the slice's report and gets a follow-up slice; the contract is deleted with the last one.

The SDK and the API document change with slices 1 and 10 to 13 (content-manager writes `api-module-sdk.md` and each `CONTRACT.md` from the builders' reports). Dashboard widgets (`*-widget.*`) are not in these slices.

## Verify

Each slice: `npm run check` (the new check and `check-conformance` with Chromium), and screenshots at 1280 light and 390 dark of each changed module docked, floating, popped out, on its own page and as a destination's part. The builders also get a small page that draws every builder with sample data, checked by `check-conformance`, so a builder is measured once and not per module. Nothing here needs a real LiveKit call; the Stream's keyed view in OBS does.

## What is not decided

- Whether the server should refuse an uploaded module that breaks the rules, instead of warning (Thomas decides later; does not block).
- The exact data shapes in the appendix are a sketch. Experience-design settles them in slices 10 to 13 and reports any change so the plan and the API document follow. Slice 10 is the first to block on them.
- Dashboard widgets and the layout rules for them.

## Appendix: builder data shapes (sketch)

Every builder takes plain data and handlers, and returns an element (or, where it updates, `{ el, update(data), destroy() }`). Strings are plain text unless a field says otherwise; the host escapes them. No builder accepts markup, a class name or a style.

**`host.ui.list(options)`**

```
{
  items: [ { id, title, subtitle?, meta?, icon?, badge?, checked?, selected?, disabled?,
             actions?: [ { id, label, icon?, danger? } ] } ],
  selectable?: "none" | "one" | "many",
  checkable?: boolean,
  sortable?: boolean,
  empty?: { text, action?: { label, onClick } },
  onSelect(id), onCheck(id, checked), onAction(id, actionId), onReorder(ids)
}
```

**`host.ui.card(options)`**

```
{
  title, subtitle?, icon?, image?: { src, alt }, band?: "accent" | "success" | "warn" | "danger",
  meta?: [ { label, value } ],
  body?: string,
  badges?: [ { text, tone? } ],
  actions?: [ { id, label, icon?, danger? } ],
  onOpen(), onAction(actionId)
}
```

For a set of cards, `host.ui.cards({ cards: [card, ...], empty? })` lays them out in the shared grid.

**`host.ui.table(options)`**

```
{
  columns: [ { key, label, align?: "start" | "end", width?, sortable?, type?: "text" | "number" | "money" | "date" } ],
  rows: [ { id, cells: { [key]: value }, actions?: [ { id, label } ] } ],
  footer?: { [key]: value },
  sort?: { key, dir },
  empty?: { text },
  onSort(key, dir), onRowClick(id), onAction(id, actionId)
}
```

**`host.ui.form(options)`**

```
{
  title?, submitLabel?, cancelLabel?,
  fields: [ { name, label, type: "text" | "longtext" | "number" | "money" | "date" | "time" | "select" |
              "checkbox" | "switch" | "radio" | "color" | "file",
              value?, placeholder?, help?, required?, disabled?,
              options?: [ { value, label } ],
              min?, max?, step?, maxLength?,
              showIf?: { name, equals } } ],
  groups?: [ { label, fields: [ name, ... ] } ],
  onChange(values, changedName), onSubmit(values), onCancel(),
  validate?(values) -> { [name]: message }
}
```

`host.ui.form` returns a handle with `values()`, `set(name, value)`, `setErrors({ name: message })` and `focus(name)`. A single field outside a form (a search box in a dialog, say) is `host.ui.field(fieldOptions)`.
