# Module Window Architecture

**Audience:** developers building or changing a module's chrome, or the host code that draws it
(`public/module-host.js`, `public/canvas.js`, `public/sdk/host.js`).

Every module a person can open -- docked beside the call, floating over it, in a window of its own, or
its own standalone page -- is drawn from the same four zones, in the same order, whichever chrome it is
in. This is what keeps a module's own code identical wherever it is shown: it never draws its own
titlebar, and it never needs to know whether it is docked, floating, popped out or on its own page.

## The four zones

```
+----------------------------------------------------+
| Titlebar   name                    [icons] [X]      |  host.header.set, the host's own buttons
+----------------------------------------------------+
| Toolbar    text | tabs | ===progress=== | [buttons]  |  host.toolbar.set (optional)
+----------------------------------------------------+
|                                                      |
|  Content                                            |  the module's frame; the drop area
|                                                      |
+----------------------------------------------------+
| Action bar                   [...] [Link] [Add note] |  host.bar.set (optional)
+----------------------------------------------------+
```

- **Titlebar.** Identifies the module and holds window-level actions: the host's own dock/float/window/close
  buttons, plus whatever icon buttons the module adds with `host.header.set`, ahead of the host's own and
  set off by a pipe. Always present wherever a module is on the canvas or in a window; absent on a module's own page
  unless it is popped out (there is nothing to identify or act on when the page already says which module it
  is).
