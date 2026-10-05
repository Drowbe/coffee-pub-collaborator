# Theme and Design Tokens

**Audience:** anyone styling a page, a panel or a module against Collaborator, who needs the
colors to follow whatever theme the admin has chosen.

Admins can re-theme Collaborator from the Theme tab of the Manage page, including light themes. A theme
changes colors only, never layout. Anything drawn with a fixed color will be unreadable on some
server, so every color must come from the tokens below.

## How a theme reaches a page

Every page links `/theme.css` after `style.css`. The server renders it from the active theme (`server/theme-css.js`)
with both of the theme's sets, the light one under `html[data-theme-mode="light"]` and the dark one under
`html[data-theme-mode="dark"]`, as overrides of the seven base tokens and of each optional token the theme sets. An
untouched server sends only the default theme's light set, so it looks exactly like the defaults in `style.css`.
`public/theme-mode.js` sets `data-theme-mode` from the person's own choice (their account's `themeMode`, or
`app.themeMode` in the browser for a guest), else the environment's default, and swaps it without a reload when
either changes; `branding()`'s `themeMode` and `themeVersion` and the notifications stream's `theme` and `mode`
events tell an open page. A person's own choice is `PATCH /api/me` `{ themeMode: 'light' | 'dark' | null }` (`null` follows the environment's default again; anything else answers 400 "the mode is light or dark, or null to follow the environment's default"), shown as `user.themeMode`. Draw every colour from the tokens and both modes follow. A theme is shared as a `.theme.json` file (`{ format: "theme", formatVersion: 1, name, author?, light, dark }`, each set with the 16 stored keys); the routes are in [architecture-overview](../architecture/architecture-overview.md), "Themes", and the owner's steps in [userguide-themes](../userguides/userguide-themes.md). Because it is an ordinary stylesheet link, the popped-out
call window picks the theme up too, when the page clones its stylesheets into the new window.

## The tokens

The theme editor sets the first seven, and may also set the thirteen in the second group. Every token in the second
group follows the base colors until a theme sets it (**Auto**), so a theme that never touches one keeps
working. The rest are derived with `color-mix`.

| Token | Use |
|---|---|
| `--bg` | page background (labeled Page background in the theme editor) |
| `--bg-section` | section background: panels, popovers, the active tab (labeled Section background in the theme editor) |
| `--border` | outlines and dividers |
| `--text` | body text |
| `--text-dim` | secondary text |
| `--accent` | links, highlights and primary buttons |
| `--on-accent` | text and icons drawn on an `--accent` background |
| `--bg-card` | card background: the small items inside a section, such as member tiles, facts and thumbnails; Auto is `--bg-input` |
| `--header-bg` | header background, drawn as a soft gradient from this color; Auto is `--bg` |
| `--header-text` | header text, the server name, breadcrumb and signed-in name; Auto is `--text` |
| `--nav-brand-bg` | the top bar's branding area (the logo and the environment's name), labeled Branding area background; Auto is `--nav-primary-edge-bg` |
| `--nav-brand-text` | text in the branding area, labeled Branding area text; Auto is `--header-text` |
| `--nav-right-bg` | the top bar's right zone (the bell and your picture), labeled Right side background; Auto is `--nav-primary-edge-bg` |
| `--nav-right-text` | text in the right zone, labeled Right side text; Auto is `--header-text` |
| `--nav-primary-bg` | the top bar's left zone (Calendar, Map, the home word and where you are, up to the right zone); Auto is `--header-bg`. Not set by a theme |
| `--nav-primary-edge-bg` | the shared Auto of the branding area and the right zone, a whisper darker than the header: `color-mix(in srgb, var(--header-bg) 97%, black)`, opaque so the editor's colour box shows it truthfully. Not set by a theme |
| `--nav-secondary-bg` | the second bar, in one colour: the space bar, and the page bar on every other page; Auto is a 2% black overlay on the header colour. Not set by a theme |
| `--icon` | icons in the page, chat and header; Auto is dim text on the page and a softened header text in the header |
| `--icon-hover` | icon hover; Auto is `--accent` |
| `--primary-hover` | Primary buttons on hover; Auto is a lighter `--accent` |
| `--secondary` | Secondary buttons, and the toolbar buttons in the call; Auto is `--surface` |
| `--secondary-text` | text on Secondary buttons; Auto is `--text` |
| `--secondary-hover` | Secondary buttons on hover; Auto is `--surface-hover` |
| `--bg-input` | inputs |
| `--surface`, `--surface-hover` | raised surfaces and their hover state |
| `--shade` | recessed areas |
| `--ok`, `--danger` | status colors |
| `--danger-text`, `--accent-hover` | lightened forms of danger and accent |

