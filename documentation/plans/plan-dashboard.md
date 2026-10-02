# Dashboard Plan

**Audience:** whoever is building the rooms page and the modules system, and the author deciding what comes next.

**Status:** Built: the contract, the dashboard on the rooms page, Who is around, the Calendar, To-do and Polls widgets, opening an item in its room's pane, and retiring the header items for modules that have a widget. What is left is the open questions and customising the layout. The decisions below were made with the author. Phase 5, a rollup of what is happening in a space on that space's tile on home, was added as a direction on 2026-10-02 (Thomas); it is not a contract yet. This plan predates the Names: a room is now a space, a widget a tile, a pane a module on the canvas, an item an object, and Magpie is Collaborator.

## What it is

A dashboard on the rooms page, in a sidebar on the left with the room cards in two columns on the right under a Who is around strip, across all of a person's rooms: what is coming up, what is due, which polls need a vote, and who is around. It replaces the dedicated module pages in the header. It is made of widgets, small views that modules provide and Magpie hosts.

## Decisions

- **It replaces the module server pages in the header.** The header no longer lists a page per module. A widget can still open the module's full view: clicking the Calendar widget opens the full calendar view, as its server page does today. The pages stay; the header items go.
- **Phase 1 is laid out by us.** A fixed order chosen in the code and the manifests, the same for everyone. Customising the layout (hide, reorder, or an admin layout) is a later step.
- **First widgets:** Calendar "coming up", To-do "due soon", Polls "need your vote", and who is around (Magpie's own).
- **Magpie names no module.** A widget is whatever a module says it is, hosted the same way for any module; a module installed later can provide one with no change to Magpie.

## The widget contract (proposed)

- **Manifest.** `surfaces.widget: { entry, title, size, order }`: an HTML file like the other surfaces, a heading, a size (`small`, `medium` or `wide`, in columns of the dashboard grid) and where it sits relative to the others. Validated in `server/modules.js` like the other surfaces.
- **Where it runs.** In the page for a module that ships with Magpie, in a sandboxed frame for an uploaded one, exactly as the other surfaces do; it uses the same SDK.
- **What it reads.** The viewer's own rooms, through the read that already gives a module its data across rooms (`rooms-data`), checked by the module's read permission in each room. A widget also gets the server scope for a module that has server data.
- **Listing.** `GET /api/modules/widgets` returns the enabled modules with a widget the viewer can see, in order, so the rooms page draws them.
- **Live.** Widgets update from the same shared stream as every other module surface.
- **Opening things.** A widget item is a pointer (`host.refs.open`). On the dashboard, opening one takes the person into that item's room with the module's pane open on it (the room page reads a request to open a module on a pointer when it joins). Opening the widget's heading opens the module's full view.
- **Who is around** is a core widget, drawn by the rooms page from what it already knows.

## Phases

1. **The contract and the first widget.** `surfaces.widget` in the manifest, the listing route, the host on the rooms page (a section below the room list), Who is around, and the Calendar widget, opening the Calendar view from its heading.
2. **The rest of the first set and opening items.** To-do and Polls widgets; opening an item takes you into its room with the pane open on it.
3. **Retire the header items.** The header stops listing module pages; each module's full view stays reachable from its widget.
4. **Later.** Customising the layout, and a widget for the Travel planner or any module that wants one. The Planner's tile ("Trips") was built, then removed on 2026-10-02; see phase 5.
5. **The space tile's rollup** (direction, 2026-10-02). See the section below.

## Phase 5: the space tile's rollup (direction)

Thomas, 2026-10-02: the home "Trips" tile, the Planner's tile (`surfaces.widget` in `modules/travel/module.json`, `widget.html`), is confusing because it is really a rollup of the Planner. It is removed as a tile on home now ([plan-calendar-destination](plan-calendar-destination.md), decision 22). Instead:

- when adding or editing a space, an owner can choose to show Planner information on that space's tile on home;
- more broadly, a space's tile on home gets a rollup of what is happening in that space.

This is recorded as a direction, starting with the Planner, as an option chosen per space. It is not a contract: the questions below come first.

**What it is today.** A space's tile on home is drawn by `renderSpaces()` in `public/space.js` from the `#space-choice` template: the space's image, name, description, how many are here, its members, and the buttons to enter, enter with the phone, pop out, edit, the space's module settings and its link. Nothing on it comes from a module. The tiles a module provides (`surfaces.widget`, listed by `GET /api/modules/widgets`, hosted by `public/dashboard.js`) are environment-wide: each reads across the viewer's spaces and none belongs to one space. Today the Calendar, To-do and Polls have one; the Planner's is the one being removed.

**Open questions.**

1. **Which modules can contribute, and how.** Only the Planner at first, or any module from the start? A module that wants to contribute would need to say so: perhaps a new manifest surface, like `surfaces.widget` but per space (a small entry drawn inside one space's tile, told which space it is for), or a summary the module's server data provides that home draws itself, with no frame. The first keeps the rule that Collaborator names no module and lets a module draw what it likes, at the cost of one frame per space per module on home; the second is lighter on home but limits what a module can show. The Planner's removed `widget.html` and its phase line ("Booking · 10 days to go", [plan-planner-phases](plan-planner-phases.md)) may be the first contribution.
2. **What the rollup shows.** The Planner's phase and days to go; perhaps the next event, tasks due, polls needing a vote, unread counts; one line or several; whether a click on a line enters the space with that module open on it.
3. **Who sets it.** The owner when adding or editing a space, as Thomas said; whether a moderator of that space can too; whether an environment template can turn it on for new spaces (Travel's, for the Planner); and whether each person can hide it for themselves.
4. **The phone layout.** Space tiles are already one column on a phone; how much room the rollup takes there, and whether it is cut short or folds away.
5. **The relation to the removed Trips tile.** Whether the rollup fully replaces it, or whether something across spaces (the next trip, wherever it is) is still wanted on home; whether the Planner's `widget.html` is reused or retired; and whether removing the tile now leaves a gap until the rollup is built.

**Left to build.** Nothing yet: a contract and build steps follow once Thomas has answered the questions above.

## Later additions

- Who is around shows everyone who is online, in a room or not, from a presence signal every page sends, and offers an invitation to a private conversation of two.
- Each widget item shows its room's icon on the left and an arrow on the right.

## Open

- What the Calendar widget lists and how far ahead (a first guess: the next seven days, each with its room's icon, newest first).
- Whether a module with no widget still appears anywhere once its header item is gone. A first answer: only in the room's panes.
- The dashboard on a phone: one column, with who is around and the rooms first and the sidebar widgets below them (decided; built).
- Guests have no dashboard; they are in one room.