- **Toolbar.** Optional, under the titlebar: information, tabs or a progress bar about the module's current
  state -- a filter, a view switch, an import's progress. Not window-level (that's the titlebar) and not the
  module's primary input (that's the action bar). Set with `host.toolbar.set`. Present everywhere the
  titlebar is, and also on a module's own page even when it is not popped out (unlike the titlebar, a
  standalone page still has room under its own header for one). **It is not a second row of titlebar
  icons.** A view or filter switch is `type: 'tabs'`, not `type: 'button'` items repeating what the
  titlebar already looks like -- a tab can still carry an icon when the icon itself means something
  (Places' Mine/This space/Everyone), that is a different thing from a button row standing in for the
  titlebar. `type: 'button'` is for the one action that goes with the toolbar's own state (a Sync button
  next to an import's progress, say), not a place to relocate the titlebar's row. See "Reusable toolbar
  tools" below before building one from raw items.
- **Content.** The module's frame or in-page root. This is the section that scrolls, and the drop target for
  a dragged ref, either as a whole or onto specific items within it.
- **Action bar.** Optional, along the bottom: the module's primary actions -- an Add button and the few
  that go with it. Set with `host.bar.set`. Typing belongs in Chat, not here: a module registers a command
  (`commands` in `module.json`) and Chat routes the text to it ([plan-one-input](../plans/plan-one-input.md)).
  The quick-add field item still exists, but no bundled module uses it since #58. Docked, it is a cell in the canvas's shared bottom row, lined up
  with the call's own control strip and the chat box (see [architecture-canvas](architecture-canvas.md));
  elsewhere it is a strip under the module. The call's own bottom control strip and the chat's input row are
  the same idea as a module's action bar, drawn natively rather than through `bar.set` because they predate
  it -- not a different concept with a different name.

A module never draws its own titlebar or reimplements dock/float/close: `public/module-host.js` draws all
four zones from what a module hands it (`header`, `toolbar`, `bar`, and the frame itself), so the same
`bar.set`/`header.set`/`toolbar.set` calls work whether the module is docked (`public/canvas.js`), floating,
popped into its own window (`public/module.js`, only when popped out for the titlebar; the toolbar and action
bar are there regardless), or the module's own standalone page.

## Overflow

Each zone folds what it can't show into a "..." the host draws and opens (`openHostMenu` in
`public/host-menu.js`, which `public/module-host.js` imports and re-exports with `closeHostMenu`) -- the host's
own analogue of `host.menu.show`, needed because that one draws inside a module's own frame and these three are
the host's chrome, outside it. The same menu serves the canvas title bars' "..." (`public/space.js`), the
profile menu under your picture and the space switcher in the top bar (`public/brand.js`) and the space bar's "..." (`public/nav-bar.js`), see
[architecture-navigation](architecture-navigation.md). Only one is open at a time. It opens under its button,
flipped above when there is no room below. Its entries are `role="menuitem"`, or `role="menuitemcheckbox"` with `aria-checked` for an entry given `checked`,
and the button carries `aria-expanded`. From the keyboard: the first entry takes focus when it opens; Up, Down, Home and End move; Enter
or Space picks; Escape closes and puts focus back on the button; Tab closes. An entry is
`{ label, icon?, regular?, hint?, danger?, disabled?, checked?, badge?, onPick }`: `checked` (true or false) makes it
a checkbox entry that shows a tick while on (a toggle folded into the space bar's "..."), and `badge` is a count
shown after its label (9+ above nine). The "..." is drawn by
`drawMoreButton`, the same look as `host.ui.moreButton` (`.sdk-more`) inside a module. In every zone it sits
on the **left**, and leftover items come off the left, so the rightmost item stays. An item marked
`overflow: true` always goes into the "...", for something you always want tucked away (a destructive
action, say).

- **Action bar** (`drawModuleBar`). Fitted by width, not by count. The primary item sits on the far right,
  the other items to its left in the order given, then the "..." at the far left. A `ResizeObserver` on the
  bar redraws it as the module is resized; while the bar overflows its width, the leftmost remaining
  secondary moves into the "...". The primary never folds. A quick-add item is drawn first and never folds.
  At most 10 items are taken.
- **Titlebar and toolbar.** At most five items, by `splitOverflow(items, max)`, which both handlers call the
  same way. Only `type: 'button'` toolbar items count; a `text`, `tabs`, `progress` or `slider` item always
  shows, since it says something about the module (or is itself the control) rather than being one more
  action alongside others.

## Reusable toolbar tools

The toolbar is a small kit (`text`, `tabs`, `progress`, `slider`, `button`), not a place for each module to
invent its own filter row from scratch. Where a pattern repeats, it gets a real helper in `host.ui`
instead of every module hand-rolling the same item array, the same signature-diffing (so a redraw does not
call `toolbar.set` when nothing actually changed) and the same `host.on('toolbar', ...)` wiring.

`host.ui.viewSwitch({ id, options, value, onChange })` is the first of these: a labelled view or filter
switch, the toolbar's most common tool. It owns the diffing and the event listener; a module calls
`switcher.set(value, options?)` on every render and it only redraws when the value or a label actually
changed (an open count in one option's label, say). Four modules were duplicating this by hand before it
existed (Polls, Calendar, To-do, Planner, each with its own `headerSig`/`syncHeader` pair) -- all four now
call the one helper. Reach for it, or add a new `host.ui.*` helper alongside it, before writing a second
copy of that boilerplate; see "Shared tools" in `api-module-sdk.md` for the same rule applied elsewhere in
the SDK.

## The action menu

A menu of independent actions with their own handlers -- a row's "...", a right-click, the + on a joint --
is `host.menu.show({ id, items, at, anchor })`, drawn inside the module's own frame (the one exception: opened
from inside an open editor window, below, it is drawn inside that dialog, so it is in the top layer with it). See
[api-module-sdk](../api/api-module-sdk.md) ("An action menu") for the shape. The host's own overflow menus
(above) are the same idea applied to the host's own chrome, where a module cannot reach to draw one itself;
they share no code with `host.menu.show` (different documents, in general -- a sandboxed module frame and
the space or module page around it), only the same visual language and the same "showing the same id again
closes it" rule.

## The editor window

A module's Add or Edit form is the one thing a module draws that is bigger than its window. It is a `<dialog>`
in the module's own root, shown modal through `host.ui.editor` (`createEditor` in `public/sdk/host.js`, its
styles in `/sdk/host.css` between `editor:start` and `editor:end`). A modal dialog is drawn in the browser's
top layer, above every module, the floating layer and the header, and no `overflow`, `z-index` or container
clips it, even from inside a shadow root; so the form is sized to itself (560 px, or 880 px for the Planner's
object form) rather than to a 240 px column, and is a full-screen sheet at 640 px and below. The dialog stays
in the module's tree, so the module's styles, the base stylesheet and the theme tokens still reach it. The
reasons and the options weighed are in [plan-editor-window](../plans/plan-editor-window.md); the contract a
module sees is in [api-module-sdk](../api/api-module-sdk.md), "An editor window".

