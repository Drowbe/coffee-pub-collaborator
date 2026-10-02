# Two-Zone Nav Plan

**Audience:** Thomas, who decides how the two bars are laid out and coloured, and the sessions that build it: experience-design (`public/nav-bar.js`, `public/primary-nav.js`, `public/brand.js`, `public/space.js`, `public/space-people.js`, `public/destination.js`, `public/profile.js`, `public/space-settings.js`, `public/ai-config.js`, `public/module-config.js`, `public/module-settings-page.js`, `public/module.js`, `public/style.css`, `public/destination.css`, `public/admin.html`, `public/admin.js`, `tools/check-nav.mjs`) and server-development (the theme's colour keys: `server/store.js`, `server/theme-css.js`, `tools/check-theme.mjs`, `tools/check-themes.mjs`).

**Status:** approved by Thomas, 2026-10-02; built 2026-10-02. Drafted the same day from Thomas's issues #152 (primary nav) and #153 (secondary nav), under #66. Thomas, 2026-10-02: "we have overcomplicated the nav layout." He gave the layout of both bars (decisions 1 to 6), then answered the plan's three questions and approved it (decisions 7 to 9), and clarified the same day that the top bar is places, not a breadcrumb (decision 10). Takes in the top bar's part of #39 ("Theme editor: fields for the nav colours"); the space bar's colour stays out of the editor. This plan changes the layout parts of [plan-primary-nav](plan-primary-nav.md) ("The bar": its three zones and empty middle; phase 6: the destinations "in the middle zone") and of [plan-nav](plan-nav.md) ("The model", "Rules", "The secondary nav, September 30": who is here in the middle, the middle centred on the row), and where [plan-calendar-destination](plan-calendar-destination.md) (decision 10) and [plan-map-destination](plan-map-destination.md) (decision 11) put the entries. Everything else in those plans stands: the slots and what they do, the switcher, the breadcrumb's segments, the bell, the profile menu, the phone menu, the destinations' own pages, the online people widget of plan-primary-nav step 4. The space bar's right zone (decision 5) is changed by [plan-layout-menu](plan-layout-menu.md) (approved 2026-10-02): Dock all, the snap switch and its grid slider move into the **Layout ▾** menu, the renamed Modules button.

## What it is today

**The top bar** (`.topbar`, `renderTopbar()` in `public/brand.js`) is a grid of three zones, `minmax(0, 1fr) auto auto`, and from 1001 px `minmax(0, 1fr) auto minmax(0, 1fr)` while the middle holds something (`.topbar:has(> .nav-middle > :not([hidden]))`):

- Left (`.nav-left`): the logo box and the environment's name (`#brand-home-link`, markup written by `renderTopbar()`), then the group `where`: the Spaces slot (`spaces-slot`, the `home` word and its caret), the breadcrumb (`#topbar-crumb`), the status line (`#topbar-status`).
- Middle (`.nav-middle`, `#core-nav`): the destinations, `dest-calendar` then `dest-map` (`destinationTools()` in `public/primary-nav.js`, group `destinations`), centred on the row. On a phone it holds the bell instead (`phoneZones()` in `public/nav-bar.js` draws a `phone: 'bar'` tool there).
- Right (`.nav-right`): the bell (`#notifications-bell`), then your picture (`#whoami-link`). On a phone this element is the menu.
- `lookOf()` in `nav-bar.js` gives a tool the core links' look (`.core-link`, icon and name) only in the primary bar's middle zone; anywhere else it is an icon button.
- Between a phone and a wide screen: from 641 to 1000 px your name goes; from 641 to 820 px the environment's name goes and a destination's entry is its icon only (`.topbar .nav-middle .core-link .core-label`); the breadcrumb keeps `min-width: 6em`, and the left zone is cut at its edge (`.topbar > .nav-left { overflow: hidden }`).
- Other pages add a segment after the Spaces slot through `setTopbarLocation()` and `crumbLink()` in `brand.js`: a destination (`public/destination.js`, its name, so on a wide screen "Calendar" shows twice: the entry in the middle and "Spaces ▾ › Calendar"; the TODO holds this, waiting on this change), Manage (`public/admin.js`), Profile and another person's profile (`public/profile.js`, "Manage › <name>"), a space's settings (`public/space-settings.js`, "Manage › <space>"), the AI configuration (`public/ai-config.js`) and a module's configuration (`public/module-config.js`), both "Manage", and a module's page (`public/module.js`, its name or the title it sets). The module settings page and the host console set none. Manage, Profile and a space's settings have their tabs (`#subtabs`, `.subtabs`) in the page body. Only Calendar and Map have a second row in the header, the page bar (`drawPageBar()` in `destination.js`).

**The space bar** (`.subnav`, built in `public/space.js`) is a grid of three zones, `minmax(0, 1fr) auto minmax(0, 1fr)`:

- Left (`.subnav-left`): the module chooser (`module-chooser`, the **Modules** button `#modules-toggle` and its list `#modules-menu`).
- Middle (`#subnav-middle`): who is here (`who-here`, `public/space-people.js`, group `people`, `fold: false`, with `fit(avail)`).
- Right (`.subnav-tools`): Dock all, the snap switch and its grid slider, Full screen, Pop out, Pull participants back, Rejoin call, a module's own tools, the **…** (`#subnav-more`) and Leave.
- The fold (`fitSecondary()` in `nav-bar.js`): who is here shrinks first to the width `middleWidth()` gives it (names with every portrait, then the count with what portraits fit, then the short count); then the right zone folds into the **…** by `foldSteps()` and `foldCount()`. `middleCentred()` decides whether the middle stays centred or sits beside a long left zone (`data-middle`).
- The destination page's bar (`.subnav.dest-bar`, `drawPageBar()` in `public/destination.js`) is attached to the registry as the secondary bar too, with an empty middle (`public/destination.css`).

**The registry** (`public/nav-bar.js`) has three zones per bar (`ZONES`). A module's tools (`host.nav.set`, `cleanModuleTools()`) always go in the space bar and may name `left`, `middle` or `right` (`right` by default); no bundled module calls `host.nav.set`. Only tools in the right zone fold.

**Colours** (`public/style.css`; `documentation/designsystem/design-theme.md`). None of the nav tokens below is in the theme editor: they are worked out in the stylesheet.

- The top bar is `--nav-primary-bg` (the header colour), and its left and right zones are `--nav-primary-edge-bg` (a 3% black overlay), the full height of the row (`.topbar .nav-left, .topbar .nav-right`).
- The space bar is `--nav-secondary-bg` (a 2% black overlay). It sits inside `.topbar`, so the same descendant rule also paints its left and right zones `--nav-primary-edge-bg`: that is the two-colour space bar #153 removes.

**Themes.** A theme's set holds seven base colours (`THEME_BASE` in `server/store.js`) and nine optional ones (`THEME_OPTIONAL`), `null` meaning Auto: `card`, `headerBg`, `headerText`, `icon`, `iconHover`, `primaryHover`, `secondary`, `secondaryText`, `secondaryHover`. `cleanThemeColors()` fills a missing optional key with `null`, so a stored theme that never had a key reads as Auto. `VARS` in `server/theme-css.js` maps each key to its property in `/theme.css`. Themes are edited only in Manage > Theme (`public/admin.html`, `THEME_OPTIONAL_FIELDS` in `public/admin.js`: an id, the property, the key and the Auto formula the preview uses); the host console has no theme editor. A theme file (`server/theme-file.js`) and a template's embedded theme (`server/templates.js`, through `readThemeFile()`) carry the same keys; a key a server does not know is dropped and named in `dropped`, never refused.

## Decisions

Thomas, 2026-10-02 (#152, #153).

1. **No middle zone in either bar.** Each bar is a left zone, left-justified, and a right zone, right-justified. "We have overcomplicated the nav layout."
2. **The top bar, left to right:** the branding (the logo or home icon, and the environment's name), then the left zone: **Calendar** and **Map** (the destinations), then the home word with its switcher and the breadcrumb. These move out of today's middle zone.

   ```text
   [ [ Branding ][ [ Calendar ] [ Map ] [ Trips > ] ]          [ existing functionality ] ]
   ```

3. **The top bar's right zone is unchanged** (the bell, the profile).
4. **The space bar, left to right:** the left zone holds **Modules ›** (the Modules button), then **Online** (today's who is here widget, moved out of the middle).

   ```text
   [ [ Modules > ]  [ Online ] ]                      [ existing functionality ]
   ```

5. **The space bar's right zone is unchanged:** Dock all, snap and grid, Full screen, Pop out, Rejoin call or Pull participants back, a module's own tools, the **…** fold, Leave.
6. **The space bar is one colour.** It no longer colours its left and right zones differently; the whole bar is one theme colour.
Thomas, 2026-10-02, answering the plan's questions and approving it.

7. **A destination page never shows its own breadcrumb segment**, on a phone too. On a phone the anchor must still say where you are; how is left to the plan (see "The anchor: places, and a space's breadcrumb only" below). Decision 10 widens this to every page but the space page.
8. **The top bar has three colour areas a theme can set:** "we want to allow for a branding area colour and a right zone colour in our themes." The branding area (the logo and the environment's name), the left zone (the bar's main colour) and the right zone. Each has its text colour too. They are part of themes, with fields in the theme editor, and default to today's look, so nothing changes until a theme sets them.
9. **Online is today's who is here,** moved to the space bar's left zone with its words unchanged. The environment-wide online people widget (plan-primary-nav step 4) still comes to the top bar's right zone later.

Thomas, 2026-10-02, clarifying.

10. **The top bar holds places, not a breadcrumb.** "While our nav model has some breadcrumb-like features, it is not a breadcrumb up top. The things there are specific places: Calendar, Map, Trips. And when in a space you get the only breadcrumb-like experience, with 'Trips › name'. Profile and Manage should not show there. We should, however, show the space bar for them, like we do for Calendar and Map." So:
    - the left zone holds places only: Calendar, Map, the `home` word with its switcher; the only "›" is a space's name (and an aside's) while in a space;
    - no other page adds anything after it: Profile, Manage, module pages, a space's settings, the configuration pages, the destinations, the host console;
    - those pages get a second bar, the page bar Calendar and Map use, with the page's name and its own controls where that is natural (Manage's tabs);
    - on a phone the anchor shows the page's name as a plain label. This widens decision 7 from the destinations to every page.

## The contract

### The registry (`public/nav-bar.js`)

- **Two zones to register into: `left` and `right`.** The page's own tools register only into these; `register()` refuses `zone: 'middle'` with the same kind of error it gives for an unknown zone. `ZONES` and `attach()` work with `.nav-left` and `.nav-right`.
- **The top bar keeps one more place, for phones only:** the element `#core-nav` (its id kept), empty and not drawn from 641 px, where `phoneZones()` draws the tools that say `phone: 'bar'` (the bell). Nothing registers into it; it is where the phone's bar puts the bell, as the middle zone is today. `phoneZones()` keeps its shape (`{ left, middle, right }` may stay as its internal names, or become `{ left, bar, right }`); what it does is unchanged: the left zone stays, `phone: 'bar'` tools go to the phone's place, everything else from the right zone goes into the menu.
- **A module's tools always go in the space bar's right zone.** `cleanModuleTools()` reads no zone: `zone: 'left'`, `'middle'` or anything else is ignored and the tool goes to `right`, not refused, the way `bar: 'primary'` and `system: true` are ignored today. This follows from decision 5, which puts "a module's own tools" in the right zone, and from plan-primary-nav decision 10 ("the host decides where a module's tools go"). It also keeps every module tool foldable: nothing in the left zone folds. No bundled module is affected. For module authors: the SDK reference's "Registering into the nav bars" loses `zone`, and the CHANGELOG says `zone` in `host.nav.set` is ignored from this release.
- **The core links' look in the top bar's left zone.** `lookOf()` gives `.core-link` (icon and name) to a primary tool in the left zone, where it gave it to the middle zone. Elements the page places itself (`element`) keep their own look as now.
- **`fit(avail)` belongs to a space bar left-zone tool** (Online), no longer to a middle one. The pure `middleCentred()` and `middleWidth()` go; one pure function gives the width a fitting tool may take: the bar's inner width, less the right zone at its natural width with nothing folded, less the rest of the left zone (the Modules button) and the gaps. `foldCount()` loses `middle`: the right zone fits when `left + right + gap <= width`, `left` measured after the fitting tool has shrunk.
- **Dividers** follow the registry's rule (a divider between groups that show something). From Thomas's sketches: in the top bar the destinations join the group `where`, ahead of the Spaces slot, so there is no divider between Map and the home word; in the space bar Modules and Online stay two groups (`modules`, `people`), with a divider between.

### The top bar (`public/brand.js`, `public/primary-nav.js`, `public/style.css`)

- **Order, left to right:** the logo box and the environment's name (`#brand-home-link`, markup as now), then the left zone's tools in one group `where`: `dest-calendar`, `dest-map` (each only when shown for this person), `spaces-slot`, `topbar-crumb`, `topbar-status`. Then the right zone: online people (plan-primary-nav step 4, not built), `notifications-bell`, `whoami-link`.
- **`SLOTS`** in `primary-nav.js` becomes `['logo', 'environment', 'destinations', 'home', 'anchor', 'people', 'notifications', 'profile']`.
- **`destinationTools()`** returns the bar entry as `zone: 'left'`, `group: 'where'`, with orders ahead of the Spaces slot (the destinations 1 to 8, the Spaces slot, the breadcrumb and the status line after them). The menu entry (`menu-dest-<id>`) is unchanged. Ids, `href`, `aria-current="page"`, `data-overlay-link` while present in a space, and the title as the tooltip are unchanged.
- **The grid** is the left zone taking what the right does not: `minmax(0, 1fr) auto` (with the phone's place out of the grid from 641 px). The 1001 px rule that centred the middle goes.
- **What gives way between 641 and 1000 px**, unchanged in order, with the destinations now in the left zone:
  1. from 1000 px down, your name (your picture and its caret stay);
  2. from 820 px down, the environment's name, and each destination's entry becomes its icon only (its name stays its title and accessible name). The rule now selects the destinations in the left zone (for example by their `data-destination`), not `.nav-middle`;
  3. then the breadcrumb is cut with an ellipsis, never below `min-width: 6em`; the left zone is cut at its edge as now.

  The destinations and the Spaces slot never shrink.
- **The anchor: places, and a space's breadcrumb only** (decisions 7 and 10).
  - The only segments after the Spaces slot are the space page's own (`updateCrumb()`, `anchorSegments()`, `crumbSegments()`): "› <space>", and in an aside "› <space> › <Aside word>: <names>". Unchanged.
  - Every other page leaves the anchor empty wider than 640 px: `destination.js`, `admin.js`, `profile.js`, `space-settings.js`, `ai-config.js`, `module-config.js` and `module.js` stop calling `setTopbarLocation()` with a segment, and `renderTopbar()`'s `location` is no longer passed. `crumbLink()` goes once nothing calls it. A destination's entry marked current (`aria-current="page"`, its accent underline) says where you are on Calendar and Map; the page bar's name does on the rest.
  - On a phone the anchor shows the page's name as a plain label: its icon and name, not a link, no separator, `aria-current="page"`, cut with an ellipsis as the anchor is, the whole name as its title. The menu's destination entry (`menu-dest-<id>`) stays marked current as today. Chosen as the least surprising of the two ways Thomas offered: on every page a phone's bar names where you are in that same place, and a mark inside a closed menu would leave the bar saying nothing.
  - What the anchor holds is a pure function in `primary-nav.js` (for example `pageAnchor({ phone, name, icon })`: nothing wider, the label on a phone; the space page keeps `anchorSegments()`), and the page paints it again when the window crosses 640 px.
- **The page bar on every other page** (decision 10). The header's second row Calendar and Map already have, made shared: `drawPageBar()` leaves `destination.js` for a shared builder (for example `renderPageBar({ name, icon, back })` in `brand.js`) that makes a `.subnav.page-bar` row, attaches it to the registry as the secondary bar, and registers the page's name as the left zone's first tool. It has the space bar's one colour (`--nav-secondary-bg`), its two zones and its fold. Calendar and Map keep their bar (`#dest-bar`, `.dest-bar`, the view switch, the filter, the search) and show no name in it: their entry in the top bar is marked current. Per page:

  | Page | The page bar's name | Its controls |
  |---|---|---|
  | Manage (`/admin`) | "Manage", gear icon | its tabs (`#subtabs`), moved from the page body into the left zone after the name |
  | Profile (`/profile`) | "Profile", user icon | its tabs (`#subtabs`) |
  | Another person's profile (from Manage > Users) | their display name, user icon | its tabs; a **Manage** link first (see below) |
  | A space's settings | the space's name, its icon (`spaceCrumbIcon()`) | its tabs (`#subtabs`); a **Manage** link first |
  | AI configuration | "AI configuration" | a **Manage** link first |
  | A module's configuration | the module's display name | a **Manage** link first |
  | The module settings page | its heading ("<Space> settings") | none |
  | A module's page (`/modules/<id>`) | the module's display name and icon, or the title the module sets (as `crumbLink(mod.icon, title \|\| mod.name)` today) | none from the host |

  - **A Manage link**, on the pages that are part of Manage, for owners and the admin only: an icon and the word, going to the tab the page came from (`/admin#users`, `/admin#spaces`, `/admin#modules`), keeping `?from=space` as `crumbLink()` did. This keeps the way back the "Manage ›" segment gave, as a link in the page's own bar rather than a breadcrumb in the top bar. It is the plan's choice, not Thomas's.
  - **The tabs keep their ids, classes and behaviour** (`#subtabs`, `.subtab`, `data-tab`, `selectTab()`); they are only placed in the page bar's left zone. They scroll sideways when they do not fit, as `.subtabs` does today, on a phone too; they never fold. Nothing may clip the page bar's zones other than the tabs' own sideways scroll.
  - **A page opened over a call** (`?from=space`) keeps its **← Back to <space>** button where it is (`wireOverlayBack()`, the top bar's right zone) until plan-primary-nav step 7's return pill replaces it.
  - **On a phone** the page bar is the header's second row, as Calendar's is; the name is not repeated there (the anchor has it), so the bar holds the controls, and a page with none has no page bar on a phone.
  - **The host console** gets no page bar and no segment: it is the deployment's own page, with its own tabs, outside any environment.
  - **A guest's page** has none of these pages.
- **Phones (640 px and below): unchanged but for the anchor above.** The bar is the logo, the anchor (a space's last segment, or the page's name as a label), the bell and the menu button; the menu holds the environment's name, home, the switcher's entries, the destinations (`menu-dest-<id>`), **New <space word>**, **Call settings** while on the call, then you and the profile menu's entries. The destinations' bar entries stay hidden on a phone (`visible: wide`).
- **Guests and the host console: unchanged.** A guest's bar has no destinations, no Spaces slot, no bell and no profile; the host console's bar stops after the anchor.
- **Colours:** three areas, see "Colours" below.

### The space bar (`public/space.js`, `public/space-people.js`, `public/style.css`)

- **Order, left to right:** the left zone, `module-chooser` (group `modules`, order 1), then `who-here` (group `people`, after it, `fold: false`, with `fit`); then the right zone, unchanged: Dock all, the snap switch and its slider, Full screen, Pop out, Pull participants back, Rejoin call, a module's own groups, the **…**, Leave.
- **The markup** is `.nav-left` and `.nav-right` only. `#subnav-middle` goes with its zone: it is the one element id this plan removes, and nothing stored or linked uses it (only `space.js`, `style.css` and `check-nav.mjs` name it).
- **The grid** is `minmax(0, 1fr) auto`: the left zone takes what the right does not. The `data-middle` attribute and its rules go.
- **What gives way, in order**, as narrow widths come (641 px and up; the rule "who is here gives way before any tool folds" stays):
  1. Online shrinks to the width it is given: the names with every portrait, then the count ("5 in this space") with as many portraits as fit, then the short count alone ("5 here"). Words give way before faces, as now.
  2. The right zone folds into the **…**, in today's order: Pop out, Full screen, a module's own tools, the snap switch with its slider, Dock all, Rejoin call, Pull participants back.
  3. Leave, the **…**, the Modules button and Online at its short count never fold.
- **Online's list** (`#who-here-list`) opens under its button, inside the window, as now (`place()`); the header still rises while it is open. Nothing may clip the space bar's left zone, which now holds both lists (the Modules list and Online's).
- **What Online shows** (decision 9): who is here as it is, with its words ("You and Alex", "5 in this space", "5 here"), its title, its list and its id (`who-here`). Only its place changes. The environment-wide online people widget stays plan-primary-nav step 4, in the top bar's right zone before the bell.
- **Phones: unchanged.** The space bar is the tab bar at the bottom: the module tabs, then Online's compact count, then Leave. With Online in the left zone after the chooser, the phone rule that shows the count follows it there (it selects `.subnav-middle` today).
- **The destination page's bar** (`.subnav.dest-bar`) follows: its empty middle element and its middle grid rules in `destination.css` go, and it takes the space bar's one colour.

### Colours

**The space bar** is one colour, `--nav-secondary-bg` on the whole bar (decision 6), as now not a theme key. The top bar's zone rules stop reaching it: they are written as child selectors (`.topbar > .nav-left`, `.topbar > .nav-right`), and no rule gives `.subnav .nav-left` or `.subnav .nav-right` a background.

**The top bar's three areas** (decision 8), in `public/style.css`:

| Area | What it covers | Background | Text |
|---|---|---|---|
| Branding | the logo box and the environment's name (`#brand-home-link`, or the guest's plain span), the full height of the row, flush to the left edge | `--nav-brand-bg` | `--nav-brand-text` |
| Left zone | the destinations, the Spaces slot, the breadcrumb, the status line, and the empty width up to the right zone | `--nav-primary-bg` (as now: `--header-bg`, which a theme sets as Header background) | `--header-text` |
| Right zone | online people (later), the bell, your picture, the full height of the row, flush to the right edge | `--nav-right-bg` | `--nav-right-text` |

- **Defaults, so nothing changes until a theme sets them.** In `:root`, `--nav-brand-bg` and `--nav-right-bg` are `var(--nav-primary-edge-bg)`, and `--nav-brand-text` and `--nav-right-text` are `var(--header-text)`. `--nav-primary-edge-bg` stays the shared Auto, written as an opaque colour, `color-mix(in srgb, var(--header-bg) 97%, black)`, which looks the same as today's 3% black overlay on the header colour; opaque so the theme editor's colour box can show the Auto colour truthfully (a translucent black reads as black there).
- **Text in each area.** Each area sets `--header-text` for what is inside it to its own text token (for example `.topbar > .nav-right { --header-text: var(--nav-right-text); }`), so its names, its carets, and its icons that fall back on the header text (`var(--icon, ...)`) follow without a rule per control. A theme that sets `icon` still sets every header icon, as today.
- **On a phone** the branding area keeps its colour behind the logo box; the rest of the bar (the anchor, the bell, the menu button) is the main colour; the menu panel keeps its own colours as now. The right zone's colour is for the bar on wider screens.
- **The host console's bar** has the branding area and the left zone; its right zone is not drawn, as now.
- **Contrast** is the theme's author's: the editor does not refuse a pair, as it does not for the header today.

**Theme keys** (server-development), four more optional keys, `null` meaning Auto:

| Key | Property | Editor field (Manage > Theme) | Auto in the editor's preview |
|---|---|---|---|
| `navBrandBg` | `--nav-brand-bg` | Branding area background, `#theme-nav-brand-bg` | `var(--nav-primary-edge-bg)` |
| `navBrandText` | `--nav-brand-text` | Branding area text, `#theme-nav-brand-text` | `var(--header-text)` |
| `navRightBg` | `--nav-right-bg` | Right side background, `#theme-nav-right-bg` | `var(--nav-primary-edge-bg)` |
| `navRightText` | `--nav-right-text` | Right side text, `#theme-nav-right-text` | `var(--header-text)` |

- `THEME_OPTIONAL` in `server/store.js` gains the four keys (after `headerText`); `VARS` in `server/theme-css.js` gains their properties. `updateTheme()`, `cleanThemeColors()`, the theme file (`SET_KEYS` follows `THEME_OPTIONAL`) and a template's embedded theme take them with no change of their own.
- **Stored themes keep working.** A stored theme, a theme file or a template's theme without the keys reads them as Auto (`null`), so it looks exactly as before. A theme file written by this server carries the four keys (as `null` when on Auto); an older server reading it drops them and names them in `dropped`, never refuses the file, so `formatVersion` stays 1. Strong Coffee and the two built-in themes set none. A bundled template's theme is unchanged, so no template's version moves.
- **The editor** (experience-design): four rows in Manage > Theme, after Header text, each a colour input with its **Auto** box, as Header background and Header text are, and four entries in `THEME_OPTIONAL_FIELDS`. The preview paints the header as it would look.
- **The words** a person reads in the editor: "Branding area background", "Branding area text", "Right side background", "Right side text". The design document's table (`design-theme.md`) gets the four tokens; that is content-manager's.

### The checks (`tools/check-nav.mjs`)

- `SLOTS` with `destinations` after `environment`.
- `destinationTools()`: the bar entry in the left zone, group `where`, ordered before `spaces-slot`; the menu entries' order unchanged.
- `brand.js`, `primary-nav.js` and `space.js` register nothing with `zone: 'middle'`; `register()` refuses it.
- `who-here` is a left-zone tool after `module-chooser`, `fold: false`, with `fit`.
- `cleanModuleTools()` puts a tool that names `left` or `middle` in `right`, not refused (the case that today expects `middle` to stay).
- The fold, as pure functions: the width Online is given; a tool given exactly that width folds nothing and a little more folds the right zone; `foldCount()` with no middle; `middleCentred()` and `middleWidth()` cases removed.
- `phoneZones()`: the bell in the phone's place, everything else from the right in the menu (the case's `middle` input goes).
- The stylesheet: the top bar's grid with no 1001 px centring rule; the 641-820 px icon-only rule selecting the destinations in the left zone; your name from 1000 px and the environment's from 820 px, as now; the breadcrumb's `min-width: 6em`, as now; the space bar's grid with no `data-middle`; no background on the space bar's zones; `subnav-middle` out of the "nothing clips the space bar" list, and that rule still holding for the left zone that now holds Online.
- The anchor: the pure function gives nothing wider than a phone and the page's name as a label on a phone; only `space.js` sets segments (no `setTopbarLocation(` with a segment and no `crumbLink(` in `destination.js`, `admin.js`, `profile.js`, `space-settings.js`, `ai-config.js`, `module-config.js`, `module.js`).
- The page bar: the shared builder used by each page in the table, attached as the secondary bar, its name the left zone's first tool; `#subtabs` inside it on Manage, Profile and a space's settings; the Manage link only for owners and the admin; `.page-bar` in the "nothing clips the space bar" rule's list.
- The stylesheet's colour areas: `--nav-brand-bg`, `--nav-brand-text`, `--nav-right-bg` and `--nav-right-text` defined in `:root` with the defaults above; the branding area and the right zone painted with them, by child selectors of `.topbar`.
- The theme keys (`tools/check-theme.mjs`, `tools/check-themes.mjs`, server-development): the four keys in `THEME_OPTIONAL` and `VARS`; a set with them writes them to `/theme.css` and one without them writes nothing for them; a stored theme without them reads them as `null`; a theme file with them round-trips, one with a bad value goes back to Auto and names it in `dropped`; a theme file and a template's theme without them still load.
- The editor's four fields in `THEME_OPTIONAL_FIELDS`, each with its Auto box in `admin.html`.

## Left to build, in order

Documentation after each step is content-manager's.

1. **The top bar in two zones** (experience-design). The destinations to the left zone (`destinationTools()`, `SLOTS`, `lookOf()`), the grid, the phone's place for the bell (`#core-nav`), the 641-820 px icon-only rule, the anchor (places only; a space's breadcrumb the only segments; the page's name as a label on a phone), the shared page bar on Manage, Profile, a space's settings, the configuration pages, the module settings page and module pages (decision 10), the three colour areas with their defaults (style.css only, nothing visible changes), and their checks. Closes the TODO's "shows twice" item.
2. **The theme keys** (server-development). The four keys in `THEME_OPTIONAL` and `VARS`, and their checks: stored themes, theme files and templates without them unchanged.
3. **The theme editor's fields** (experience-design). Four rows in Manage > Theme with their Auto boxes and preview. Needs step 2.
4. **The space bar in two zones** (experience-design). `who-here` to the left zone, the markup and grid without a middle, the fold without a middle (the width Online is given, `foldCount()`), the phone rule for Online's count, the destination page's bar, one colour, and their checks.
5. **The registry without a middle** (experience-design). `register()` refusing `middle`, `cleanModuleTools()` putting every module tool in the right zone, the checks. Content-manager: the SDK reference ("Registering into the nav bars", `zone` ignored) and the CHANGELOG's note for module authors.

Content-manager after the steps: [architecture-navigation](../architecture/architecture-navigation.md) (the two bars' zone tables, the anchor and the page bar on every page, the breadcrumb table, "The fold", "Rules": the middle centred on the row, between a phone and a wide screen), [design-theme](../designsystem/design-theme.md) (the nav tokens and the four new ones), the theme keys where [architecture-overview](../architecture/architecture-overview.md) lists them, the CHANGELOG (the new theme fields), the status lines of plan-primary-nav, plan-nav and the two destination plans, and #39's remaining part (the space bar's colour) in the TODO.

## Verify

- **Step 1.** Checked by `tools/check-nav.mjs` (above). Live in headless Chromium, signed in as a member and an owner, with Calendar and Map shown, at 1280, 1001, 1000, 900, 820, 700 and 390 px: home, a space, an aside's breadcrumb, a destination page, Manage, Profile, another person's profile, a space's settings, the AI and a module's configuration, the module settings page and a module page (no segment wider; the page bar with its name and tabs; the Manage link for an owner and not for a member; the plain label at 390 px, and again after the window crosses 640 px), Manage and Profile opened over a space with **Back to** still working, a tab picked from the page bar landing on its section (`/admin#modules` from the bell); the left zone's order; the icon-only entries from 820 px; a long space name cut while the destinations and the Spaces slot stay whole; the bell in the phone's bar at 390 px; the colours in light and dark looking as before (a screenshot against one taken before the change). With Calendar and Map off: the left zone as before less the entries. On a guest link: no entries.
- **Step 2.** Checked by `tools/check-theme.mjs` and `tools/check-themes.mjs` (above). Live with curl on a throwaway `DATA_DIR`: a theme with the four keys set, and `/theme.css` carrying them; an existing `DATA_DIR` copied from before the change, its themes and `/theme.css` unchanged; a theme file exported before the change imported after.
- **Step 3.** Live in headless Chromium as an owner: the four fields, Auto on by default showing the default colours, a colour set and saved, the header painted with it in that mode only, Auto put back. On a single install and a hosted environment.
- **Step 4.** Checked by `tools/check-nav.mjs`. Live in headless Chromium with the faked LiveKit, one and five people in a space, at 1280, 1000, 800, 700, 641 and 390 px: Online after Modules, with its words as before; Online shrinking before anything folds, then the right zone folding in order; Online's list and the Modules list opening below, not clipped; a popped-out window's bar; the tab bar at 390 px (tabs, count, Leave); the destination page's bar; one colour across the space bar in light and dark.
- **Step 5.** Checked by `tools/check-nav.mjs`: a module tool naming `left` or `middle` lands in the right zone; a page tool naming `middle` is refused.
- **Needs a real call:** Online with several real people on the call, their names and pictures shrinking as the bar narrows, and its live count as people join and leave. Not checked here, any step: a real screen reader, Firefox, Safari, a real phone.

## What is not decided

Nothing for this plan: Thomas answered its three questions (decisions 7 to 9) and clarified the top bar (decision 10). Three things are the plan's own choices, which he may still overrule: the anchor on a phone is the page's name as a plain label (the least surprising of the two ways he offered); the pages that are part of Manage carry a Manage link in their page bar, for owners and the admin; and a module's tools all go in the space bar's right zone, whatever `zone` they name.

Later, outside this plan: the space bar's colour in the theme editor (the rest of #39); the online people widget in the top bar (plan-primary-nav step 4).
