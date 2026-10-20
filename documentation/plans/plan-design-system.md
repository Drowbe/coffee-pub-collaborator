# Design System Plan

**Audience:** Thomas, who decides the design of every component and how strict the rules are; experience-design, which builds the shared stylesheet, the page and each component's move onto it; server-development, which builds the page's route, the usage scan and the check; quality-assurance, which measures each move against its screenshots; content-manager, which writes the design pages and the rule text once Thomas approves it.

**Status:** decided 2026-10-15 (questions 1 to 4); step 1 starting. Questions 5, 6 and 7 are still open and do not block the build. Later the same day, after seeing the first-look page, Thomas changed how the components are decided: one family at a time, in chat, with a proposal on the review page before anything moves into `system.css`. The button family is decided (see Component decisions); fields and forms are next. From Thomas, 2026-10-15, after a day of visual rules added one complaint at a time (selected states are fills, the radius tokens, the form standard, and a "no coloured borders" rule that was written too broadly and is being rolled back): "We are missing a visual language. Do we not have a design system in place?" His decision, in his words: roll back the border sweep; "Create webpage that will become our design system"; "we will only use components in that system. If a component does not exist, we will add it to the system"; "We will ensure that if we change the design of a component in the design system, the consumers of said component get those changes for free (we should not have to change code for something using a component)"; "If we are creating something that may not need to be part of our system, we will discuss it first as an exception". His example of a simple system is his blog's page, https://stayingblonde.com/design-system/, and "ours will be far more exhaustive and robust". Added later the same day: he wants to see the system as it is built, without a new image build each time, "so we don't invest cycles in things I might want to change"; this adds a review copy (step 6b) and a review gate before any component changes. 2026-10-20: 26 families are drawn; a build-out plan to move the product onto them is below, approved to start 2026-10-21 and revised the same day after Thomas said "we have not released this product yet. There is not "migration" or "legacy" or whatever needed", with a one-page approval sheet in [plan-design-system-approval](plan-design-system-approval.md).

## What it is today

There are documents and tokens, and a few shared pieces, but no living components. Every page and module draws most things itself, so they drift, and each fix lands as one more rule.

**What exists and works.**

- [design-theme](../designsystem/design-theme.md): the colour tokens (seven a theme sets, thirteen it may set, the rest derived), the eight tints, the five radius tokens (`--radius-min` 3px, `--radius-small` 5px, `--radius-medium` 7px, `--radius-large` 11px, `--radius-round` 999px), `--selected-bg`, the bar layout tokens, and prose for the action button, the action bar, the switch, the editor window and the kind picker. It is a reference document, not a page of live examples.
- `public/sdk/host.css` (1,207 lines): the module page's base. The server inlines the current file into every module HTML page it serves (`server/index.js:7849-7861`, `<style id="sdk-base">`), and a module running in the page fetches `/sdk/host.css` into its shadow root (`public/module-host.js:2198-2207`). So **a change to `host.css` already reaches every module, bundled or uploaded, with no module version bump.** This is the pattern the system builds on. Its marked blocks: `action-btn`, `view-switch`, `form`, `datepicker`, `editor`, `kind`.
- `public/style.css` (12,296 lines, about 2,000 rules, 891 class names): every app page's stylesheet. It holds word-for-word copies of three `host.css` blocks (`action-btn`, `view-switch`, `form`), each held equal by a check (`check-buttons`, `check-switches`, `check-forms`).
- SDK helpers in `public/sdk/host.js` that draw UI: `host.ui.viewSwitch`, `host.ui.datePicker`, `host.ui.kindPicker`, `host.ui.currencySelect`, `host.ui.editor`, `host.ui.moreButton`, `host.ui.toolbarButton`, `host.ui.toast`, `host.ui.icon`, `host.menu.show`, `host.toolbar.set`, `host.status.set`, `host.add.set`. The menu's and the more button's CSS is a string in `host.js` (`UI_CSS`, `host.js:387-410`), not in a stylesheet.
- The form standard ([plan-form-standard](plan-form-standard.md), decided 2026-10-15): the `.sdk-form` block with its seven tokens is built in both stylesheets (`host.css:275-733`), the static check `tools/check-forms.mjs` is in `npm run check` and the measured one is `npm run check:forms`; only the Planner's markup uses `.sdk-form` so far.
- Checks that guard visual rules one at a time: `check-radius` (radius tokens), `check-nav` (no border on a selected state), `check-buttons`, `check-switches`, `check-forms`, `check-module-window` (no fixed colour in the editor and kind blocks), `check-theme`.
- Icons: Font Awesome Free 7.3.1 (`@fortawesome/fontawesome-free`, 2,001 solid SVGs, with `metadata/categories.yml` and `metadata/icons.yml` for categories and search terms). App pages load the font (`/fa/css/all.min.css`); a sandboxed module cannot, and asks for an SVG with `host.ui.icon(name)` (`GET /api/icons/:style/:name`). An admin may drop in Font Awesome Pro (`DATA_DIR/fontawesome-pro/`). About 81 distinct icon names appear in the code.

**What is missing.** No component list, no type scale, no spacing scale, no elevation or motion tokens, no states model, no place where a person can see a component, and no rule that a page or module must use one.

### The audit, in numbers

Read from the code, not measured in a browser.

| Measure | Count | Where |
|---|---|---|
| Stylesheets | 23 | `public/style.css`, `public/sdk/host.css`, `destination.css`, `landing.css`, `diag.css`, 18 in `modules/*/src/` |
| Distinct class names across them | about 1,470 | 891 in `style.css` alone |
| Font sizes in px | 20 different values | 12px 170 times, 11px 97, 13px 92, 14px 62, then 10, 16, 15, 18, 20, 17, 9, 22, 28 and seven more |
| Font weights | 6 | 400, 500, 600, 650, 700, 800 |
| Distinct `padding` values | 191 | no spacing scale |
| Distinct `gap` values | 39 | |
| Distinct `box-shadow` values | 70 | no elevation scale |
| Distinct `z-index` values | 28 | only `--z-menu` is a token |
| Distinct `transition` values | 26 | no motion tokens; `prefers-reduced-motion` in 6 files |
| Breakpoints | 10 widths | 640px 36 times; also 480, 560, 600, 760, 820, 1000, 1200, and `.app.narrow` in modules (55 rules) |
| `border` declarations | 616 | 165 of them in the accent, a tint, `--danger` or `--ok` |
| Coloured edge bars | 6 places | below |
| Inline visual styles in scripts and markup | 6 | 3 `style=""`, 3 `.style.*` (low; good) |

### The audit, component by component

"Copies" are separate rule sets for the same thing. File references are to the first rule.

