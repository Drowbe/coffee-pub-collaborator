# Navigation: two rows, six zones

**Status:** decided September 23, 2026 (the author's sketch); the frame is built, the registry the bars draw from is built (September 24), what fills each zone is being worked out zone by zone. The account menu decided by Thomas, September 30, 2026: on desktop your picture is last in the right zone and opens the account menu (View profile, Sign out); on a phone it folds into the menu with the rest of the right zone; Sign out is no longer its own item in the right zone. Built September 30, 2026, the phone fold included (your picture, View profile and Sign out in the menu). The secondary nav decided by Thomas, September 30, 2026, and built the same day: one **Modules** button that opens a list of switches, who is here in the middle, and a "…" that the right zone folds into so the bar never overlaps (see "The secondary nav, September 30" below). Thomas named the live pieces in both bars **widgets** the same day. **The primary nav moves to [plan-primary-nav](plan-primary-nav.md)** (Thomas's spec of 2026-10-01, a draft for him to approve): once it is approved, it replaces this plan's primary nav table, its phone rule for the primary nav, the account menu above and the primary zones under "Open, zone by zone". This plan keeps the registry and the secondary nav.

## The model

The header is two rows, and each row is three zones: **left** (left-justified), **middle** (centred), **right** (right-justified). The rows are about different things and never borrow from each other:

**Primary nav: the system.** The same on every page.

| Zone | What it is for | Today |
|---|---|---|
| Left | The logo (home), where you are, and quick actions (to be defined) | the server icon and name (the home link), the crumb ("> Lobby", "> Server Settings") |
| Middle | Core navigation, system-level: the spaces (decided: rooms are "spaces" in everything a person reads; the code keeps `room`), and more to come | Spaces, and each module's own page |
| Right | System-level actions and system information: settings, install, a clock, and you | Manage, Install, the time on the server's clock (12- or 24-hour, the Language, time and money setting), and last your picture, which opens the account menu (View profile, Sign out); there is no separate Sign out item (decided 2026-09-30) |

**Secondary nav: the space.** Only at the table (a room), under the primary nav.

| Zone | What it is for | Today |
|---|---|---|
| Left | The space's name, and the module selector | the space's name, then the **Modules** button and its list of switches (conference, chat, the space's modules) |
| Middle | Space information and space navigation | who is here (the first widget) |
| Right | Space actions: layout, snap, close, and so on | Dock all, the canvas-level snap and its grid slider, Full screen, Pop out, Pull participants back or Rejoin call (during an aside), a module's own tools, the "…" (what does not fit), Leave space |

## Rules

- A control belongs to exactly one zone, chosen by what it is about (the system or the space) and what it does (navigation, action, information), not by where it happens to fit. Adding a control means naming its zone.
- The middle zone is centred on the row, not on what is left over: the row is a three-column grid (`1fr auto 1fr`), so the core navigation sits in the same place whatever the left and right zones hold.
- The markup is the same on every page: `public/brand.js` builds the primary nav (`.topbar` with `.nav-left`, `.nav-middle`, `.nav-right`), `public/room.js` builds the secondary (`.subnav` with the same three). Nothing else adds to the header; a page that wants a control in it asks one of these two.
- On a phone (below 640px) the primary nav keeps the logo, the crumb and a menu button; the middle and right zones fold into the menu. Your picture folds into the menu with the rest of the right zone: inside it, your picture and name, then View profile and Sign out as entries. The secondary nav is the tab bar at the bottom of the page: the module switches are the bar, who is here is a count, the right zone keeps only Leave. The zones do not change meaning, only where they are drawn.

## Modules register into the bars (built September 24, 2026; from the author's Blacksmith menubar)

**Built 2026-09-24:** `public/nav-bar.js` is the registry both bars draw from; the primary nav's middle and right zones and the secondary nav's right zone are registrations of the shape below; `host.nav.set`, `setActive` and `setBadge` are in the SDK with the `nav` event; `tools/check-nav.mjs` holds the ordering, band, visibility and namespace rules. The contract is "Registering into the nav bars" in `api-module-sdk.md`, the structure in `architecture-navigation.md`. Two things the plan left open and the build decided: a module's tools always form their own group (a divider from the system's), and the primary bar's rule is kept simple, a `system: true` tool from a module whose manifest has `surfaces.page.nav: true`, into the right zone only.

