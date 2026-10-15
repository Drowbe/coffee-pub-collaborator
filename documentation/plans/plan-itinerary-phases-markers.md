# Itinerary Phases and Markers Plan

**Audience:** Thomas, who decided what phases and markers look like and what they are; experience-design, which builds the Planner's pages (`modules/travel`); server-development for the one settings change and the checks; content-manager for the documentation.

**Status:** decided 2026-10-15; ready to build (Thomas to say go). Nothing built. Drafted by product-planner. Each step is a try build (one builder, one pass, its own checks, a Planner patch version bump, the app working after it). Thomas's words: phases are chapters shown as a rail with a labelled cap at each end ("he likes this"); markers are bookmarks whose weight follows the job; "Built in" goes. Later the same day he also decided that the Buffer phase goes, that phases may have gaps between them, that the Calendar gets no rail or caps for now, that caps use each phase's own icon and that caps come before marker chips on one joint (decisions 6 to 10). This builds on [plan-planner-phases](plan-planner-phases.md) (the phases and the four fixed markers). It must use the design system's components once [plan-design-system](plan-design-system.md) is decided (it did not exist when this was written; see "The design system").

## What it is today

- The Planner is the `travel` module. Its marker types are the environment setting `markers` (`modules/travel/module.json`), a list of `{ id, label, icon, color }`. The setting names four ids as `fixed` (`planning-start`, `planning-end`, `trip-start`, `trip-end`); the server refuses a save that drops them (`server/setting-list.js`) and the settings page shows a "Built in" pill in place of the remove button (`public/module-settings.js`, `listRow`). The default list holds those four and seven more: `free-time`, `rest`, `buffer`, `meet-up`, `leave-by`, `travel-day`, `free-day`.
- `modules/travel/src/travel.js` repeats the list as `DEFAULT_MARKER_TYPES`, names the four as `AUTOMATIC`, and hides them from the menus with `blockTypes()`. `markerType(id)` falls back to the code's list and then to a grey clock labelled with the id. `useMarkerTypes` falls back to the code's list when the setting is empty.
- Where a marker sits is how it was added, not what type it is. An object of kind `lane` hangs on the line between days. A `block` with a time is a row inside a day. A `block` with no time is a tag in the day header (`daySummary`, the tags near line 509). Any type can be used any of the three ways ("Mark the day" and "Add at a time" both list `blockTypes()`).
- The four automatic markers are drawn by `timelineMarkers` (`buildMarker`): planning starts and ends, and trip starts and ends at the first and last booked object (`state.bounds`, `tripBounds`). With phases the line carries `phaseJoints` and `buildPhaseMarker` instead: one full-width pill per phase start and per phase end, in the phase's tint, the ending one first on a shared joint.
- A day in a dated phase takes a wash of the phase's tint on its header (`.day2.in-phase .day-head2`), a small `.phase-tag` with the phase name, and the same wash on its chip in the day strip (`.daychip.in-phase`). The tint is one of eight theme tint names (`.ph-blue` and the others set `--ph`, in `travel-lib-cards.css`). The Calendar colours its days the same way from the same bands (`phaseOnDay` in `modules/calendar/src/calendar-lib.js`).
- A template phase has `id`, `label`, `main` and `icon` (`server/templates.js`, `PHASE_KEYS`); Travel's are Planning (`clipboard-list`), Booking (`ticket`), Buffer (`hourglass-half`; decision 6 removes it), Pre-trip, Trip (`plane`, main) and Post-trip. Their `tint` reaches the Planner through the bands.
- The Planner is 0.15.28 in the working tree (0.15.26 committed). Bundled versions installed in Thomas's environment must go up, so every step below bumps from whatever the version is when it is built.

## Decisions

Thomas, 2026-10-15.

1. **Phases are chapters, drawn as a rail with caps.** Each phase is a continuous tinted rail down the side of its days. A labelled cap sits at the top ("Booking begins · Oct 12 · 3 days") and another at the bottom ("Booking ends"). Every phase has its own begin and end. When one phase ends and the next begins on the same day, the caps stack, the ending one first. They are fills, never borders. Reason: Thomas likes how it reads as chapters.
2. **Markers are bookmarks, and their weight follows the job.**
   - A moment between days is a small chip hanging on the line.
   - A block of time inside a day (Free time, Rest, Buffer) is a light row, lighter than a booking.
   - A tag on a whole day (Travel day, Free day) is a small chip in the day header.
   - None spans the width. None uses a phase colour. A marker keeps its own colour.