## Rules

1. Take every color from these tokens. For a see-through tint use `color-mix`, for example
   `color-mix(in srgb, var(--text) 8%, transparent)`, never `rgba(255, 255, 255, .08)`.
2. Text on an `--accent` background uses `--on-accent`, not white or black.
3. Never assume a dark background. Test every new surface with a dark and a light theme.
4. Scrims and shadows may stay black, because they darken whatever is behind them rather than
   standing in for a theme color.
5. A button is Primary (`--accent` with `--on-accent`) or Secondary (`--secondary` with `--secondary-text`); do not invent a third look. Hover comes from `--primary-hover` and `--secondary-hover`. The square icon button of the bottom row is the action button (see "The action button" below), not a button of its own.
6. A fixed color is acceptable only where it carries a meaning the theme must not change, such as the
   red of a muted badge, and then its text is fixed too so the pair stays readable.
7. Anything drawn on its own, such as a canvas or SVG, reads the tokens with `getComputedStyle` and
   redraws when the theme changes.

A fixed dark background under theme-colored text is the classic failure: it looks correct on the
default theme and unreadable on a light one.

**The top bar's three areas.** The branding area, the left zone and the right zone each have a background and a text colour; each area sets `--header-text` to its own text token for what is inside it, so names, carets and icons that fall back on the header text follow. Until a theme sets them, the branding area and the right zone are `--nav-primary-edge-bg` with the header text, which is how the bar always looked. On a phone only the branding area keeps its colour. How the bar is built is in [architecture-navigation](../architecture/architecture-navigation.md).

## Tints

Eight named colours mark what a message or a module is from: a module's own colour (its manifest's `color`), and gold for the AI. They are fixed, not part of a theme, and no theme sets them; each has a dark and a light value, tested on both. On a light page the darker value is used: under the stylesheet's light set (`data-theme-mode="light"`), or the environment's light default when the person has made no choice (`data-mode-shown="light"`, set by `public/theme-mode.js`).

| Token | Dark | Light |
|---|---|---|
| `--tint-gold` | `#d9a93c` | `#94680a` |
| `--tint-blue` | `#6aa6e8` | `#2a62b0` |
| `--tint-green` | `#6fbf73` | `#2e7d32` |
| `--tint-teal` | `#4fbfb2` | `#00796b` |
| `--tint-purple` | `#b18be0` | `#6a3fb0` |
| `--tint-red` | `#e07a6e` | `#b3372b` |
| `--tint-orange` | `#e8964a` | `#b35a00` |
| `--tint-pink` | `#e58ab8` | `#ad3a78` |

