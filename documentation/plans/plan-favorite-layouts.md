# Favorite Layouts Plan

**Audience:** Thomas decides; server-development (`server/layouts.js`, `server/index.js`, `tools/check-layouts.mjs`) and experience-design (`public/space.js`, `public/style.css`, `tools/check-nav.mjs`) build; content-manager documents.

**Status:** approved by Thomas, 2026-10-04, answering the draft's questions (decisions 4 to 11); built 2026-10-04, all three steps (GitHub #190). See "Built" below for where the build goes beyond the plan. From Thomas, 2026-10-04: "For layouts, we need to add a 'Favorite' option in the '...' menu that let's them favorite/unfavorite. We will use a heart. When something is favorited, it appears to the right of the 'layout' menu button." Changed by Thomas, 2026-10-04, after quality-assurance found the bar crowded (20 favorites at 1600 px gave 11 buttons cut to about 6 characters, nine of them reading "Mine …"): "do not shorten names unless out of space. Limit to 3 favorites." Decisions 12 and 13 replace decisions 7 and 8; built 2026-10-04. It builds on [plan-saved-layouts](plan-saved-layouts.md) (built 2026-10-03) and [plan-layout-menu](plan-layout-menu.md).

## What it is today

- **Saved layouts** are kept on the server in `DATA_DIR/layouts.json` (`server/layouts.js`): `{ "spaces": { "<space id>": { "shared": [layout], "people": { "<user key>": [layout] } } } }`. Each person has up to 10 of their own per space, and each space has up to 10 shared ones. A layout belongs to one space. `forgetSpace()` and `forgetPerson()` clean up; `remove()` deletes one.
- **`GET /api/spaces/:id/layouts`** answers `{ mine, shared, defaultLayout, canShare, canSetDefault }`. A guest gets `mine: []` and may only load.
- **The Layouts section** of the Layout panel (`#modules-menu-layouts`, `renderLayouts()` and `openLayoutMenu()` in `public/space.js`) lists shared layouts, then your own. Each row is a load button (`data-layout`) with a **…** (`data-layout-more`, `aria-label` "More for <name>") through `openHostMenu()`. **The …** is drawn only on layouts you may change, so a member sees none on a shared layout. Its entries are **Make default** and **Stop using as default** (owners, shared layouts, the `star` icon), then **Replace with this layout**, **Rename** and **Delete**.
- **The space bar's left zone** holds, in order: the Layout button (`module-chooser`, group `modules`, order 1, `fold: false`), **Join the call** (`join-call`, group `call`, `groupOrder` 1.5) and Online (`who-here`, group `people`, `groupOrder` 2, which shrinks through `fit`). On a phone or a narrow pop-out (640 px and below) there is no Layout button ([plan-layout-menu](plan-layout-menu.md), decision 6). The Layouts section is also hidden on a narrow canvas.
- **The notes** a load makes, such as "Map isn't on in this space, so it was left out.", go to `#modules-menu-note` in the panel, and to `#layout-announce` for a screen reader while the panel is closed (`layoutNote()`).
- **Icons** are Font Awesome. `openHostMenu()` takes `regular: true` for the outline style, so `fa-regular fa-heart` and `fa-solid fa-heart` are both available.

## Decisions

Thomas, 2026-10-04, from the request:

1. **A Favorite entry in a layout's …,** which toggles between favorite and not favorite.
2. **A heart** marks a favorite.
3. **Favorites appear to the right of the Layout button,** in the space bar.

Thomas, 2026-10-04, answering the draft's questions:

4. **A favorite is each person's own, per space.** Shared layouts reach everyone, so one person's favorite should not fill another's bar. A pick for the whole space is already **Make default**.
5. **Favorites are kept on the server, in `layouts.json`,** so they follow the person to another computer, as their own layouts do (saved layouts, decision 2).
6. **Members get a … on shared layouts,** so they can favorite them.
7. *Superseded 2026-10-04 by decision 12.* **No limit on favorites.** A person can favorite every layout they can see. The file is already bounded, because favorites can't be more than the layouts a person can see in a space: at most 10 of their own plus 10 shared, so 20.
8. *Superseded 2026-10-04 by decision 13.* **Each favorite shows a heart and its name,** with the name cut short after about 16 characters. A heart alone would make every button look the same.
9. **Favorites are in the order they were favorited.** When the bar is too narrow, the names shorten first, then the last favorites leave the bar and stay in the Layout panel with their hearts.
10. **No favorites at 640 px and below,** which matches "No Layout on phones" (plan-layout-menu, decision 6).
11. **When a favorite leaves something out,** a short note shows under the favorites for 6 seconds, as well as the screen-reader announcement. Otherwise a sighted person, with the panel closed, would never learn it.

