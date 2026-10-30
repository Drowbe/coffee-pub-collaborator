# Phone Experience Plan

**Audience:** Thomas, who decides what a phone is to the product, how a person moves around a space on one, and which
modules and pages are made for it first; and the sessions that build it: experience-design (`public/space.js`,
`public/canvas.js`, `public/nav-bar.js`, `public/style.css`, `public/sdk/host.js`, `public/sdk/system.css`,
`public/sdk/host.css`, each module's page), server-development (`server/index.js` for the manifest, `public/sw.js`, the
checks in `tools/`, the phone emulation in `tools/shots.mjs`), quality-assurance (the audit and each step), content-manager
(the architecture and API documents, the user guides, the changelog).

**Status:** draft, 2026-10-30, by product-planner. Proposes; Thomas decides. Nothing built. From Thomas, 2026-10-30, as
relayed by the project manager: what we have been calling the "phone layout" is only a width breakpoint, and "a phone
experience is not just a smaller, repurposed desktop experience". He expects phone use to be a large share of use. The
same day he decided, in [plan-object-window](plan-object-window.md) (decision 5), "Phone experiences are designed for
the phone, not a shrunk desktop", and that plan's question 16 suggested this plan with a scope this one follows. Added
the same day, from Thomas: "We will need to understand how common each layout is and ensure we target the core
experience to the expected size" (the section "How common each layout is", step 0, questions 18 to 23). Every
section below except "What it is today" is the planner's proposal and waits on the open questions at the end.

## Why

The product answers to a window's width, not to the person holding it. At 640 px and below it folds the desktop into
one column, a tab bar and a few sheets; above 640 px it is the desktop, whatever the input. So a narrow desktop window
gets the phone shape with a mouse, a phone turned sideways (844 px wide, 390 px tall) gets the desktop with a thumb,
and a tablet gets hover-only controls it cannot hover. Inside that one breakpoint each module shrinks its desktop
shape: the Planner's timeline, the Calendar's month grid, the Map's side panel, Set up's tabs. Nothing asks what a person
on a phone came to do in each module, and nothing is built for one thumb, the back gesture, the on-screen keyboard,
the camera, a flaky network or the home screen.

## What it is today

Read from the code on 2026-10-30. Nothing here was seen on a phone in this session; the iPhone figures are the ones
measured earlier and recorded in [architecture-canvas](../architecture/architecture-canvas.md), "What an iPhone reports".

### The width lines

- **640 px, the window.** `applyLayout()` in `public/space.js` sets `narrow` at 640 px; `placeSubnav()` and
  `phoneWidth()` move the space bar to the foot as the tab bar ([plan-phone-space-bar](plan-phone-space-bar.md));
  `phoneZones()` folds the top bar's right zone into its menu. `public/style.css` has 30 `@media (max-width: 640px)`
  blocks and 6 `(min-width: 641px)`; `public/sdk/system.css` has 22; `public/sdk/host.css` 1; `modules/places/src/places.css`
  2. In `public/sdk/host.js` the kind picker and the menus ask `matchMedia('(max-width: 640px)')` (`phone()`), and the
  editor window's lift reports `phone` by the page's width (`editorlift`).
- **900 px and 1200 px, the window.** The top bar drops the environment name and the destinations' words between 641
  and 900 px; Home stacks below 900 px.