`data-tint="<name>"` on an element sets `--tint` to that token. A tint colours an icon and a thin edge only (a message's 3-pixel left edge and its portrait's icon, a module's icon in its titlebar and the Layout menu); text and backgrounds keep their usual tokens. The tokens are in `public/style.css` and in `/sdk/host.css`, so a module's page has them too.

## The action button

`.action-btn` is the one square icon button of the bottom row: the call's controls, the chat's Send, a module's action bar (docked, floating, popped out and on its own page) and a module's own add buttons. It is Secondary, or Primary with `.primary`, and red for **Leave the call** (`.danger` on the call's toolbar). Two layout tokens size it; they are not colours and no theme sets them:

| Token | Use |
|---|---|
| `--action-btn-h` | the button's width and height: `--bar-control-h` (38px) on the app's pages, 38px on a module's page; a compact call toolbar and the phone's sizes set it smaller (40, 34 or 30px) |
| `--action-icon-ratio` | the icon's size as a share of the button, `calc(20 / 38)`: a 20px icon in a 38px button, the same share at every size |

A smaller button sets `--action-btn-h` only, never the icon's size. The rules are written once in `public/style.css` and once, word for word, in `public/sdk/host.css` (between `action-btn:start` and `action-btn:end`); `tools/check-buttons.mjs` holds the two copies equal, the call controls, Send and the action bar on `.action-btn`, and the bundled modules from sizing it or setting the tokens.

## The switch

A view or filter switch (**Month | Week | Day | Agenda**, **Open | Done | All**, **All | Private | Public**) is one row of segments, each an icon beside its word, the chosen one marked. When the row is too narrow for the words, every segment shows its icon only (`.tb-tabs-compact`), and the word stays the tooltip and the accessible name; a segment with no icon always shows its word. It takes its colours from the tokens above and needs no tokens of its own. The rules are in `public/style.css` for the app's pages and in `public/sdk/host.css` for a module's (`.tb-tabs`, `.tb-tab`, `.tb-tab-glyph`, `.tb-tab-word`, `.tb-tabs-compact`); a module draws one with `host.ui.viewSwitch` ([api-module-sdk](../api/api-module-sdk.md)) and never sizes it, which `tools/check-switches.mjs` holds.

## The editor window

A module's Add or Edit form opens as a window over the whole page: a modal `<dialog class="sdk-editor">` drawn by the SDK (`host.ui.editor`, [api-module-sdk](../api/api-module-sdk.md), "An editor window"). It is 560 px wide (`.sdk-editor-large`, 880 px, for the Planner's object form), at most the window less 48 px tall, centered, and a full-screen sheet at 640 px and below. It takes `--bg-section`, `--text` and `--border`, a 10 px radius and a shadow; its backdrop is `color-mix(in srgb, var(--bg) 70%, transparent)`, the tint the modules' own overlays used before, and plain `--bg` on a phone. The close button in the corner (`.sdk-editor-close`) is `--text-dim`, `--text` on hover with a 10% text tint behind it, and an `--accent` focus ring; the button row a module marks `.sdk-editor-actions` and the "Discard your changes?" row (`.sdk-editor-discard`) stick to the bottom on `--bg-section` with a `--border` line above. On a phone the close button and the row's buttons are 44 px tall (the row sets `--action-btn-h`). No theme sets any of this, and the rules use no colour of their own (`tools/check-module-window.mjs` fails a fixed colour there). A module's form inside it sets only the layout of its fields, never a box, a width or a background of its own. The rules are in `public/sdk/host.css` between `editor:start` and `editor:end`.

## The kind picker

The field a form asks what a thing is with (`host.ui.kindPicker`, [api-module-sdk](../api/api-module-sdk.md), "Choosing a kind"; the Planner's **What is it**) is one row, `--bar-control-h` (38 px) tall, drawn as a field: `--bg-input` on a 1 px `--border` with a 6 px radius, `--text`, and when focused an `--accent` border with a 2 px ring of the accent at 30%. A disabled picker is at 60% opacity. The chosen kind's icon sits on a 26 px round chip at the start of the row, and each option in the list carries the same chip: its colour is `--kind-color`, a custom property the SDK sets on the chip and on the row from the option's `color` (any CSS colour; the accent until a kind has one), the chip's background `color-mix(in srgb, var(--kind-color) 22%, var(--bg-card))` and its icon `--kind-color`. The chosen option's chip is filled with `--kind-color` and its icon `--on-accent`, and its name is semibold. A marker type's colour is the owner's, not the accent, so on a light theme the chosen marker's icon can be low-contrast (white on a yellow); an open point for Thomas. The Planner's colours are its cards' own: the accent's hue turned by the kind's family (`TURNS` in `modules/travel/src/travel-lib.js`, with `oklch(from var(--accent) ...)` where the browser has relative colours, else a 65% mix of the accent and `--text`), and a marker type's own colour from the Planner's settings, so the kind in the field and its card on the plan look alike under any theme. The chevron is `--text-dim`.

The list (`.sdk-kind-list`) is `--bg-card` on a 1 px `--border` with an 8 px radius, a shadow and 4 px padding, at most 360 px tall; group titles are `--text-dim`, 10 px, bold, upper-case, letter-spaced, and groups are divided by a `--border` line. The active option (the one the keys are on) is a 14% accent tint; "Nothing matches" is `--text-dim`. At 640 px and below the open picker is a sheet fixed to the bottom of the screen (`.sdk-kind.open .sdk-kind-sheet`): `--bg-section` with a `--border` line above, 12 px top corners, a shadow and the safe-area insets, over a tint of `--bg` at 60%; the field grows to 44 px and the input to 16 px so a phone does not zoom, and each option is at least 44 px tall. The chevron turns when the list is open, with a short transition unless `prefers-reduced-motion` is set. No theme sets any of this, and the rules use no colour of their own except the shadows' black (`tools/check-module-window.mjs` fails a fixed colour there). The rules are in `public/sdk/host.css` between `kind:start` and `kind:end`.

## Modules

A module runs in a sandboxed frame, so it cannot see Collaborator's stylesheet. The host reads the current theme from the page's computed style and hands it to the module on start, and the module SDK sets it on the frame's `:root` as CSS custom properties. A module written to the rules above follows the theme with no code. Collaborator also adds a small base stylesheet to each module page (`.btn`, `.btn-primary`, `.action-btn`, `.card`, styled inputs) built from the same tokens. The rules apply to module authors too; see [api-module-sdk](../api/api-module-sdk.md).
