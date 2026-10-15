# Form Standard Plan

**Audience:** Thomas, who decides the standard and the order; experience-design, which builds the SDK's form pieces and moves every form onto them; server-development, which builds the two checks; quality-assurance, which measures the result; content-manager, which writes the design and SDK pages once the standard is built.

**Status:** proposed 2026-10-15, not approved. From Thomas's feedback of 2026-10-14: "A lot of our edit forms are sloppy and have a lot of drift in fields." With two screenshots: the Phases sheet (mostly fine) and the Planner's Flight form, whose departure row (**Departure day** with a date field, **Pick from the list** and **Unscheduled**, then **Departure time**, then **Flight time** in hours and minutes) and arrival row (**Arrival day** as a list, then **Arrival time**) are visibly out of line: fields of different heights, labels at different heights, a list cut off at its edge, the phase chip ("Trip") hanging under the date field, mixed widths, and different controls for the same job in one form. Earlier complaints this plan also answers: two controls for one job, lists of 20 rows, fields that look different from module to module, borders on selected states, and radii written as numbers.

## What it is today

There is no form standard. Each piece below was right when it was written; together they drift.

- **The SDK gives fields a colour, not a size.** `public/sdk/host.css:242-259` styles `input`, `select` and `textarea` with `padding: 6px 8px`, the tokens and a focus ring, and no height. An input is therefore its font's line plus 14 px, about 31 px, and a `select` is a pixel or two off it in Chrome. The kind picker beside them is 38 px (`--bar-control-h, 38px`, `host.css:496-521`), and Places' icon and colour buttons are 38 px too (`places.css:159`). Nothing ties these together.
- **The date picker's own pieces are not in `host.css`.** `host.ui.datePicker` injects its look from a string in `public/sdk/host.js:388-404` (`UI_CSS`): a 30 px button beside the field, and the weekday in accent text on its own line under it (`.tv-dow-hint`). Its "today" in the month is a border (`.sdk-dp-day.today { border-color: var(--accent) }`), which the selected-states rule forbids and `check-nav` does not see, because it reads stylesheets only.
- **Seven copies of the form rules.** The Planner (`travel.css:125-156`, `travel-lib-editor.css`), Places (`places.css:64-73`), Calendar (`calendar.css:78-84`), To-do (`todo.css:56-80`), Polls (`polls.css:58-68`), Research (`research.css:119-154`) and Budget (`budget.css:127-147`) each restate `.editor-card`, its labels, its rows, its tick boxes and its button row, each slightly differently (below).
- **The app's own pages have four more systems.** Manage, the profile and the host console use `.panel` and `.fields` (`style.css:1843-1880`, `3070-3085`): labels in capitals with letter spacing, text fields at `8px 10px` (about 35 px). `.fields select` is in that rule and `.panel select` is not, so a list outside a `.fields` grid keeps the base `6px 8px` and sits lower than a text field beside it. Set up has `.setup-field` (`style.css:10608-10636`) with the same padding, an outline focus instead of the ring, and the section heading standing in for the label (the real label is visually hidden). The Phases sheet has `.phase-date` at 150 px wide and 34 px tall (`style.css:10224-10250`). The AI settings have a fifth set (`.ai-fields`, `style.css:8456`).
- **What the editor window already holds.** A module's Add or Edit form opens in `host.ui.editor` ([plan-editor-window](plan-editor-window.md); [design-theme](../designsystem/design-theme.md), "The editor window"): 560 px, or 880 px for the Planner, a full-screen sheet at 640 px and below, with a sticky button row (`.sdk-editor-actions`). That plan's rule, "a module's form inside it sets only the layout of its fields, never a box, a width or a background of its own", is where this plan starts.

### Why the Planner's Flight form is out of line

Read from the code (`travel.html:186-196`, `travel-lib-editor.css:56-81`, `travel.css:139-156`); the screenshot shows the result.

1. The departure row is a flex row aligned to the bottom (`.timing`, `align-items: flex-end`). The day group's bottom is not its date field but the phase chip under it (`.when-phase`, about 18 px), so the date field sits higher than the time field beside it, and the chip hangs under it.
2. **How long** carries its **Length | End time** switch on its label line (`.dur-head`, a 24 px switch in a bordered box), so that label line is about twice as tall as the others and the labels start at different heights.
3. The day group holds a date field and two text buttons (**Pick from the list**, **Unscheduled**) that wrap inside the group when it is narrow, so the group grows a second line.
4. Heights differ: the row sets `min-height: 30px` on its fields, the two buttons are 30 px with 12 px text, the hour and minute boxes are the base height, and the kind picker above is 38 px.
5. The arrival row is a different layout (`.editor-row`, a grid of `minmax(130px, 1fr)` columns), so its columns do not line up with the departure row above it. Its day is a `select` of nine choices worded like "Fri, Oct 9 (the next day)" (`travel.js:1962`, `ARRIVAL_OFFSETS` in `travel-lib.js:84`), wider than its column, so the text is cut.
6. The same job has different controls in one form: the departure day is a date field with a list button and a no-day button, the arrival day is a `select`, the flight lookup's **Day it leaves** is a bare date field, and the length is hours and minutes or an end time.
7. None of the Planner's date fields use `host.ui.datePicker`, while Calendar, To-do, Polls, Budget and the Planner's own day dialog do.