The author's Blacksmith module (its `api-menubar` wiki page) has the same idea, a bar in three zones that modules register tools into, and its shape is adopted here where it fits:

- **One registration, not markup.** A tool is `{ id, bar: 'primary' | 'secondary', zone: 'left' | 'middle' | 'right', icon, label, title?, order?, group?, groupOrder?, href? | onClick, visible?, toggleable?, active?, badge? }`; the host draws it and owns its look. The page's own controls (Rooms, Manage, the snap switch, Leave...) become registrations of the same shape, so there is one drawing path, not two.
- **Groups and order.** Tools sit in groups (a divider between), groups by `groupOrder`, tools by `order`; the bands Blacksmith uses (1-10 core, 11-50 secondary, 51-100 utility, 101-998 a module's own, 999 last) keep the system's tools ahead of a module's without anyone coordinating numbers.
- **Visibility and state.** `visible` is a boolean or a function (a tool for the room's owner, a tool only while in the call); `toggleable` tools carry `active` (the stage-level snap, full screen), updated in place (`setActive`), never by re-registering.
- **A module's tools come and go with it.** `host.nav.set([...])` from a module registers into the secondary bar under the module's own namespace (a module cannot touch another's, nor the system's), drawn while its pane is open in this room and removed when it closes; the primary bar takes a module's registration only for a system-wide tool (its own page's link is already there), and only from a module the admin has allowed there.
- **Notifications** (Blacksmith's middle-zone notices with a duration, a click and a pulse) are a later step here: the primary nav's right zone already carries the unread badge, and the toast exists; whether a bar-level notice adds something is to see.
- **Not taken:** Blacksmith's secondary bars as tab-like toolbars that open one at a time under the main bar are its own thing (a game table's toolbars); here the secondary nav is the space's bar, always there at the table, and a module's toolbar is its own pane's (`host.toolbar.set`).

## The secondary nav, September 30 (decided by Thomas, built)

- **Widgets.** The live pieces in the primary nav (the top bar) and the secondary nav (the space bar) are called **widgets**. The dashboard's widgets are to be renamed **tiles**, by a renaming plan with a data migration that is not written yet.
- **Who is here** is the first widget, in the middle of the space bar: portraits (up to four, then "+N", then the count alone as room runs out; "Just you" when alone), and a list with you first and a mark on those on the call. It is live, leaves out OBS viewers, gives way before any tool folds, and its list stays inside the window.
- **One Modules button.** The space bar no longer shows a switch per module: one **Modules** button (the environment's word) opens a list of switches. On a phone (640 px or less, a narrow pop-out included) the list is the tab bar, as before. **Open with** and space settings' **Opens with** use the same switches.
- **The bar never overlaps.** The right zone's tools fold into a "…" (More) before Leave, in this order: Pop out, Full screen, a module's own tools, the snap switch with its grid slider, Dock all, Rejoin call, Pull participants back. Leave, the "…" and the Modules button never fold. The space's name is cut short only after everything that can fold has, with its full name as a tooltip.
- **No call control.** The "N in the call · Join" control from [plan-entering](plan-entering.md) is removed; joining lives in the Conference.

As built: `public/switch-list.js`, `public/space-people.js`, and in the registry a tool's `fold: false` and a middle tool's `fit(avail)`; the shared page menu gained checkbox and count entries. The structure is in [architecture-navigation](../architecture/architecture-navigation.md). Checked by `tools/check-nav.mjs` and verified live in headless Chromium with a faked LiveKit; not checked with a real screen reader, in Firefox or Safari, or in a real call.

## Open, zone by zone

- Primary left: what the quick actions are (a new room, a search, a notification tray?).
- Primary middle: what else is core navigation beyond the rooms and module pages -- the dashboard, a person's own things (their research, their places)?
- Decided: the crumb is not shown at the table (the secondary nav names the space); it stays on the pages that have no second row. Whether those pages should have a second row of their own (a profile's, a module page's) is open.
- Secondary middle: who is here is built (September 30). Still open: the call's state, the time in the call, and space navigation (the views of the space?).
- Secondary right: whether the layout choice (docked, floating, snap) grows into one layout menu rather than several buttons.