Thomas, 2026-10-04, after quality-assurance found the bar crowded: "do not shorten names unless out of space. Limit to 3 favorites."

12. **Up to 3 favorites per person per space.** A 4th is refused. With no limit, 20 favorites filled the bar with buttons too short to tell apart. Replaces decision 7.
13. **Names show at full length,** up to about 16 characters, with the heart. They shorten only when the bar can't fit them all: evenly, down to about 6 characters, before any favorite leaves the bar. Replaces decision 8.

## The contract

### Whose favorite, and where it is kept

- **A favorite is the person's own,** per space (decision 4). A shared layout can be one person's favorite and not another's. Guests have no favorites, because they have no account to keep them on and they save nothing else.
- **It is kept on the server, in `layouts.json`** (decision 5), beside the person's layouts. Each space's entry gains `favorites`:

  ```json
  { "spaces": { "<space id>": { "shared": [], "people": {}, "favorites": { "<user key>": ["l3f9a2c", "lq7m2xd"] } } } }
  ```

  The list holds layout ids in the order they were favorited. No existing key changes and nothing is migrated. `tidy()` drops an empty list. An older server rolled back would drop `favorites` the next time it writes the file, which is acceptable.
- **Up to 3** per person per space (decision 12). A favorite has to name a layout the person can see, and each id is listed once, so a list never holds more than 3 ids. (Before 2026-10-04 there was no limit, decision 7.)

### Routes (server-development)

- `GET /api/spaces/:id/layouts` adds `favorites: [layout id]`: the person's favorites that still exist and that they can see, in order. A guest gets `[]`.
- `PUT /api/spaces/:id/layouts/:layoutId/favorite` returns `200 { favorites }` and appends the layout. Favoriting a layout that is already a favorite returns 200 and changes nothing. It returns 404 for a layout this person can't see and 403 for a guest. When the person already has 3 favorites in the space, it returns 409 "You can have 3 favorite layouts. Unfavorite one first." and changes nothing.
- `DELETE /api/spaces/:id/layouts/:layoutId/favorite` returns `200 { favorites }`. Removing one that isn't a favorite returns 200 too.
- **Clean-up:** `remove()` drops the layout's id from every person's favorites in that space, so deleting a shared layout removes it from everyone's bar. `forgetPerson()` drops the person's favorites. `forgetSpace()` already drops the whole entry.
- **Losing access:** someone who is no longer a member of the space can't read its layouts (403), so they see no favorites there. Their stored list stays and comes back if they rejoin. A layout whose modules are off still loads, leaving those modules out as today.

### The … menu (experience-design)

- **Every row gets a …** for anyone signed in, not only on layouts they may change. A member's … on a shared layout holds only the Favorite entry. Guests see no … on any row, as today.
- **The Favorite entry comes first,** above Make default, with a divider after it when other entries follow:
  - not a favorite: **Favorite**, outline heart (`icon: 'heart', regular: true`);
  - a favorite: **Unfavorite**, filled heart (`icon: 'heart'`).