## Decisions

Only what Thomas has said. Everything else in this plan is a proposal until he decides it.

- **The feedback** (Thomas, 2026-10-14): "A lot of our edit forms are sloppy and have a lot of drift in fields."
- **Selected states are fills, never borders** (Thomas, 2026-10-14: "I found ANOTHER button border. Stop adding them."), already a rule in [design-theme](../designsystem/design-theme.md), "Selected states".
- **Corners are tokens**, already a rule ([design-theme](../designsystem/design-theme.md), "Corner radii", `tools/check-radius.mjs`).
- **A form in the editor window sets only the layout of its fields** ([plan-editor-window](plan-editor-window.md), approved 2026-10-04).

## (a) The audit

Every form, and its drift. "Height" is read from the stylesheets, not measured; the live check in step 2 measures it.

### Form by form

| Form | Where | Drift |
|---|---|---|
| Planner, an object (every kind) | `modules/travel/src/travel.html:179-243`; `travel.css:125-156`; `travel-lib-editor.css` | Four row layouts in one form: `.editor-row` (grid, 130 px columns), `.timing` (flex, bottom-aligned), `.pairing` (From, arrow, To), `.lookup-row` (grid). Heights 30, 31, 34 (`.mode`), 24 (`.lm`) and 38 (kind picker). Section titles `.fieldgroup-title` at 10 px in capitals with a line above. "Whose is it" is a `.hint` used as a label. The look-up box is a tinted box with a tinted border and a large radius inside the window. Selected states are accent fills with `var(--bg)` text, not `--on-accent` or `--selected-bg` (`.mode.on`, `.lm.on`, `.when-pick .btn.on`). The length switch's inner radius (`--radius-medium`) is larger than its box's (`--radius-small`). Round trip is a checkbox with `role="switch"`. Money fields are `type="number"` with no currency shown. Phone: 16 px text only on the day field and the look-up, so other fields zoom on iOS. |
| Planner, the dates | `travel.html:165-178` | First day, Last day and Currency share one `.editor-row`; the two date fields have no `datePicker`; the currency hint is a separate line. |
| Planner, the day dialog, Move to a date, Add days | `travel.html:245-254`, `68-71`, `133` | The day dialog's date has `datePicker`; the Move-to pop-up's date does not; the Add days form puts its field inside a sentence ("Add [1] days"). `role="switch"` on a checkbox again. |
| Places, a place | `modules/places/src/places.html:37-84`; `places.css:64-73`, `143-201` | Labels gap 3 px; title 17 px. Type, icon and colour on one row of 38 px pieces drawn with an inset shadow instead of a border. **Visit** is round pills with an accent fill (`.status-btn.on`). **Shows in** is a `fieldset` whose legend is a third heading style. "Whose is it" a `.hint` as label. Position's note sits inside its label. |
| Calendar, an event | `modules/calendar/src/calendar.html:27-71`; `calendar.css:78-84`, `106-115`, `143` | Labels gap 4 px. Rows are flex, 110 px basis, not bottom-aligned. **Starts** and **at**, **Ends (optional)** and **at**: a day and a time as two fields with a one-word label. "(optional)" written into labels. No phone rule at all: 14 px fields zoom on iOS, tick boxes are the browser's size. Save is `type="button"`. |
| To-do, a task | `modules/todo/src/todo.html:29-57`; `todo.css:39-80` | Rows flex, 140 px basis, bottom-aligned. The reminder is a tick box in a row beside a date field. The link search's results are bordered boxes with a hover border. No phone rule. Save is `type="button"`. |
| Polls, a poll | `modules/polls/src/polls.html:26-45`; `polls.css:58-68` | **Closes (optional)** is one `datetime-local` field, the only one in the product. Options are a list with its own row style. Four tick boxes in a column. No phone rule. Save is "Start poll", `type="button"`. |
| Research, an object | `modules/research/src/research.html:43-73`; `research.css:119-154`, `184` | Rows grid with 160 px columns (the others use 130). **Type** is a row of 58 px icon tiles with their own selected look (16% accent mix). **Place** is a field for pasted coordinates, where Places calls the same thing **Position**. Hints inside labels. Phone rule covers inputs and text areas, not lists. The danger button says **Remove**. |
| Budget, a cost | `modules/budget/src/budget.html:76-107`; `budget.css:127-147` | Amounts are text fields with the currency in the label ("Planned USD"). **Paid by** a `select` of people, **Shared by** tick boxes with a note under them. The error has `role="alert"`; no other form's does. |
| Budget, the target | `budget.html:110-122` | Amount and Currency on two full-width rows, where Set up puts the same pair side by side. |
| Set up panel | `public/space-setup.js:267-445`; `style.css:10595-10680`, `11069`, `11147` | Each section's heading is the label and the real label is hidden. Fields `8px 10px`, focus is an outline, not the ring. The budget is a number field and a currency list side by side. Phase rows reuse the Phases sheet's 150 px date fields. Sticky action bar (`actionBar()`), right. |
| Phases sheet | `public/phase-sheet.js:157-250`; `style.css:9763-10415` | Date fields 34 px (44 on a phone), no `datePicker`; **Start** and **End** words shown only on a phone; per-row **Skip** and **Add dates** small buttons; a problem line per row. Closest to right already. |
| Manage | `public/admin.html`, `public/admin.js`; `style.css:1843-1880`, `3070-3085`, `3180` | Labels in capitals; `.fields` grid at 200 px columns; `.row` flex rows; `.panel select` shorter than `.panel input`; switches (`input.switch`) and tick boxes mixed; a Save button per panel, not sticky. |
| Profile, host console, module settings, AI settings | `public/profile.html`, `public/host.html`, `public/host-templates.js`, `public/module-settings.js`, `public/ai-form.js` | The Manage system again, plus the template editor's bordered `fieldset` (`style.css:8654`), `.field-label` used as a heading, and `.ai-fields` restating the field look. |