What the SDK owns, so no module writes it twice: the close button in a sticky corner strip, the sticky button row
(`sdk-editor-actions`), Escape (handled on the key and stopped there, so the module's and the page's listeners
never see it; the dialog's own `cancel` event is prevented because a browser fires it only with a fresh user
activation, and a second Escape would otherwise close the dialog over the question), the "Discard your changes?"
row when the module's `isDirty()` says so, the backdrop that ignores clicks, the accessible name
(`aria-labelledby` the first heading) and focus on close. Focus is restored a microtask after `onClose`, because
a module that redraws its list after a save queues that redraw as a microtask too, and the row to return to is
in the redrawn list.

Three things follow from the dialog being modal, and are accepted (plan decisions 2, 4 and 9): the page behind
is inert, so the call's buttons cannot be clicked (its keys on `document` still work, since the dialog's keys
bubble to it; the SDK stops only Escape); nothing can be dropped on the module while its form is open (To-do's
drop onto the open form went, its link search stays); and the host's own overlays show under the backdrop.

**Popovers inside it.** `showMenu`, the date picker, the kind picker's list and `host.actions.pick` in
`public/sdk/host.js` ask `editorAt(anchor)`: the open `dialog.sdk-editor` the anchor is in, else the module's
topmost open editor (`pick` has no anchor and always takes the latter), else none. Inside an editor they append
to the dialog instead of the module's root, so they are in the top layer with it rather than inert under it, and
clamp to the window less 4 px rather than to the module's box. Each one's Escape is prevented and stopped, so it
closes only itself.

**The kind picker.** The one field inside a form that the SDK draws whole: `host.ui.kindPicker` (`createKindPicker`
in `public/sdk/host.js`, styles in `/sdk/host.css` between `kind:start` and `kind:end`) is the ARIA combobox
pattern over a list of named, iconed, coloured options in groups, with typing to filter and the recent choices
first, kept in `localStorage` under `app:kind:<moduleId>:<key>` as `host.actions.pick`'s `remember` keeps its
under `app:pick:...`. It is in the SDK rather than the Planner because the plan names two more users (Research's
note type, Places' category), and because the Planner's day "..." already lists the same kinds through
`host.menu.show`. The pure parts (`kindMatches`, `kindPickerGroups`, `kindRecentAdd`) are written so
`tools/check-module-window.mjs` can slice them out of `host.js` and run them, as it does the editor's sizes. On a
phone the picker's sheet is a stylesheet rule on `.sdk-kind.open .sdk-kind-sheet`, not a second element, so the
script only decides where the list is appended (the sheet on a phone, the open editor or the root otherwise).
The contract is in [api-module-sdk](../api/api-module-sdk.md), "Choosing a kind"; the Planner's use of it, and
how one **Markers** group maps to the stored `block` and `lane` kinds through **Where** (`kindOf` and `tileAt` in
`modules/travel/src/travel-lib.js`), is in [plan-editor-window](../plans/plan-editor-window.md), Part 2.

**Moving.** `moveModule()` (below) takes the module's container out of the page and back, which drops an open
modal dialog out of the top layer. After the move the canvas delivers the event `moved` (`{ mode }`) and the SDK
reopens every editor the module has open (`openEditors`, dialog to `{ reopen }`): it removes the `open` attribute,
calls `showModal()` again and puts focus back on the last focused element inside.

**In a sandboxed frame** the top layer is the frame's own, so a modal dialog there would be clipped to the
module's window. The same `host.ui.editor` call therefore lifts the whole frame (step 11 of the plan; no bundled
module runs in a frame, so this is for uploaded modules). The SDK's `createEditor` gets a `lift(open, size)`
dependency only in a frame (`env.lift` from the frame boot, sending `editor.lift` `{ open, size }` over the
bridge); `open()` and `reopen()` ask for the lift just before `showModal()`, without waiting, and the dialog's
`close` asks for it to be put back only when no other editor of the module is open. When the host answers `true`
the dialog gets `sdk-editor-lifted` (`/sdk/host.css`): `position: fixed`, the frame's full width and height, no
border, radius or shadow, its backdrop the plain `--bg`, so the frame is the window and the dialog fills it.