- **The row** of a favorite shows a small filled heart after its name, as the "Default" mark does (`.layout-favorite-mark`, `aria-hidden`; the row's button gets ", favorite" in its accessible name).


### The favorites in the space bar (experience-design)

- **One group** after the Layout button: `#layout-favorites`, registered as a left-zone tool (`id: 'layout-favorites'`, group `modules`, order 2), with `role="group"` and `aria-label` "Favorite layouts". It is not drawn when the person has no favorites, in an aside, for a guest, on a narrow canvas, or at 640 px and below (decision 10).
- **One button per favorite,** in the order favorited (decision 9). Each button is `btn btn-small layout-favorite` with `data-layout-favorite="<id>"`, holding a filled heart and the name (decision 13). The name shows at full length; a name longer than about 16 characters is cut with an ellipsis. Names shorten further only when the bar is out of space (below). The button's `title` is "Load <name>" and its accessible name is the full name.
- **A press loads the layout** the same way a row in the panel does (`canvas.loadLayout()`, then `syncSnapBar()`). One click, no confirm, no undo.
- **The "left out" note** (decision 11): when a load from the bar leaves a module out, its line (`leftOutNote()`, for example "Map isn't on in this space, so it was left out.") shows under the favorites in `#layout-favorites-note` for 6 seconds, the same time the panel's note stays. It also goes to `#layout-announce` for a screen reader. A load from the panel keeps using the panel's own note.
- **No "current" state:** a button does not stay pressed after a load, because the canvas can change afterwards.
- **A narrow bar** (decisions 9, 12 and 13). With at most 3 favorites, the bar holds them all at full length on a wide screen; shortening is for when it can't:
  - The favorites give way before Online and Join. While all of them fit at full length, no name is shortened. When they don't, every name shortens evenly, down to a least width of the heart and about 6 characters.
  - If they still don't fit, favorites leave the bar from the last one back. The ones that stay are always the first ones favorited, so a person's first picks are the ones that stay in view.
  - Favorites that don't fit are still one click from the Layout button. The Layouts section lists every layout, and each favorite's row has its heart. The bar shows no "+N" or count (the plan's choice; see below).
  - They never fold into the space bar's **…**, and the left zone gets no fold of its own. The builder measures with the left zone's existing `fit` (`fitSecondary()` in `public/nav-bar.js`), which gives the group the width that is left after Layout, Join, Online at its least and the right zone.
- **Kept current:** the group is redrawn from the same `layoutList` the panel uses: on entering a space, when the panel opens, and after every change in it. It is not pushed live. If someone else deletes a shared layout, its button disappears at the next refresh, and pressing a stale button still loads the copy the page has.

### Keys and screen readers

- Tab reaches the favorites shown in the bar after the Layout button, in their order. Enter or Space loads one, and focus stays on the button. There is no new shortcut. The favorites left out of the bar are reached by keyboard through the Layout panel.
- The … entry is announced as "Favorite" or "Unfavorite". Afterwards the list is redrawn with focus back on the row, and "<name> is a favorite." or "<name> is no longer a favorite." goes to the panel's note.

### Words

"Favorite", "Unfavorite", "Favorite layouts", "Load <name>", "<name> is a favorite.", "<name> is no longer a favorite.", and the existing left-out line.

## Built

**Built 2026-10-04,** steps 1 to 3, as the contract above. Documented in [api-modules](../api/api-modules.md) ("Saved layouts"), [architecture-navigation](../architecture/architecture-navigation.md) ("Favorite layouts" and the fold) and [userguide-call](../userguides/userguide-call.md) ("Favorite layouts").

- **Beyond the plan:** the nav registry gained a `fitFirst` flag on a left-zone tool with `fit`, and the pure helper `labelsThatFit()` in `public/nav-bar.js`. The plan said the builder would measure with the existing `fit` alone; `fitFirst` is what makes the favorites give way before Online. Both are host internals, not part of the module SDK.
- **Refusals,** for the record: 401 "Sign in first."; 404 for no such space or an aside; 403 "You are not in that space."; 403 for a guest, "Guests can load shared layouts but not keep favorites." (the guest word is the environment's); 404 "There is no such layout here."
- **Decisions 12 and 13, built 2026-10-04.** `LAYOUT_LIMITS.favorites` (3) in `server/layouts.js`: a 4th `PUT` gets 409 "You can have 3 favorite layouts. Unfavorite one first." and changes nothing. A stored list longer than 3 reads as its first 3 visible ids and is trimmed at the next write. In the **…**, once a person has 3, **Favorite** on another layout is disabled with that sentence as its hint (`FAVORITE_LIMIT` in `public/space.js`); **Unfavorite** always works. `labelsThatFit()` keeps every name at full length (up to about 16 characters) while all fit, then shortens them evenly down to about 6, and only then drops the last favorite. At 1280 px and wider 3 full names show; around 900 px they shorten.
- **Quality-assurance's minor notes, fixed:** reading the file now drops favorite ids the person can't see (gone, malformed or hand-edited), and a space entry that holds only such favorites is dropped.
- **Verified:** live by the builder in Chromium as a member, an owner and a guest, at widths from 1600 down to 390 px, with 0, 3 and 20 favorites (the first build); then the limit and the bar after decisions 12 and 13, live in Chromium by the builder. Checked by tool: `tools/check-layouts.mjs` (63 checks) and `tools/check-nav.mjs` (65 tests). Quality-assurance: passed with notes, and the notes are fixed. Not checked: loading a favorite while on a real call, a real screen reader, Firefox and Safari.

## The steps, as planned

1. **Store and routes** (server-development): `favorites` in `layouts.json`, the `GET` field, the `PUT` and `DELETE` favorite routes, and the clean-up in `remove()` and `forgetPerson()`. Checked by new cases in `tools/check-layouts.mjs`.
2. **The … entry** (experience-design): a … on every row for a signed-in person, **Favorite** and **Unfavorite** with their hearts, the heart mark on the row, and the notes. Checked by `tools/check-nav.mjs`.
3. **The favorites in the space bar** (experience-design): the `layout-favorites` tool, its buttons, loading, the left-out note under the group, the names shortening and favorites leaving the bar when it is tight, and the places it is hidden. Checked by `tools/check-nav.mjs`.

Documentation after each step is content-manager's: [architecture-navigation](../architecture/architecture-navigation.md) (the space bar's left zone and the Layouts section), the API document (the two routes and `favorites`), the user guide's space bar, and the CHANGELOG.

## Verify

- **Step 1.** `tools/check-layouts.mjs` against a throwaway server:
  - favorite and unfavorite your own layout and a shared one;
  - a second member's favorites are separate;
  - repeating a favorite or unfavorite returns 200 and changes nothing;
  - 3 layouts can be favorites; a 4th `PUT` gets 409 "You can have 3 favorite layouts. Unfavorite one first." and the list is unchanged; after an unfavorite, another can be added; the list never holds more than 3 ids or the same id twice;
  - favoriting one that is already among the 3 still returns 200;
  - a guest gets 403, and someone not in the space gets 403;
  - an unknown layout, or another person's own layout, gets 404;
  - deleting a shared layout removes it from every person's favorites;
  - removing a person drops their favorites;
  - the order is kept;
  - a file without `favorites` reads as before.
- **Step 2.** `tools/check-nav.mjs` checks the entry's words and icons, and that a guest gets no …. Then live in headless Chromium: a member favorites a shared layout from its …, the row shows the heart, and **Unfavorite** removes it.
- **Step 3.** `tools/check-nav.mjs` checks the tool's registration and order, and that it is hidden at 640 px and below and in an aside. Then live in headless Chromium at 1600, 1000, 800 and 390 px, with 1 and then 3 favorites, including names of about 16 characters:
  - the buttons appear right of Layout, in the order favorited;
  - a press loads the layout;
  - at 1600 px, 3 favorites show their names at full length, not shortened;
  - as the window narrows, names stay whole until they no longer fit, then shorten evenly, then the last favorites leave the bar, before Online shrinks; nothing runs under Join, Online or the right zone;
  - the favorites left out of the bar are in the Layout panel with their hearts and load from there;
  - a favorite naming a module that is off shows the note under the group for 6 seconds;
  - at 390 px there are no favorites and the tab bar is unchanged;
  - after a reload, and in another browser signed in as the same person, the favorites are still there.
- **Needs a real call:** loading a favorite while on the call keeps the conference. **Not checked here:** a real screen reader, Firefox, Safari.

## What is not decided

Nothing blocks the build: Thomas answered the draft's questions (decisions 4 to 11). The plan made two choices of its own, which he may overrule. The bar shows no count of the favorites that don't fit. (The other choice, that a name shortens to about 6 characters before a favorite leaves the bar, is now Thomas's decision 13.)