### One job, many controls

| Job | What the forms use today |
|---|---|
| A day | Date field with **Pick from the list** and **Unscheduled** or **Not set** (Planner When, Return day, Check out); a `select` of nine offsets (Planner Arrival day); a bare date field (Planner look-up, the dates, Move to a date; Research; Phases; Set up); a date field with `datePicker` (Calendar, To-do, Budget, Polls options, the day dialog). |
| A day and a time | Two fields, the second labelled "at" (Calendar); two fields with full labels (Planner); one `datetime-local` (Polls). |
| How long | Hours and minutes with a **Length | End time** switch (Planner stops and journeys); hours and minutes with no switch (Planner, getting to the stop); an end day and end time (Calendar); a fixed "at 9:00" in words (To-do). |
| An arrival or an end | Arrival day and time, plus the length, plus the "Arrives" line worked out under them (Planner journeys); Check out day and time (Planner stays); Ends and at (Calendar). |
| A person | A `select` with "Nobody yet" first (Planner and Budget **Paid by**); tick boxes (Planner and Places **Whose is it**, Budget **Shared by**). |
| Money | `type="number"`, step 0.01, no currency (Planner **Estimated**, **Actual**); text with `inputmode="decimal"` and the currency in the label (Budget); a number field and a currency list side by side (Set up) or on two rows (Budget target); a currency list alone (Planner dates, Manage). |
| A place | Address (Planner stays, Planner stops under two ids, Places); Position, pasted coordinates, with a pick-on-map button (Places); Place, pasted coordinates (Research); From and To text and airport codes (Planner journeys). |
| One of a few | Icon buttons with an accent fill (Planner **Getting to this stop**); a tiny two-way switch (Planner length); round pills (Places **Visit**); icon tiles (Research **Type**); `select` (Calendar **Repeats**, **Remind people**; Planner **Class**). |
| What kind | `host.ui.kindPicker` (Planner, Places); icon tiles (Research). |
| Yes or no | Tick box with words (most); tick box with `role="switch"` (Planner round trip, day dialog); a toggle button with `aria-pressed` (Planner **Unscheduled**); switches (Manage). |
| Long text | `textarea`, 3 rows (most), 4 or 6 with a format bar (Research). |

### Drift shared by every form

- **Labels:** 12 px dim, sentence case, 3 px gap (Planner, Places, Research, Budget) or 4 px (Calendar, To-do, Polls); 12 px in capitals with letter spacing (Manage, profile, host console); hidden (Set up). A group's label is sometimes a `span`, sometimes a `.hint` `div`, sometimes a `legend`.
- **Section headings:** five looks: `.fieldgroup-title` 10 px capitals with a line, `legend` 12 px, `.setup-heading` 12 px semibold capitals, `.field-label` 12 px capitals, `.sdk-kind-group-title` 10 px capitals.
- **Rows:** grid at 130, 160 or 200 px columns, flex at 110 or 140 px, aligned to the bottom, the centre or not at all. No two modules agree, and a row never shares its columns with the row above it.
- **The window's heading:** 17 px (Places, Research, Budget) or the browser's `h3` (the others), padded 32 or 36 px on the right.
- **Button row:** `.editor-buttons` or `.row.buttons`; Save `type="submit"` (Planner, Places, Research, Budget) or `type="button"` (Calendar, To-do, Polls).
- **Errors:** one `p.error` above the buttons in every form; nothing points at the field that is wrong (no `aria-invalid` anywhere in the product); `role="alert"` only in Budget.
- **Required:** the `required` attribute on a title, no mark anywhere; "(optional)" written into some labels and placeholders (Calendar, Polls, Places, Research); Budget turns validation off (`novalidate`).
- **Hints:** a line after the field, a line inside the label, a placeholder standing in for a hint ("Not yet", "No target", "words, separated by commas"), or the weekday line under a date field in accent text.
- **Phone:** 16 px text in Places, Research (not lists) and Budget, partly in the Planner, not at all in Calendar, To-do and Polls. 44 px on the kind picker when open, Places' type row and **Visit**, the Phases sheet; every other field stays about 31 px.
- **Tick boxes:** 16 px in the Planner, Places, Research and Budget; the browser's size elsewhere.