3. **"Built in" goes.** Every marker type is fully configurable and can be deleted. The four built-ins (Planning starts and ends, Trip starts and ends) are removed. A space with no phases gets nothing automatic: no first and last day markers, no booked-item trip start and end. Reason: phases now say where a plan begins and ends; a marker is only what a person adds.
4. **The name stays "Markers".** Not Bookmarks.
5. **The settings page lists only the user's types.**
6. **Buffer is dropped from the phases.** The travel template's phase list loses Buffer (the template version goes up); a space that stored a Buffer date simply ignores it. Thomas: "Buffers can be added into any other phase. It really just means 'the time between' and there is nothing stopping the user from adding days between the end of, say, planning and the beginning of pretrip. If they want to add a marker to those days between, they can do so. This is actually a good usecase for markers." The marker type called Buffer in the Planner's marker types **stays**, with its name: it is a user marker, and it is the use case.
7. **Phases may have gaps between them.** A phase's start is its own date. The phase sheet still proposes dates in sequence by default, but each start can be changed; "each phase starts the day after the one before ends" becomes a default, not a constraint. Days that no phase covers belong to no phase: no rail, no tint, and the strip's journey bar shows the gap. Markers can sit on those days. Reason: the same words as decision 6; the time between phases is the user's to use.
8. **The Calendar gets no rail or caps for now.** It only washes days, as today, until the Planner's look is settled. The Calendar's wash does follow decision 7 (gap days are not washed).
9. **Caps use each phase's own template icon.** Booking's is a ticket. A plain flag only where a phase has no icon. Reason: it tells chapters apart at a glance, which is what the caps are for.
10. **On one joint, phase caps come before marker chips.** Where lane chips hang on the same joint as caps, the caps first and the chips after. Thomas agreed.

## Assumed (from the decisions; Thomas can overturn)

- A gap exists only where a phase's own `end` is earlier than the day before the next phase starts; a phase with no `end` still runs to the day before the next one (step 1b). The other reading, a phase with no end ending on its own start day, would turn stored spaces into one-day phases and is not used.
- The heading level of the caps is the builder's call from the page's outline, not a product choice.
- The job of a marker comes from how it is placed (line, timed block, untimed block), as today, not from its type. A type is only a label, an icon and a colour. So "Free time" used on a whole day is a day tag.
- The day header's phase wash and `.phase-tag` stay. The rail adds to them; it does not replace them. (If the rail makes the wash look doubled, that is a look for Thomas to call after step 2.)
- A phase with no end date (and no later dated phase to end it) has no end cap, and its rail runs to the last day shown. A phase with no start date has no rail and no cap.
- The cap's length ("3 days") counts the days of the phase that are shown. An open-ended phase omits it.
- Phase days outside the shown days are not drawn; a cap at the head or tail of the list stands for a phase that begins before or ends after what is shown, and says its real date.
- Nothing is live, so there is no migration. The Planner still must not break a stored list or object.

## What happens to what is stored

- **The stored `markers` list.** A list saved before this change still holds the four ids. After step 1 they are ordinary rows: shown in the settings list, editable and deletable, and offered in "Mark the day" and "Add at a time" like any type. Nothing rewrites the list. The new default list (when nothing was ever saved) has seven types, not eleven.
- **An empty list.** A saved empty list now means no types (the menus offer none). Today the code treats it as "use the defaults"; that goes, because "100% deletable" includes deleting all. A list never saved still gets the defaults from `module.json`.
- **An object whose `type` is one of the four ids.** It reads like any object whose type was deleted: if the id is still in the list it shows its label, icon and colour; if not, it shows the id as its label with a grey clock (the existing `markerType` fallback) and still moves, edits and deletes. The code stops carrying the four in its own default list. No object is rewritten.
- **Nothing automatic is drawn from them.** Having a type with one of these ids no longer does anything special; the stylesheet's four `--turn` rules for them go.

## The contract

### Server half

- `modules/travel/module.json`: the `markers` setting loses `fixed` and the four rows from `default`, and its help text stops mentioning "the four automatic ones". With `fixed` gone the server's save check (`cleanRows`) already allows deleting any row; no server code changes. `fixed` stays supported for Budget and Places.
- `tools/check-*.mjs`: a case that the Planner's `markers` setting declares no `fixed`, and that a list without the four saves.

### Pages half (`modules/travel/src/`)

**Markers**

