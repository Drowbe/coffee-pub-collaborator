# Editor Window Plan

**Audience:** Thomas, who decides how a module's Add and Edit forms open and how the Planner's form asks what kind of thing is being added; and the sessions that build it: experience-design (`public/sdk/host.js`, `public/module-host.js`, `public/canvas.js`, `public/style.css`, and each module's page), server-development (the checks in `tools/`). No server change.

**Status:** approved by Thomas, 2026-10-04, taking the draft's suggested answer to all fifteen questions (decisions 1 to 15); nothing built. From GitHub #192 (`priority: now`), Thomas: "when we add or edit, we seem to stuff those screens into the module area. Why? That is a horrible experience and is easily ruined by having to scroll the edit/add window within the module window." The issue's direction: a module asks for its Add and Edit form to open large and centered over the canvas, full screen on a phone, sized to the form rather than the module, for all six modules. It also takes in GitHub #193, Thomas about the Planner's **Add to the plan**: "this is a horrible experience. It takes up so much space. Is there a better way to do this? like a filter input/dropdown combo that still shows the color and icons we will use?" That is Part 2.

## Why the forms are squeezed

**How a module runs.** `runModeOf` in `server/modules.js` decides it ([architecture-modules](../architecture/architecture-modules.md), "Run modes"):

- **In the page.** Every module that ships with Collaborator runs this way unless the admin chose otherwise: To-do, the Planner (`travel`), Calendar, Polls, Research, Places, Maps, Stream and the Assistant. `startInPage` in `public/module-host.js` gives it a container (`.module-root`) with a shadow root, puts its style, markup and script there, and hands it its SDK directly.
- **In a sandboxed frame.** A module someone uploads runs in an `<iframe sandbox="allow-scripts allow-forms">` with an opaque origin, talking to the page only by `postMessage`, unless the admin switches it to the page after a warning.

**Why there are frames at all.** The frame exists only to contain code nobody here wrote. A module in a frame cannot read the page, its cookies or its storage, cannot call the network, and can do only what the SDK lets it, which the server checks against the permissions the admin approved. A module in the page could bypass all of that, which is why the bundled modules (trusted, shipped with the server) run in the page and an uploaded one does not. Nothing about the forms needs a frame.

**So the six forms are clipped by their module's window, not by a frame.** Each module draws its form as an overlay inside its own root: `#editor` holding `form#form.editor-card`, styled `.editor { position: absolute; inset: 0; overflow: auto; ... }`. The overlay is exactly the module's window, and the form scrolls inside it. The six:

| Module | Markup | Code | Opens with |
|---|---|---|---|
| To-do 1.14.0 | `#editor` in `modules/todo/src/todo.html` | `openEditor` and `closeEditor` in `todo.js` | **New todo** in the action bar, a click on a task, a drop, Chat's `/t` |
| Planner 0.13.1 | `#editor`, filled from `tpl-editor2` (an object) or `tpl-editor-trip` (the plan) in `travel.html` | `openEditor(mode, item, place)` in `travel.js` | the bar's add, the day's "...", the + on a joint, an object on the plan |
| Calendar 1.23.0 | `#editor` in `calendar.html` | `calendar.js` | the bar, a day, an event |
| Polls 1.14.0 | `#editor` in `polls.html` | `polls.js` | the bar, a poll |
| Research 0.3.0 | `#editor` in `research.html` | `research.js` | the bar, a note, a link, a photo, an answer |
| Places 0.9.1 | `#editor` in `places.html` | `places.js` | the bar, a place, Maps' `newPlace` |

Every one of them, today:

- **Scrolls inside the window.** A docked module is a column (at least 240 px wide), a floating one as small as 240 by 160 px. The Planner's form is the tallest: its kind tiles alone are about 800 px before **Title** (Part 2).
- **Has no focus trap.** Tab leaves the form for the list behind it, the canvas and the header. Nothing returns focus to what opened it.
- **Closes on Escape** with a keydown listener on the module's root, and nothing asks about unsaved changes. None of the six tracks whether anything changed.
- **Is not a dialog to a screen reader:** a `div` with no role, no label and nothing hiding the rest.
- **On a phone** fills the module, which fills the screen, so a phone is already close to right; only Places says so in a plan ([plan-map-destination](plan-map-destination.md): "The dialog fills the screen").

**Menus do not escape either.** #192 said menus avoid this through `host.menu.show`. They do not: `showMenu` in `public/sdk/host.js` appends the menu to the module's own root and clamps it to `rootElement`, the module's box ([architecture-module-window](../architecture/architecture-module-window.md), "The action menu": "drawn inside the module's own frame"). The same is true of `host.ui.datePicker`'s popover and `host.actions.pick`. Only the host's own overflow menus (`openHostMenu` in `public/host-menu.js`) draw outside a module, and they serve the host's chrome, not a module. So there is no path today for a module to draw anything bigger than its window. This matters below: a date picker or a menu opened from inside the new editor window must not fall back into the module's box.

**What else touches an open form.**

- **Drops into the form.** To-do links a dropped object to the open form's link field (`dropTarget` in `todo.js`, the `.editor.drop` class). The host's drag brokering (`ptrTarget` in `public/module-host.js`) finds the module under the pointer by its container's box.
- **Moving a module.** `moveModule()` in `public/canvas.js` moves a module's container between docked and floating without reloading it, so an open form survives. The docked limit ([plan-docked-limit](plan-docked-limit.md)) can float a module when the window narrows. Popping the call out reopens every module in the new window, losing whatever was open.
- **The space page's keys** (`onKey` in `public/space.js`): M, V, D, C, L, R, S, F and 1 to 6, and the person's mute and camera hotkeys (Cmd or Ctrl+D and +E by default) and push to talk, all on `document`, ignored while typing in a field (`typing()` reads the event's composed path, so a field in a shadow root counts).
- **Several people at once.** Each module checks a version on save: To-do says "Someone changed this task since you opened it. Close it and open it again." (a 409). Live changes redraw the list behind an open form; they do not touch the form.

## The options for #192

Six were weighed. Each is judged on the same points; the lean is at the end and is a suggestion.

### A. A native modal dialog, from a shared SDK helper (chosen, decision 1)

The module's `#editor` becomes a `<dialog>`, opened with `showModal()` through a new SDK helper, `host.ui.editor`. A modal dialog is drawn in the browser's **top layer**, above everything on the page and outside every box, even from inside a shadow root: no `overflow`, `z-index` or container clips it. It stays in the module's shadow tree, so the module's own styles, the base stylesheet and the theme tokens (which inherit through the shadow root) still apply to it.

- **Per module:** small. The markup's `<div id="editor" class="editor" hidden>` becomes `<dialog id="editor" class="sdk-editor">`; the `.editor` overlay rule goes; `$('editor').hidden = false/true` becomes `editor.open()` and `editor.close()`; the module's own Escape listener goes; an `isDirty` test is added. The form inside, its ids and its code stay. About half a day each, the Planner a day.
- **Host:** the helper in the SDK (sizes, the phone sheet, the close button, Escape, focus, the discard question), and moving the SDK's popovers into an open editor. No server change.
- **Focus and keyboard:** the browser traps focus in a modal dialog and makes the rest of the page inert; Escape fires the dialog's `cancel`, which the helper handles. Returning focus is the browser's on close, and the helper takes an explicit element for when the opener was redrawn.
- **Screen readers:** a modal dialog is announced as a dialog, labelled by its heading (`aria-labelledby`), and the page behind is hidden from the reader while it is open.
- **Phones:** the same element styled as a full-screen sheet below 640 px.
- **Unsaved changes:** the helper asks the module's `isDirty()` before closing on Escape or the close button.
- **Several people:** unchanged; the module's version check still answers.
- **Costs and what it rules out:** while it is open the rest of the page is inert. The call's buttons cannot be clicked (its keyboard keys still work: see "The call while editing"), another module cannot be dragged into the form (To-do's drop on its link field is lost while the form is open; its search stays), and the host's own overlays (an aside's recall countdown, away) show under the backdrop. `::backdrop` inherits the theme tokens only in current browsers (Chrome 122, Firefox 120, Safari 17.4 onward); older ones show the plain backdrop.
- **Third-party authors:** call `host.ui.editor` on a `<dialog>`. A module that does not keeps working exactly as today, clipped as today.