## (b) The standard

One set of tokens and classes, in `public/sdk/host.css` between `form:start` and `form:end`, and word for word in `public/style.css` (as the action button and the view switch are), so a module and an app page draw the same field. A form uses the classes and writes no field CSS of its own.

### Tokens

Layout tokens, not colours; no theme sets them. Defined on `:root` in both files.

| Token | Value | Use |
|---|---|---|
| `--field-h` | 38 px; 44 px on a phone | the height of every one-line control: text, number, date, time, `select`, the kind picker, a button inside a field, a choice |
| `--field-pad-x` | 10 px | the inner side padding of a field |
| `--field-font` | 14 px; 16 px on a phone | the text in a field (16 px stops iOS zooming) |
| `--field-gap` | 12 px | between fields across a row and between rows |
| `--label-size` | 12 px | a field's label, `--text-dim`, weight 500, sentence case, one line of 16 px |
| `--label-gap` | 4 px | from a label to its field |
| `--section-gap` | 20 px | above a section, which starts with a 1 px `--border` line |

`--field-h` equals `--bar-control-h` (38 px) on desktop, so a field, the kind picker and the action button are the same height. The kind picker reads `--field-h` instead of its fallback. On a phone (`@media (max-width: 640px)`, and a lifted frame marked `data-lift="phone"`) `--field-h` is 44 px and `--field-font` 16 px.

### The classes

- **`.sdk-form`** on the `<form>`: a column of rows with `--field-gap` between them, `container-type: inline-size` so its columns follow its own width, not the page's. It styles every control inside it: height `--field-h`, `--field-pad-x`, `--field-font`, `--bg-input`, a 1 px `--border`, `--radius-small`, the accent ring on focus, 60% opacity when disabled. Tick boxes are 16 px. A `textarea` is at least three lines and grows with its `rows`.
- **`.sdk-field`**, one field: `<label class="sdk-field"><span class="sdk-label">Title</span><input ...><span class="sdk-hint"></span></label>`. A field of more than one control (a day with its buttons, hours and minutes, an amount and its currency) is `<div class="sdk-field" role="group" aria-labelledby="...">` with a `span.sdk-label` holding the id. The hint slot holds a hint, the phase chip, the weekday, or the field's error (`.sdk-error`).
- **`.sdk-row`**, fields side by side: a grid of `--cols` equal columns, where each `.sdk-field` spans three grid lines (label, control, hint) as a subgrid. So in one row every label starts at the same height, every control sits on the same line and has the same height, and every hint starts at the same height, however long one label or hint is. A field that does not fit moves whole to the next line of the row.
- **Field sizes**, a class on the field: `.sdk-s`, `.sdk-m`, `.sdk-l`, `.sdk-full` (the default outside a row).

  | Size | 880 px window (6 columns) | 560 px window (4 columns) | Phone sheet (2 columns) | For |
  |---|---|---|---|---|
  | `s` | 1 column, about 131 px | 1, about 123 px | 1, about 177 px at 390 px | a time, a number, a code, a seat |
  | `m` | 2 columns, about 274 px | 2, about 258 px | 2, the whole width | a day, a duration, a short `select`, money |
  | `l` | 3 columns | 3 | 2 | a name, an address, a person list |
  | `full` | 6 | 4 | 2 | a title, notes, anything long |

  The column count comes from a container query on `.sdk-form`: 6 columns from 760 px of form width, 4 from 440 px, 2 below. The 880 px window's form is 848 px wide, the 560 px window's 528 px, the phone sheet's the screen less 24 px; Set up, the Phases sheet and Manage get whatever their panel gives them.