- Remove `AUTOMATIC`, the four default types, and `blockTypes()` (use the list itself). `useMarkerTypes` respects an empty list. Remove the non-phase branch of `timelineMarkers` and the `planning-start`, `planning-end`, `trip-start` and `trip-end` draws; `timelineMarkers` then draws only what hangs on the line (lane objects) and, until step 2, the existing phase joints. Check that `state.bounds` has no other reader before dropping it.
- **On the line:** a small chip hanging on the line, with its icon and label, in the type's colour as a fill. No full-width pill, no date column.
- **In a day:** a light row, with the time, icon and label, lighter than a booking card: no card shadow, a faint fill from the type's colour, smaller type. It keeps the existing menu, drag and edit behaviour.
- **In the day header:** a small chip with icon and label, beside the date, in the type's colour as a fill. It wraps with the other header tags and does not push the header taller on a phone.
- The three look different from one another and from a booking, and none uses a `--ph` colour.
- No coloured border, outline or ring (`tools/check-borders.mjs` must pass).

**Phases**

- **The rail:** for each dated phase, a continuous strip down the side of every day in it, filled in `--ph` (the phase's tint token, at a mid-strength mix with the card background, as the day wash does). It runs through the day headers, rows and the line between days without a break. It has no text.
- **The top cap:** at the phase's first day, a labelled cap in the phase's tint: the phase's own icon (a flag when it has none; decision 9), "<Label> begins", the date ("Oct 12"), and the length ("3 days"). Example: "Booking begins · Oct 12 · 3 days".
- **The bottom cap:** after the phase's last day: "<Label> ends".
- **Stacking:** where phase A ends and phase B begins on the same joint, the caps stack on the line between the two days, A's end first, then B's begin. Where lane chips hang on the same joint, the caps come first and the chips after them (decision 10).
- `phaseJoints` and `buildPhaseMarker` are reworked into the caps; the old full-width phase pills go. The rail uses the bands the page already has (`plan.bands()`).

**Phone, 390 px (and 320)**

- The rail is a narrow strip (6 px at most) in the margin the page already has at the left of the days. It adds no width and moves nothing.
- A cap is one full-width line of text on the page's column. If the label, date and length do not fit they wrap onto a second line; they are never clipped or shortened with an ellipsis.
- Header chips wrap under the date. Light rows keep their time and label on one line, wrapping the label.
- Where the page's phone layout does not hold, that is a bug to fix in the step, not a reason to hide the rail.

**Accessibility**

- The rail is decorative: no text, `aria-hidden`, not focusable.
- A cap is real text in the reading order, in the place it appears (begin above the first day, end below the last): a heading at the level that keeps the page's outline in order (the builder reads the days' heading level and uses the level that fits), so a screen reader hears "Booking begins, Oct 12, 3 days" before the phase's first day.
- Colour never carries the meaning alone: the cap names the phase, and a marker chip has its label.
- Text on a fill uses the theme's text token, with contrast checked in the light and dark themes.

**Consistency with other places**

- **The Calendar** keeps its per-day wash (`phaseOnDay`); the rail and the caps are the Planner's (decision 8). The two share the phase's `tint`, so a phase is the same colour in both. The Calendar does not get a rail or caps in this plan.
- **The status strip** ([plan-space-story-strip](plan-space-story-strip.md)) is touched only by step 1b (the gap in the journey bar). Its bands and the rail use the same tint and the same dates.
- **The home widget** (`travel-widget.js`) is not touched.

### Phases without Buffer and with gaps (step 1b)

**What changes in the rules.** Today the timeline is contiguous: a phase's end is the day before the next dated phase starts, and only the main phase may carry its own `end` (`timelineOf`, `ownEnd`, `moveBoundary` and `addPhase` in `public/phases.js`; `problemsOf`' ordering check; the Set up Phases tab and the phase sheet). After this step a phase's `start` is its own date and any dated phase may carry its own `end`. A phase with no `end` of its own still runs to the day before the next dated phase starts, so a space with stored dates and no `end`s behaves as before. A gap exists only where a phase's `end` is earlier than the day before the next phase's start. This is the reading of decision 7 that keeps every stored space working; Thomas can overturn it (see "What is not decided").

**Server half**