The host's side is `liftFrame()` and `releaseLift()` in `mountModule()` (`public/module-host.js`). `editor.lift`
answers `false` for a module in the page (`pageMode`) and for a mount made with `lift: false` (`public/module.js`
in a window of its own, where the frame fills the window already); otherwise it lifts and answers `true`. The lift
gives the frame `module-editor-lifted` (`module-editor-lifted-large` for `large`), inserts `div.module-editor-backdrop`
before it, and makes the rest of the page `inert` the way a modal dialog does it: walking from the frame up to
`<body>`, every sibling of the frame and of each ancestor that is not already inert (the header, the canvas's
other modules, the floating layer, this module's own bar and toolbar), remembering which so the release
un-inerts exactly those. The release removes the class and the backdrop, and puts focus back on what had it before
only when focus is on nothing (it stays in the frame throughout otherwise). Lifting again (a second editor, or
the same one after a move) rebuilds the inert set and keeps the one backdrop. The release runs on the frame's
`load` (the module started over: no editor is open in it), in the mount's `destroy()`, and through the mount's
`lift(false)`, which `moveModule()` in `public/canvas.js` calls before moving a module between docked and
floating, since the move takes the backdrop away with the old chrome and the SDK reopens the editor (and asks for
the lift again) on `moved`. The canvas also hears `onLift(open, size)` and brings a floating module's box to the
front while it is lifted, so no other floating module draws over it.

The styles are in `public/style.css` between `lift:start` and `lift:end`: the backdrop fixed over the viewport,
`color-mix(in srgb, var(--bg) 70%, transparent)`, and the frame fixed and centered, `width: min(560px, 100vw - 32px)`
(880 px for `large`) by `calc(100dvh - 48px)`, the theme's border and background, both at `--z-menu` (above the
floating layer, so a docked module's lift clears the floating modules, and under the pages opened over the call);
at 640 px and below the frame is a full-screen sheet (`top: 0` with `height: 100dvh`, never `inset: 0`) over a
solid `--bg`; a short fade unless `prefers-reduced-motion`. The frame is exactly the editor's size, not wider
with the module showing behind, so nothing of the module is drawn at the lifted size but the form.

`tools/check-module-window.mjs` holds the six migrated modules to the shape (a `<dialog id="editor" class="sdk-editor">`,
no `.editor { position: absolute; inset: 0 }` overlay, Cancel through `editor.cancel()`, nothing reading
`$('editor').hidden`, icons waited for together), and runs the SDK's `EDITOR_SIZES`, its handle and its thrown
sentence sliced out of `host.js`, with `/sdk/host.css`'s widths held to the same numbers and its colours to the
tokens. It also holds the lift: the frame boot's `lift`, the asks around `showModal()` and `close`, `sdk-editor-lifted`
filling the frame, and `style.css`'s lift block (the two widths equal to `EDITOR_SIZES`, the backdrop, the phone
sheet without `inset: 0`, no fixed colours). `tools/check-module-host.mjs` runs `liftFrame()` and `releaseLift()`
sliced out of `module-host.js` on a stand-in page: the classes, one backdrop, exactly the right elements inert and
un-inert again, what was inert before staying so, and `canvas.js` and `module.js` doing their parts.