| Component | What exists | Drift and duplicates | Missing |
|---|---|---|---|
| Button | `.btn`, `.btn-primary`, `.btn-danger` in both stylesheets; `.btn-small`, `.btn-accent`, `.btn.on`, `.btn.off` in `style.css:955-1021`, `3674` only | The app's `.btn` is `7px 12px` with a press shift and `nowrap`; the module's is `6px 12px` without them (`host.css:88-125`). `.btn-small` is used by Polls (`polls.html:33`) and Stream (`stream.html:41-43`) but is not in `host.css`, so in a module it does nothing. Seven modules resize `.btn` themselves (about 20 rules: `budget.css:28`, `maps.css:40`, `places.css:83`, `research.css:152`, `travel.css:97`, `travel-lib-cards.css:104`, `todo.css:14`). Maps redraws Primary (`maps.css:172`). `.sdk-btn` (form) is a fourth button. Landing has its own `.btn` (`landing.css`). | One size scale; a quiet (ghost) look the modules keep inventing; a loading state |
| Icon button | `.action-btn` (shared, `check-buttons`), `.sdk-more` (in `UI_CSS`), `.sdk-field-btn` (form), `.fbtn` (the call's toolbar, `style.css:4166`, alongside `.action-btn`), `.msg-btn` (chat, `style.css:4579`), `.tb-btn` (module toolbar) | `.icon-btn` restated in Maps (`maps.css:97`) and Research (`research.css:16`), 30px, where `.sdk-more` is 28px | One quiet icon button with sizes |
| Field and form | `.sdk-form` and its classes (built, both stylesheets); base `input, select, textarea` in `host.css:242-259` | `.editor-card` restated in 7 modules; `.panel .fields` (`style.css:2273-2347`, `3530`), `.setup-field`, `.phase-date`, `.ai-fields` on the app's pages. Covered by [plan-form-standard](plan-form-standard.md) | Already planned there |
| Switch and tabs | `.tb-tabs` (shared, `host.ui.viewSwitch`, `check-switches`) | Six tab looks: `.tb-tabs`, `.layout-tabs` (`style.css:2927`), `.setup-tabs` (`10985`), `.subtabs` (`6267`), `.dest-tabs` (`destination.css`), Polls' own `.seg` (`polls.css:12-15`, a copy of the view switch). `.tb-tab.on` is an accent fill with `--on-accent`, not `--selected-bg` as rule 8 says | A tabs component distinct from the view switch, or a decision that they are one |
| Toggle | `input.switch` (`style.css:2720-2799`), app pages only | Not in `host.css`; a module wanting one uses a tick box with `role="switch"` (which the form standard forbids) | Decide whether a module may have one |
| Menu | `host.menu.show` (`.sdk-menu`, CSS in `host.js` `UI_CSS`) | Five menu looks: `.sdk-menu`, `.host-menu` (`style.css:7293`, the nav registry's), `.modules-menu` (`6815`), `.chat-command-menu` (`4942`), the Planner's own `.menu` (`travel.css:119-123`); `.popover` is defined twice (`style.css:5444`, `5605`) | The menu's CSS in a stylesheet; one menu look |
| Card and row | `.card`, `.section` in `host.css:261-273` | `.tile` has four top-level rule sets (`style.css:2119`, `2199`, `2208`, `5541`); `.panel`, `.user-card`, `.module-settings-card`, `.bgpick-card`, `.aside-overlay-card`; Planner cards (`travel-lib-cards.css`, 336 rules), Research `.rcard`, Places `.place-row`, Calendar `.item`. Selected rows drawn three ways (Places' gradient, `places.css:114`) | A row component (list rows that are and are not boxes) and a card component with slots |
| Chip, pill, badge | `.sdk-kind-chip`, `.sdk-chip` (form) | More than ten looks: `.chip` in Calendar (an event block, `calendar.css:22`) and Places (a filter pill, `places.css:25`), `.filter-chip` (`style.css:8024`), `.rs-chip` (Research), `.chip-btn` (Budget), `.pill` (`style.css:6651`, `travel-lib-cards.css`), `.badge`, `.daychip`, `.markerpill`, `.phase-chip`, `.nav-badge`, `.pin-badge` | Filter chip, status chip, count badge as named components |
| Banner, notice, toast | `.toast` (`style.css:6989`, through `host.ui.toast`) | `.env-banner` (`8803`), `.bell-notice` (`474`), Maps' `.banner` (`maps.css:39`), `.conflict-bar` restated in Places, Research and the Planner (`places.css:81`, `research.css:150`, `travel.css:95`), each with a `--danger` outline | One banner with kinds; one inline notice |
| Error line | none | `.error` restated in 8 modules, Stream's with a fixed colour (`stream.css:13`, `#e07a5f`) | Part of the form standard (`.sdk-form-error`); a page-level one |
| Empty, loading, error states | none shared | `.state` in Budget, Maps, Places, the Planner (4 copies, `budget.css:120`, `maps.css:111`, `places.css:86`, `travel.css:137`); `.empty` in Calendar, Polls, To-do (3); `.skel` loading bars in Maps, Places, Research, the Planner (4); on the app's pages `.canvas-empty`, `.dashboard-empty`, `.bell-empty`, `.activity-empty`, `.chat-view-empty`, `.no-call-empty` | One empty state, one loading skeleton |
| Message and AI card | `.message`, `.message-*` in `style.css:4623` onward, `data-tint` | One place, but its tint is a 3px coloured left edge (`style.css:4641`) | Registered as a component with its parts |
| Status strip and phase chip | `status-strip` block (`style.css:9552-10107`), `.phase-chip`, `.nav-text` | One place; the nav text has its own tokens | Registered as a pattern |
| Calendar and day cards | Calendar module (`calendar.css`), the Planner's day cards (`travel-lib-cards.css`), the date picker's month (`datepicker` block) | Three month and day looks; Calendar's markers and outside events use a 3px inset coloured edge (`calendar.css:152-184`) | A day cell and an event chip shared by Calendar, the Planner and the date picker |
| Pins and map UI | Maps (`maps.css`), the Planner's map, MapLibre controls restyled (`maps.css:43-44`) | Pin drawn twice (Maps and Planner), allow-listed in `check-radius` | Registered as a pattern |
| Call controls | `.action-btn` with `.fbtn` (`space.html`), `.fbtn-caret`, `.fbtn.danger`, `.fbtn.dial` | `.fbtn` still carries states and a meter beside `.action-btn` | Registered as a pattern; verified only in a real call |
| Home tiles and ghost slot | `.tile`, `.tile-ghost` (`style.css:5792`), the dashboard's widgets | `.tile` restated four times | Registered as a pattern |
| Editor window, kind picker, date picker, action bar | `editor`, `kind`, `datepicker` blocks in `host.css`; `action-bar` block in `style.css:10109` | One place each; the action bar is app-only and the editor row module-only, with the same look | Registered as they are |

**Coloured edges today** (the kind of thing Thomas has objected to; each one is for him to keep or change on the page, and nothing changes until he does): the message's 3px left edge in its tint (`style.css:4641`); the host console's environment card, a 4px left edge in its status colour (`style.css:782-794`); Calendar's markers and outside events, a 3px inset edge (`calendar.css:152-184`); the conflict bars and the environment banner, a 1px `--danger` outline (`places.css:81`, `research.css:150`, `travel.css:95`, `style.css:8803`); `.btn-danger`, a `--danger` outline (`host.css:116-120`, `style.css:1016`); and a `.btn` on hover, an accent-tinted border (`host.css:100-103`, `style.css:970-973`). The timeline's 4px top edge on a phase band is a chart mark, listed in [design-theme](../designsystem/design-theme.md).

## Decisions

Only what Thomas has said.

- **Roll back the border sweep** (Thomas, 2026-10-15). In progress, not part of this plan. The rule it added ("no coloured borders, anywhere") goes with it; the coloured edges above stay as they are until he decides each one on the page.
- **A webpage becomes the design system** (Thomas, 2026-10-15: "Create webpage that will become our design system").
- **Only components in the system are used; a missing one is added to the system first** (Thomas, 2026-10-15: "we will only use components in that system. If a component does not exist, we will add it to the system").
- **A change to a component reaches its consumers with no change to their code** (Thomas, 2026-10-15: "We will ensure that if we change the design of a component in the design system, the consumers of said component get those changes for free (we should not have to change code for something using a component)").
- **Anything outside the system is discussed first as an exception** (Thomas, 2026-10-15: "If we are creating something that may not need to be part of our system, we will discuss it first as an exception").
- **More than his blog's example** (Thomas, 2026-10-15: "ours will be far more exhaustive and robust"). The blog's page shows live examples of every widget, a prefixed class family where a widget takes up to three classes in a fixed order (a required style class, an optional icon, an optional button style), one place that sets every heading so a change spreads by itself, and a rule to ask for a custom build instead of restyling. It has no tokens, no states, no snippets and no phone notes; this system has all four.

Decided 2026-10-15, taking the recommendation in each case:

- **The first deliverable is the page showing today's components unchanged** (Thomas, 2026-10-15). Then each component is redesigned one at a time, after his review on the page. Reason: building the page and redesigning at once mixes two kinds of change and makes before and after impossible to compare.
- **The page is `/design-system`, for any signed-in member and up** (members, moderators, owners, admins), in the environment's own theme, and linked from the host console (Thomas, 2026-10-15). Reason: the people who build and use modules, including uploaded ones, can see it, and it does not show the environment's theme and words to strangers.
- **One shared `public/sdk/system.css`, loaded everywhere** (Thomas, 2026-10-15). App pages link it; module pages get it inlined by the server, as they get `host.css` today. Changing a component there updates every consumer with no module version bump. Reason: a change is made once, and it is what "consumers get changes for free" needs.
- **Keep today's class names; new components use the `sdk-` prefix** (Thomas, 2026-10-15). `.btn`, `.action-btn`, `.tb-tab`, `.card` and the `sdk-*` classes are registered as they are; membership in the system is the registry, not the prefix. Kept because Thomas decided it; the compatibility reason given then (nothing a module or a saved page uses is renamed) was withdrawn on 2026-10-21, when he said the product is not released. A product prefix is ruled out by the identifier rule in `CLAUDE.md`.

Decided 2026-10-15, later the same day:

- **Thomas sees the design system as it is built, without an image build each time** (Thomas, 2026-10-15: he wants to SEE it as it is built, without a new image build each time, "so we don't invest cycles in things I might want to change"). Reason: building into an image before he has looked spends effort on looks he may change. Three parts follow.
  - **A review copy.** From the first step that has a page (steps 3 to 6) onward, the project manager publishes the page as a private static web page, so he can look at each stage with no build or deploy. See (f).
  - **A review gate.** Before any component is consolidated or redesigned (steps 9 onward), Thomas looks at that component in the review copy. Nothing is moved onto a changed look until he has said so on the page. Before and after screenshots from the step 1 tool are published beside each stage, so he sees whether anything changed.
  - **The real `/design-system` route still ships.** It is built into an image only when Thomas is happy with a stage.

Decided 2026-10-15, after the first-look page:

- **One family at a time** (Thomas, 2026-10-15, on seeing the first-look page: "holy fuck. what a mess. no wonder much of my feedback was on inconsistencies"). He decides each component family in chat, with the options and a recommendation, in this order: buttons, fields and forms, tabs and view switches, cards and rows, chips and badges, menus. For each family a proposal is shown on the review page, in scoped CSS, and nothing in the product changes. He signs off there, and only then does the family move into `system.css`. Reason: the page showed how far the looks have drifted, and deciding every family at once, or building first, repeats the problem. This replaces "for each candidate family he picks the look" as a single review after step 8; the review now happens family by family, each before its step from 9 onward.

Standing decisions this plan keeps, already in [design-theme](../designsystem/design-theme.md): a selected, on, active or current state is a fill, never a border (Thomas, 2026-10-14: "I found ANOTHER button border. Stop adding them."); corners are the five radius tokens; and the form standard's decisions ([plan-form-standard](plan-form-standard.md), 2026-10-15).

Decided 2026-10-16:

- **A third page, a Prototype page** (Thomas, 2026-10-16). Whole screens drawn from the proposed components as they would appear in the product: panels, forms, chat, the call bar, the Planner. Reason: buttons and other components cannot be judged alone, only in context. Not needed yet; it is built after a few families are approved, and is placed in the step list under "Left to build, in order".

## Component decisions

One table per family, dated. Each row is Thomas's decision; for the buttons he took the recommendation in every case. The CSS is written only after the proposal has been shown on the review page and he has signed off there.

### Buttons (decided 2026-10-15)

| Question | Decision | Reason |
|---|---|---|
| Roles | Four: Primary, Secondary, Danger, Quiet. A toggle uses the selected fill (`--selected-bg`). The Accent button and the on/off look fold into these. | Four roles cover every button the audit found; a toggle is a state, not a role. |
| Sizes | Two: default 38px (44px on a phone, 640px and below) and small 30px. | Matches `--control-h`, `--control-h-touch` and `--control-h-sm`; removes the 28px and other one-off heights. |
| Danger | A soft red fill (`--danger-bg`) with text in the darker mix of `--danger` into `--text` (about 5 to 1 contrast in light mode). Solid red (`--danger` with `--on-danger`) only for a final confirm. | Danger is shown by a fill and text colour, not an outline (see the border rules). A destructive action that is not final should not shout. |
| Icon-only buttons | One component: square, `--radius-small` corners, in the same two sizes. It replaces the action, more, icon, field, close and message buttons (`.action-btn`, `.sdk-more`, `.icon-btn`, `.sdk-field-btn`, close buttons, `.msg-btn`). | Six looks for one thing. |
| Call controls | They stay circles (`--radius-round`). | The call's toolbar is its own pattern; only checkable in a real call. |
| Class names | Today's are kept and redefined once: `.btn`, `.btn-primary`, `.btn-danger`, `.btn-small`, `.sdk-btn`. Added: `.btn-quiet` and one icon-button name (chosen when the proposal is built, named by kind). | Names kept as Thomas decided; the compatibility reason is withdrawn (2026-10-21); consumers get the change with no code change. |

Thomas decided this on 2026-10-18: today's `--danger-text` is the pale red of dark mode and fails contrast on a light page, so Danger buttons and error text (see Fields and forms) use the same readable colour, the darker mix of `--danger` into `--text`.

What this settles for step 9: the spec above. What it leaves for the proposal: the exact fills and hover and pressed fills (tokens), the loading state, and the icon-button class name.

### Fonts (decided 2026-10-16)

Thomas's decisions on the Typography family of the Proposed page (commits f18d7ac, 75f8e26).

- **Bundled fonts.** The product bundles its own fonts, self-hosted as woff2 from our own server, with no third-party font CDN, so it renders the same for everyone. Reason: system fonts have different metrics, so button text sat low on some systems. The fix is font-metric overrides in `@font-face`, so a fallback matches the bundled font.
- **UI font: Figtree.** SIL OFL, variable, weights 300 to 900, Latin only; Cyrillic and Greek fall back.
- **Headline font: Fraunces.** SIL OFL, variable, Latin only. For display text only: the landing title, page titles, the environment name in the top bar, and space names on Home cards. Everything else stays Figtree; small labels and the 14px docked title bar stay sans.
- **Still to decide:** weights and the size scale. Today the product uses 17 pixel sizes and the weights 400, 500, 600, 650, 700 and 800.
- **Open points:** italics are dropped everywhere (decided 2026-10-21): no italic text anywhere, and a quote uses the bar or quotation marks. A per-template headline font is a possible later decision, not decided. Fraunces at 17 to 18px is to be checked in context.

### Fields and forms (decided 2026-10-18)

Thomas's decisions on the Fields and forms family of the Proposed page (commit c13beaf and its follow-ups). Each one is his decision, in plain words.

- **Field edge.** A neutral 1px hairline (`--border`) with a `--bg-input` fill. Height 38px, or 44px on a phone. Corners `--radius-small`.
- **One focus rule.** An accent border with a soft 2px ring. It is drawn so all four sides render equally at any display scale.
- **Placeholder.** Text in `--text-dim`.
- **Error.** A danger edge on the field, and an error line below it, marked `aria-invalid`. The error text is the darker mix of `--danger` into `--text`, the same as the Danger button. Reason: today's `--danger-text` fails light-mode contrast at about 2.1 to 1.
- **Required.** Write "(optional)" in the label of optional fields only. No asterisks.
- **Choosing.** One 16px tick box and one radio, with the edge in `--text-dim`.
- **On and off.** One switch component, 36 by 20. The Planner's round-trip tick, which has a switch role, becomes a real switch. The To-do 18px tick becomes 16px.
- **Search.** One 38px search field with the magnifier inside it. The three search looks in use today fold into it. No compact variant until a real need appears.
- **Calendar and picker buttons.** Inside the field at the trailing edge, as a small quiet icon button.

Open items:

- The date field's native text is not settled, and Firefox and Safari are untested.
- Pickers, Choice rows and the Editor window are still undecided.

### Tabs and view switches (decided 2026-10-18, except counts)

Thomas's decisions on the Tabs and view switches family of the Proposed page. Each one is his decision, in plain words.

- **Shape.** Separate tabs, each a rounded rectangle with `--radius-small` corners. Not fully round ends.
- **Height.** 30px for small and 38px for the default. On a phone the tap area is 44px.
- **The toolbar view switch.** The same component, with its tabs joined by 2px gaps.
- **Selected.** The quiet neutral `--selected-bg` fill, with the text in the darker accent mix (about 5 to 1). No solid accent fill and no underline bar.
- **Overflow.** A strip of tabs scrolls sideways and keeps the selected tab in view. The toolbar view switch drops to icons only when it is narrow. The top bar keeps its "..." fold.
- **Separate families.** Chips and the phone bottom bar are not part of this family.
- **Counts: not approved here.** This entry does not settle the counts on tabs. The count badge is recorded under Chips and badges below, and whether it stands for tabs is still open.

### Chips and badges (decided 2026-10-18)

Thomas's decisions on the Chips and badges family of the Proposed page. Each one is his decision, in plain words.

- **One family, with roles.** The choice chip and the people chip are 30px high. The tag and the removable chip are 24px high.
- **Corners.** `--radius-small`.
- **Selected.** The quiet neutral `--selected-bg` fill.
- **Text size.** No text under 11px. Tags are 12px. Choice chips are 13px.
- **Category colour.** A tint fill with readable text. Never a coloured border or bar.
- **Count badges.**
  - An 18px neutral count after a tab label.
  - A 16px accent count in the corner of an icon-only tab.
  - Capped at 99+.
  - Where a number is not useful, a 7px dot.
- **The pill colour.** The hard-coded `#e0b25a` pill moves to a token. The token's name is for the proposal to choose.
- **Retired.** The 9 to 10px caps tags.

### Cards and rows (decided 2026-10-18)

Thomas's decisions on the Cards and rows family of the Proposed page. Each one is his decision, in plain words.

- **One surface.** A card has a 1px neutral hairline and no shadow.
- **Hover and selected.** Both are quiet fills. Selected uses `--selected-bg`.
- **A row inside a card.** It drops its own border and takes the next surface step along `--bg`, `--bg-section`, `--bg-card`, `--bg-input` from the card it sits in.
- **Tinted cards.** The Planner, Places and Research tinted gradient cards lose the gradient, the coloured border and the lift. Category colour stays on the icon and the text.
- **The menu slot.** A "..." menu sits in a fixed top-right slot on cards, and at the end of rows. A card or row has at most one primary inline action.
- **Height on a phone.** Rows are 44px high.

### Coloured left bars (decided 2026-10-18)

Thomas's decisions on the coloured edges listed in the audit. Each one is his decision, in plain words. Each bar becomes a fill, an icon or words.

- **Chat messages.** A tint fill.
- **The chat link box.** The tint goes on the portrait icon only.
- **Toast and the option-help callout.** A neutral hairline and an icon.
- **Host console environments.** A status chip with a word, such as Active, Past due or Suspended.

**Exception** (Thomas, 2026-10-18). Calendar's agenda rows and event markers keep their bar: `.item`, `.item.ext`, `.item.marker`, `.chip.ext` and `.chip.marker`. The owner is Thomas. The reason is his decision; no other reason is given here.

Where the exception is recorded:

- The route in this plan is `public/design-system/exceptions.json` (what, file, reason, owner, date, his words), once that file exists.
- The `check-borders` tool was removed in the rollback, so no allow-list is kept. If a bar check returns, its allow-list would be `tools/check-borders-allow.json`, and this exception goes there.

### Menus and popovers (decided 2026-10-18)

Thomas's decisions on the Menus and popovers family of the Proposed page. Each one is his decision, in plain words.

- **One standard menu surface.** A 1px neutral hairline, a medium corner (`--radius-medium`), one shadow token and 4px of padding.
- **Items.** 32px high on desktop and 44px on a phone.
- **Hover.** A quiet neutral fill.
- **The current choice.** The neutral selected fill (`--selected-bg`).
- **Check marks.** Only in rows that are tick boxes.
- **Danger.** Red text only, in the darker readable mix. No red fill on hover.
- **Long lists with search.** They become the bottom sheet the kind picker already uses.
- **Still to decide.** Dialogs and sheets, toasts and banners, and tooltips. Each is a separate family.

### Typography (decided 2026-10-19)

Thomas's decisions on the type sizes and weights. Each one is his decision, in plain words.

- **Interface sizes.** Nine steps, in Figtree: 11px for captions, 12px for small text, 13px for dense UI, 14px for default UI and body text, and 16px for large body text and phone fields.
- **Headline sizes.** Four steps, in Fraunces: 18px for section headings, 22px for titles, 28px for page titles and 40px for display text.
- **One exception to the 11px floor.** The micro count: a 9px number inside a 14px corner badge on icon-only tabs and icon buttons. It shows 99+ at most.
- **Interface weights.** 400, 500 and 600. The weights 650, 700 and 800 fold into 600.
- **Headline weights.** Fraunces at 600 or 700, to be chosen on the page.
- **Phone fields.** Their text stays 16px.

### Colour (decided 2026-10-19)

Thomas's decisions on colour. Each one is his decision, in plain words.

- **The role list.** The role list as shown on the Proposed page is approved ("roles make sense"): seven base roles, plus optional status bases, and about 45 derived roles, each driving one job.
- **Text on a fill.** The text on a status fill is chosen automatically, dark or white, whichever passes 4.5 to 1. This is the same rule as text on accent.
- **Field edge.** The 1px hairline on a field stays. It is an accepted exception to the 3:1 contrast target for non-text parts. The fill separates the field, and focus and error are strong.

### Chips, badges and counts (decided 2026-10-19)

Thomas's decisions on the chips, badges and counts. Each one is his decision, in plain words.

- **The proposal.** The proposal as drawn is approved: small corner chips, a neutral selected fill, and counts, dots and avatars stay fully round.
- **Category choice chips.** A category choice chip shows its category on a dot or an icon, with no tint fill. Tags, removable chips and status labels keep the tint fill.
- **Counts.** Plain accent counts are replaced by the readable mix of accent into text.
- **The micro count.** A 14px badge with 9px numbers and a 3px inset. It is an allowed size (see Typography).

### Cards, panels and rows (decided 2026-10-19)

Thomas's starting values, in his words: "we can start with this". They may be tuned later.

- **Corners.** Large for cards and panels, medium for a row on a panel, small for a row inside a card.
- **Padding.** 12px for a card, 14px for a panel, 8px by 10px for a row, and 20px for a Home card.
- **Group headers.** 12px, weight 600, uppercase.
- **Ghost card.** A dashed neutral hairline, with no fill.

### Menus and popovers: additions (decided 2026-10-19)

Thomas's decisions that add to the menus and popovers family above. Each one is his decision, in plain words.

- **The proposal.** The proposal as drawn is approved.
- **One shadow.** One shadow token, `--shadow-2`, kept small: about `0 4px 12px`, not large.
- **A scrim.** A new scrim token is added. Its name is for the proposal to choose.
- **Hover.** Text at 10%, the same as tabs.
- **Date picker.** The chosen day is a solid accent fill. This is an exception to the rule that selected is neutral.

### Foundations and 17 more families (decided 2026-10-21)

Thomas approved all 18 drawn families as drawn: Foundations, Dialogs and sheets, Toasts and banners, Tooltips, Empty/loading/error, Links, Pickers, Progress and meters, Avatars and portraits, Choice rows, Module window, Chat, Journey bar, Phone tab bar, Calendar cell, Markers, Day cards and Tables. Every choice B1a to B18b is approved, with the fixes C1 and C6, and with the 8 earlier families that makes 26. Values that changed from the sheet or from earlier entries:

- **C2.** Ok green used as a mark (bars, presence dot) uses a darker ok mix that reaches 3:1 in light mode; dark mode is unchanged.
- **C3.** The environment name in the top bar is Figtree 600 at 16px below 640px and Fraunces 600 at 18px from 641px up; long names ellipsize.
- **C4.** Calming Teal keeps its teal; text on teal fills and teal-as-text are auto-picked; the theme editor warns about remaining low-contrast pairs.
- **C5.** Header chips are 30px, not 28.
- **C8.** Panel padding is 16px, on the 4px scale. This supersedes the 14px in "Cards, panels and rows" above. Card 12, row 8 by 10 (8 plus 2).
- **Fraunces headline weight** is 600.
- **Calendar end caps.** The approved left-bar exception for agenda rows (`.item`, `.item.ext`, `.item.marker`) and chips (`.chip.ext`, `.chip.marker`) is a straight, square-ended 3px block, not curved or clipped by the corner radius, and the side it sits on has square corners (the other corners keep their radius). Thomas: "I do not want them rounded like this as that looks sloppy." The Calendar draws it today as an inset box-shadow that follows the radius, so step 32 and the markers and day cards steps draw it straight.
- **The page.** The Proposed page becomes the design system page at `/design-system` in the product; the Today inventory is retired when the build-out ends and stays until the last step.

### Settings decisions (2026-10-21)

Thomas decided these about Manage on 2026-10-21. They are not design-system steps and are not placed in the build order above; they are recorded here, the nearest plan, so they are not lost. The Fields step (13) touches the same pages and should know them.

- **Conference's call features** live in Manage > Modules > Conference only. They leave Manage > Environment.
- **The shared Save and Cancel bar is not applied now.** It is revisited after the design system.
- **The first sub-tab of Manage > Environment is renamed "General".**
- **The hosted plan and usage panel stays at the top of that tab.**
- **The AI service gets a tab on Manage > Modules, like every other module.** Its settings, today on its own AI Configuration page, move into the tab. The AI service is the server-wide provider, model, key and usage setup shared by the Assistant, Chat's AI and Research; it is not part of the Assistant module.

## (a) The system

Four layers. Each lower layer is used only through the one above it: a module never writes a colour, a size or a shadow, only a component class and its own layout.

### Layer 1: tokens

All tokens are custom properties on `:root` in the system stylesheet (below). Colour tokens are the theme's and change per theme and mode; every other token is fixed and no theme sets it. The first build records today's values as tokens and changes nothing on screen; a value moves only when Thomas changes it on the page.

| Group | Tokens | Today |
|---|---|---|
| Colour, base | `--bg`, `--bg-section`, `--bg-card`, `--bg-input`, `--border`, `--text`, `--text-dim`, `--accent`, `--on-accent`, `--ok`, `--danger`, `--on-danger`, `--danger-text`, `--accent-hover` | exist |
| Colour, surfaces (levels) | level 0 `--bg` (the page), 1 `--bg-section` (a panel, a window), 2 `--bg-card` (a thing inside a panel), field `--bg-input`, recessed `--shade`, raised `--surface` and `--surface-hover` | exist; the page names the levels |
| Colour, roles | `--primary-hover`, `--secondary`, `--secondary-text`, `--secondary-hover`, `--selected-bg`, `--icon`, `--icon-hover`, the header and nav tokens | exist |
| Colour, state tints (new) | `--hover-bg` (a quiet hover, today written as `color-mix(in srgb, var(--text) 10%, transparent)` in about a dozen places), `--active-bg` (the menu's 14% accent), `--danger-bg`, `--ok-bg` (status fills) | written out in each rule today |
| Tints | `--tint-gold` to `--tint-pink`, `data-tint` | exist |
| Type | `--font-ui` (the page's family), sizes `--text-2xs` 10px, `--text-xs` 11px, `--text-sm` 12px, `--text-md` 13px, `--text-base` 14px, `--text-lg` 16px, `--text-xl` 18px, `--text-2xl` 22px, `--text-3xl` 28px; weights `--weight-regular` 400, `--weight-medium` 500, `--weight-semibold` 600, `--weight-bold` 700; `--leading-tight` 1.2, `--leading-normal` 1.4, `--leading-loose` 1.5; the heading styles h1 to h4 set once; `--nav-font-*` stay | 20 sizes in use; the nine named cover about 95% of declarations; 9px, 15px, 17px, 20px and the rest are listed for Thomas |
| Spacing | `--space-1` 2px, `--space-2` 4px, `--space-3` 6px, `--space-4` 8px, `--space-5` 10px, `--space-6` 12px, `--space-7` 16px, `--space-8` 20px, `--space-9` 24px, `--space-10` 32px; the form's `--field-gap`, `--label-gap`, `--section-gap` stay and point at these | 191 padding values; most are pairs of these |
| Radii | `--radius-min`, `--radius-small`, `--radius-medium`, `--radius-large`, `--radius-round` | exist, enforced |
| Lines | `--line` 1px `--border` (the neutral hairline), `--line-strong` (a 2px neutral, for a drag target's dashed edge), `--focus-ring` (`0 0 0 2px` of the accent at 30%) | written out today |
| Elevation | `--shadow-0` none (in the page), `--shadow-1` a card lifted on hover or drag, `--shadow-2` a menu, popover, kind list, toast, `--shadow-3` a window, sheet or dialog | 70 shadow values; the page shows today's groups for Thomas to name |
| Layers | `--z-canvas`, `--z-bar`, `--z-menu` (exists, 26), `--z-sheet`, `--z-window`, `--z-toast` | 28 values |
| Motion | `--motion-fast` 0.08s (a press), `--motion-base` 0.15s (hover, fill), `--motion-slow` 0.25s (a sheet, a callout), `--ease-out`; every animation stops under `prefers-reduced-motion` | 26 values |
| Density and size | `--control-h-sm` 30px, `--control-h` 38px (`--bar-control-h`, `--field-h`, `--action-btn-h`), `--control-h-touch` 44px; `--action-icon-ratio`; on a phone (640px and below) a control is at least 44px | exist under three names |
| Breakpoints (documented, not tokens, since a media query cannot read one) | three widths, 640, 900 and 1200px (decided 2026-10-21). A module keeps its own width and answers it with container queries, using the three widths as steps (`.app.narrow` becomes a container query); a page outside a module answers the window with media queries at the same three widths | 10 widths in use |

**Borders and dividers, by role.** Thomas has not forbidden borders. Each role has one look:

| Role | Look | Example |
|---|---|---|
| A thing's edge | the neutral hairline, `1px solid var(--border)` | a field, a card, a menu, a window |
| No edge | none; the fill or the space separates it | a menu entry, a row inside a box, a quiet button |
| A divider | the hairline on one side only | between menu groups, above an action row, between sections |
| State (selected, on, current, hover) | a fill: `--selected-bg`, `--hover-bg`, `--active-bg`; never an edge | a tab, a chosen day, a pressed tool |
| Kind or status (what a thing is, or its condition) | a fill tint and the icon or text colour | a status chip, a module's icon, a phase band |
| Focus | `--focus-ring` on `:focus-visible`; required, never removed | every control |
| A drop target | `--line-strong`, dashed, while dragging only | a canvas slot, Research's drop area |
| Elevation | a shadow, not an edge | a menu, a toast, a window |
| A coloured edge | not a role. The six places above keep their look until Thomas decides each on the page | the message's left edge |

### Layer 2: icons

- Font Awesome Free, solid style only, unless a component's spec names another (brands only for a service's own mark). On an app page a component writes `<i class="fa-solid fa-<name>" aria-hidden="true"></i>`; in a module, `host.ui.icon(name)` gives the SVG. A Pro install changes nothing in the names.
- **Our icon list**, `public/design-system/icons.json`: each icon the product uses, with the meaning it carries (`plus` is Add, `ellipsis` is More, `xmark` is Close), its category (actions, objects, people, places and travel, time, media and the call, status, navigation, files, money), and its aliases (the search words). One meaning, one icon: Add is always `plus`. A new meaning is added to the list before it is used, like a component.
- The whole Free set is browsable as well, from Font Awesome's own metadata (below), so a person can find a new icon and propose it.

### Layer 3: components

A component is a CSS class family plus a small markup contract, written once in the system stylesheet, and, where it has behaviour, one `host.ui.*` helper that draws that markup. Every component's entry on the page has the same parts:

1. **Anatomy**: the parts, each a class (`.sdk-menu`, `.sdk-menu-item`, `.sdk-menu-icon`, `.sdk-menu-label`, `.sdk-menu-hint`).
2. **The markup contract**: the exact HTML, in the fixed class order **component, variant, size** (`<button class="btn btn-primary btn-small">`, the order Thomas's example uses: a required class first, then the optional ones). State is never a class a consumer picks; it is an attribute: `disabled`, `aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-invalid`, `aria-busy` (loading). Today's state classes (`.on`, `.open`, `.today`) are registered as they are and given their attribute when the component is next changed.
3. **Variants**: Primary, Secondary, Quiet, Danger, and so on; only the listed ones exist.
4. **States**: rest, hover, focus (`:focus-visible`), pressed, disabled, selected, loading, error, each shown live.
5. **Sizes**: small (30px), regular (38px), touch (44px; automatic on a phone).
6. **Responsive behaviour**: what it does at 390px, 700px and 1280px.
7. **Accessibility**: role, name, keyboard, focus order, the contrast of each text and icon on its fill, in light and dark.
8. **Usage**: when to use it, when to use something else, and do and don't pairs.
9. **Content**: the words (sentence case, a verb on a button, the names in `CLAUDE.md`), length limits, icon or no icon.
10. **Tokens it uses**, read from the stylesheet.
11. **Consumers**: every page and module that uses it, found by a scan.
12. **Status**: stable, new or exception.

The first list of components, from the audit: button, icon button, action button, field and the form classes, tick box and choice, toggle, date picker, kind picker, currency list, view switch, tabs, menu, more button, popover, editor window, sheet, action bar and action row, card, row, chip (filter, status, people), badge (count), banner (info, warning, danger), inline notice (the conflict bar), toast, error line, empty state, loading skeleton, message, status line (`host.status.set`), tooltip (the `title` today), and the heading styles.

### Layer 4: patterns

Compositions of components, shown with real content and the markup to copy. Each names the components it is made of and adds no CSS of its own beyond layout:

- the form standard (every form's field, row, section and action row);
- the editor window with a form in it, at 560px, 880px and as a phone sheet;
- a module's window: titlebar, `host.toolbar.set`'s toolbar with a view switch, the **+** (`host.add.set`), the body, the status line;
- menus and flyouts: a row's more button opening a menu, a category opening its flyout, the nav registry's menu;
- lists: cards, rows, a selected row, a row with a menu, grouped lists with headings;
- messages: a person's message, a command's, the AI's card, an object shared into chat;
- feedback: a toast, a banner, the conflict notice with its buttons, an error under a field;
- status: status chips, the phase chip, the status strip, a count badge on a tab;
- calendars and day cards: a month cell, an event chip, a marker, the Planner's day card;
- pins and maps: a pin, a selected pin, a callout, the map's controls;
- call controls: the toolbar with mute, camera, share, leave and the device caret (shown, but only checked in a real call);
- empty and loading: a first-run empty state with its action, a loading skeleton, a refusal;
- Home: a space's tile, the ghost slot, the dashboard's widgets.

## (b) Propagation by design

**One stylesheet for every component, loaded by everything.** The component rules move out of `style.css` and `host.css` into one file, `public/sdk/system.css`, which holds the tokens (with the default theme's values), the state tints, and every component. No element rules (`body`, `input`) live in it, so loading it changes no page by itself.

| Consumer | How it gets `system.css` | Version bump to pick up a component change |
|---|---|---|
| An app page (space, Manage, profile, host console, landing, destination) | `<link rel="stylesheet" href="/sdk/system.css">` first, then `style.css`, then `theme.css` | none |
| A module in a sandboxed frame | the server inlines `system.css` then `host.css` into the module's HTML as it serves it, as it does `host.css` today (`server/index.js:7855-7860`) | none |
| A module running in the page (shadow root) | `module-host.js` fetches `/sdk/system.css` with `/sdk/host.css` and scopes both, as it does today | none |
| An uploaded module | the same two routes; it gets the system whether it asks or not | none |
| A module that opts out (`<meta name="sdk-base" content="none">`, today only Stream's keyed page for OBS) | nothing; it is a recorded exception | n/a |

`host.css` keeps only the module page's base (the element rules a module's own page needs). `style.css` keeps only the app's page layout. The word-for-word copies go, so `check-buttons`, `check-switches` and `check-forms` stop comparing two copies and check the one. The `UI_CSS` string in `host.js` moves into `system.css` (the menu and the more button), where the checks can read it.

**What a consumer may write.** A page or module writes markup with component classes and its own layout: where things sit (`display`, `grid-*`, `flex-*` placement, `order`, `gap` between its own blocks, `margin` between components, `position` and inset of its own blocks, `width` and `max-width` of its own columns, `visibility`, `overflow` of its own regions). It never sets a component's colour, padding, height, font, radius, border, shadow or state. A module that wants a component to look different asks for a variant (below), never restyles it.

**Data colours.** Where a colour is data, not design (a kind's colour, a phase's tint, a marker type's colour an owner chose), the consumer passes it as a custom property the component reads (`--kind-color`, `--tint`, `--tone`), never as a declaration. This is how the kind picker works today.

**When a component's look changes**, only `system.css` changes. Every consumer updates on its next load. Module versions do not move, because the module's own files did not change. (A module's own CSS does need a patch bump whenever it changes, so that Manage installs the updated bundled module in Thomas's own test environment.)

**When a component's markup contract changes** (a class renamed, a part added that consumers must write): the change is made once, in `system.css`, the registry and the bundled pages and modules together, in the same build. No old class is kept as an alias, there is no deprecation period and no warning release for uploaded modules (Thomas, 2026-10-21: the product is not released). `system.css` carries a contract number in its first comment and in the registry (`"system": 1`), raised on a change to a markup contract, and shown on the page. No module declares it; it is for people reading a CHANGELOG.

## (c) The webpage

**Route:** `/design-system`, for any signed-in member and up (decided 2026-10-15). It is an app page, served by the app, in the environment's theme, built from the system's own components.

**Files** (plain HTML, CSS and JavaScript, no build step):

| File | What |
|---|---|
| `public/design-system/index.html` | the page shell: the nav, search, the light and dark switch |
| `public/design-system/page.js` | renders everything below from the registry; the forced states, the widths, the search |
| `public/design-system/page.css` | the page's own layout only (it is a consumer like any other) |
| `public/design-system/registry.json` | the list: each component and pattern's id, name, group, status, file |
| `public/design-system/components/<id>.html` | one component: a `<script type="application/json">` head (name, status, since, classes, variants, states, sizes, tokens, helper, a11y, usage do and don't, content rules, changelog, replacedBy) and one `<template data-example="<name>">` per example. The example is the snippet: the page renders the template and shows its source, so the two cannot differ |
| `public/design-system/patterns/<id>.html` | a pattern, the same shape |
| `public/design-system/tokens.json` | each token's name, group and use (the values are read from the stylesheet, not written here) |
| `public/design-system/icons.json` | our icon list: name, meaning, category, aliases |
| `public/design-system/exceptions.json` | the exceptions: what, where (file), reason, owner, date, Thomas's decision |
| `public/design-system/changelog.json` | dated entries per component |

**What the page shows.**

- **Every component**: its live examples, every variant and every state, small, regular and touch; its anatomy; the snippet to copy; usage and content rules; a11y notes; the tokens it uses; its consumers; its status marker (stable, new, exception); its changelog.
- **Forced states.** The page reads `system.css` through the CSS object model and, for each rule with `:hover`, `:focus-visible` or `:active`, adds a copy that matches `[data-force~="hover"]` (and so on) inside the demo area. A forced hover is therefore the real hover rule, never a second copy that could drift. Disabled, selected, loading and error are attributes, so they are set directly.
- **Light and dark, and three widths.** Each example can render in a small same-origin frame of the page's own example route (`/design-system/frame`), which sets its own `data-theme-mode` and has its own width, so media queries and the theme's light and dark sets behave as they do for real: light beside dark, and 390px, 700px and 1280px (scaled to fit).
- **Tokens**: swatches of every colour in the current theme and mode, the surface levels stacked, the tints, the type scale as text, spacing as bars, radii as boxes, elevation as cards, motion as a play button; and the contrast ratio of each text and icon token on each surface, worked out in the page from the computed colours (WCAG 2), with the ones under 4.5 to 1 marked.
- **Icons**: our list by category, searchable by name, meaning and alias; and the whole Free solid set from Font Awesome's metadata, served compact by the app (`GET /api/design-system/icons`, built from `metadata/icons.yml` and `categories.yml` at start), with a **Propose** note that copies the name for a request.
- **Patterns**: the compositions in Layer 4, with real words in the environment's words (`host.util.word`).
- **Consumers**: from `GET /api/design-system/usage`, which scans the bundled modules' sources and the app's pages and scripts for each registered class and helper call, with the file and line. The scanner is one file (`server/system-scan.js`) that the check imports too, so the page and the check agree. Uploaded modules are not scanned.
- **Exceptions**: from `exceptions.json`, each with its reason, owner and date, linked from the component it differs from.
- **Changelog**, newest first, and per component.
- **Search** over names, classes, tokens, icons and words; **deep links** to every component, variant and state (`/design-system#button/primary/hover`).

**The registry is also the checks' data.** The check reads `registry.json`, the component heads and `exceptions.json`; the scanner reads the class lists; nothing is said twice.

## (f) The review copy

Decided 2026-10-15 (see Decisions). The review copy is the page, published so Thomas can look at it without an image build. It is a copy for looking, not a second source: it is made from the same files.

**What it is.** A private static web page, a claude.ai Artifact, private by default, updated in place at one fixed link so Thomas keeps one bookmark. It is built from the same `system.css`, the same component files and the same registry as the real page. No build or deploy of the app is involved. The project manager publishes it from the first step that has a page (steps 3 to 6) and again at each later stage.

**It is built as static files.** `tools/design-system-snapshot.mjs` (written by experience-design) produces one self-contained folder of HTML, CSS, JavaScript and icons from `public/sdk/system.css`, `public/sdk/host.css` where the page needs it, `public/design-system/` and the icon files. The folder must:

- load no external scripts, and use only hosts the Artifact allows;
- carry the product's fonts and the Font Awesome icons inside it, inlined or as files uploaded with it;
- stay under the Artifact's size limit, 16 MB in all (the script reports the total and fails above it);
- hold no data and no secrets: only styles and example content. No environment name, member, token, key or stored object goes in. The script reads only the files listed above, never `DATA_DIR`.

**What works in the snapshot.** The components, the tokens (values read from the stylesheet, contrast worked out in the page), the states with forced hover and focus, light and dark, the three widths, the icon browser (our list and the Free set, from files written at snapshot time instead of the icons route), the examples and the snippets, search and deep links.

**What does not.** The usage scan (consumers) and any part fed by the server. These show "not available in the review copy". The real page at `/design-system` has them.

**Before and after.** At each stage the project manager publishes the step 1 tool's screenshots beside the page: the baseline and the current set, with the images that differ named. If nothing differs, the page says so.

**Who.** experience-design writes the snapshot script, with the page, in step 6b. The project manager runs it and publishes, and says in the report what changed since the last publish.

## (d) Governance

1. **Only system components are used.** A page or module draws UI with registered components and patterns, and writes only its own layout.
2. **A missing component is added first**, in this order: Thomas agrees it is needed; the spec (anatomy, variants, states, sizes, a11y, usage) is written into its registry file as `new`; its CSS goes into `system.css` and its helper, if any, into `host.js`; its examples render on the page; then the page or module uses it. Each is a try build like any other.
3. **An exception is discussed with Thomas first.** If he agrees, it is recorded in `exceptions.json` (what, the file, the reason, an owner, the date, his words), shown on the page, and allowed by the check for that file only. An exception with no reason or owner fails the check. Today's known ones go in at once: MapLibre's controls, the map pin's teardrop, Stream's keyed page for OBS, the phase band's top edge.
4. **Who changes a component.** Thomas decides every design change, on the page (the review copy first, see (f)): he looks at the component, says what changes, and signs off the before and after. Nothing is moved onto a changed look until he has said so there. experience-design builds it in `system.css`; server-development builds checks and routes; nobody restyles a component anywhere else.
5. **How builders and QA are told.** Proposed wording; Thomas or the project manager edits these files, not this plan.

**Proposed rule for `CLAUDE.md`, under Rules:**

> - Use only the design system's components (`/design-system`, `public/design-system/registry.json`). A page or module writes component markup and its own layout, never a component's colour, size, padding, font, border, radius, shadow or state; a component's look lives only in `public/sdk/system.css`. If a component does not exist, add it to the system first (spec, registry entry, example), then use it. Anything outside the system is discussed with Thomas first and recorded in `public/design-system/exceptions.json`. `tools/check-system.mjs` enforces this.

**Proposed text for `.claude/agents/experience-design.md`:**

> Before you draw anything, find it on `/design-system`. Use the component's markup exactly as its snippet shows. If what you need is not there, stop and say so in your report: name the component you would add and why. Do not restyle a component in a page or module stylesheet, and do not add a class that looks like one. A component change goes only in `public/sdk/system.css`, with its registry entry, example and changelog line, and only when Thomas has decided it. A family step applies exactly the look Thomas approved; take the before and after screenshots and say whether the differences are the approved ones.

**Proposed text for `.claude/agents/quality-assurance.md`:**

> For any change to the UI, check that it uses registered components only (`node tools/check-system.mjs`), that no page or module stylesheet styles a component, and that the before and after screenshots of each changed component match unless Thomas decided the change. Report each difference with its screenshot.

**Proposed text for `.claude/agents/project-manager.md`:**

> A UI task names the components it uses. If it needs one that is not in the system, the first step is to add it to the system, after Thomas agrees. A change to a component's look is Thomas's decision on the design system page, and goes in as its own try build.

**Proposed text for `.claude/agents/server-development.md`:** none beyond keeping the check and the scan in step with the registry.

### The check: `tools/check-system.mjs`

In `npm run check`. It reads `registry.json`, the component files, `exceptions.json`, `system.css`, the app's stylesheets, pages and scripts, and every bundled module's `src/`. To avoid the false positives the borders check had, **it fails only on rules that need no judgement**, and reports the rest:

Fails:

1. **The registry is whole.** Every class in `system.css` belongs to a registered component (or is a token); every class a component lists exists in `system.css`; every component has a status, at least one example and its a11y and usage fields; every exception has a reason, an owner and a file.
2. **No restyling.** A rule outside `system.css` whose selector names a registered component class, and declares anything outside the layout list in (b), fails with the component's name, the property and the rule text. (This is `check-forms` rule 10, made general.) A data colour passed as a custom property is not a declaration of colour.
3. **No borrowed names.** A page or module defines no class that starts with the system's prefix (`sdk-`) and no class with a registered component's name (`.btn`, `.chip`, `.menu`).
4. **No unknown system classes.** Markup or a script that uses an `sdk-` class not in the registry fails (a typo, or a component someone invented without adding it).

5. **No inline visual style.** `style=""` or `.style.<property> =` setting a colour, background, border, radius, shadow, padding, font size or weight in markup, templates or scripts (custom properties, and positions and sizes set by drag and layout code, are allowed).
6. **One stylesheet.** `system.css` exists and is linked by every app page and inlined into module pages; no word-for-word copy of a block remains elsewhere.

Reports, never fails:

7. **Things that look like components.** A local class whose name holds a component word (`btn`, `button`, `chip`, `pill`, `badge`, `tab`, `menu`, `toast`, `banner`, `card`, `empty`, `skel`, `error`) and which declares visual properties. Listed per file with a count, so the migration can be tracked; a name list is too blunt to fail on.

**The "not yet" list.** Like `check-forms`, the check holds a list of the pages and modules not yet moved. Rules 2, 3 and 5 apply only to files off the list; rules 1, 4 and 6 apply everywhere from the first build. Each migration step removes its own file, so drift cannot return to a file once it has moved. The last step empties the list. (Superseded for the step 7 checks on 2026-10-21 by a count per file that can only fall; see the build-out plan.)

**How it sits with the other checks.** `check-radius`, `check-nav` and `check-module-window` keep their own rules, which become rules about `system.css` once every component lives there. `check-buttons`, `check-switches` and the copy rule of `check-forms` become rule 7 and are folded in. `check-forms` keeps its form-specific rules (fields in rows, no nine-choice lists) and `npm run check:forms` stays as it is.

## (e) The order

The first deliverable is the page with today's components exactly as they are (decided 2026-10-15). Then each component is moved onto its drawn look, one family at a time, after Thomas has looked at it on the page, in the review copy (f), and said so. The real route is built into an image only when he is happy with a stage.

**How the form standard and the radius tokens fold in.** The form standard is the first finished component family: its block moves into `system.css`, its classes are registered, and its remaining steps (Places to Manage) are absorbed by the Fields step of the build-out plan (decided 2026-10-21), each also lowering the module's counts in the checks. The radius tokens become the radii group of the tokens and `check-radius` keeps enforcing them.

**The order.** Pieces behind the complaints first, then module by module (superseded by the build-out plan's family order). Each step is a try build: one builder, its own checks, pushed at once, and a patch bump of any module whose files change. A step that consolidates several looks into one starts with Thomas choosing the look on the page.

## The contract

**Server half (server-development).**

- Serve `public/sdk/system.css` as a static file. In the module page route, inline `system.css` before `host.css` in the `<style id="sdk-base">` it already writes, unless the page opts out with `sdk-base: none`.
- `GET /design-system` and `GET /design-system/frame`: the page and its example frame, for a signed-in member and up (a guest or a signed-out visitor is refused as on the other app pages, with the usual words); the host console links to the page. `public/design-system/` holds no data, so its static files may stay readable like `style.css`.
- `GET /api/design-system/usage`: `{ components: { <id>: [{ file, line, kind: 'module' | 'page', module?: id }] }, scannedAt }`, computed by `server/system-scan.js` on first request and kept until restart. Same audience.
- `GET /api/design-system/icons`: `{ icons: [{ name, label, categories, aliases }], categories: [{ id, label }] }`, built once at start from Font Awesome Free's metadata, solid style only.
- `tools/check-system.mjs` as in (d), with self-tests that plant each failure in a fixture and require it to fail, and a clean fixture to pass.
- Help the snapshot script (step 6b) where it needs server-side data: the icon files and the Free set's compact list are written as files at snapshot time, from the same code the icons route uses. The snapshot never reads `DATA_DIR`.
- A screenshot tool, `tools/shots.mjs` (run as `npm run shots`, not in `npm run check`), reusing the DevTools-protocol driver of `check-forms-live.mjs`: it opens a list of pages and module fixtures and the design system page's examples at 390, 700 and 1280px, in light and dark, saves the images to a folder given on the command line, and compares two folders pixel by pixel, naming every image that differs.

**Pages half (experience-design).**

- `system.css` with the tokens, state tints and every component moved in, word for word from where it is today; the app's pages link it; `module-host.js` fetches it for in-page modules.
- The page and the registry as in (c), drawn with the system's own components.
- What a person sees at `/design-system`: a left list of groups (Tokens, Icons, Components, Patterns, Exceptions, Changelog) with search on top; each entry a section with its status marker, its examples on a neutral ground with **Light | Dark | Both** and **390 | 700 | 1280** switches (a view switch), a **States** row (rest, hover, focus, pressed, disabled, selected, loading, error), the snippet with **Copy**, then usage, content, a11y, tokens, consumers and changelog. On a phone the list becomes a menu at the top.
- `tools/design-system-snapshot.mjs` (step 6b): builds the page as the static folder described in (f). The page's code must therefore work with no server: where it asks the usage route or the icons route, it falls back to "not available in the review copy" or to the files written at snapshot time.

## Left to build, in order

Each step a try build, small, checked on its own. Modules get a patch bump only when their files change.

| Step | What | Who | Changes the look |
|---|---|---|---|
| 0 | Thomas answers questions 1 to 4 (done 2026-10-15) | Thomas | |
| 1 | `tools/shots.mjs`, and a baseline set of screenshots of every page and module fixture in light and dark at three widths, kept outside the repository | server-development | no |
| 2 | `public/sdk/system.css`: the shared blocks (`action-btn`, `view-switch`, `form`, `datepicker`, `editor`, `kind`, the menu and more button from `UI_CSS`, `.btn`, `.card`, `.section`, the radius, selected and tint tokens) moved word for word; app pages link it; the module route inlines it; the copies go; `check-buttons`, `check-switches`, `check-forms` read the one file. Where `style.css`'s `.btn` and `host.css`'s differ, both stay, scoped as they are, and the difference is listed for step 7 | experience-design, server-development for the route | no; the shots must match step 1 |
| 3 | The page shell, `registry.json`, the token section (values read live, contrast worked out), the route and its audience | experience-design, server-development | no |
| 4 | Register today's shared components as they are, with examples, states, snippets and rules: button, action button, view switch, the form classes, date picker, kind picker, editor window, action bar, menu, more button, card, section, toast, message, status strip | experience-design | no |
| 5 | The page's tools: forced states, light and dark frames, the three widths, consumers (the usage route), search, deep links, changelog, exceptions | experience-design, server-development | no |
| 6 | The icon browser: `icons.json` for the 81 icons in use, with meanings and categories, and the whole Free set from the icons route | experience-design, server-development | no |
| 6b | The review copy: `tools/design-system-snapshot.mjs` produces a self-contained static folder of the page (no external scripts, fonts and Font Awesome icons inside it, under 16 MB, no data and no secrets). The project manager publishes it as a private Artifact at one fixed link, with the step 1 before and after screenshots beside it, and republishes at every later stage. Server-fed parts show "not available in the review copy" | experience-design writes the script; project-manager publishes | no |
| 7 | `tools/check-system.mjs` with every file on the "not yet" list (so it passes on today's code), `exceptions.json` with today's known exceptions; in `npm run check` | server-development | no |
| 8 | Register the duplicates as candidates: each of the audit's duplicate families (chips, empty states, skeletons, banners and conflict notices, error lines, icon buttons, tabs, menus, cards and rows, small buttons) on the page with every current look side by side and where each is used | experience-design | no |
| | **Thomas reviews each family, one at a time** (decided 2026-10-15, replacing a single review of all families): in chat with options and a recommendation, then as a proposal on the review page in scoped CSS with nothing in the product changed. Order: buttons, fields and forms, tabs and view switches, cards and rows, chips and badges, menus. He also decides each coloured edge. This is the review gate: before a family's step from 9 onward, he has signed off its proposal, and only then does it move into `system.css` | Thomas, experience-design for each proposal | |
| 9 | Buttons, as decided under Component decisions: Primary, Secondary, Danger and Quiet; two sizes (38px, 44px on a phone; 30px); soft red Danger; one square icon button replacing the action, more, icon, field, close and message buttons; call controls stay circles; `.btn`, `.btn-primary`, `.btn-danger`, `.btn-small` and `.sdk-btn` redefined once, `.btn-quiet` and the icon-button name added; module `.btn` restyles removed (Budget, Maps, Places, Research, the Planner, To-do). Starts with the proposal on the review page | experience-design | as decided; modules bumped |
| 10 | Fields and forms: the form standard's remaining steps, unchanged, now also removing each form from this check's list. Review of the family comes first | experience-design | as that plan says |
| 11 | Tabs and view switches (review first): Polls' `.seg` becomes `host.ui.viewSwitch`; `.layout-tabs`, `.setup-tabs`, `.subtabs`, `.dest-tabs` registered as one tabs component or kept as exceptions, as Thomas decides | experience-design | as chosen; Polls bumped |
| 12 | Cards, rows and list rows: `.card` and a row component; `.tile` merged into one rule set; Places', Research's and the Planner's rows on it | experience-design | as chosen |
| 13 | Menus: the Planner's `.menu` becomes `host.menu.show`; `.host-menu`, `.modules-menu`, `.chat-command-menu` and `.popover` share the menu's look or are recorded exceptions | experience-design | as chosen; the Planner bumped |
| 14 | Banners, notices and toasts: one banner with kinds, one inline notice replacing the three conflict bars, the error line | experience-design | as chosen; Places, Research, the Planner, Maps bumped |
| 15 | Chips and badges: filter chip, status chip, count badge; the module chips on them | experience-design | as chosen |
| 16 | Messages and AI cards, with the left-edge decision | experience-design | as chosen |
| 17 | Empty states and loading skeletons, replacing the seven `.state` and `.empty` copies and the four `.skel` copies | experience-design | as chosen |
| 18 to 27 | Module by module, each off the "not yet" list: the Planner, Places, Calendar (with its inset edges decided), To-do, Polls, Research, Budget, Maps, Stream, Assistant | experience-design | only what earlier steps decided; each bumped |
| 28 | The app's pages off the list: space, Home and the dashboard, Set up, the Phases sheet, Manage, profile, host console, landing, destination; then the list is empty | experience-design | only what earlier steps decided |
| 29 | Documentation: content-manager rewrites [design-theme](../designsystem/design-theme.md) as the system's reference pointing at the page, the SDK page and `CONTRACT.md`; Thomas or the project manager puts the rule text from (d) into `CLAUDE.md` and the agent files | content-manager, project-manager | no |
| To be placed | The Prototype page (decided 2026-10-16, see Decisions): whole screens drawn from the proposed components as they would appear in the product (panels, forms, chat, the call bar, the Planner), so components are judged in context. Built after a few families are approved | to be placed | no |

**Superseded 2026-10-20.** Steps 2 and 7 are re-scoped and steps 8 to 29 are replaced by the build-out plan below ("Build-out plan (2026-10-20, revised 2026-10-21)"). The table above stays as the record of the earlier order. Steps 1 to 6b are done.

Steps 9 to 13 (buttons, fields and forms, tabs, cards and rows, menus) and 15 (chips and badges) each start with Thomas deciding that family in chat and signing off its proposal on the review page, in the order he set. Steps 9 to 17 do not depend on one another once he has done so; 18 to 27 follow the component steps they need. Each of steps 8 to 17 ends with a republished review copy and its before and after screenshots, and the real route is built into an image only when Thomas is happy with a stage.

## Build-out plan (2026-10-20, revised 2026-10-21)

**Status:** approved to start 2026-10-21; revised the same day. Steps 2, 7 and 10 are built (see the table). Written after 26 families were drawn on the Proposed page (`public/design-system/proposed-*.js`). Thomas's reason, 2026-10-20: the process is taking far too long. Nothing here decides a design; every look is the one drawn, and the choices still waiting for him are in [plan-design-system-approval](plan-design-system-approval.md). Thomas, 2026-10-21: "we have not released this product yet. There is not "migration" or "legacy" or whatever needed." The product is moved onto the design system; nothing is kept for an installed base, because there is none.

**What changed on 2026-10-21.** The section was called the migration plan. Every compatibility concept is gone: old tokens are not kept as aliases (they are renamed to the new roles in the files each step touches and their definitions deleted when the last consumer moves); there is one theme file format, updated in place, with no `formatVersion` 2 and no older-format reader (step 8); no old id, hash, route or stored key is kept alive; there is no deprecation period and no warning release for uploaded modules; the module version bump remains only so Manage installs an updated bundled module in Thomas's own test environment. In the table, step 10 is folded into step 2 (both built together), step 8 drops from two passes to one and from the larger model to medium, step 36 also deletes the old token definitions, and the question about aliases and the theme file version are gone. The remaining 31 steps (8, 9, 11 to 39) are the same in number; two are smaller. The batches for Thomas's looks are kept.

**What changed from the old step list.** Steps 1 to 6b stay as they are, done. The old step 2 asked for `system.css` and it is not in the repository (`public/sdk/system.css` does not exist), so it is redone as step 2 below, with the tokens now drawn. The old step 7 (the check) keeps its number and now also holds five token checks. The old steps 8 (candidates) and the review gate are done by the Proposed page. The old steps 9 to 17 are re-ordered into steps 12 to 22 and the families drawn since are added (steps 18 to 35). The old module-by-module steps 18 to 27 and the pages step 28 are gone: a family step moves every file it touches, modules and pages alike, and step 36 sweeps what is left. The old step 29 is step 38. The Prototype page is step 39, optional.

### The method, the same in every family step

1. Copy the family's block from `proposed-<id>.css` into its reserved slot in `system.css`, without the `.ds-proposed` prefix.
2. Delete the old rules for that family's classes from `style.css`, `host.css`, the `UI_CSS` string in `host.js` and the module stylesheets.
3. Change markup where the family's "Today to proposed" table says so. A class, id or route is renamed only where Thomas decided it; nothing is kept alive for its own sake, because the product is unreleased.
4. In every file the step touches, rename the old token names to the new roles, and put the family's sizes, weights, spacing, radii, shadows, layers, motion, icon sizes and media queries on tokens. Lower the counts for the files touched in the allow-lists of the checks from step 7. The old token definitions stay only while an unmoved file still reads them and are deleted when the last consumer moves (step 36).
5. Bump the patch version of every module whose files changed. Only so that Manage will install the updated bundled module in Thomas's own test environment: it must be higher than the version installed there (`check-module-versions` holds it).
6. Run `npm run check` and `npm run shots:compare`. The builder names every screen that differs and says if the table below expected it. A difference that is not expected is a defect and the step does not ship.

A try build per step: one builder, one pass or the passes listed, its own checks, pushed at once, merged on its own.

### (a) The baseline

`npm run shots` writes the baseline to `tools/.shots/baseline` (125 screens from `tools/shots-screens.json`: light and dark; 1280, 700 and 390 for the core screens, 1280 and 390 for the state screens). It is gitignored and the container is ephemeral, so:

- **At the start of every session**, before the first edit and on the last merged commit, run `npm run shots`. Never take it after editing.
- After the step, run `npm run shots:compare`. It names each differing screen and writes difference images to `tools/.shots/diff`.
- If a session restarts in a new container, the baseline is gone. Check out the last merged commit in a second worktree, run `npm run shots` there, then compare. Baseline and compare must run in the same container image (same Chromium and fonts), as the tool's header says.
- How long 125 screens take was not measured for this plan. The builder should report it so the plan can say.

### The steps

Passes: one pass is one builder run. Risk: low, medium, or **larger model** for layout and canvas, migrations, layers and security (the project manager's rule).

| Step | What | Touches | Passes | Risk |
|---|---|---|---|---|
| 1 to 6b | Done: shots tool, Today page, Proposed page, icon browser, review copy | | done | |
| 2 (built: `public/sdk/system.css`, `public/fonts`, `check-system-css`; commits 102b5dd and 813e6cb) | `system.css`: new tokens (spacing, elevation, layers, scrim, motion with the reduced-motion rule, icon sizes, type scale, breakpoints noted), the new roles written in terms of today's tokens as a starting point (replaced family by family, see (b) to (c)), an empty reserved slot per family. Linked first by every app page; inlined before `host.css` in the module route; fetched by `module-host.js`; the popped-out call window clones it | `public/sdk/system.css`, every `public/*.html`, `server/index.js` (about line 7849), `public/module-host.js`, the call window code | 2 | **larger model** (cascade order, in-page modules strip `:root`) |
| 7 (built: the six drift guards; commits a3251ad, 5d9e1ac) | The checks, each with an allow-list at today's counts (see (e)), plus `check-system.mjs` as in (d) | `tools/check-*.mjs`, `tools/check-*-allow.json`, `package.json` | 2 | low |
| 8 | Colour, server: `theme-css.js` writes the new roles directly; `store.js` accepts optional status bases (ok, warn, danger, info); one theme file format, updated in place (no `formatVersion` 2, no reader for an older format); the 3 shipped themes updated; text on accent and on status fills picked automatically (dark or white, whichever is 4.5 to 1 or better) | `server/theme-css.js`, `server/store.js`, `server/theme-file.js`, `server/file-format.js`, the 3 shipped themes, `public/sdk/system.css` | 1 (was 2: no older-format reader, no load of stored old themes) | medium |
| 9 | Colour, editor: status pickers and contrast warnings in the admin theme editor | `public/admin.js`, `public/admin.html` | 1 | low |
| 10 | Folded into step 2 (built together, commits 102b5dd and 813e6cb): Figtree and Fraunces woff2 and their licence texts in `public/fonts`, `@font-face` with the metric-matched fallbacks, the type scale tokens. No family applied yet | `public/fonts`, `system.css` | done | |
| 11 | Fonts, switched on: `--font-ui` on the pages, inputs and modules; Fraunces on display text only (landing title, page titles, the environment name in the top bar, space names on Home cards) | `system.css`, `style.css`, `host.css`, `landing.css` | 2 | **larger model** (every screen's text metrics) |
| 12 | Buttons: four roles, 38, 44 and 30px, soft red Danger, one square icon button (`.action-btn`, `.sdk-more`, `.icon-btn`, `.sdk-field-btn`, `.msg-btn`, close) | `style.css`, `host.css`, `host.js` `UI_CSS`, `landing.css`; modules budget, maps, places, research, travel, todo, polls, stream | 3 | medium; the call's circles stay and need a real call |
| 13 | Fields and forms: field edge, focus ring, "(optional)", tick box, radio, switch 36 by 20, search; the remaining module moves of [plan-form-standard](plan-form-standard.md). Two builders: 13a app pages, 13b modules | `style.css`, `host.css`, module `editor-card` copies; modules budget, calendar, places, polls, research, todo, travel | 3 | medium |
| 14 | Tabs: separate rounded tabs, neutral selected fill, scroll overflow; `.sdk-choice` folds into the joined switch; Polls' `.seg` becomes `host.ui.viewSwitch` | `host.js`, `host.css`, `style.css` (`.layout-tabs`, `.setup-tabs`, `.subtabs`), `destination.css`; module polls | 1 | low |
| 15 | Chips and badges: 24 and 30px, small corners, neutral selected fill, count badges, retired caps tags, the `#e0b25a` pill on a token | `style.css`, module chips in calendar, places, research, budget, travel | 2 | medium |
| 16 | Cards and rows: one hairline surface, quiet hover and selected fills, tinted gradient cards flattened, menu slot, 44px rows on a phone | `style.css` (`.card`, `.tile`, `.panel`), `travel-lib-cards.css` (336 rules), research, places, calendar rows | 3 | **larger model** (the Planner's cards are layout) |
| 17 | Menus: the menu surface and `--shadow-2`; `.host-menu`, `.modules-menu`, `.chat-command-menu`, `.popover` share it; the Planner's `.menu` becomes `host.menu.show`; the `host.css` layer 10000 moves to the popover layer | `host.js` `UI_CSS`, `style.css`, `host.css`, `host-menu.js`; module travel | 2 | medium (layers) |
| 18 | Dialogs: editor window, kind picker, background picker (layer 1000 to the dialog layer), aside overlay, Set up and Phases sheets; scrim 55%; the layout sheet 360 to 560 | `host.css` editor and kind blocks, `style.css`, `background-picker.js`, `layouts.js` | 3 | **larger model** (layers, overlays on the canvas) |
| 19 | The styled confirm, as its own step: a promise-returning `host.ui.confirm` and an app-page twin, then the 42 `confirm(` calls move to it (`admin.js` 15, `profile.js` 12, `space.js` 4, `host-templates.js` 3, `module-config.js` 2, `module-settings.js` 2, one each in `chat-input.js`, `flight-schedule.js`, `host.js`, `modules/stream/src/stream.js`). Two builders: the helper first, then two sets of files | those files, `public/sdk/host.js` | 2 | **larger model** (a blocking call becomes async; each flow is checked) |
| 20 | Toasts and banners: toast, banner kinds, the conflict bars (Places, Research, the Planner), `.env-banner`, `.bell-notice`, Maps' `.banner`, `.option-help` with `data-kind`; toasts newest nearest the edge | `style.css`, `host.js`, module css in places, research, travel, maps | 2 | low |
| 21 | Tooltips | `host.js` or `style.css`, wherever `title` is replaced | 1 | low |
| 22 | Empty, loading, error: the `.state`, `.empty`, `.skel` copies (4 + 3 + 4) and the app's `.canvas-empty` family; one `.sdk-skel` | module css in budget, maps, places, research, travel, calendar, polls, todo; `style.css` | 2 | low |
| 23 | Links: `.tag.ref` and Calendar `.links` become Chips tag links (markup change) | `style.css`, calendar | 1 | low |
| 24 | Pickers: date picker, kind picker list, currency list, palette (16 colours as data) | `host.css` `datepicker`, `host.js` | 2 | medium |
| 25 | Progress and meters: every bar gets `role="progressbar"` | `style.css`, module css, `host.js` | 1 | low |
| 26 | Avatars: initials on the type scale, the stack count | `style.css`, `dashboard.js`, chat | 1 | low |
| 27 | Choice rows: `.sdk-check` becomes the choice row | `host.css` form block, `style.css` | 1 | low |
| 28 | Module window: titlebar, toolbar surface `--bg-input`, status chip 20px, toolbar search 30px, tinted icons | `module-host.js`, `host.css`, `host.js`, `style.css` | 3 | **larger model** (the canvas) |
| 29 | Chat: body 14px, `--msg-meta`, the "..." always visible, reactions as tags, the attention pill, tint fill instead of the left edge | `style.css` chat block, `chat-input.js` | 3 | **larger model** (layout, long lists) |
| 30 | Journey bar (the status strip and phase chip) | `style.css` `status-strip` block | 1 | medium |
| 31 | Phone tab bar: 45px tabs, 20px icons, folded tabs in a popover, the Join icon | `style.css`, `space.js` | 2 | **larger model**; the phone and the call need a real device |
| 32 | Calendar cell: 18px event chips, current day and today, "Linked", the outside and other-calendar chips | `modules/calendar/src/calendar.css` | 2 | **larger model** (grid layout) |
| 33 | Markers | `calendar.css`, `travel-lib-cards.css` | 1 | medium |
| 34 | Day cards: the 40px (44px phone) chip, the gap count, the Planner's day cards | `travel-lib-cards.css`, `calendar.css` | 2 | **larger model** |
| 35 | Tables | budget, research, places css | 2 | medium |
| 36 | The sweep: every raw value left in files no family claimed (host console, landing, diag, call toolbar, destination, MapLibre notes); the old token definitions deleted; every allow-list at zero or at a recorded exception; the heuristic checks start to fail | all remaining files | 2 | medium |
| 37 | The design system page (see (f)): its examples render with `system.css`; the scoped `proposed-*.css` copies and the Today page go | `public/design-system/` | 3 | medium |
| 38 | Documentation (see (g)); once after step 11, once at the end | `documentation/` | 2 + 2 | low |
| 39 | Optional: the Prototype page (see below) | `public/design-system/` | 3 | low |

### What a person sees, which screens differ, and what guards it

"Screens" are the families in `tools/shots-screens.json` (the number is the count of screens). A family step that touches a screen not named here is a defect.

| Step | Visible change | Screens expected to differ | Guard |
|---|---|---|---|
| 2 | None | None: all 125 identical | `check-design-system-foundations`; the shots |
| 7 | None | None | each rule fails on a planted fixture |
| 8 | None, except text on accent or a status fill where today's pairing fails 4.5 to 1 | None, or only those fills | `check-theme`, `check-themes`; the 3 shipped themes load in the one format |
| 9 | Theme editor gains status pickers and warnings | Manage pages (10) | `check-theme`; walked on a local server |
| 10 | None | None | a check that the font files and licence texts exist and no third-party font URL is used |
| 11 | Every text changes shape and width | All 125; Thomas looks at a sample of each family | `check-design-system-typography`; read for truncation at 390 |
| 12 | Button roles, heights, soft red Danger, icon button | Most of them: Forms (24), Manage (10), Planner (17), Places, Research, Budget, Maps, Home, Menus, call controls | `check-buttons` reads `system.css`; `check-design-system-buttons`; new rule: no `.btn` restyle in a module |
| 13 | Field edge, focus ring, switch, search | Forms and editor windows (24), Manage (10), Profile and Set up tabs (12), module editors | `check-forms`, `npm run check:forms` |
| 14 | Tab shape and selected fill | Profile and Set up tabs (12), Polls (3), Planner, Calendar toolbars | `check-switches`, `check-nav` |
| 15 | Chip sizes and fills | Chips and badges (2), Calendar (5), Planner, Places, Research | `check-design-system-chips`, `check-radius` |
| 16 | Flat cards, hairline, no gradient | Home cards (2), Planner (17), Places, Research, Manage | `check-design-system-cards` |
| 17 | One menu surface | Menus (21), Planner | `check-host-menu`, `check-design-system-menus` |
| 18 | Dialog surface, wider layout sheet, scrim | Forms and editor windows (24), Menus (sheets) | `check-design-system-dialogs`, `check-module-window` |
| 19 | The browser's confirm box becomes the product's own | None in the shots (a confirm opens on a click); the state screens that open one need a new row each | a check that no `window.confirm` or bare `confirm(` is left; each flow walked on a local server |
| 20 | Banners and toasts | Banners, toasts and notices (1), Places, Research, Planner, Maps | `check-design-system-toasts`, `check-module-notices` |
| 21 | Tooltips | None in the shots (hover) | `check-design-system-tooltips` |
| 22 | Empty and loading states | Empty and loading states (8) | `check-design-system-states` |
| 23 to 27 | Link, picker, bar, avatar and choice looks | Few: Calendar (5), Planner, Home, Manage, Forms | the family checks |
| 28 | Module window chrome | Every module screen (Planner 17, Places, Budget, Polls, Research, Maps, Calendar, Assistant, Stream) | `check-module-window`, `check-module-chrome` |
| 29 | Message fills, reactions | Messages and AI cards (2), the space page (2) | `check-design-system-chat`, `check-chat-page` |
| 30 | The bar | Status strip and phases (1), space page | `check-design-system-journey` |
| 31 | The phone bar | Space page at 390 (2) | `check-design-system-tabbar`; needs a real phone |
| 32 to 35 | Calendar, markers, day cards, tables | Calendar (5), Planner (17), Budget (3), Research (3) | the family checks, `check-markers` |
| 36 | None expected | None, or the files Thomas names | all five token checks at zero |
| 37, 38, 39 | None in the product | None | `check-design-system` |

### (b) to (c): colour, `system.css`, fonts

- **Loading.** `system.css` is linked first on app pages, inlined before `host.css` in module pages and fetched by `module-host.js`, as in (b) above. Tokens reach a module in a shadow root by inheriting from the app page, so both must load it.
- **Old tokens.** `system.css` today defines the new roles in terms of today's tokens (`--bg-card`, `--danger-text` and the rest). The build-out replaces the old tokens by the new roles directly, family by family: a sweep renames old names to new ones in the files each step touches, and the old token definitions are deleted when the last consumer moves (step 36). There is no alias layer, no deprecation period and no warning release for uploaded modules. An old definition stays only while an unmoved file still reads it.
- **Fonts.** Step 10 only added files and `@font-face`. Step 11 switches them on. The type scale replaces size and weight declarations family by family (method, point 4). There is no italic text anywhere (decided 2026-10-21), so no italic face is bundled and none is needed.
- **Fraunces weight** is 600 (decided 2026-10-21); it no longer blocks step 11.
- **Sandboxed module frames.** Whether a frame with an opaque origin can load a font from our server (a cross-origin header may be needed) is not known; step 10's builder checks it and reports before step 11 starts.

### (e) The checks that keep the system honest

All static, in `npm run check`, built like `check-radius`: a JSON allow-list per file with a count that can only fall (decided 2026-10-21); a new raw colour fails the build, and the heuristic checks warn until the last step (step 36), when they fail too. Each also has a recorded exception (with reason and owner) for a data colour, MapLibre, the map pin, Stream's keyed page and the phase band edge. `tools/check-design-system.mjs` stays (it opens a real browser, about five minutes, so it is run for a family step, not in `npm run check`). All six are written in step 7 at today's counts, and each family step lowers them.

| Check | Fails on |
|---|---|
| `check-no-raw-colours` | a hex, `rgb()`, `hsl()` or named colour outside `system.css` and the exceptions; inline `style=""` colours |
| `check-spacing` | a `padding`, `margin`, `gap` or inset in pixels that is not a spacing token, `0`, `auto` or `calc(-1 * var(--space-n))` |
| `check-type-scale` | a `font-size` or `font-weight` that is not a type token; the micro count is the one exception |
| `check-icons` | an icon name not in `icons.json`; a style other than solid; an icon size that is not an icon token |
| `check-breakpoints` | a media query width other than 640, 900 or 1200 |
| `check-system` | as in (d); also a z-index, `box-shadow` or `transition` that is not a token (suggested; Thomas may fold this into the others) |
| `check-design-system-sync` | while a family exists twice (`proposed-<id>.css` and its block in `system.css`), the two differ once the `.ds-proposed` prefix is removed; goes at step 37 |

### (f) What to delete at the end

- Step 37: the Today inventory page and the `todayOnly` lists in the family checks; the `.ds-proposed` copies of each family's CSS, once the page's frames load `system.css`; the "undecided" list in `proposed.js`. If Thomas agrees, the Proposed page, renamed, is the design system page at `/design-system`. A tag in git keeps Today for anyone who wants it.
- Step 36: the old `host.css` and `style.css` blocks that `system.css` replaced, and the old token definitions, deleted when the last consumer has moved.
- No alias layer, no deprecation period and no warning release are kept: the product is unreleased.

### (g) Documentation (content-manager)

Under try builds there is no documentation per step. Two passes: after step 11 (tokens, colour, fonts, the theme file format: `documentation/designsystem/design-theme.md`, the architecture document's theme and module-page sections, the API document's theme file format, the theme editor's user guide) and at step 38 (one page per family under `documentation/designsystem/`, the rule text from (d) for `CLAUDE.md` and the agent files, the SDK page, `CONTRACT.md` for modules). `npm run docs:build` builds the wiki pages for review. Publishing the wiki waits for Thomas.

### (h) What can run as two builders at once

Pairs that share no file, read from the file lists above (not tried):

- Steps 7, 8 and 10 (checks, theme server, fonts): different files.
- Step 13a and 13b (app pages and modules); step 19's two halves once the helper exists.
- After step 13: step 14 (tabs) with step 15 (chips); step 17 (menus) with step 22 (empty states); step 24 (pickers) with step 25 (progress).
- Steps 30 (journey bar) and 31 (phone bar) with step 35 (tables): different parts of `style.css` and different modules.
- Steps 32, 33 and 34 share the Calendar and Planner css and run one after another. Steps 12, 16, 18, 28 and 29 touch the most shared files and run alone.
- Step 39 can run beside anything: it touches only `public/design-system/`.

All of them edit `system.css` and `style.css`. Each family has its own reserved slot, so edits sit in separate places and git merges them; the second to merge may need a trivial rebase.

### (i) Effort, and what only Thomas can do

The step passes add up to about 60 builder passes with the documentation passes, plus about one in four needing a second pass after Thomas or QA looks, so 60 to 75. These are counts from the file lists, not measured. Wall-clock time is not estimated.

Between the steps, only Thomas can:

- After step 8 and 9: open a light and a dark theme and judge the status colours and the contrast warnings.
- After step 11: look at the fonts in Safari and on an iPhone (the tool uses Chromium only).
- After step 12: look at the buttons and, in a real call, the call's circles. After step 31: the phone bar and the Join button on a real phone, in a real call. No real call can be made in the container.
- After step 19: use two or three of the destructive flows he knows (delete a space, erase, discard).
- After each batch below: look at the screenshots that changed.

**Batches for his looking** (decided 2026-10-21: he looks after each batch, not each step): A steps 2 to 11; B steps 12 to 17; C steps 18 to 22; D steps 23 to 27; E steps 28 to 31; F steps 32 to 35; G steps 36 to 38. A step merges when its own checks and the screenshot list pass, without waiting for him; he looks at the batch.

### The Prototype page (step 39, optional)

Whole screens drawn from the approved components. It pays off if Thomas wants to judge combinations before they reach the product, for example the 28px header chips beside the chips scale, or a Module window with Chat and the Phone tab bar together. It does not pay if the migrated screens in the shots show the same thing a few steps later, which is the case from batch B on. Suggestion: build it only if the approval sheet turns up combinations he cannot judge alone; it can run beside anything (3 passes).

### Answers, 2026-10-21

Thomas's answers to the open questions of the earlier plan, and the instruction that changed the plan: "we have not released this product yet. There is not "migration" or "legacy" or whatever needed."

- **The page.** The Proposed page becomes `/design-system` and Today retires when the build-out ends, at step 37 (it stays available until then).
- **Fraunces weight.** 600.
- **How often Thomas looks.** After each batch, not each step.
- **Drift checks.** A count per file that can only fall. A new raw colour fails the build; the heuristic checks warn until the last step.
- **Form standard.** The Fields step (13) absorbs the remaining steps of [plan-form-standard](plan-form-standard.md): one move over the same files.
- **Breakpoints.** A module keeps its own width and answers it with container queries, using 640, 900 and 1200 as the steps. Pages outside modules use media queries at the same three widths.
- **Italics.** Dropped everywhere. No italic text anywhere; a quote uses the bar or quotation marks.
- **Old token names.** Moot: there are no aliases at all.
- **Theme file version.** Moot: there is one format.
- **Panel padding.** 16px (see "Foundations and 17 more families").

### Still open for Thomas

None. Every question the plan held is answered above. Question 6 and 7 under "What is not decided" are older and do not block the build.

## Verify

- **Step 1:** two runs on unchanged code produce identical shots (the tool's own noise is zero), checked by a tool.
- **Step 2:** the shots after match step 1's for every page and fixture, both modes, three widths (checked by a tool); `npm run check` and `npm run check:forms` pass; a module page's source shows `system.css` inlined before `host.css`; an in-page module (a composite) renders the same (shots).
- **Steps 3 to 6:** the page renders every registered component in light and dark and at three widths on a throwaway local server; a forced hover matches a real hover's screenshot; contrast numbers match a hand calculation for two pairs; the usage route lists a class planted in a scratch module; the icon search finds `plus` by "add". Checked by a tool and walked on a local server.
- **Step 6b:** the snapshot script produces output on a clean checkout (a folder with an `index.html`), checked by a tool: it reports the total size and fails above 16 MB; a scan of the folder finds no external script or font URL, and no string from a planted secret in a scratch `DATA_DIR`; the folder opened from disk renders the components, forced states, light and dark, the three widths and the icon browser, and the usage section reads "not available in the review copy". The publish itself (the Artifact and its fixed link) and what Thomas sees there are checked by the project manager by opening the link, not by a tool in this repository. Fonts and icons showing in the Artifact, and its allowed hosts, cannot be confirmed until the first publish.
- **Step 7:** each fail rule fails on a planted fixture and passes a clean one; `npm run check` passes on today's code.
- **Step 8 onward:** before the step, Thomas has looked at the component in the review copy and said so; each step's shots match the baseline except the components Thomas decided to change, and those differences are exactly the ones he signed off, shown to him before and after; the step's module checks and `check-module-versions` pass; the moved file is off the "not yet" list and the check fails if a restyle is planted in it.
- **What only Thomas can check:** whether a component looks right, every design change before and after, light and dark by eye, Safari and iOS, Firefox, a real phone, a screen reader.
- **Needs a real LiveKit call:** the call controls (step 9 and the space page in step 28) and the call's popped-out window, which clones the stylesheets and must now clone `system.css` too. Nothing else.

## Risks

- **Restyling unasked.** A step changes only the looks Thomas approved. Every step compares shots with the baseline; any difference that is not an approved look is a defect, and the step does not ship.
- **Cascade order.** `system.css` loads before `style.css`, while today the blocks sit in the middle of `style.css`. A rule earlier in `style.css` that the block used to override would now win. Step 2 lists every selector in `style.css` that matches a moved class and resolves each before shipping; the shots catch what the list misses.
- **In-page modules strip `:root`.** `module-host.js`'s `scopeCss` removes `:root { ... }` blocks, so tokens in `system.css` reach an in-page module only by inheriting from the app page, which also loads `system.css`. Fine while both load it; the step 2 shots of a composite confirm it.
- **Module versions.** Needed only so that an updated bundled module installs in Thomas's own test environment: its version must be higher than the one installed there, or Manage will not install the new files. `check-module-versions` holds it. There is no other installed base (the product is unreleased, 2026-10-21).
- **A bigger inline stylesheet** in every module frame (system plus base). `host.css` is about 1,200 lines today; watch the size, and if it grows past what is comfortable, serve it by link where the frame allows.
- **The page as a second source.** It must render from the same stylesheet and registry, never hold copies; the forced-state and frame designs in (c) are there for that.
- **False positives in the check.** Only rules that need no judgement fail; the heuristic only reports.
- **The review copy drifting from the real page.** It is built by a script from the same files, never edited by hand, and republished at every stage. Parts that cannot work in a snapshot say so on the page instead of showing stale data.
- **Leaking data into the review copy.** It carries styles and example content only; the script reads a fixed list of files and never `DATA_DIR`, and step 6b's check looks for a planted secret.
- **Artifact limits.** 16 MB, no external scripts, a list of allowed hosts. The script fails above the size; the fonts and icons are inside the folder. If the Artifact refuses something at the first publish, the project manager reports it and the script changes, not the page's design.
- **Scope creep.** The audit is large. Steps 1 to 8 change nothing a person sees and give Thomas the page to decide on, in the review copy; nothing after step 8 starts without his review there.

## Assumed

Not decided; each is for Thomas to confirm or change.

- The system's components are for the app's own pages and every module; the landing page and the sign-in pages are included (they are pages), and MapLibre's own controls are an exception.
- Font Awesome Free, solid style, is the icon set; Pro, when installed, changes nothing in names.
- The token values in Layer 1 are today's most-used values; tokens that would change a look are listed for Thomas, not applied.
- The page's frame for examples is same-origin and needs no LiveKit.
- The Artifact's allowed hosts and any limit beyond the 16 MB are not known to this plan; the project manager confirms them at the first publish.
- `system.css` is the file's name, named by kind as `CLAUDE.md` requires.

## What is not decided

Questions 1 to 4 were decided on 2026-10-15 and are under Decisions. Question 5 was answered on 2026-10-21 (below). Questions 6 and 7 are open and neither blocks the build; they can wait for the review after step 8.

5. **How strictly the check blocks.** Answered 2026-10-21: each check holds a count per file that can only fall; a new raw colour fails the build; the heuristic checks warn until the last step, when they fail too. This replaces the "not yet" list for the step 7 checks (see "Still open" and "Answers, 2026-10-21" in the build-out plan). The component-looking heuristic (rule 7 of `check-system`) only reports.
6. **The coloured edges.** Which of the six in the audit Thomas meant by the edge bar he disliked, and what each becomes. Recommended: decide each on the page in the review after step 8, with today's and a fill version side by side; nothing changes before then.
7. **Its own folder or package later.** Recommended: no; it stays in `public/design-system/` and `public/sdk/system.css` until there is a consumer outside this repository.