- `templates/travel.json` drops the `buffer` phase; its entry in `tools/template-versions.json` goes up by one. `server/templates.js` and its checks need no code change unless a fixture or default lists the phases (read `tools/check-templates.mjs`, `tools/check-template-switch.mjs`, `tools/fixtures/format-old/` and `tools/check-phases.mjs`, which name Buffer, and change each that lists the Travel phases, keeping the old-format fixtures as they are because they are old files). The stored `buffer` date in a space's `phases` setting is left in place and ignored: `cleanDates` already drops dates for phases the template no longer has, and a check proves it.
- The phases validation (`problemsOf` and the server's `dates` refusal for `phases`): refuse an `end` before its `start`; refuse phases out of order (a later phase starting on or before an earlier dated phase's start); refuse overlap (a phase's start on or before an earlier phase's own `end`). Do not refuse a gap. Each refusal is one plain sentence naming both phases, as today.

**Pages half**

- `public/phases.js`: `timelineOf` returns, besides the bands, the gaps, `{ start, end, days }`, for the days between one dated band's end and the next dated band's start (none before the first or after the last). `ownEnd` allows any phase's own end. `chipWords` and the countdown: in a gap the chip names the gap by what comes next ("Booking ends Oct 9 · Pre-trip starts in 4 days" is the builder's to word in plain, short words, using only template labels); the countdown to the main phase counts to its start, gap or not. The story sentence ("Booking starts tomorrow") treats the gap day before a start as "tomorrow" correctly and has a clause for being in a gap; no new word that is not a template label.
- `moveBoundary`, `addPhase` and `skipPhase`: moving a start no longer drags the end of the phase before it (nor does it close a gap); the proposal of dates in sequence stays the default when a phase is added or a start is first set (it proposes the day after the previous phase ends, and it may be changed).
- The phase sheet and the Set up Phases tab: each dated phase has Start and End; every Start can be set freely; an End is optional ("ends the day before the next one starts" is shown as the default when empty). Refusals show as the validation sentences above, in the sheet and the tab, and Save is held while one stands.
- The status strip's journey bar (`public/space.js`, `bandShares`): a gap is drawn as its own segment, a neutral fill from the theme tokens with no phase tint, sized by its days; it takes no phase colour and is not current. Today's mark can sit in it. On a phone the 2 px line shows the gap the same way.
- The Calendar (`modules/calendar/src/calendar-lib.js`, `phaseOnDay`): a gap day is washed in no phase colour. The Calendar gets no rail or caps (decision 8).
- The Planner (`modules/travel/src/`): `plan.bands()` and everything reading it treat a gap day as unphased: no rail, no wash on the day header or the day chip, no `.phase-tag`; a phase's top and bottom caps still sit at its own first and last day, so a gap shows as a stretch of days with no rail between a bottom cap and the next top cap. A marker or object can sit on any gap day as on any other. The phase line in the header says nothing about a phase on a gap day. "Not on a day yet" and the object editor's `f-phase` are unchanged; an object with no `phase` still falls into the current phase, and with today in a gap, the last phase that has started.
- Modules bump: the Planner (`travel`) and the Calendar (`calendar`) each go up by a patch version from what they are when this is built.

### The design system

[plan-design-system](plan-design-system.md) was not decided when this was written. Until it is: build on today's classes (`.ph-*`, `--ph`, `.markerpill`, `.phase-tag`, the theme tint tokens) and add no one-off visual styles or new colours; the rail, the cap and the three marker forms are each written once, in `travel-lib-cards.css`, with no copies. Once it is decided, this plan's parts are registered as components there: the phase rail, the phase cap, and the marker (one component with three forms: line chip, day row, day tag), each taking only a tint or a colour from the tokens. If the design system is decided before step 2 starts, steps 2 and 3 build them as those components straight away; if after, a later try build moves them over without changing how they look.

## Left to build, in order

Each step is one try build, checked by its own checks and by looking at the page.

1. **Remove the built-ins** (server-development for the check, experience-design for the pages; Planner patch bump, to 0.15.29 if still on 0.15.28):
   - `module.json` and `travel.js` as in the contract; the four `--turn` rules in `travel-lib-cards.css`; the comments in `travel.html` and the example in `design/markers.html`; the automatic-markers section of `CONTRACT.md`.
   - Unchanged in this step: the phase pills, so a space with phases still shows its phase starts and ends.
   - Result: the settings page lists only seven types, all with remove buttons; a space with no phases draws nothing on the line unless someone added a lane marker.