## Reuse across dock and float

Switching a docked module to floating (or back) does not rebuild it: `moveModule()` in
`public/canvas.js` pulls the frame (or in-page container), the action bar, the toolbar and the
titlebar's custom-icons span out of the old chrome and moves those same DOM nodes into the new chrome,
so whatever the module is holding onto (a conversation, a draft, a scroll position) survives the switch.
Only the class that lays each one out changes, and the module is told with the `moved` event (the SDK
uses it to reopen an editor window, above). A window is a real new page, so that still goes through
`closeModule` + `popOut` instead -- a frame cannot move between windows without reloading.

This is why the toolbar and action bar are real elements the host hands into `mountModule` (not markup the
module builds), the same as the titlebar's custom span: whichever zone's DOM node is not moved on a mode
switch would otherwise lose whatever `host.toolbar.set`/`host.bar.set` last drew into it, or worse, leave
`module-host.js`'s own reference to it pointing at a detached node.

## Rules

- **The "..." is one icon, and one control.** Every "more" affordance -- the host's overflow in a titlebar, a
  toolbar or an action bar, a card's own menu, a day's, a place's, a poll's, the call's More -- is Font Awesome's
  `ellipsis-vertical`, centered. Inside a module it is `host.ui.moreButton` (class `.sdk-more`, styled by the SDK);
  in the host's chrome it is `drawMoreButton`, with the same class. Not the
  horizontal `ellipsis`, and not a text glyph standing in for it. It opens `host.menu.show` (a module's own) or
  the host's overflow menu; both look the same. Found by hand once (a vertical glyph on a poll, a horizontal
  icon everywhere else), which is what the check below is for.
- **A menu is one of two things.** `host.menu.show` inside a module, `openHostMenu` (`public/host-menu.js`) for the host's own chrome,
  and `host.actions.pick` (the drop menu, a choice) draws in `menu.show`'s look. Nothing draws its own list of
  actions.

`tools/check-module-window.mjs` enforces the first rule mechanically (the icon, and a `<button>` in a module's markup
with `ellipsis-vertical` must carry `sdk-more`; the call's own More is exempt), as part of `npm run check`, the way
`check-canvas.mjs` enforces the canvas grid's; add a rule there when the next drift shows the shape of one.

## What is not built yet

- **More enforcement.** The zones themselves (a module drawing its own titlebar-like row instead of using
  `header.set`, a bespoke action list instead of `menu.show`) are not checked yet; worth adding to
  `check-module-window.mjs` once a violation shows what to match.
- **Language, not code.** `architecture-canvas.md` still calls the call's own bottom control strip "the
  video toolbar"/"the call toolbar" in places. It is the same idea as a module's action bar (above); the
  wording there should catch up, without needing the call's own native implementation to actually move onto
  `bar.set`.
- **A toolbar search/filter tool.** Places and Research each still have their own free-text filter field
  drawn in the page, not the toolbar -- `host.toolbar.set` has no item type for a text input yet, only
  `tabs` for a fixed set of choices. Worth a `type: 'search'` (or a `host.ui.*` helper wrapping one) once a
  second module wants it, rather than guessing its shape from one.

Every module's own "..." menu that was a flat list of actions is on `host.menu.show` now (Places, Research,
Travel's gap-add, Polls). What is deliberately still native: Travel's item menu (`#item-menu`); and every
module's edit form is a real form with selects and fields, not a list of independent actions, so it is an editor
window (above), never a menu -- forcing those onto `host.menu.show` would be a regression, not a retrofit, since
it only draws a flat list of `{ label, icon, onClick }` rows.