- **`.sdk-group`**, the line inside a composite field: controls and buttons in one row at `--field-h`, never wrapping inside the field. **`.sdk-unit`** is a word after a control in that line ("h", "min", "USD"), dim. **`.sdk-field-btn`** is a square `--field-h` icon button in that line (the calendar, the list, pick on the map), Secondary.
- **`.sdk-pair`**: From, an arrow, To, the arrow in its own narrow column centred on the control line.
- **`.sdk-section`**: `<fieldset class="sdk-section"><legend class="sdk-section-title">Booking</legend>...</fieldset>`; the title 11 px, bold, in capitals with 0.06 em spacing, `--text-dim`, after a `--border` line and `--section-gap`. One heading style for every form; the old five go.
- **`.sdk-checks`**: tick boxes in a wrapping list, each `label.sdk-check` (the box, then its words) at least 32 px tall, 44 px on a phone.
- **`.sdk-choice`**: one of a few, a segmented row at `--field-h`, words or icons, the chosen one a fill (see the open question on which fill). It is the view switch's shape at field height, not a new look.
- **`.sdk-people`**: the people of the space as chips (initial and name), a tick box each for "whose is it" and "shared by", a radio each for "paid by", with "Nobody yet" as the radio's first chip.
- **`.sdk-form-error`**: one line above the action row for a refusal that is not one field's (the server's 409, a network failure), `role="alert"`, `--danger-text`.
- **The action row** stays `.sdk-editor-actions` (the window's sticky row) and `actionBar()` on the app's pages: Save first (Primary, `type="submit"`), Cancel (Secondary, through `editor.cancel()`), a spacer, Delete last (danger). One class name for the row, `.sdk-editor-actions`; `.editor-buttons` and `.row.buttons` go.

### Alignment rules

1. A label is always above its field, at every width.
2. In a row, every field's control is `--field-h` tall and on one line; labels share a top; hints share a top.
3. A row wraps whole fields. A composite field (a day and its buttons, hours and minutes) never wraps inside itself.
4. Anything under a field (a hint, a chip, the weekday, an error) is in its hint slot, never in the control line and never between the label and the control.
5. Fields line up with the rows above and below, because every row of a form has the same columns.
6. Nothing is cut: a control fits its column, or the field takes the next size up.

### One control per job

| Job | The control | Replaces |
|---|---|---|
| A day | `<input type="date">` with `host.ui.datePicker`: the calendar as a `.sdk-field-btn` in the line, the weekday in the hint slot. Where a module has named days or places to choose from (the Planner's days by phase and the spots between days), the same field takes a list button (see the SDK below). "No day" is the picker's **Clear** and the list's first entry, never a third button. | Planner's two text buttons and the arrival `select`; every bare date field |
| A day and a time | Two fields: the day (`m`) and the time (`s`), each with its own label. Never `datetime-local`. | Polls **Closes** |
| A time | `<input type="time">`, `s` | |
| When, start and end | **`.sdk-when`**, one pattern every module reuses: a Starts pair (day, time) and an Ends pair (day, time) as two groups in one row (6 columns: both on one line; 4 columns: one line each). A module hides the end day when its objects stay within one day. The length it comes to is shown in the Ends hint ("2 h 30 min"). | Calendar's Starts/at and Ends/at; Planner's When, Time, How long, Arrival day and time, Check out |
| How long | **`.sdk-duration`**, `m`: hours and minutes, two boxes with "h" and "min" as units, in one line. Used where a length is its own fact, not a start and an end: a journey's travel time (its arrival is in another time zone), getting to the stop, a marker's length. | the Length/End time switch, which goes (see open question 2) |
| A person | `.sdk-people`, chips with radios | **Paid by** lists |
| People | `.sdk-people`, chips with tick boxes | **Whose is it**, **Shared by** lists |
| Money | **`.sdk-money`**, `m`: the amount as text with `inputmode="decimal"`, the currency code as its unit in the line; where the form chooses the currency, `host.ui.currencySelect` beside it in the same group. | number fields, currency in the label, amount and currency on separate rows |
| A place | **Address** (`l`, text) and, where a module keeps a position, **Position** (`m`, text taking coordinates or a map link, with the pick-on-map `.sdk-field-btn` where a map is open). The same two words in every module. | Research's **Place** |
| One of two to five | `.sdk-choice` | icon buttons, pills, tiles, the length switch |
| A kind, or six or more named choices | `host.ui.kindPicker` | Research's **Type** tiles |
| A short fixed list (up to eight words) | `<select>` | |
| Yes or no | `label.sdk-check` in a `.sdk-checks` | `role="switch"` in a form, the **Unscheduled** toggle button; a switch stays only where a setting takes effect at once (Manage) |
| Long text | `textarea`, `full` | |

A `select` never lists more than eight fixed choices; a longer or growing list is the kind picker, the date field or people chips. `host.ui.currencySelect` is the one exception: it is grouped, Common first, and a person types to jump.

### Errors, required fields and hints

- A field's error is in its hint slot (`.sdk-error`, `--danger-text`), the control gets `aria-invalid="true"` and `aria-describedby` pointing at it, and focus goes to the first wrong field. A refusal that is not one field's goes in `.sdk-form-error`.
- Required fields: see open question 4. The proposal: no mark, since nearly every field is optional; the one required field (a title, a question) says what it needs in its own error ("Give it a title"); "(optional)" goes from every label.
- A hint is words in the hint slot, never only a placeholder. A placeholder may show an example ("WN 2483").

### Sizes at the three widths

| | 880 px window | 560 px window | Phone sheet (390 px screen) |
|---|---|---|---|
| Form width | 848 px | 528 px | 366 px |
| Columns | 6 | 4 | 2 |
| Field height | 38 px | 38 px | 44 px |
| Field text | 14 px | 14 px | 16 px |
| The Flight form's departure row | Departure day (`m`), Departure time (`s`), Flight time (`m`): one line, five of six columns | Departure day and time on one line, Flight time under the day | Day, then time and flight time side by side |
| Its arrival row | Arrival day (`m`) and time (`s`), the same columns as the row above | the same | the same as the departure row |

## (c) The SDK pieces: build or reuse

Two ways to give modules these pieces.

- **Markup and CSS only (the lean).** The classes above, documented markup for each pattern, and the helpers that exist already: `host.ui.datePicker`, `host.ui.kindPicker`, `host.ui.currencySelect`, `host.menu.show`, `host.people()`. The small scripts a composite needs (hours and minutes kept tidy, the end it comes to) stay in the module that has them; the Planner already has them. Costs: a module writes the markup by hand, so the static check has to hold the markup to the pattern. Rules out nothing; a helper can come later if a third module writes the same script.
- **New helpers** (`host.ui.dateField`, `timeField`, `durationField`, `whenField`, `peopleField`, `moneyField`): each draws its markup and owns its value. Costs: six new APIs to document and keep, every form rewritten to call them, and a module's ids and `name`s (which its save code and its `isDirty` snapshot read) moved behind the helpers. More than the drift needs.

The lean: markup and CSS, with three small changes to what exists.

1. **`host.ui.datePicker`** draws its button as a `.sdk-field-btn` at `--field-h` inside a `.sdk-group`, and its weekday in the field's hint slot as a `.sdk-hint`, when the field is in a `.sdk-form` (the old look stays for forms not yet moved, so nothing changes under them in the meantime). It gains one option, `list: { label, items }` (`items` a function giving `host.menu.show` entries), which adds a second `.sdk-field-btn` that opens that menu under the field. The Planner's **Pick from the list** becomes this. Its rules move from the `UI_CSS` string in `host.js` into `host.css`'s form block, where `check-nav` reads them, and "today" in the month becomes a fill.
2. **`host.ui.kindPicker`** reads `--field-h` (38 px now, so no visible change on desktop).
3. **The form block** in `host.css` and `style.css`, word for word, held equal by the check.

No other new SDK call.

### The Planner, first

The Planner's forms move first because they have every pattern and the worst drift:

- **The object form** (`tpl-editor2`), every kind: the journeys (flight, train, ferry, bus, car, taxi, rideshare, shuttle), the stay, the stops (restaurant, cafe, bar, sight, museum, attraction, tour, show), the note, and the markers in a day and between days.
  - **When:** `.sdk-when`. A journey: Departure day and time, and Arrival day and time, the arrival day a date field (with the list, defaulting to the departure day as it does now), plus **Flight time** or **Travel time** as `.sdk-duration`. A stay: Check in and Check out. A stop or a marker: Starts and Ends, with the end day hidden. The phase chip goes into the day's hint slot. **Unscheduled** and **Not set** go into the list and the picker's Clear.
  - **Journey:** `.sdk-row` and `.sdk-pair` for company and number, the airports, From and To, Pick up and Drop off; terminal, gate, platform, coach and seat as `s`; **Class** stays a `select`.
  - **Look up a flight:** a plain `.sdk-section` with a row (number `m`, day `m`, **Find** a Secondary button aligned to the control line), its tinted box gone.
  - **Round trip:** a tick box; the return leg a `.sdk-section` built the same way as the outbound.
  - **Booking:** Reference (`m`), Estimated and Actual as `.sdk-money` with the plan's currency as the unit, **Paid by** as people chips.
  - **Getting to this stop:** the six ways as an icon-only `.sdk-choice`, and its time as `.sdk-duration`.
  - **Whose is it:** people chips, with a real label.
- **The dates** (`tpl-editor-trip`), **the day dialog** (`tpl-day-dialog`), **Move to a date** (`#date-pop`) and **Add days** (`tpl-dayedge`).
- Every element id and `name` stays, so `travel.js`'s save code, `isDirty` snapshot and `[data-types]` logic keep working; the wrappers and classes change. Stored data does not change. The rules in `travel.css:125-156` and `travel-lib-editor.css` that drew fields go; what is left there is layout that is the Planner's own (which fields show for which kind).

## (d) The order

Each step is a try build: one builder, one pass, its own checks, pushed at once, and a patch bump of any module it changes. The documentation is written once Thomas calls the work done (step 12).

| Step | What | Who | Version |
|---|---|---|---|
| 1 | The form block in `host.css` and `style.css`; the three SDK changes; `tools/check-forms.mjs` (static) with every module still on its "not yet" list, so it passes on today's code | experience-design, then server-development for the check | none (the SDK has no version) |
| 2 | `tools/check-forms-live.mjs` (measured) and its fixtures | server-development | none |
| 3 | **The Planner pilot**: every form above; the Planner comes off the "not yet" list | experience-design | Planner, next patch |
| | **Thomas looks at the pilot** in light and dark, at the three widths, before the rest move | Thomas | |
| 4 | Places | experience-design | Places, next patch |
| 5 | Calendar | experience-design | Calendar, next patch |
| 6 | To-do | experience-design | To-do, next patch |
| 7 | Polls | experience-design | Polls, next patch |
| 8 | Research (with **Type** as a kind picker) | experience-design | Research, next patch |
| 9 | Budget (the cost and the target) | experience-design | Budget, next patch |
| 10 | Set up panel | experience-design | none |
| 11 | Phases sheet | experience-design | none |
| 12 | Manage, the profile, the host console, module settings and the AI settings, if they join (open question 5); then the "not yet" list is empty and the old classes are gone; content-manager writes "Forms" in the design and SDK pages, the modules' `CONTRACT.md` and the CHANGELOG | experience-design, content-manager | none |

Steps 4 to 9 do not depend on each other and can be built in any order after the pilot. Step 10 and 11 share the phase rows (Set up uses the sheet's date fields), so they go in that order.

## (e) The checks

### `tools/check-forms.mjs`, in `npm run check`

A rule scanner like `check-radius` and `check-nav`. It reads every bundled module's `src/*.html` and `src/*.css`, `public/style.css`, `public/sdk/host.css` and the form markup in `public/space-setup.js` and `public/phase-sheet.js`. It fails when:

1. The form block in `host.css` and `style.css` differs, or either lacks a form token.
2. In a form that has moved (a `form.sdk-form`, or any form in a module not on the "not yet" list):
   - a visible `input`, `select` or `textarea` is not inside a `.sdk-field` or a `.sdk-check` (hidden inputs and the SDK's own pieces excepted);
   - two fields sit side by side outside a `.sdk-row` (a `.sdk-field` whose parent is not `.sdk-form`, `.sdk-section`, `.sdk-row` or a composite);
   - an old class is left: `.editor-card`, `.editor-row`, `.editor-buttons`, `.row.buttons`, `.timing`, `.when-pick`, `.hm`, `.pairing`, `.fieldgroup`, `.fieldgroup-title`, `.setup-field`, `.field-label` used as a heading;
   - a `select` lists more than eight fixed options;
   - `datetime-local` or a checkbox with `role="switch"` is used.
3. A module's stylesheet has a rule whose selector reaches into a form (it names `.sdk-form`, a `.sdk-` form class, `input`, `select`, `textarea` or `label`) and declares anything but `display`, `order`, `visibility` or `grid-column`. Heights, padding, borders, backgrounds, fonts, radii, shadows and outlines are the SDK's. An allow-list (`tools/check-forms-allow.json`) holds each exception with its reason, and Thomas decides each one, as with the radius and selected-state checks.
4. The SDK's date-picker rules are still in `host.js` instead of `host.css`.

The "not yet" list in the check names the modules and pages still to move; each step removes its own, so the check bites on a form the moment it has moved and drift cannot return to it. Step 12 deletes the list.

### `tools/check-forms-live.mjs`, measured in a browser

Static rules cannot see a label two pixels low. This check opens every form in headless Chromium at the three widths (an 880 px and a 560 px window on a 1280 by 900 screen, and a 390 by 844 phone) and measures:

1. Every one-line control in a `.sdk-field` is `--field-h` tall (38 or 44 px, within half a pixel).
2. In every row, fields on one line have the same label top, control top and control height.
3. Nothing overflows: no control past its field's edge, no horizontal scroll in the window, and no `select` whose longest option is wider than its box (the cut-off list).
4. Every date field is a date picker's (inside `.sdk-datefield`).
5. On a phone every field's text is at least 16 px and every tick row at least 44 px.

**The module forms** come from fixtures, with no server: the check builds a page from the module's own HTML (the dialog or template), `host.css` and the module's stylesheet, opens the dialog, and for the Planner and Research shows each kind in turn (`.on-type`, `data-kind`). Lists the script would fill are filled with the longest choice the module can produce (named in the fixture). **The app's forms** (Set up, the Phases sheet, Manage) are measured on a throwaway local server (`PORT=`, `DATA_DIR=/tmp/...`, signed in as `admin`), which serves a space's page up to the call without LiveKit.

It drives Chromium through its DevTools protocol over Node 22's built-in `WebSocket`, with no new dependency, finding the browser from `CHROME_PATH` or the usual install paths. Where it runs is open question 6.

## Verify

- **Step 1:** `check-forms` passes on today's code and fails on a planted drift in a scratch copy (a height in a moved form, a field outside a row, a nine-choice `select`, a mismatch between the two copies of the block). Forms not yet moved look exactly as before: compared by screenshot in the live check's fixtures before and after (checked by a tool). `npm run check` passes.
- **Step 2:** the live check fails on today's Planner Flight form (the misalignment Thomas saw) and names the row and the fields; it passes on a fixture written to the standard.
- **Step 3 and each module step:** `check-forms` and `check-forms-live` pass for that module at the three widths and for every kind; `check-modules`, `check-module-window`, `check-module-versions`, `check-nav` and `check-radius` pass. Saving, editing, cancelling with the "Discard your changes?" question, a 409 from a second browser, and a read-only form are walked on the module's own page on a local server (no call needed). The Planner's round trip, flight look-up and arrival day are walked with a flight that lands the next day.
- **Steps 10 to 12:** the same on a throwaway local server.
- **What only Thomas can check:** whether the pilot reads right (the gate after step 3); light and dark themes by eye; Safari and iOS, whose date and time fields draw their own way (the live check is Chromium only); Firefox; a real phone; a screen reader on the new error wiring.
- **Needs a real LiveKit call:** nothing in the layout. Only that a form opened over a space during a call still behaves (the editor window's own Verify already covers it).

## Risks

- **The SDK block changes every form at once if it is not scoped.** Everything is under `.sdk-form`, and the date picker keeps its old look outside one, so a form not yet moved does not change. The kind picker stays 38 px.
- **Ids and stored values.** The Planner's arrival day changes from a `select` of offsets to a date field. When a journey has no day yet the offsets today are plain numbers (`String(n)` in `arrivalDays`), not days, so the form's joining of day and time (`arrivalJoin`) must keep handling a journey with no day; `check-travel` should get a case for it.
- **A time field in one column at 560 px** (about 123 px) may be too narrow for "10:30 PM" with the browser's clock icon. The live check will say; if so, a time takes `m` at four columns.
- **Rows whose fields are all hidden for a kind** must hide too, or they leave an empty gap; the row carries the same `data-types` as its fields, or hides with `:has()`.
- **Subgrid and container queries** need Chrome 117, Safari 16 and Firefox 110 or later. On an older browser the fields still stack with labels above; rows may not line up.
- **Try builds have no QA pass.** The live check is the safety net for layout; save paths rest on the builder's walk-through until a feedback or production build.
- **Uploaded modules** do not change: the classes are there for them to use, and the checks read only bundled modules.

## Assumed

- Forms are the add and edit forms of modules and the settings forms of the app. The sign-in pages, the keyed pages, Chat's input, the Maps search box and Places' and Research's filter boxes are not forms in this sense and are left out.
- A space has fewer than about fifteen people, so people chips wrap in two or three lines. A bigger space would want a searchable person field later.
- The editor window's sizes (560 px, 880 px, the sheet at 640 px) stay as they are.

## What is not decided

Each with a recommendation; Thomas decides. Questions 1, 2 and 3 block step 1 and the pilot; 5 blocks step 12; 6 blocks step 2.

1. **One date control, or a date field with a list button everywhere?** Options: (a) one date field everywhere (typed, with the calendar button), and a list button only where a module has named days or spots to offer (the Planner); (b) a list button on every date field; (c) the Planner keeps its text buttons. Recommended: (a). A list of days helps only where the days have names (phases, the spots between days); elsewhere it is a second control for the same job. "No day" lives in the list and the picker's Clear, so **Unscheduled** stops being a third button.
2. **For something in one place (a dinner, a sight, an event), is the end an end time or a length?** Options: (a) Starts and Ends times, the length shown under them, the **Length | End time** switch gone; (b) a length only, the end time shown under it; (c) keep the switch. Recommended: (a). It is how the Calendar asks already, and the Planner stores the length (`minutes`), which the form works out, so nothing stored changes. A journey keeps a travel time beside its arrival, because the arrival is in another time zone. Issue #247 (the length, or the end time it comes to) made an end time something a person can type, which (a) keeps.
3. **Labels above at every width, or beside the field in wide windows and on Manage?** Recommended: above everywhere. One rule, one baseline, the same at 880 px and on a phone, and Manage gains nothing from a second layout.
4. **Marking required fields.** Options: (a) no mark, an error under the field when it is empty, "(optional)" removed from labels; (b) an asterisk on required fields; (c) "(optional)" on optional fields. Recommended: (a). Almost every field is optional, and only a title or a question is required.
5. **Do Set up, the Phases sheet and Manage (with the profile, the host console, module settings and the AI settings) join the standard?** Recommended: yes, after the modules, with the same block in `style.css`. Manage keeps its own save model (a Save per panel) and only its fields change; making Manage's saving sticky is a separate question.
6. **Where the live check runs.** Options: (a) inside `npm run check`, failing where there is no browser; (b) its own `npm run check:forms`, run by the builder and QA on any change to a form; (c) add `playwright-core` as a development dependency and run it in `npm run check`. Recommended: (b). The cloud containers may have no Chromium, and the static check in `npm run check` already keeps the markup and CSS honest; the measured check is for every change that touches a form.
7. **The fill of a chosen choice.** The view switch's chosen segment is an accent fill with `--on-accent` (`.tb-tab.on`, `host.css:235-239`), while the design rule says `--selected-bg`; the Planner, Places and Research choices use a third and fourth look. Recommended: `.sdk-choice` uses `--selected-bg`, as the rule says, and bringing `.tb-tab.on` into line is a separate small fix. Not blocking.