### A2. The same, but not modal (the `popover` attribute)

`popover="manual"` also draws in the top layer, without making the page inert: the call's buttons stay clickable and another module can be dragged into the form. But nothing traps focus or hides the page from a screen reader, so the helper would build both by hand, and the drag brokering would have to learn the form's box as a second drop area of its module. Roughly twice the host work of A, for two things (clicking the call's buttons mid-form, dragging into a form) that the keyboard keys and the link search already cover.

### B. Open the module's own page a second time, in a window the host draws

The host draws a large dialog of its own and mounts the module a second time inside it (a second container, or a second frame), with something like `?editor=<pointer>`. Works the same for a module in a frame.

- **Per module:** large. The second copy starts cold: it loads its data again and must be told everything the form was opened with, as text: the pointer, a prefill from a drop or from Chat (`/t`), the place the Planner's + stood at, the To-do form's links. The Planner's form reads the whole plan (days, joints, phases, people), so its second copy loads the whole Planner. Save happens in the second copy; the first hears it through the live stream.
- **Host:** a dialog, a second mount with its own stream subscription and nav registrations to keep apart, the handoff, and closing both ways.
- **Memory:** two copies of the module's script and data per open form; the Planner's script is about 3,700 lines with its libraries.
- **Focus, readers, phones, unsaved changes:** as A, drawn by the host.
- **Third-party authors:** a new start-up mode to support. Old modules unchanged.
- Too much per module for what it buys; worth keeping only as the way to reach a frame, and option C does that more cheaply.

### C. Grow the module's own window while editing

The host lifts the module's container (or frame) out of the layout to a large centered box with `position: fixed`, and puts it back on close. One copy, no handoff.

- **Per module:** almost none; the module's overlay simply gets bigger.
- **Host:** the lift, a backdrop, making the rest of the page inert by hand, focus return, and putting the box back in its column, floating box or window.
- **Costs:** the whole module is drawn at the large size, not just the form: the list behind reflows to the wide layout (the Planner's `.app.narrow` turns off, say) and snaps back on close, losing its scroll. Docked, the column stays where it was with nothing in it while lifted. A floating module's box sits in the floating layer (`z-index: 25`), so the lift stays under the host's menus (26) and pages opened over the call (30). This is the right tool only where nothing better reaches: a sandboxed frame, whose top layer is the frame's own.
- **Third-party authors:** for a frame, the same `host.ui.editor` call as A; the SDK asks the host to lift the frame.

### D. Edit in the popped-out window

**Pop out** already opens the module in its own window (`popOut()` in `public/canvas.js`). Editing there means a reload (the open form and its draft are lost), a popup a browser may block, a second window to manage beside the call, and nothing on a phone, where pop-out is hidden. It does not answer the complaint, which is about the module on the canvas.

### E. The form described as data, drawn by the host (a schema form)

The host draws every form from a description. Consistent, and it would work for a frame. But each module rewrites its form and keeps none of its behaviour: the Planner's fields by kind, the round trip's second leg, the flight lookup; To-do's link search and rules; Research's formatting bar and suggested tags; Places' **Where**. A rewrite of six forms, and a new contract every time a module needs a field the schema lacks. Not recommended.

### The choice

A for every module in the page, which is all six; C as the same helper's path in a sandboxed frame, built after the six. One SDK call, two ways of drawing it, and a module that does not call it works as before.

## Part 2: the Planner's kind picker (#193)

### What it is today

The Planner's form (`tpl-editor2` in `modules/travel/src/travel.html`) opens with `#f-types`, a grid of buttons (`.tile[data-type]`, 84 px wide, icon over name) in seven groups before **Title**:

| Group | Tiles | From |
|---|---|---|
| Getting there | Flight, Train, Ferry, Bus, Car, Taxi, Ride share, Shuttle | the markup; `JOURNEY_TILES` in `travel-lib.js` |
| Stay | Stay | the markup |
| Eat and drink | Restaurant, Café, Bar | the markup; `STOP_TILES` |
| See and do | Sight, Museum, Tour, Show | the markup; `STOP_TILES` |
| Other | Note | the markup |
| Time | Free time, Rest, Buffer, Meet-up, Leave by, Travel day, Free day | `addTileGroup('Time', 'block')` in `travel.js` |
| Between days | the same seven | `addTileGroup('Between days', 'lane')` |

31 tiles. **Icons:** `data-icon` (Font Awesome names, drawn with `host.ui.icon`); the same names the plan's objects show as badges (`BADGES` in `travel-lib.js`). **Colours:** a tile of the first five groups is the accent turned round the colour wheel by its family (`--turn` per `data-type` in `travel-lib-editor.css`, with `oklch(from var(--accent) ...)` where the browser has it), so a tile and the object it makes look alike under any theme. A marker tile takes its marker type's own colour (`--marker`), a hex value from the Planner's **markers** setting (`DEFAULT_MARKER_TYPES` until an owner changes it). Choosing a tile calls `applyType(tile)`, which shows the fields that kind needs (`[data-types]` and `.on-type`), words the labels, and sets **Where**'s choices. A new object starts on Sight, or on the kind the day's "..." or the + chose.

**The two marker groups are one choice asked twice.** Both list the marker types that are not automatic. A `block:` tile makes a marker **in a day** (`kind: 'block'`: with a time it is a row in the day, without one a tag on the day's header); a `lane:` tile makes a marker **between days** (`kind: 'lane'`: on the line at a joint, never timed). The stored difference is real, but it is a difference of **where**, not of **what**, and the form already has a **Where** field (`f-date`) listing the days and the joints interleaved; picking a `lane:` tile only narrows Where to the joints (`placeOptions(..., { jointsOnly: true })`). Every other kind of thing can stand at a joint already without being a different kind. So the picker should show each marker type once, and Where should decide which of the two it is stored as (a day: `block`; a joint: `lane`). The model is unchanged.

**Other modules.** None of To-do, Calendar or Polls has kinds to pick. Research's note **Type** (`#f-icons`, a row of icon buttons from `NOTE_ICONS`) and Places' **Category** (a plain `select#f-category`) are the two other choices that would fit the same piece later. The Planner's **Move to** picks a place, not a kind, and is a menu; it stays one.

### The options for #193

- **A shared combobox in the SDK, `host.ui.kindPicker` (chosen, decisions 11 and 14).** Closed, one row: the chosen kind as a chip with its icon in its colour and its name. Typing filters; the open list shows the groups, each kind with its icon and colour, recently used kinds first. The ARIA combobox pattern. On a phone the list is a sheet inside the editor's sheet. A general piece (any list of named, iconed, coloured choices in groups), so Research's Type and Places' Category can use it later. About two days in the SDK, a day in the Planner.
- **The Planner's own combobox.** The same, written into `travel.js`. Cheaper by the SDK's packaging, but CLAUDE.md's rule is that a second user moves it into the SDK, and the Planner's own day "..." already lists the same kinds through `host.menu.show`.
- **Keep the tiles, folded.** The chosen tile alone, with **Change** opening the grid. Keeps the look, still about 800 px when changing, no filtering.
- **A plain `<select>`.** One row and native everywhere, but no icons and no colours, which is the thing Thomas asked to keep.

## Decisions

The issues fix the aim: Add and Edit forms open large over the canvas, full screen on a phone, sized to the form, in all six modules (#192); the Planner's kind choice takes far less of the form and keeps its colours and icons (#193). Thomas, 2026-10-04, taking the draft's suggested answer to each question:

1. **Forms open in a window over everything**, drawn from the module's own form (a modal `<dialog>` through `host.ui.editor`, option A). It is the only option that keeps each module's form and code as they are and is not clipped by the module's window.
2. **The page waits behind an open form;** the call's keys (M to mute, the mute and camera hotkeys, push to talk) still work. A modal dialog gives the focus trap and what a screen reader needs for free; a page that stays usable would cost about twice the build.
3. **Escape or Close after typing asks "Discard your changes?"** Nothing typed is lost by a stray key.
4. **A click outside the form does nothing.** The same reason.
5. **Two sizes:** the Planner's object form large (880 px), every other form medium (560 px). The Planner's form is the one that needs the width.
6. **On a phone the form fills the screen,** as a sheet. A phone's screen is the module's window already.
7. **A Close button in the form's corner,** beside the module's own Cancel. A way out that is always in the same place.
8. **Save is always in view:** the button row stays at the bottom while the form scrolls. Scrolling to find Save is part of #192.
9. **Dropping another module's object onto an open To-do form goes while a form is open;** the link search stays. The page behind a modal form cannot be a drop source.
10. **Uploaded modules in a sandboxed frame:** the same call, the frame growing over the canvas, as a later step (step 11). No bundled module runs in a frame.
11. **The Planner's kind choice is a one-row field you can type in to filter,** showing each kind's icon and colour, recent kinds first (#193).
12. **One Markers group:** each marker type once, and **Where** decides whether it is stored in a day (`block`) or between days (`lane`). The two groups were one choice asked twice.
13. **A new object starts on the last kind used, else Sight,** with the kind field focused so typing starts the search.
14. **The kind picker is part of the SDK** (`host.ui.kindPicker`), for Research's note Type and Places' Category later.
15. **The editor window comes first** (#192, steps 1 to 8), then the kind picker (#193, steps 9 and 10).

## The contract

### The SDK: `host.ui.editor`

```js
const editor = host.ui.editor(host.root.getElementById('editor'), {
  size: 'medium',              // 'medium' (560 px) or 'large' (880 px); the Planner's object form is 'large'
  isDirty: () => changed(),    // optional: true when closing would lose something the person typed
  onClose: (reason) => {},     // after it closed: 'cancel' (Escape, the close button, or a discard), 'done' (the module called close())
});
editor.open({ focus, returnTo });  // shows it; `focus` an element inside (else the first field), `returnTo` an element or a function giving one, focused on close
editor.close();                    // closes at once, nothing asked (after Save or Delete)
editor.isOpen;                     // true while it is open
editor.element;                    // the <dialog>
```

- The element must be a `<dialog>` in the module's root; anything else throws "host.ui.editor needs a <dialog> element". The SDK adds the class `sdk-editor` and the size class (`sdk-editor-medium`, `sdk-editor-large`), and `aria-labelledby` pointing at the first heading inside when the dialog has neither `aria-label` nor `aria-labelledby`.
- **Opening** calls `showModal()`. A second `open()` while open only moves focus. Two modules may each have one open; the newer is on top and Escape closes it first.
- **The close button.** The SDK draws `button.sdk-editor-close` in the dialog's top right corner: the `xmark` icon, `aria-label` and `title` "Close". It closes as Escape does. The module's own **Cancel** stays and calls `close()` through the same question (below) when the module wants it to, or `close()` directly.
- **Escape** is the dialog's `cancel` event: the SDK prevents the browser's own close, stops the key from reaching the module's and the page's listeners, and closes through the question. An Escape that closes a list inside the dialog (a date picker, a menu, the kind picker) closes only that list.
- **The question.** When `isDirty()` says true, closing by Escape or the close button does not close: a row, `.sdk-editor-discard` with `role="alertdialog"`, appears at the bottom of the dialog reading "Discard your changes?" with **Keep editing** (focused) and **Discard**. Keep editing (or Escape again) takes the row away and puts focus back where it was; Discard closes with `onClose('cancel')`. When `isDirty` is not given, or says false, it closes at once.
- **A click on the backdrop** does nothing.
- **Focus on close** goes to `returnTo` when it is given and still in the page, else to whatever had focus before `open()`, else to the module's root element.
- **Layout.** Centered, `width: min(<size>, 100vw - 32px)`, `max-height: calc(100dvh - 48px)`; the dialog's content scrolls inside it, and a button row the module marks `sdk-editor-actions` sticks to the dialog's bottom, so **Save** is always in view. Colours from the tokens: `background: var(--bg-section)`, `color: var(--text)`, `border: 1px solid var(--border)`; the backdrop `color-mix(in srgb, var(--bg) 70%, transparent)`, the same tint the overlays use today.
- **Phones** (640 px wide or less, the canvas's `narrow`): a full-screen sheet, `top: 0` with `height: 100dvh` (never `inset: 0`; see [architecture-canvas](../architecture/architecture-canvas.md), "What an iPhone reports"), padded by the safe-area insets, no backdrop showing, the close button and the action row at 44 px for touch.
- **Reduced motion:** no transition when `prefers-reduced-motion` is set; otherwise a short fade, nothing that slides.
- **The styles** go in `/sdk/host.css` (the base stylesheet), so they reach a module in the page (scoped into its shadow root by `startInPage`), in a frame and on its own page alike. The space page's policy allows them as it is (`style-src 'self' 'unsafe-inline'`).

### Popovers inside an open editor

`host.ui.datePicker`, `host.menu.show`, `host.actions.pick` and `host.ui.kindPicker` (Part 2) today append to the module's root and clamp to its box. When the control they open from is inside an open `.sdk-editor`, they append to that dialog instead (so they are in the top layer with it, not inert under it), position with `position: fixed` against the window, and clamp to the window less 4 px. Everywhere else they behave as now.

### Moving a module with its editor open

`moveModule()` in `public/canvas.js` (docked to floating and back, including the docked limit's floats) moves the container, which takes an open modal dialog out of the top layer. After a move the host sends the module the event `moved`; the SDK, when its editor was open, opens it again modal with the same focus. Popping the call out, or the module into its own window, reopens the module, so an open form is lost as it is today.

### The call while editing

The call's buttons are inert while an editor is open. Its keys keep working, because they are on the page's `document` and the dialog's keys reach it: M, V and D, the mute and camera hotkeys, and push to talk (ignored while typing in a field, as now). The SDK stops only Escape. Nothing in `public/space.js` changes.

### A module in a sandboxed frame (the later step)

The same `host.ui.editor` call. Inside a frame the SDK first asks the host to lift the frame (`editor.lift` over the bridge, `{ open: true, size }`), then shows the dialog modal inside the frame, which now fills the lifted frame. On close it asks `editor.lift` `{ open: false }`.

- The host (`public/module-host.js`) gives the frame the class `module-editor-lifted` (`position: fixed`, centered at the size asked, the phone sheet below 640 px), adds `div.module-editor-backdrop` behind it, sets `inert` on the page's other parts (the header, the canvas's other modules, the floating layer's other modules), and on close takes all three away and puts focus back on what had it before the lift.
- The module behind the form is drawn at the large size while lifted; that is accepted for frames only.
- Until this step is built, `host.ui.editor` in a frame shows the dialog modal inside the frame: clipped to the module's window as today, but with the focus trap, Escape, the close button and the question.

### Each module's migration

The same in all six: `#editor` becomes `<dialog id="editor" class="sdk-editor">` with the form inside as now; the `.editor` overlay rule and its `.narrow` padding go; the button row gets `sdk-editor-actions`; `$('editor').hidden` reads become `editor.isOpen`; the module's own Escape-closes-the-form listener goes (a Planner menu still closes on Escape); `isDirty` compares the form with what it opened with. Every element id inside stays. Each module's version goes up one minor.

- **To-do.** `isDirty`: the title, notes, due date, reminder, done, **Where**, the links and the rules against what it opened with. The drop on the open form's link field is removed (the page is inert under a modal); `dropTarget`'s other cases stay. `returnTo`: the task's row after a save (found again by its id, since `render()` redraws the list), else the **New todo** button.
- **The Planner.** `size: 'large'` for an object, `medium` for the plan (`tpl-editor-trip`). The template is still cloned into `#editor` on open. `CONTRACT.md`, "The editor", and `design/editor.html` follow.
- **Calendar, Polls, Research, Places.** As above. Places on the Map destination's panel opens over the whole destination page. Research's and Places' `CONTRACT.md` follow.

### The SDK: `host.ui.kindPicker` (Part 2)

```js
const kind = host.ui.kindPicker(host.root.getElementById('f-types'), {
  label: 'What is it',
  groups: [
    { label: 'Getting there', options: [{ id: 'flight', label: 'Flight', icon: 'plane', color: '<a CSS colour>', words: ['plane', 'air'] }] },
  ],
  value: 'sight',
  recent: { key: 'add', max: 4 },  // recently chosen first, kept in this browser for this module (as host.actions.pick's remember)
  onChange: (id) => {},
});
kind.value;            // the chosen id
kind.set(id);          // choose without onChange
kind.setGroups(groups);// a new list (marker types change in the settings)
kind.disabled = true;
kind.focus();
```

- **Closed:** one row, `--bar-control-h` (38 px) tall: an `input[role=combobox]` showing the chosen kind's name, with its icon in its colour on a tinted chip at its start (the `color` set as `--kind-color`) and a chevron at its end.
- **Open** (a click, typing, Alt+Down, or Down): a `ul[role=listbox]` under the field, up to 360 px tall and scrolling, the groups as `role=group` with their label, each option `role=option` with its icon in its colour and its name. **Recent** comes first when `recent` is given and something was chosen before (up to `max`, not repeated below). Typing filters by name and `words`, matching the start of any word; a group with nothing left goes; "Nothing matches" when none do.
- **Keys** (the ARIA combobox pattern, editable with a list, `aria-autocomplete="list"`): Up and Down move the active option (`aria-activedescendant`), Home and End go to the first and last, Enter or Tab chooses it, Escape closes the list and puts the chosen name back (a second Escape is the editor's). The field keeps focus throughout. `aria-expanded` and `aria-controls` on the field.
- **On a phone:** the list opens as a sheet over the editor's lower part, filling at least half the screen, with the field at its top, inside the editor's dialog. Choosing closes it.
- **In an open editor** it follows "Popovers inside an open editor".
- **Colours:** any CSS colour per option. The Planner passes its families' accent turn (the expression its objects on the plan use) and its marker types' own colours.

### The Planner with the kind picker

- `#f-types` stays as the picker's wrapper (the tiles go); `CONTRACT.md` and `design/editor.html` follow.
- The groups: Getting there, Stay, Eat and drink, See and do, **Markers** (each non-automatic marker type once), Other. Six where there were seven.
- **A marker and Where.** With a marker chosen, Where lists the days and the joints (not "Not on a day yet"); a day stores `kind: 'block'`, a joint `kind: 'lane'`. The time and length fields show for a day only. An existing marker keeps its kind until its Where changes. The day's "..." and the + on a joint are unchanged: they open the form with the marker and the place already chosen.
- `applyType()` is called from `onChange`; the add menu's `withTile()` calls `kind.set()` and then `applyType()`.

### Words a person reads

- The editor's close button: "Close".
- The question: "Discard your changes?", with **Keep editing** and **Discard**.
- The kind field's label: "What is it" (as `#f-types`' `aria-label` today). The group "Markers". The empty list: "Nothing matches". The recent group: "Recent".
- Each form's heading stays the module's own ("New task", "Edit task", "Add to the plan").

## Left to build, in order

1. **The editor window in the SDK** (experience-design). `host.ui.editor` as above, in a module in the page and on a module's own page; its styles in `/sdk/host.css`; the popovers' move into an open editor (`datePicker`, `menu.show`, `actions.pick`); the `moved` event from `moveModule()` in `public/canvas.js`. No module uses it yet.
2. **The checks** (server-development). In `tools/check-module-window.mjs`: a bundled module's `#editor` is a `<dialog>` with `sdk-editor` once its module is migrated (a list in the check, growing with steps 3 to 8), and no module stylesheet keeps an `.editor` rule with `position: absolute; inset: 0`. The SDK's `host.ui.editor` sizes and its thrown sentence, sliced out of `public/sdk/host.js` and run, as `check-module-host` does for pointers.
3. **To-do 1.15.0** (experience-design). The migration and its `isDirty`; the open form's drop target removed.
4. **Calendar 1.24.0** (experience-design).
5. **Polls 1.15.0** (experience-design).
6. **Research 0.4.0** (experience-design), with `CONTRACT.md`.
7. **Places 0.10.0** (experience-design), with `CONTRACT.md`.
8. **The Planner 0.14.0** (experience-design): the editor window, `large`, with `CONTRACT.md` and `design/editor.html`.
9. **The kind picker in the SDK** (experience-design): `host.ui.kindPicker`; a check of its filtering and its recent list (server-development, sliced out and run, in `check-module-window.mjs` or its own file).
10. **The Planner 0.15.0 with the kind picker** (experience-design): the tiles replaced, one Markers group with Where deciding `block` or `lane`; `tools/check-travel.mjs` (server-development) for that mapping, run on `travel-lib.js` if the mapping lives there.
11. **A module in a sandboxed frame** (experience-design): the lift in `public/module-host.js`, `public/canvas.js` and `public/module.js`; the bridge's `editor.lift`.
12. **The documentation** (content-manager): [api-module-sdk](../api/api-module-sdk.md) ("An editor window", "Choosing a kind"), [architecture-module-window](../architecture/architecture-module-window.md) (the editor window; and its sentence that menus are drawn inside the module, which stands), [architecture-modules](../architecture/architecture-modules.md) (what the SDK carries), the user guides that show a form, and the changelog with each step.

Steps 3 to 8 depend only on step 1 and may go in any order. Steps 9 and 10 can follow step 8 at once, or before step 3 if #193 is wanted first (the kind picker works inside today's overlay too). Step 11 waits on nothing but step 1; no bundled module runs in a frame, so it comes last.

## Verify

- **Step 1.** In headless Chromium on a local server, on To-do's own page with a test page calling `host.ui.editor` from the console (no module uses it yet): opens above the header and every module; Tab stays inside; Escape closes; the question with `isDirty`; the close button; focus returns; a date picker opened inside draws above the dialog and inside the window; at 390 px the sheet fills the screen. Moving a floating module to docked with the editor open (from the console, as the docked limit would) leaves it open and modal. Checked by a tool: nothing until step 2.
- **Step 2.** `npm run check`; the new cases fail on a module that keeps the old overlay (tried on a copy).
- **Steps 3 to 8.** Each module on its own page (no call needed): add and edit from every way it opens; save, delete, cancel; the question after typing, not before; a date picker inside; a 409 from a second browser's save; phone width. Then on a space's canvas, docked at 240 px and floating at its smallest: the form at full size over the canvas. `check-modules` and `check-module-versions` pass. On the canvas this needs a space page, which runs without LiveKit only up to the call; the call's keys (M, push to talk) with an editor open, and the conference's buttons being inert, can be checked only in a real call.
- **Steps 9 and 10.** The Planner's own page: the field is one row; typing "fl" leaves Flight; Recent after two adds; each marker type once; Where with a marker chosen lists days and joints, and a save at a joint stores `lane`, on a day `block` (read back from the plan); the day's "..." and the + still open the right kind; the keys of the combobox pattern; a screen reader (VoiceOver or NVDA) reads the field, the active option and its group. Phone width: the list as a sheet.
- **Step 11.** To-do switched to run in a frame by the admin: the frame lifts, the page behind is inert, the form is large, focus returns to the action bar's **New todo**, a phone width gives the sheet.
- **Not checkable here:** the call with an editor open (its keys and mute), a recall countdown arriving under an open editor, and anything in a popped-out call. Firefox and Safari need a person with those browsers; `::backdrop`'s tint in an older Safari will show the plain backdrop.

## What is not decided

Nothing blocks the build. Not part of this plan: menus and the date picker drawn outside a module's window when no form is open (the same clipping, a smaller problem); the Planner's **Move to**; a form saying "Changed by someone since you opened it" while it is open.