- **`tools/check-breakpoints.mjs`** allows only 640/641, 900/901 and 1200/1201 for a media query on width; two strays
  are allow-listed (`public/style.css` 760 px, the journey strip's fact chips; `modules/stream/src/stream.css` 560 px).
  Container queries may use any width.
- **The module's own width.** The Planner sets `.app.narrow` under 720 px and `.app.tiny` under 480 px from its root's
  width (`fit()` in `modules/travel/src/travel.js`, a `ResizeObserver`; 25 rules in `travel.css`, 35 in
  `travel-lib-cards.css`), because "a bundled module runs in the page, so a media query would follow the window". The
  shared card head stacks under 300 px (`@container (max-width: 299px)` in `system.css`); `host.css` answers at 440 and
  760 px of the module's box; `travel-lib-editor.css` at 759 px. These are module-width rules: a module docked 400 px
  wide on a desktop gets them, which is right, and they say nothing about touch.

### Input

- **`(pointer: coarse)`** appears three times: twice in `style.css` (wider splitter handles for the side column) and
  once in `system.css`, `@media (max-width: 640px), (pointer: coarse)`, which gives the module frame's title bar and
  toolbar buttons a 44 px tap area (`--mf-hit`) on a phone or any touch screen.
- **`(hover: none)`** appears once (`style.css`: the picture slot's paste button and hint show without hover).
  `travel-lib-cards.css` uses `(hover: hover)` twice.
- **Hover, drag and right click in the modules**, counted from the source (a count, not a judgement; the audit
  decides which ones a phone loses):

| Module | `:hover` rules | `draggable` | `dragstart` / `pointerdown` | `contextmenu` | date and time fields |
|---|---|---|---|---|---|
| Planner (`travel`) | 8 | 7 | 1 / 1 | 0 | 18 |
| Maps | 5 | 2 | 1 / 1 | 2 | 0 |
| Places | 4 | 2 | 0 / 2 | 0 | 0 |
| Calendar | 4 | 2 | 0 / 0 | 0 | 5 |
| To-do | 3 | 2 | 0 / 0 | 0 | 1 |
| Research | 2 | 3 | 0 / 0 | 0 | 1 |
| Polls | 2 | 2 | 0 / 0 | 0 | 2 |
| Budget | 0 | 0 | 0 / 0 | 0 | 1 |
| Assistant | 0 | 1 | 0 / 0 | 0 | 0 |
| Stream | 0 | 0 | 0 / 0 | 0 | 0 |

  The canvas reorders docked modules by dragging a title bar (`wireReorder()`), floating windows move and resize by
  pointer, and the side column's splitters drag. On a phone none of these show (one view at a time), so they are not
  lost there; on a tablet above 640 px they are the only way.

### What the phone shape does today

- **One view at a time**, the space bar as a tab bar at the foot (module tabs at least 56 px, Join, Online's count,
  Rejoin call, the **…**, Leave), the other views open but hidden so the call keeps running, and a dot on the
  Conference tab while in the call (green, red while the microphone is live). No Layout button, no floating, no docked
  limit ([plan-layout-menu](plan-layout-menu.md) decision 6, [plan-docked-limit](plan-docked-limit.md)).
- **Sheets:** the editor window (`host.ui.editor`) is a full-screen sheet; the kind picker's list fills the lower part
  of the screen (`.sdk-kind-sheet`); the host's menus drill in instead of flying out; the phases sheet has a 52 px band.
  None of these is a shared "sheet" piece: each is styled on its own inside the "Dialogs and sheets" block of
  `system.css`.
- **The viewport:** `body.in-space` is `position: fixed; top: 0; height: 100dvh`; `syncViewportHeight()` copies
  `visualViewport.height` into `--app-vh`; the top bar and the tab bar pad by `env(safe-area-inset-top)` and
  `env(safe-area-inset-bottom)` (about 40 uses of `safe-area-inset` in `public/`). Every page has
  `viewport-fit=cover`. Nothing follows `visualViewport` to keep a focused field above the keyboard.
- **History:** nothing in `public/` uses `history.pushState` or `popstate`. The phone's back gesture leaves the page,
  whatever sheet is open.
- **Keyboard hints:** about 70 `inputmode`, `enterkeyhint` or `autocomplete` attributes across the pages and modules'
  HTML; the design system decided field text is 16 px on a phone ([plan-design-system](plan-design-system.md), "Phone
  fields"), so the phone does not zoom. Whether every field keeps that is for the audit.

### The installed app

- **Manifest:** `GET /manifest.webmanifest` in `server/index.js` gives `name` and `short_name` from the environment's
  name, `start_url: '/'`, `display: 'standalone'`, a fixed `background_color` and `theme_color` (`#1a1410`, not the
  theme's tokens), and two icons: the admin's own PNG (`sizes: 'any'`) when set, and the brandmark at 1024 px. No
  `maskable` icon, no `id`, no `shortcuts`, no `share_target`. It is linked only from `public/space.html` and
  `public/diag.html` (not the landing page, sign in or Profile); `space.html` also has an `apple-touch-icon`.
- **Service worker:** `public/sw.js` installs, claims and caches nothing, on purpose ("so an updated server always
  serves fresh pages"). `space.js` registers it for everyone but a guest viewer.
- **Notifications:** none. Nothing uses the Notification or Push APIs.
- **Offline:** nothing listens for `online` or `offline`; a page that loses the network finds out when a request
  fails, each in its own way.
- **Share:** nothing uses `navigator.share`; Share in the module frame shows a link with **Copy link**.

### Pictures from a phone

- Profile's picture slots take `accept="image/png,image/jpeg,image/gif,image/webp"`, which on a phone offers the photo
  library and the camera. Chat sends pictures live only, never stored ([plan-chat-model](plan-chat-model.md)); how a
  picture is chosen there on a phone is for the audit.
- The Vault ([plan-attachments-vault](plan-attachments-vault.md), approved, not built): **Add files** opens the photo
  library and the camera on a phone, several at once; the grid three across; the viewer full screen as a sheet with
  **Download** as a large button; HEIC is refused and a `.mov` may not play outside Safari.

### Sizes

The pages have no build step, so what is served is the source: `public/space.js` 400 KB, `public/sdk/host.js` 208 KB,
`public/style.css` 240 KB, `public/sdk/system.css` 264 KB, the Planner's `src/` 464 KB (on disk, before compression).
Nothing measures what a phone downloads or how long a space takes to become usable.

### How phones are checked today

- `tools/check-conformance.mjs` measures the Workspace at 390 px dark, each module through the tab bar, and each
  module's and destination's own page at 390 px, including the 44 px tap areas in title bars and toolbars.
  `tools/check-narrow.mjs` checks six rules, several at 390 px or a 260 px window.
- Both drive Chromium over the DevTools protocol (`tools/shots.mjs`), not Playwright (there is no Playwright in the
  repository). `shots.mjs` sets `Emulation.setDeviceMetricsOverride` with `mobile: false` and a device scale of 1;
  `check-confirm.mjs` and `check-design-system.mjs` set `mobile: true` at their phone width. Nothing turns on touch
  emulation, nothing runs at 360 px, nothing sets safe-area insets, landscape or a keyboard.
- `/diag.html` (linked from Manage, About) reports a real device's viewport, `visualViewport` and insets.

### Known issues on phones

From [known-issues](../known-issues.md): the host console's Maps tab is too wide on a phone; the Calendar's Day view
can scroll by itself at 390 px; a Calendar or Map editor in a narrow window is a phone sheet. Narrow bands in the
status strip hide their label (any width).

## Definitions (proposed)

The plan uses four separate ideas, and the code should too.

- **Width class**, the window's width, on the three lines the product already has: **compact** (640 px and below),
  **medium** (641 to 900 px), **wide** (above 900 px). It decides the shape of the page: one view at a time, or the
  canvas of windows. A narrow desktop window is compact.
- **Module width**, the module's own box, answered by container queries (as the shared card and the Planner already
  do). It decides how a module lays out what it shows. It never decides navigation.
- **Input**, from the browser: `(pointer: coarse)` (the main pointer is a finger), `(any-pointer: fine)` (a mouse or a
  pen is also there) and `(hover: none)` (nothing can hover). It decides tap areas, whether hover may carry anything,
  and whether long press is offered. It is independent of width: a tablet is wide and coarse; a narrow desktop window
  is compact and fine.
- **Phone**, for this plan, is compact width with a coarse pointer, in either orientation (question 2 covers a phone
  held sideways, which is wider than 640 px but only about 390 px tall). Never detected from the user agent.
- **Safe areas**: the `env(safe-area-inset-*)` insets, real only in the installed app with `viewport-fit=cover` (47 and
  34 px on the measured iPhone) and 0 in a browser tab, so nothing may depend on them being there.
- **Orientation**: portrait or landscape, from `(orientation: ...)` and the height, not from a device's name.
- **The installed app**: the page opened from the home screen, `(display-mode: standalone)` (and `navigator.standalone`
  on iOS). It has no address bar and no browser back button, so the page's own Back is the only one on an iPhone.

## How common each layout is (proposed, questions 18 to 23)

Nothing today records what screens people use: there is no analytics, no database and no count of anything of the
kind in `server/`. The audience is small groups (a trip's family and friends, testers), so the numbers will be small
and every count is close to a person.

### What counts as a layout

A layout is one combination of:

- **The window's width class:** compact, medium or wide (see "Definitions").
- **Each shown module's own width**, in buckets that match the rules modules already have: under 300 px (the card's
  stacked head), 300 to 479, 480 to 719 (the Planner's `.tiny` and `.narrow` lines), 720 to 1099, 1100 px and over.
  This is independent of the device: on a desktop a docked column can be 240 px (`DOCK_MIN`) while the canvas beside
  it is 1200; on a phone every module is the whole width.
- **How the module is shown:** docked, floating, the only view (a phone, or the full canvas), its own page, a
  pop-out, a destination's part.
- **Input:** coarse, fine, or both (`any-pointer`).
- **Orientation:** portrait or landscape.
- **Display mode:** a browser tab or the installed app.
- **The person's role** (question 21): `admin`, `owner`, `moderator`, `member` or `guest`.

### How we learn it

Four ways, which can be combined (question 19):

- **Layout counters in the product.** The page reports its layout when it has been stable for 10 seconds and again
  when it changes class (not on every resize): `POST /api/layout-counts` with the classes above, never a pixel width,
  a user agent, a name, a space or a time. The server adds one to that combination's count in a per-environment
  `DATA_DIR/layout-counts.json`, by week, keeping 12 weeks; it stores no IP and no user key. Manage gains a
  **Layouts** section for the admin and the environment's owner: shares per width class, per input, per display mode,
  and per module by its width bucket and how it is shown, with any count under 5 shown as "fewer than 5", so a family
  of six cannot read one person's phone from it. Turned on by an environment variable (question 20), so an install
  that does not set it behaves exactly as before. Cost: one route, one JSON file with batched writes, a small script
  in the pages, the Manage section, and a check; about a feedback build.
- **A tester device list.** Thomas asks each tester which phone, browser and orientation they use, and whether they
  install it. One message, no code, known before anything ships; it misses how each module is shown.
- **An outside benchmark.** Public web statistics say what share of browsing is on phones. They fit this audience
  poorly: they measure browsing in general, not a planning tool used at home before a trip and on a phone during it,
  and they say nothing about module widths. Useful only as a sanity check.
- **The audit's own screens**, which say what breaks but not how often anyone sees it.

### How the data decides the core experience

A target per width class, each module's primary task (from the audit table) placed where it is expected:

| Width | What must work | Expected modules |
|---|---|---|
| 360 and 390 px, touch | Every module's primary phone task, by taps only; the call, Chat, sign in, Home | Every module, one at a time |
| About 720 px (a tablet, a phone sideways, a narrow window) | Everything a phone does, with two things side by side where it helps (a list and its object) | The Planner, the Calendar, the Map |
| 1100 px and over | Planning: the canvas, several modules at once, Set up, Manage | Every module, docked or floating |
| A module under 480 px of its own on a wide window | Its primary task, as on a phone, without the phone's navigation | Chat, the call, To-do, Polls, docked |

The counts then order the work: the audit's rows and steps 11 to 14 go in order of each module's share of compact use,
and a module seen mostly wide and by owners goes later. A module often shown under 480 px on a desktop gets its narrow
layout checked at that width too. **Until there is data**, the order is: Chat, the call, the Planner (today), Polls,
To-do, Calendar, Places with Maps, Budget, Research, Assistant; then Home, Set up and Profile; sign in; Manage and the
host console last. After four weeks of counts (or sooner if Thomas asks), product-planner proposes a new order for
Thomas to confirm.

### The assumption until data exists (question 23)

**Phone first for members and guests; desktop first for planning and admin work.** A member or a guest is most likely
in a space on a phone during the trip: the call, Chat, today's plan, a vote, a photo, a cost. An owner, a moderator or
the admin plans at a desk: the Planner's whole trip, Set up's heavier tabs, Manage, the host console, module
configuration. Desktop first still means usable at 390 px (nothing cut, nothing sideways), just not designed for it.
Thomas can overrule this.

## Principles (proposed)

Decided once, then every page and module is held to them.

1. **Designed for the task, not shrunk.** Each module names its primary task on a phone (the table below proposes
   one), and its phone screen opens on that task. What a phone does not need can be one level deeper, or absent.
2. **One thumb.** The actions used most sit in the lower half of the screen; a screen's one primary action is at the
   foot, full width, above the safe area. The top bar holds the title, Back and the menu.
3. **One thing at a time.** One view fills the screen; a sheet covers it; a sheet over a sheet is the most there ever
   is.
4. **Back is always "up one level".** Every sheet, menu and drill-in is one history entry; the back gesture, Android's
   back button and the page's own Back do the same thing.
5. **Nothing needs a hover.** No information or control only appears on hover; tips are extras, never the only place
   a thing is said.
6. **Nothing needs a drag.** Every drag on the desktop has a tap way on a phone: a menu entry (**Move to**,
   **Move up**, **Move down**) at least, a long press to pick up where a list is reordered.
7. **No right click, no keyboard shortcut needed.** Every action a context menu or a key gives is also a visible
   control.
8. **Targets and type.** Every control at least 44 by 44 px, 8 px apart; rows 44 px; field text 16 px; words beside
   icons where there is room.
9. **The keyboard never hides what is typed or Save.**
10. **The phone's own tools first.** The phone's date and time pickers, its camera and photo library, its share sheet.
11. **A bad network is normal.** The page says when it is offline and what still works; nothing is lost silently.
12. **Same names, same objects.** The phone shows the same objects and the same words as the desktop; only the shape
    changes.

## The audit (step 1)

Every page and every module, measured at **390 by 844** and **360 by 780**, portrait, touch emulated
(`mobile: true`, `hasTouch`, device scale 3), light and dark, as an owner and as a member; then the same pages at
**844 by 390** landscape for the call, Chat and the Planner. Screenshots go under `tools/.shots/` (outside git) for review.
quality-assurance runs it and reports; product-planner copies the findings into the table below. The **primary phone
task** column is the planner's proposal, for Thomas to correct (question 4).

Severity: **blocks** (the primary task cannot be done), **hurts** (it can, badly: hidden, cut, tiny, drag or hover
only), **polish** (looks wrong, works).

| Page or module | Primary phone task (proposed) | What breaks at 390 / 360 | What is desktop-only (hover, drag, right click, small targets, keys) | Severity |
|---|---|---|---|---|
| Landing (`landing.html`) | Sign in or read what it is | | | |
| Sign in, the sign-in step, register, the second factor (`login*`, `register`, `mfa-enrol`) | Sign in with one hand, a password manager filling | | | |
| Home (`space.html`, no space entered) | Find the space and enter it; see what changed | | | |
| Home's Chat | Read and reply | | | |
| A space: the Workspace and the tab bar | Switch between the call, Chat and one module | | | |
| A space: the conference | Hear, be heard, mute, see who is talking | | | |
| A space: Chat | Read and reply; send a picture | | | |
| A space: Join, Online, the **…**, Leave | Join, see who is here, leave | | | |
| An aside | Talk to one or two people, rejoin the call | | | |
| Set up (the space's sheet: Space, Members, Phases, Modules, Opens with) | Change a date or a member; mostly read | | | |
| The phases sheet and the journey strip | See where we are; move a date | | | |
| Profile (`profile.html`) | Change my picture and name; the microphone | | | |
| Manage (`admin.html`) | Read the state; small fixes | | | |
| The host console (`host.html`) | Read the state | | known: the Maps tab runs past the edge | |
| Module configuration (`module-config.html`) | Rarely on a phone | | | |
| A module's own page (`module.html`) | As the module | | | |
| A destination's page (`destination.html`) | As the destination's parts | | | |
| A pop-out (`popout.html`) | Not on a phone | | | |
| The keyed view (`keyed.html`, OBS) | Not on a phone | | | |
| Planner (`travel`) | What is next today, and where; add a stop | | `.narrow` and `.tiny` are module-width rules; cards drag by a handle | |
| Calendar | Today and the next days; add an event | | known: the Day view scrolls by itself at 390 px | |
| To-do | My tasks; tick one; add one | | | |
| Places | Find a place near me; open it in the phone's map | | | |
| Maps | Where am I, where is the next stop | | known: an editor in a narrow window is a phone sheet | |
| Polls | Vote | | | |
| Research | Save a link or a photo from the phone; read a note | | | |
| Budget | Add a cost on the spot (a receipt) | | | |
| Assistant | Ask a question | | | |
| Stream | Not on a phone (OBS) | | | |
| Vault (not built) | Add photos from the phone; show one | | | |

The audit also records, for each row: whether it scrolls sideways at either width (the page or a part of it), every
control under 44 px, every field under 16 px, every hover-only control, every drag-only control, whether the
keyboard hides the focused field or Save (approximated; see "Real devices"), and how many requests and bytes the first
screen takes.

## Navigation on a phone (proposed, question 3)

### What a space is on a phone

A space on a phone is a stack, not a canvas: the base is one **view** (the call, Chat, or one module), sheets go over
it. A canvas window maps to the view: docked, floating, popped out or inside a composite, on a phone a module is the
whole screen between the top bar and the bottom bar. A module's window frame is drawn in its phone form (the title
bar becomes the top bar's title; see "The shared pieces"). The person's desktop layout is not changed by anything done
on a phone; the phone remembers its own last view per space (question 15).

### The bottom bar

Today's tab bar shows every open view as a tab and folds the rest into the **…**. Three shapes are possible (question
3). The planner's suggestion is a fixed bar with stable places:

- **Call** (the conference; its dot as today), **Chat** (its unread count), the **module being used** (its icon and
  name; tapping it again goes to that module's top), and **Modules**, which opens a full-screen list of the space's
  modules (the Show list, as large rows with their icons and unread counts) to switch to one.
- **Leave** moves to the top bar's menu, with a confirm while in the call; **Join** shows as the Call tab's word while
  out of the call; **Online** moves to the top bar beside the space's name (its count, opening the list as a sheet).
- A module's own tools (`host.nav.set`) go into the module's top bar menu, not the bottom bar.

This keeps the call and Chat one tap away from anywhere, puts the places where the thumb learns them, and lets the
number of modules grow without a crowded bar. It replaces parts of [plan-phone-space-bar](plan-phone-space-bar.md)
(decisions 1 to 4 and 7 to 8 would change; `phoneTabs()` would go), which is why it is Thomas's call.

### The call, Chat and modules together

- **In the call, looking at something else:** a **call strip** (question 5): one row above the bottom bar with the
  person talking (face and name), the microphone toggle and hang up. Tapping it shows the call. It is drawn from
  `host.call.state` ([plan-call-as-module](plan-call-as-module.md)) so it works the same when the call is a module.
- **Audio keeps running** while another view or a sheet is shown, as today.
- **Chat over a module:** a link chip in Chat opens its object's window as a sheet over Chat; Back returns to Chat
  ([plan-object-window](plan-object-window.md), question 9: on a phone the tab does not change).

### Back and history (question 6)

- **One entry per sheet.** Opening a sheet (the object window, the editor, a menu, the kind picker, the Modules list,
  Set up, the phases sheet, a picker) pushes one entry; back closes it; a sheet with changes asks first ("Discard your
  changes?", the entry pushed again while it asks). Closing a sheet by its own control goes back one entry, so the
  history never fills.
- **Switching views does not push.** It replaces the entry, so back from a space goes to Home, not through every tab.
- **Entering a space pushes one entry** for the space; back from its base view returns to Home; while in the call it
  asks first ("Leave the call?" with **Stay** and **Leave**).
- **One owner for history.** A small host module (`public/sheet-history.js`, proposed name) holds the stack; every
  sheet opens and closes through it, including a module's `host.ui.editor` and the object window. The SDK's own sheets
  call it; a module never touches `history` itself.
- **Deep links** (`#object=` from [plan-object-window](plan-object-window.md)) open the space, the owner module as
  the view and the object's sheet over it, with one entry under it so back lands on the module.

## Touch in place of drag (question 7)

| Desktop drag | On a phone (proposed) |
|---|---|
| Planner: a card to another day or position | **Move to** in the card's menu (a day list, then before or after a stop); long press to pick up within a day later |
| Calendar: an event to another day or time | Open the event, change the date and time (the phone's pickers) |
| To-do: reorder, link a task | **Move up**, **Move down**, **Link to** in the task's menu |
| Maps: a marker to a new point | **Move pin**: the map pans under a fixed crosshair, **Set here** at the foot |
| Places: a place onto a map or a day | **Show on map**, **Add to day** in the place's menu |
| Research and Polls: reorder | **Move up**, **Move down** |
| The canvas: reorder, float, resize | Not on a phone (one view at a time) |
| The side column's splitters | Not on a phone |
| Dropping a file onto a module | **Add files** (the chooser) |

A long press, where offered, is 500 ms, shows the object lifted, and has the same result as the menu entry; it is
never the only way.

## Keyboard (on-screen)

- **The focused field stays in view.** The shared sheet listens to `visualViewport` (`resize`, `scroll`) and keeps the
  focused field between the top bar and the keyboard's top.
- **Save stays reachable.** In a sheet's edit mode Save is in the top bar (the phone's own pattern, object window
  question 12); a form's sticky foot, where one exists, rides above the keyboard.
- **16 px field text** everywhere on a phone; a check fails a field under it.
- **The right keyboard:** `inputmode` (`decimal` for costs, `tel`, `email`, `url`), `enterkeyhint` (`send` in Chat,
  `next` in a form, `done` on the last field), `autocomplete` on sign in, `autocapitalize` and `spellcheck` where they
  help.
- **Dates and times:** the phone's own pickers (`type="date"`, `"time"`, `"datetime-local"`) on a coarse pointer
  (question 9).
- **Chat's box** grows to four lines, sits above the keyboard, and keeps the last message in view when the keyboard
  opens.

## Camera, photos and share

- **Choosing pictures:** every picture field takes `accept="image/*"` plus the types the server accepts, so the phone
  offers the camera and the library; several at once where the module allows. `capture` is not set, so the person
  chooses. HEIC: the server's refusal sentence stays as the Vault plan says; whether to convert is not in this plan.
- **Chat pictures and the Vault:** **Add a picture** in Chat's box (one tap: camera or library), with the upload's
  progress on the message; the Vault's **Add files** as its plan says.
- **Share out:** where the phone has `navigator.share`, Share in the module frame and the Vault's share link offer
  **Share…** (the phone's sheet) beside **Copy link**.
- **Share in (question 12):** a `share_target` in the manifest so a photo, a link or text shared from another app
  lands in a "Send to a space" sheet: choose the space, then Chat, the Vault, Research or the Planner's Add from text.
  Only an installed app receives shares, and the planner's understanding is that this works on Android and not on
  iOS; the device pass confirms it.

## Offline and a flaky network (question 11)

- **Say it.** One banner under the top bar, "You're offline. Changes will not be saved until you're back.", shown
  from `offline` events and from a failed request, gone with "Back online." for three seconds.
- **Nothing lost silently.** A save that fails keeps the sheet open with its sentence and **Try again**; a Chat message
  that fails stays in the box marked "Not sent" with **Send again**.
- **Reconnect.** The live updates and the call already reconnect; the page refreshes what it shows on `online` and on
  `visibilitychange` back to visible (a phone that slept).
- **No cached pages yet.** `sw.js` keeps its "fresh pages" rule; caching the shell is a later choice (question 11).

## Performance budget (question 14)

Proposed, to be set from the audit's measurements, on a mid-range Android phone (the device pass) and in Chromium with
4x CPU slowdown and a "fast 3G" network (the check):

- A space's first view usable (the tab bar and the first view drawn, taps answered) within 4 seconds.
- The page's own scripts and styles for a space under a figure set from the audit, compressed; a module's code
  loaded only when the module is first shown on a phone.
- No long task over 200 ms while switching views; switching a view under 300 ms.
- Pictures in lists use a small size and `loading="lazy"`.

The product has no build step, so the budget is met by loading less, not by bundling (question 14 asks whether
minifying at serve time is allowed).

## Installability (question 10)

- **The manifest** on every signed-in page and on sign in (today: the space page and `/diag.html` only), with `id`,
  `start_url` set to Home, `display: standalone`, `background_color` and `theme_color` from the environment's theme
  tokens (not a fixed value), icons at 192 and 512 px and a `maskable` one, and `shortcuts` for the person's last
  spaces if Thomas wants them.
- **iOS:** the `apple-touch-icon` on every page that links the manifest, the status bar's colour from the theme.
- **Install help:** Profile gains one line on a phone that is not installed: "Add it to your home screen" with the
  phone's own steps (iOS has no install prompt). No pop-up asks.
- **The installed app's own Back:** in `standalone` on iOS there is no browser back button, so every sheet's Back
  and the space's top bar Back must be there (principle 4).
- A single-environment install keeps one manifest; with `BASE_DOMAIN`, each environment's manifest uses its own name,
  icon and theme.

## Notifications (question 13)

None today. A phone without them misses a call starting or a mention. The planner suggests leaving web push out of
this plan and giving it its own: it needs keys in environment variables, a subscription store in `DATA_DIR`, a push
handler in `sw.js`, a settings page for what notifies, and on iOS it works only in the installed app. Inside this
plan: the app badge (`navigator.setAppBadge`) for unread Chat in the installed app, where supported.

## Accessibility on touch

- **Tap areas** 44 by 44 px, measured by a check (`check-conformance` already measures the title bar's).
- **Focus:** a sheet takes focus on its title when it opens and returns it when it closes; Back is reachable first;
  a screen reader's swipe order follows the visual order (top bar, content, bottom bar).
- **Reduced motion:** sheets fade instead of rising under `prefers-reduced-motion` (as the object window plan says);
  no motion carries meaning.
- **Text size:** the page follows the phone's text size where the browser passes it on; no layout breaks at 200%
  zoom.
- **Labels:** every icon-only control has a name a screen reader reads; the bottom bar's tabs say their state
  (`aria-current`).

## Real devices and emulation

**What this container cannot check:** a real phone. There is no phone, no WebKit, no on-screen keyboard and no
LiveKit server here. Everything emulated is "checked by a tool" at best, never "verified live".

**The device pass (Thomas, or someone with the phones),** one short script per phone step:

| Device | Browser | Why |
|---|---|---|
| iPhone 13 Pro Max, iOS 26 (Thomas's, measured before) | Safari tab; the home-screen app | The installed app, safe areas, edge-swipe back, the keyboard |
| The same iPhone | Chrome for iOS | WebKit under a different shell; the bottom address bar |
| A small iPhone (SE or mini, 375 px wide) if one is to hand | Safari | The narrowest iPhone |
| A Pixel (any recent) | Chrome; installed | Android's back button, share target, install prompt, push later |
| A Samsung Galaxy A-series (360 px wide) | Samsung Internet and Chrome | The 360 px width, a mid-range CPU for the budget |
| An iPad | Safari | Wide and coarse: hover-only and drag-only controls |

Each pass: sign in, enter a space, join the call, switch to each view, open and close an object with back, edit and
save with the keyboard up, add a photo, lose the network and come back, rotate, install and reopen.

**The emulation layer for the checks (question 8).** The checks today drive Chromium over the DevTools protocol in
`tools/shots.mjs`. The planner suggests extending it rather than adding Playwright: a `phone` option on a tab that sets
`Emulation.setDeviceMetricsOverride` with `mobile: true`, the width, height and a device scale of 3,
`Emulation.setTouchEmulationEnabled` (with which Chromium should answer `pointer: coarse` and `hover: none`; the builder
confirms it in the Chromium the checks find), `Emulation.setEmulatedMedia` for `prefers-reduced-motion`, and taps and
long presses through `Input.dispatchTouchEvent`. Playwright's `hasTouch` and `isMobile` do the same
things in Chromium; its gain would be a WebKit build, which is still not iOS Safari. Safe-area insets have no stable
emulation in either; the plan proposes one token per inset in `system.css` (`--safe-top`, `--safe-bottom`,
`--safe-left`, `--safe-right`, each `env(safe-area-inset-*, 0px)`), used everywhere instead of `env()` directly, so a
check can set them to the measured iPhone's 47 and 34 px. The keyboard is approximated by shrinking the visual
viewport.

**What emulation cannot prove:** the real keyboard and how iOS scrolls the page under it, `100dvh` while the address
bar moves, the edge-swipe and the back button, installation and the standalone window, the share target, real touch
accuracy and scrolling against long press, the speed of a real CPU and radio, audio in the background or with the
screen locked, the camera and photo pickers, and HEIC and `.mov` handling.

## The checks to add

- **`tools/check-phone.mjs`** (new, Chromium, skips without it): every page and every module's view at 390 and 360 px
  with touch on: no sideways scroll of the page; every visible control's tap area at least 44 by 44 px; every field's
  text at least 16 px; nothing under the bottom bar or past the safe-area tokens; back closes the open sheet (one
  entry per sheet); the keyboard approximation keeps the focused field and Save visible.
- **`tools/check-touch.mjs`** (static, no browser): no `:hover` rule hides or shows a control or text unless the same
  rule has a `:focus-visible` or `(hover: none)` counterpart; every `draggable` or drag handler in a module has a
  menu entry the module registers for the same action (a list the module declares, checked by name); no raw
  `env(safe-area-inset-*)` outside the tokens.
- **`tools/check-breakpoints.mjs`**: unchanged lines; gains `(pointer: coarse)`, `(hover: none)` and
  `(orientation: landscape)` with a height as allowed forms.
- **`tools/check-manifest.mjs`**: the manifest's fields, its icons' sizes and that every page meant to install links it.
- **The budget:** a measured run (requests, bytes, time to the first view with the slowdown) that reports and, once
  Thomas sets the numbers, fails over them.

## Left to build, in order

Each step is built and checked on its own, leaves `npm run check` passing and bumps any module it changes. The kind
of build is Thomas's to name; the planner suggests a production build for steps 3 to 6 (every page uses them) and
feedback builds for the module steps.

| # | Step | Who | Blocked by questions |
|---|---|---|---|
| 0 | **Learn how common each layout is.** The tester device list (Thomas, no code), and, if chosen, the layout counters: `POST /api/layout-counts`, `DATA_DIR/layout-counts.json` by week, the environment variable, the pages' report, Manage's **Layouts** section with the "fewer than 5" rule, and a check. Shipped first so counts gather while the audit runs; the audit does not wait for them. | Thomas (the list), server-development (the route, the store, the check), experience-design (the report, the Manage section) | 18 to 21 |
| 1 | **The phone emulation and the audit.** The `phone` option in `tools/shots.mjs` (touch, `mobile: true`, 390 and 360, landscape, the inset tokens' override, the keyboard approximation); a run that screenshots every row of the audit; the findings filled into this plan's table. No product change. | server-development (the tool), quality-assurance (the run), product-planner (the table) | 8 |
| 2 | **The phone decisions.** Thomas decides questions 1 to 7, 22 and 23 on the audit's results and the tester list; product-planner records them here and in [plan-phone-space-bar](plan-phone-space-bar.md)'s status, and orders steps 11 to 14. No build. | Thomas, product-planner | 1 to 7, 22, 23 |
| 3 | **Foundations.** The width-class and input rules in `system.css` (the safe-area tokens, the coarse-pointer tap areas everywhere, not only in the frame); one SDK answer a module can ask (`host.screen`, proposed: `{ width, touch, hover, installed, orientation }` with a `change` event); `check-breakpoints` extended; `check-touch` (static). | experience-design, server-development (the check) | 1, 2 |
| 4 | **History: one entry per sheet.** The host's sheet stack; the editor window, the kind picker, the menus' drill-in, Set up and the phases sheet open through it; back closes; entering a space pushes once. | experience-design | 6 |
| 5 | **The shared phone pieces**, drawn for Thomas in the design system first, then built in the SDK: the full-screen sheet (top bar with Back, title, menu; the keyboard rule), the bottom sheet (menus, pickers, the Modules list), the bottom action bar (one primary action), the offline banner, the "Not sent" state. The object window's phone sheet uses the full-screen sheet. | experience-design | 2 |
| 6 | **The navigation model** as decided: the bottom bar, the Modules list, the top bar's Online and Leave, the call strip, the phone's own last view per space. Replaces the parts of the phone space bar it changes, cleanly. | experience-design | 3, 5, 15 |
| 7 | **`tools/check-phone.mjs`** at 390 and 360 for what steps 3 to 6 built; added to `npm run check`. | server-development | none beyond 6 |
| 8 | **The keyboard and fields:** the 16 px fields, `inputmode` and `enterkeyhint` everywhere, the phone's date and time pickers on touch, Chat's box above the keyboard. | experience-design | 9 |
| 9 | **Offline and reconnect:** the banner, failed saves kept with **Try again**, Chat's **Send again**, refresh on `online` and on waking. | experience-design | 11 |
| 10 | **Installability:** the manifest's fields and icons from the theme and the environment, linked from every page meant to install; `apple-touch-icon`; the install line in Profile; `check-manifest`. | server-development (the manifest), experience-design (the pages) | 10 |
| 11 | **Chat on a phone:** read and reply, **Add a picture**, link chips opening sheets, `enterkeyhint="send"`. | experience-design | 3 |
| 12 | **The Planner on a phone:** opens on today (the next stop and where), **Move to** in place of drag, add a stop from the bottom bar, the object window as its read view (with object window step 6). | experience-design | 4, 7 |
| 13 | **Calendar, To-do, Places with Maps, Polls, Research, Budget, Assistant**, one step each, each opening on its proposed primary task with the drags replaced. | experience-design | 4, 7 |
| 14 | **Home, Set up and Profile on a phone**, then sign in and Manage; the host console last. | experience-design | 16 |
| 15 | **Share out and share in:** `navigator.share` beside **Copy link**; the share target and "Send to a space" (after the Vault's first steps). | experience-design, server-development | 12 |
| 16 | **The budget**, measured and, once set, checked. | server-development | 14 |
| 17 | **Documentation:** [architecture-canvas](../architecture/architecture-canvas.md) "Phones", [architecture-navigation](../architecture/architecture-navigation.md), [api-module-sdk](../api/api-module-sdk.md) (`host.screen`, the sheets), the user guides, the changelog. | content-manager | each step as it lands |

Step 0 runs beside step 1 and blocks nothing. Steps 8 to 10 depend only on step 3 and can go in any order. Steps 11
to 14 need steps 4 to 6, and their order (and the modules inside step 13) follows question 22: the default order until
the counts say otherwise. Step 15 waits on the
Vault.

## Verify

- **Step 0.** The check posts layouts to a throwaway server (`DATA_DIR=/tmp/<name>`) and reads the store: only the
  classes are kept, no IP, user key, user agent or pixel width; counts under 5 show as "fewer than 5"; without the
  environment variable the route answers 404 and the pages send nothing. Checked by a tool. Real counts from real
  phones only on Thomas's host.
- **Step 1.** The run's screenshots at 390 and 360, portrait and landscape, light and dark, reviewed by Thomas; the
  emulation itself checked by a page that prints what it sees (`/diag.html`: the width, `pointer: coarse`,
  `hover: none`, the inset tokens). Checked by a tool.
- **Step 3.** `check-touch` and `check-breakpoints` pass, and fail on a copy with a hover-only control and with a raw
  inset. `host.screen` answers correctly under emulation at 390 touch, 390 mouse, 1280 touch and 1280 mouse.
- **Step 4.** In headless Chromium: open a sheet, back closes it; open a sheet over a sheet, two backs close both; an
  edited sheet asks first; switching views adds no entry; back from a space's base goes to Home. The iPhone's edge
  swipe and Android's back button only on the devices.
- **Steps 5 and 6.** `check-conformance` and `check-phone` at 390 and 360; the call strip with the faked LiveKit
  (`check-call-bars`), which shows the strip, not real audio. A real call (hearing, the microphone while another view
  shows, the screen locked) needs a real LiveKit and a real phone.
- **Steps 7 to 10.** `check-phone`, `check-manifest`; offline with the DevTools protocol's network emulation; the
  keyboard by the viewport approximation. Installing, the standalone window, the real keyboard: device pass only.
- **Steps 11 to 14.** Each module's view at 390 and 360 with touch: its primary task done by taps only (no drag, no
  hover, no key), `check-modules` and `check-module-versions` pass; then the device pass.
- **Step 15.** `navigator.share` exists only on some browsers in Chromium headless; the share target only on an
  installed Android app: device pass only.
- **Not checkable here:** every real phone, Safari and WebKit, the real keyboard, the back gesture, installation,
  share in, notifications, the camera, a real call, a real network and CPU, a screen reader on a phone.

## How it relates to other plans

- **[plan-object-window](plan-object-window.md)** (draft): its phone section (the full-screen sheet with Back, Save in
  the top bar, one bottom action, 44 px and 16 px, the keyboard, one history entry) is this plan's full-screen sheet
  and history step. The planner suggests this plan owns the shared sheet and the history stack (steps 4 and 5) and the
  object window uses them, so its step 1's phone part and its step 4's back handling are built once, here. If the
  object window is built first, its sheet becomes the shared one and this plan's step 5 starts from it.
- **[plan-call-as-module](plan-call-as-module.md)** (draft): the call strip and the Call tab's dot read
  `host.call.state`; the host draws the phone's bars, the call module draws only its content. Built before that plan,
  the strip reads today's `space.js` state and moves to `host.call.state` with that plan's step.
- **[plan-phone-space-bar](plan-phone-space-bar.md)** (built): today's tab bar. Question 3's (a) keeps it; (b) and (c)
  replace parts of it, which needs Thomas's word since its decisions are his.
- **[plan-unified-layout](plan-unified-layout.md)** (approved): its builders (`host.ui.list`, `host.ui.card`,
  `host.ui.table`, `host.ui.form`) should be phone-first when they come: a list's row actions in its menu, a table as
  rows on a phone, a form in the full-screen sheet.
- **[plan-design-system](plan-design-system.md)**: the 44 px, 16 px and row rules; the approved Phone tab bar family
  would be redrawn for question 3's (b) or (c); the new pieces in step 5 are drawn for approval before they are built.
- **[plan-attachments-vault](plan-attachments-vault.md)** (approved): its phone parts stand; its share sheet and file
  chooser sheet are built on step 5's pieces.
- **[plan-layout-menu](plan-layout-menu.md)** and **[plan-docked-limit](plan-docked-limit.md)**: no Layout and no
  limit on a phone, unchanged.

## Open questions

Each has options and the planner's suggestion, marked as such. The table above says which step each blocks.

1. **What makes the phone shape.** (a) Width only, as today: 640 px and below. (b) Width for the shape, input for the
   touch rules (tap areas, no hover, long press), independently. (c) A device guess from the user agent. (a) keeps
   tablets on hover-only controls; (c) is wrong often and breaks on new devices. *Suggestion: (b).* Blocks steps 2
   and 3.
2. **A phone held sideways.** (a) The desktop shape, as today (it is 844 px wide). (b) The compact shape when the
   pointer is coarse and the height is 500 px or less, with the call's tiles using the width. (c) Ask the installed app
   to stay portrait. (c) only works installed and stops a person watching the call sideways. *Suggestion: (b).*
   Blocks step 3.
3. **The bottom bar.** (a) Today's tab bar: every open view a tab, the rest in the **…**. (b) One module at a time
   with a switcher in the top bar (its name and a chevron), and the bottom bar holding that module's own actions.
   (c) A fixed bar: Call, Chat, the module being used, and **Modules** (a full-screen list); Leave in the top bar's
   menu, Online beside the space's name. (a) moves tabs as modules open and close; (b) hides the call and Chat a level
   down. *Suggestion: (c).* Blocks steps 2 and 6.
4. **Each module's primary phone task.** The audit table proposes one per module (the Planner: what is next today and
   where; Budget: add a cost on the spot; Polls: vote). (a) Take them. (b) Correct them row by row. *Suggestion: (b),
   in the review of step 1.* Blocks steps 12 and 13.
5. **The call while another view shows.** (a) The tab's dot only, as today. (b) A call strip above the bottom bar:
   who is talking, the microphone, hang up. (c) A floating picture of the speaker that can be moved. (c) is a drag
   and covers content. *Suggestion: (b).* Blocks step 6.
6. **Back and views.** (a) Switching views replaces the history entry; sheets push one each; back from a space's base
   goes to Home, asking first while in the call. (b) Switching views pushes too, so back walks through them. (c) No
   history; Back buttons only. (c) leaves the back gesture leaving the page. *Suggestion: (a).* Blocks step 4.
7. **Drag on a phone.** (a) Menu entries only (**Move to**, **Move up**, **Move down**). (b) Long press to pick up and
   drag. (c) Menu entries first, long press later where a list is reordered often. (b) fights scrolling and is
   invisible. *Suggestion: (c).* Blocks steps 12 and 13.
8. **The emulation layer.** (a) Extend `tools/shots.mjs` over the DevTools protocol; no new dependency. (b) Add
   Playwright as a dev dependency, for `hasTouch`, `isMobile` and a WebKit build. (b) adds a large dependency and a
   second browser download to every check run; its WebKit is still not iOS Safari. *Suggestion: (a).* Blocks step 1.
9. **Date and time on a phone.** (a) The phone's own pickers (`type="date"` and `"time"`) on a coarse pointer. (b)
   The SDK's own picker everywhere. (a) is what a phone person knows, and the fastest; (b) keeps one look.
   *Suggestion: (a).* Blocks step 8.
10. **Installing.** (a) The manifest everywhere a signed-in person goes, from the theme and the environment, maskable
    icons, Home as the start, an install line in Profile. (b) As today. (c) (a) plus `shortcuts` to the person's last
    spaces. *Suggestion: (a),* with (c) later. Blocks step 10.
11. **Offline.** (a) Say it, keep unsaved work, nothing cached (the service worker keeps "fresh pages"). (b) (a) plus
    a cached shell, so the installed app opens to a "You're offline" page instead of the browser's error. (c) Offline
    reading and queued changes. (c) is a sync engine. *Suggestion: (a) now, (b) as a later step.* Blocks step 9.
12. **Share in.** (a) A share target and "Send to a space" (Android, installed). (b) Not now. *Suggestion: (b) until
    the Vault's first steps land, then (a).* Blocks step 15.
13. **Notifications.** (a) Not in this plan; its own plan for web push (call started, a mention). (b) Web push here.
    (c) None ever. *Suggestion: (a),* with the app badge for unread Chat in this plan. Blocks nothing here.
14. **The performance budget.** (a) Set the numbers from the audit's measurements. (b) Take the proposed ones now.
    And: may the server minify scripts and styles as it serves them (the product has no build step)? *Suggestion: (a),
    and no minifying until the measurements say it matters.* Blocks step 16.
15. **What a phone remembers.** (a) Its own last view per space, apart from the desktop's layout. (b) The desktop's
    layout, read as "the first open module". *Suggestion: (a).* Blocks step 6.
16. **Pages for the owner and the admin.** (a) Every page made for the phone. (b) Home, Set up and Profile made for
    the phone; sign in made for it; Manage and the host console usable (nothing cut or scrolling sideways) but not
    redesigned. (c) Manage and the host console say "Open this on a computer." *Suggestion: (b).* Blocks step 14.
17. **Where this goes in the queue.** (a) Steps 1 and 2 now, the rest after the object window's steps 1 to 4. (b) Now,
    ahead of the object window, so the window is built on the shared sheet. (c) After unified layout slices 10 to 13.
    *Suggestion: (a),* since the audit changes nothing and informs both plans. Blocks the start.
18. **What a layout is, for counting.** (a) The window's width class only. (b) The window's class, each shown
    module's width bucket and how it is shown, input, orientation and display mode. (c) (b) plus exact pixel widths.
    (a) misses a narrow docked module on a wide window; (c) is more identifying and the buckets already decide
    everything. *Suggestion: (b).* Blocks step 0.
19. **How we learn how common each layout is.** (a) Layout counters in the product. (b) A tester device list only.
    (c) An outside benchmark only. (d) The tester list now and the counters, with a benchmark as a sanity check.
    (b) misses module widths and anyone who is not a tester; (c) does not fit a small trip group. *Suggestion: (d).*
    Blocks step 0, and the order of steps 11 to 14.
20. **Counters on or off, and who sees them.** (a) Off unless an environment variable turns them on (proposed
    `LAYOUT_COUNTS=on`), shown in Manage to the admin and the owner, with one line in Profile: "This site counts
    screen sizes, not people." (b) On by default, with an owner switch to turn them off. (c) On by default, no switch.
    (b) and (c) change how an install that sets nothing behaves, against the single-environment rule.
    *Suggestion: (a),* turned on for Thomas's own host. Blocks step 0.
21. **The role in the counts.** (a) Counted, with the "fewer than 5" rule. (b) Not counted. In a group of six a role
    and a phone can name a person, but the assumption in question 23 is by role, so without it the data cannot test
    it. *Suggestion: (a).* Blocks step 0.
22. **The width targets and the default order.** (a) Take the targets table and the order in "How the data decides
    the core experience", reviewed after four weeks of counts. (b) Change them. *Suggestion: (a).* Blocks the order of
    steps 11 to 14.
23. **The assumption until data exists.** (a) Phone first for members and guests, desktop first for planning and
    admin work (still usable at 390 px). (b) Phone first for everyone. (c) Desktop first until the counts say
    otherwise. (c) is how the phone became a shrunk desktop; (b) makes Manage and the Planner's whole-trip planning
    wait on phone designs few will use. *Suggestion: (a).* Blocks step 2.