1b. **Phases without Buffer and with gaps** (server-development for the template, the validation and the checks; experience-design for `public/phases.js`, the sheet, the Set up tab, the strip, the Calendar and the Planner's reading of gaps; Planner and Calendar patch bumps, each upward from the version when built, so 0.15.29 may already be taken by step 1 and this is the next one):
   - The template and validation as in "Phases without Buffer and with gaps".
   - Check cases (in `tools/check-phases.mjs` and `tools/check-templates.mjs`, with the existing Buffer cases rewritten to another phase or removed): the Travel template has five phases and a higher version; a stored `buffer` date is ignored and changes no band; an `end` before its `start` is refused; phases out of order are refused; an overlap is refused; a gap is accepted; `timelineOf` returns the gap with its days, and none when the phases are adjacent; a stored space with no `end`s gives the same bands as before; `chipWords`, the countdown and the story sentence in a gap, the day before a start and on the first day of a phase after a gap; the journey bar's shares with a gap segment; `phaseOnDay` returns no phase for a gap day.
   - Result: five phases in a new Travel space; a start can be set to leave days between two phases; those days have no tint in the strip, the Calendar or the Planner.
2. **The rail and caps** (experience-design; Planner patch bump, to 0.15.30): the rail, the two caps, the stacking, the phone layout, the accessibility; the old phase pills go.
3. **Markers by job** (experience-design; Planner patch bump, to 0.15.31): the line chip, the day row and the day tag.
4. **Documentation** (content-manager; no module change): [userguide-templates](../userguides/userguide-templates.md) and [userguide-spaces](../userguides/userguide-spaces.md) (the six phases become five, and "one timeline with no gaps" goes), [architecture-canvas](../architecture/architecture-canvas.md) (its "Contiguous" paragraph in the phases section), [userguide-planner](../userguides/userguide-planner.md) (the Phases and Markers sections, which now say the four automatic ones can be changed but not removed and describe the pill markers), the Planner's `CONTRACT.md` if the builder has not, the [design-theme](../designsystem/design-theme.md) if a new fill is used, `CHANGELOG.md`, and this plan's status.

If these ship together as a production build, the bumps become one minor version (0.16.0), which is also an upward change.

## Verify

- **Step 1, by check and by looking:** the `markers` setting has no `fixed` and a list without the four saves; an empty list saves and the menus offer no types. By looking in a dev browser: the settings page shows no "Built in" pill on the Planner's list; a space with no phases and a booked flight shows no trip start or end; a stored list that still holds the four ids shows them as ordinary rows.
- **Step 1b, by check and by looking:** the cases listed in the step, run by `npm run check`. By looking in a dev browser: a new Travel space has five phases; set Pre-trip's start a week after Booking's end and see the strip's gap segment, no tint on those days in the Calendar and the Planner, and a marker added on one of them. The gap's wording in the chip and the sentence is read as code plus looked at once. Installed bundled versions are higher than before.
- **Step 2, by looking** in a dev browser at the desktop width, 390 px and 320 px: a space with the six Travel phases dated back to back (caps stacked at every joint, the ending first); a phase with no end (no end cap); a phase before the first shown day; light and dark themes. `npm run check` including `check-borders`. Contrast measured on the cap text.
- **Step 3, by looking:** one marker used the three ways; its colour stays its own and no marker takes a phase tint; light rows are visibly lighter than a booking; no tag makes a header grow on a phone.
- **Accessibility, read as code plus a check in the browser's accessibility tree:** the rail is hidden from it; caps appear as headings in the right order. A real screen reader run is not done here.
- **Not checkable without a real LiveKit call:** nothing in this plan touches a call. The pages are checked locally with the dev server.

## Risks

- **Doubled colour.** The rail and the header wash both carry the phase tint. If they look heavy together, one of them has to give; Thomas decides which (see Assumed).
- **The rail through changing content.** Days open, collapse and reorder; a rail that draws per day can show seams. The rail should be drawn so a seam cannot show (one fill running through, not a strip per day), and checked while days are moved.
- **Many caps on a short plan.** Six phases in a week stack many caps on a phone. A phone could use more room than it has; step 2 checks it with the Travel template and reports the height, and Thomas decides whether to reduce them.
- **The empty-list change** reaches every Planner in an environment that saved a list. It is intended, and it is the only place this plan changes stored behaviour.

## What is not decided

Nothing is open for Thomas. Answered since drafting: which "Buffer" is renamed (neither; decision 6), the Calendar (decision 8), the cap's icon (decision 9) and the order of caps and chips (decision 10). What the builders settle themselves: the cap's heading level, the wording of the gap in the chip and the sentence, and the reading of a gap in Assumed.
