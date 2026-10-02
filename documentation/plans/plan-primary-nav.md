# Primary Nav Plan

**Audience:** Thomas, who decides what the top bar holds and how presence works, and the sessions that build it: experience-design (`public/brand.js`, `public/nav-bar.js`, `public/space.js`, `public/dashboard.js`, the styles) and server-development (`server/words.js`, `/api/presence`, the aside routes, the notification routes, the checks).

**Status:** approved by Thomas, 2026-10-02; steps 1 and 2 built 2026-10-02, step 3 next. Drafted 2026-10-01; Thomas answered the bell, the SDK's top-bar tool and the aside rules on 2026-10-02 (decisions 9 to 11), corrected the aside rules the same day (ending an aside stays as it is today), answered the remaining questions (decisions 12 to 25) and the four they raised (decisions 26 to 29), and approved the plan. From Thomas's "Primary Nav Spec" (October 1, 2026): "The primary nav is the environment-level bar. It shows on every page, keeps the same layout everywhere, and always tells the user where they are present and how to get back." Thomas's decisions on the spec are recorded below; on present versus viewing he chose option (a), "this was actually always the intent", "first choice pending details". This plan gives those details. It replaces the primary nav sections of [plan-nav](plan-nav.md) ("The model", its list of the primary nav's zones, the phone rule for the primary nav, and "Open, zone by zone" for the primary zones). The secondary nav stays in plan-nav until its own spec comes. Answers three TODO items once approved: the invited private conversation with no origin, the aside's **Join** button on home, and "rethink navigating away and hanging up". Changes the module SDK: a module can no longer place a tool in the top bar (decision 10), and `surfaces.page.nav` is no longer read (decision 12). Needs one change to CLAUDE.md, which is Thomas's: the Names section gains `home` (decision 13).

## What it is today

**The bar.** `renderTopbar()` in `public/brand.js` builds `.topbar` in three zones, drawn from the registry in `public/nav-bar.js`:

- Left: the environment's logo, its home icon (`data-brand="home-icon"`, the couch by default, the suitcase for Travel; this is the "lock or luggage" icon the spec removes) and its name, all one link to `/` (`#brand-home-link`); the crumb (`#topbar-crumb`, empty on the space page since September 23); the status line.
- Middle: **Spaces** (`spaces-link`, `word('space', { many: true, cap: true })`, with the home icon), then a link to each module page (`page-<module>`, `loadModuleNav()`).
- Right: the light or dark switch (`theme-mode-switch`), **Manage** (`#admin-link`, shown to owners and the admin, with the module update count), the clock (`#topbar-clock`), and your picture (`#whoami-link`), which opens View profile, Install as an app (when the browser offers it, never for guests) and Sign out.
- On a phone (640 px or less): the logo, the crumb and the menu button; everything else folds into the menu (`phoneZones()`).

**Module pages in the bar.** `loadModuleNav()` lists what `GET /api/modules/nav` answers, less a module with a dashboard widget or with `surfaces.page.nav: false`. That route answers only modules with an environment page: a page mounted with `scope: 'environment'`, reading across the viewer's spaces. Of the bundled modules those are Calendar, Places, Polls, Stream, To-do and Travel (Planner). So the bar has shown Stream; Calendar, Polls, To-do and Travel are reached from their widget's heading on home; Places has `nav: false` and no link at all. Maps and Research have never been in the bar: their pages are space or person scope only, with no environment page. (Corrected 2026-10-02, after step 1's build: the first draft listed Maps and Research in the bar.) The SDK also lets a module put a `system: true` tool in the right zone (`cleanModuleTools()` in `nav-bar.js`, `host.nav.set`); no module does.

**Home.** `/` is `public/space.html`. Its `#join` view is the space list, the dashboard (`public/dashboard.js`: the widgets, to be renamed tiles, and the **Who's around** strip with its invite button) and the asides, each as an entry whose button reads **Join** with the phone.

**Present versus viewing, today.** Most of option (a) already exists on the space page:

- `openOverlay(path)` loads `/profile`, `/admin`, a space's settings and a module page into `#page-overlay-frame`, a full-window iframe over the space, and calls `setAway(true)`. `closeOverlay()` clears it. The framed page draws its own header with a "Back to <space>" button (`wireOverlayBack()` in `brand.js`).
- `showSpaceList()` swaps the space page to the `#join` view while staying connected, and calls `setAway(true)`; `returnToCanvas()` swaps back. The space's entry on home reads **Back to <space>**.
- `setAway()` mutes what you hear, holds the microphone and camera off, and says it through the `away` and `awayMessage` participant attributes, so a late joiner sees it.
- The address is always `/`. Overlays and the home view add nothing to the browser's history, so the browser's Back button leaves the page, which drops the call. A reload rejoins the space this tab was in (`app.space` in session storage).
- There is no way to look at another space without entering it.

**Presence data.** `GET /api/presence` answers every user with `online`, `present`, `space` and `inCall`, every space with `mine`, and every aside with its `members`, `origin` and `private`, to anyone signed in and to guests. The Who's around strip names any person's space, whether or not the viewer belongs to it. `GET /api/status` (Studio and OBS, the stream key) answers the same for its own use.

**Asides.** An aside's record is `{ id, members, origin, private, createdAt }` (`addAside()` in `server/store.js`); it does not say who started it. `POST /api/asides` (a pull) takes the origin from the initiator's call, so a pull from inside an aside would nest. `POST /api/asides/invite` makes a private aside with no origin (`addAside(..., null, true)`) and checks only that the invitee is online (`isPresent`), so someone already in an aside can be invited, and their **Join** pulls them out of the first one. The page hides the start controls inside an aside (`public/space.js`, the pull and private conversation entries), but the server refuses nothing. Any member's **Rejoin call** (`returnFromAside()`) or **Leave** (`leaveSpace()`) calls `POST /api/asides/return`, which sends everyone else back to the origin too; Leave then disconnects, which lands you on home, not in the origin. An owner's **Pull participants back** (`POST /api/asides/recall`) brings back every private conversation from the owner's space. An aside is pruned when nobody is in it (`pruneAsides`, after a 20-second grace).

**Notifications.** A store already exists. A module with the `notify` hook calls `host.notify({ to, title, body })` (Calendar, Polls and To-do do). `ModuleHooks.deliver()` in `server/module-hooks.js` keeps up to 50 per person in `modules/notifications.json`, each `{ id, module, scope, spaceId, title, body, at, read, by }`. `GET /api/notifications` answers the list, unread counts by module and the total; `POST /api/notifications/read` marks a module or one notice read; `/api/notifications/stream` pushes each one live. The pages show a toast and a count on the module's link or widget. What is missing: one place to see them (the bell and its panel), a pointer from a notice to its object, mark all read, and mentions (chat has none).

**Module tools in the top bar.** `host.nav.set` takes a tool with `bar: 'primary'` and `system: true` into the top bar's right zone when the module's manifest has `surfaces.page.nav` (`cleanModuleTools()`'s `allowPrimary` in `public/nav-bar.js`, set by the `nav.set` handler in `public/module-host.js`). No module does this. `surfaces.page.nav` also decides whether the module's page is linked in the bar.

**The canvas and live chat, for the visit view.** `createCanvas()` in `public/canvas.js` is made once per page and holds one `spaceId`; it finds its parts by document-wide ids (`#canvas`, `#canvas-empty`, `#modules-menu`). `mountModule()` in `public/module-host.js` already mounts a module for any `spaceId`, and every module frame for one space shares one live stream (`joinStream()`, `/api/modules/stream?space=`). A module that asks for the call gets a hidden viewer connection to the person's own space (`/api/token` with `role: 'viewer'`, which follows them as they move). The server decides what a person may do in a space by their role and membership there (`store.spacePermissions()`, `modulePerms()`), never by where they are present. Chat messages are stored by `POST /api/spaces/:id/chat`, but they reach the others live only over the call's data channel (`publishData` with the `chat` topic in `public/space.js`), so only people connected to that space see them arrive. `openInSpace()` in `space.js`, which `objects.open` and the dashboard use for an object in a space, enters that space.

**Words.** `server/words.js` holds the twelve level and role keys (`words`, each `{ one, many, a? }`) and one verb (`verbs.enter`). Its rule: "Adding a key means adding a level, which is a change to CLAUDE.md's Names first."

**The clock setting.** `settings.clock` (12 or 24 hours) drives the bar's clock and also every module's times through `host.locale().clock` (Calendar, Polls, To-do). Removing the bar's clock leaves the setting in use.

## Decisions

Thomas, 2026-10-01.

1. **Names.** `aside` stays the code name; the spec's `childSpace` is not used. "Side chat" and "Whisper" are template words for `aside`. `home` is a new word key, because it is not the plural of space ("Campaigns" against "Game"). The Names hold in code and in words: the spec's "items due" and "parent's card" are reworded ("objects due", "the parent space's entry").
2. **Present versus viewing: option (a).** Home, other spaces, settings and profile open as views inside the space page, sliding over the space as Profile and Manage do now (`openOverlay`). The call never stops. Doing anything else marks you Away on the call (hearing muted, microphone and camera held off, seen by late joiners). Coming back clears Away. The use cases: pop into settings or profile, or visit another space to grab something from it. Option (b), a single-page rewrite, was rejected as not scaling. Option (c), dropping the call, was rejected: people would think you dropped.
3. **Notifications** are a system where a module raises a notice and the host stores it and tracks unread. Recorded as a gap and a known issue; the bell keeps its slot; built last.
4. **The profile menu adapts to role.** Owners get Manage, admins get the host's settings, and so on. The spec's "admins only" was a mistake. Theme and Install go in it; Install is already there for members and up.
5. **Guests** are temporary and the design is not for lasting use by them. They get the server's default theme and no theme switch. What else they see is kept minimal.
6. **The online people list** names only spaces the viewer belongs to. A person in an aside shows as in a side chat (the `aside` word). Later: show all spaces with a "request" option. Joining from the list follows that space's rules: the template's enter word, and entering never joins the call. A space that is a "call" space is a future option.
7. **Phone layout:** the logo, the anchor or the return pill, the bell and the menu button. Everything else is in the menu.
8. **Build order:** (1) the bar's layout and moves; (2) the online people widget; (3) the aside rules; (4) present versus viewing and the return pill, by (a); (5) notifications.

Thomas, 2026-10-02.

9. **The bell is there before phase 5.** At first it shows that module updates are available: today's count on Manage and on your picture moves to the bell, for those who can act on it (owners and the admin).
10. **No module tool is placed in the top bar by the module.** Thomas: "not specifically to the top bar." The top-bar registration (`system: true` with `surfaces.page.nav`, into the right zone) is retired. Modules keep registering tools, and the host decides where they go.
11. **The aside rules**, for pull asides and private conversations alike:
    - **An invited private conversation gets a parent:** the space it was started from, the inviter's present space.
    - **One at a time.** A person is in at most one aside, and nobody can start one from inside one: they end it first. The server refuses both starting one while in one, and inviting or pulling someone who is in one, and tells the inviter in a plain sentence. Thomas: being the other person and just getting dropped is a bad experience.
    - **Ending stays as it is today** (Thomas, correcting a first version of this decision the same day). Anyone in an aside or private conversation ends it with **Rejoin call** or **Leave**, and that brings everyone back. No starter-only End, no leaving alone. **Rejoin call** stays. It closes when empty, as today, and an owner's **Pull participants back** stays as today.

Thomas, 2026-10-02, answering the remaining questions.

12. **Module pages: a Modules slot.** A **Modules ▾** slot beside Spaces ▾, in the template's word for module, listing every environment-scope module page: Calendar, Places, Polls, Stream, To-do and Travel (Planner), those reached only from a tile on home included. Maps and Research have no environment page (theirs are space or person scope only), so they are not listed; adding them needs an environment page in each module first, which is module work Thomas has been told about (corrected 2026-10-02, after step 1's build). On a phone it goes into the menu. Under (a), opening one while present in a space slides over the space as a view.
13. **`home` is a word key** in `server/words.js`'s `KEYS`, beside `space`, `aside` and `module`. Its default is the capitalised plural of the space word, so nothing changes without a template. CLAUDE.md's Names section needs `home` added; that file is Thomas's to change.
14. **The breadcrumb shows while in a space**, as the spec draws it. The space bar stops repeating the space's name; the secondary spec is to take that into account.
15. **A space in the switcher:** entered when you are present nowhere; visited, with an enter button, when you are present elsewhere.
16. **"+ New <space>"** is for owners and the admin.
17. **Moderators** get nothing more in the profile menu; their tools belong in the space bar (the secondary spec). The single-install admin was left to the plan (see the profile menu in phase 1).
18. **The bell before phase 5**, for members and moderators: the module notices the server already keeps.
19. **Who's around stays on home**, beside the online people widget in the bar.
20. **Inviting to a private conversation:** the inviter must be in a space (the invite works only then), and only members of the inviter's space can be invited. Conversations between two people outside any space come in a later phase.
21. **The visit view allows full editing**, not read only. Editing follows the visited space's own permissions for that person, as if they were there. The bar makes it unmistakable which space you are editing in. It does not change presence or the call. The modules open in it are mounted for the visited space.
22. **Mentions** are in the notifications phase.
23. **The home icon setting stays.** The logo slot shows the uploaded image or the chosen icon, in the same box.
24. **Away is a call state only.** Someone present in a space but not on the call is not marked Away when a view opens.
25. **The breadcrumb's parent segment in an aside** behaves like **Rejoin call**: you land in the parent space.

Thomas, 2026-10-02, answering the questions raised by decisions 12 to 25, and approving the plan.

26. **Modules ▾ sits before Spaces ▾**: `[logo] [environment] [Modules ▾] [Spaces ▾] › …`.
27. **Chat in a visit is live.** The server relays each chat message over the space's module stream, so a visitor reads and writes chat live.
28. **Visitors are seen.** They show in that space's who is here as "visiting", without a call tile.
29. **A visit's layout changes are remembered** as your layout for that space.

## The bar

Eight slots, left to right: the spec's seven and the Modules slot (decision 12). Default words; a template changes only the words.

```text
[logo] [Sandbox]  [Modules ▾] [Spaces ▾] › [Disneyland] › [Aside: Michelle]        [people 4] [bell 2] [Thomas ▾]
```

| Slot | Shows | Click |
|---|---|---|
| Logo | the uploaded logo, else the chosen home icon, in one box | home |
| Environment | its name, no icon | home |
| Modules | the `module` word (many, capitalised) and a caret | the module menu |
| Spaces | the `home` word and a caret | the word: home; the caret: the space switcher |
| Anchor | the breadcrumb (up to two segments after the Spaces slot), or the visiting label and the return pill | a segment: that space; the pill: back to where you are present |
| Online people | up to three portraits and the count of everyone online | the list |
| Notifications | the bell and its count | the panel |
| Profile | your picture, your name and a caret | the profile menu |

The Modules slot sits before Spaces (decision 26), so the breadcrumb runs on from Spaces unbroken. The left side is identity and location; the right is people and you. The three zones and the registry stay: logo, environment, Modules, Spaces and the anchor are the left zone; online people, the bell and the profile are the right zone; the middle zone is empty.

### Anchor states

| You are | The anchor shows |
|---|---|
| on home, present nowhere | nothing after the Spaces slot |
| present in a space and looking at it | `Spaces ▾ › Disneyland`, the last segment current |
| present in an aside and looking at it | `Spaces ▾ › Disneyland › Aside: Michelle`; Disneyland does what **Rejoin call** does (decision 25) |
| present in a space, visiting another | `Spaces ▾`, the label `Visiting Paris`, and the pill `↩ Disneyland · 2 on the call` |
| present in a space, looking at anything else (home, profile, Manage, a module page) | `Spaces ▾` and the pill `↩ Disneyland · 2 on the call` |
| present in an aside, looking at something else | `Spaces ▾` and the pill `↩ Aside: Michelle` |
| present nowhere, visiting a space | not possible: present nowhere, a space is entered (decision 15) |

The pill points to the deepest place you are present. It shows the call count when anyone is on the call and the space's unread chat count when there is any. It has a highlighted look from the theme tokens (an accent border and fill, never colour alone: the arrow icon and the words carry it).

## The contract

In Thomas's five phases (decision 8). "Left to build" splits them into steps that can each be built and checked alone; "Verify" uses those step numbers.

### Phase 1: the bar's layout and moves

**Server** (server-development):

- **The `home` word** (decision 13). A thirteenth key in `KEYS` in `server/words.js`, changeable by an owner and a template like the others, with `one` and `many`. Its default is worked out from the resolved `space` word: `one` and `many` are both the capitalised plural of the space word ("Spaces", "Trips"), so an environment with nothing set reads **Spaces** as today, and an owner who calls a space "trip" reads **Trips** without setting `home`. An owner's or a template's own `home` wins as for any key. It flows everywhere the words do: `branding()`, `PATCH /api/settings`, the template file (`server/templates.js`, `tools/check-templates.mjs`), `host.locale().words`, Manage > Template > Words ("Home page"), the host template editor, and `check-names --words`, which learns the key. `templates/travel.json` sets nothing (it reads "Trips"). The vocabulary rule in `words.js` ("adding a key means adding a level") is met once CLAUDE.md's Names gains `home`.
- **`surfaces.page.nav` is no longer read** (decision 12): `GET /api/modules/nav` lists every enabled module with an environment page that the viewer can read at environment level, widget or not, Places included. A read permission in some space is not enough: the page mounts at environment scope, so a space-only grant would open a page that refuses them. Each entry: `{ id, name, icon }`, the display name and icon. Manifests that set it keep loading; the field is ignored.
- **Module tools no longer reach the top bar** (decision 10): see the pages below; no server change.
- **"+ New"** uses `POST /api/spaces` as it is: owners and the admin (decision 16).

**Pages** (experience-design):

- `renderTopbar()` draws the eight slots. Removed: the clock (`#topbar-clock`, `startClock()`), the light or dark switch and **Manage** from the right zone, the module page links from the middle zone, and the update count from your picture and Manage.
- **The logo slot** (decision 23): one box, the uploaded logo when there is one (`branding().hasIcon`), else the chosen home icon (`homeIcon`, the template's `icons.home`, the couch by default). Never both. The setting and its picker in Manage stay.
- **The Modules slot** (decision 12): the `module` word (`word('module', { many: true, cap: true })`) and a caret, opening a menu through `openHostMenu()` of every environment-scope module page from `GET /api/modules/nav`, each with its display icon, its display name and its unread count. Present in a space, a pick opens the page as a view over the space (`data-overlay-link`, as today); present nowhere, it goes to `/modules/<id>`. With no module pages, the slot is not drawn. The tiles on home keep their links.
- **The Spaces slot** replaces `spaces-link`: the `home` word as a link to home, and a caret button (`aria-haspopup="menu"`, title "Switch <space word>") that opens the switcher. On the space page, the home link keeps today's in-page handling (`showSpaceList()`), so the call keeps running.
- **The switcher** lists the spaces the viewer belongs to (`mine` from `/api/presence`), in the space list's order. Each entry: the space's name, a mark on the space you are present in (an icon with the title "You are here", not a coloured dot alone), and "N here" when anyone is. Asides are not listed. Last, after a divider, "+ New <space word>" for owners and the admin, which opens Manage > Spaces with the new-space form (over the space when present). A pick (decision 15): present nowhere, it enters the space, as its entry on home does; present in that space, it goes back to it; present in another, it opens the visit view (from phase 4; until then it enters, as today).
- **The breadcrumb** (decision 14) fills the anchor: on home, nothing; in a space, its name (`spaceDisplayName()`, with `spaceCrumbIcon()`); in an aside, the parent's name, then "<Aside word>: <the other members' first names>". A segment that is not the current one is a link; the parent's segment in an aside calls `returnFromAside()` (decision 25).
- **The space bar stops naming the space** (decision 14): `#space-name` leaves the space bar's left zone, which starts with the Modules button. Noted for the secondary spec, which owns the space bar from here.
- **The bell** (decisions 9 and 18): an icon button in the right zone, between online people and your picture. Its count is the unread module notices (`GET /api/notifications`'s `unread`, kept live by the stream's `notification` event) and, for owners and the admin, the module updates available (`loadUpdateBadge()`, `GET /api/modules`'s `bundled[].update`). Title: "Notifications, N unread", and for owners and the admin ", M module updates". Its panel: for owners and the admin, a line "M module updates available" linking to Manage > Modules (over the space when present); then the notices, newest first, each with its module's icon and name, title, body and time, marked read when the panel opens. "Nothing new." when there are none. Phase 5 adds the rest.
- **The profile menu** (`accountMenuItems()`) by role (decisions 4, 17):
  - every account: **View profile**; the light or dark switch as a checkbox entry ("Dark mode", `role="menuitemcheckbox"`); **Install as an app** while the browser offers it (as today, never a guest); **Sign out** last;
  - an owner: **Manage** (`/admin`, keeping `?from=space` and the overlay as today);
  - the admin on a single install (no `BASE_DOMAIN`): **Manage** only. There is no host console on a single install, and Manage already holds the server's settings, so Manage is the admin's host settings there. Left to the plan by Thomas (decision 17).
  - the host admin's stand-in on a hosted server (`hostAdmin`): **Manage** and **Host console** (the host's own address);
  - a moderator: nothing more than a member (decision 17).
- **Module tools no longer reach the top bar** (decision 10). `cleanModuleTools()` drops `allowPrimary` and the `bar: 'primary'` path, and the `nav.set` handler in `module-host.js` stops passing it. A tool that still says `bar: 'primary'` or `system: true` is not refused: the two fields are ignored and the tool is placed like any other (the space bar), so a module written against the old contract keeps working. For module authors: the SDK reference's "Registering into the nav bars" loses the primary-bar paragraph, and the CHANGELOG says that `bar` and `system` in `host.nav.set`, and `surfaces.page.nav` in a manifest, are ignored from this release.
- **Guests** (a guest link's page; decision 5): the logo and the environment's name as plain text, not links; the anchor shows the space's name; no Modules or Spaces slot, no online people, no bell, no profile menu. The page uses the environment's default theme and ignores a mode this browser remembers.
- **Phones** (640 px or less; decision 7): the bar is the logo, the anchor or the pill (the last segment only, cut short with an ellipsis, the whole name as its title), the bell with its count, and the menu button. The menu holds, in order: the environment's name, the Spaces slot (the home link, then the switcher's entries inline), the Modules slot's entries, online people (the count, opening the list), then your picture and name, the profile menu's entries for your role, and Sign out. `phoneZones()` keeps doing the folding.
- The clock setting stays in Manage: modules still read it (`host.locale().clock`).

### Phase 2: the online people widget

**Server:**

- `GET /api/presence` names a person's place only where the viewer belongs (decision 6). For each user, `space` is the space's id only when the viewer is a member of it (`mine`: owners and the admin belong to every space, as the space list already treats them); otherwise `space` is null and `elsewhere: true` says they are in a space the viewer cannot see. A person in an aside reads `space: <the parent's id>, aside: true` to a member of the parent, and the aside's own id only to the aside's own members. `asides` lists only the asides the viewer is in. A guest's answer names only the guest's own space and the people in it.
- `GET /api/status` (the stream key, Studio) is unchanged.
- The space page's own uses of `space` (the counts on home's entries, `asideNow`, the bystander placeholders) keep working, since they are about spaces the viewer belongs to.

**Pages:**

- A widget in the right zone, `online-people` (an `element` tool, group `people`, before the bell): up to three square portraits in the style of who is here (`public/space-people.js`), then the count. Its title and accessible name: "N people online". "Just you" when alone.
- The list, under it, inside the window (the same placement as who is here): you first, then each person with their portrait, name and where they are: "in Disneyland", "in an aside" (the `aside` word, `a` form), "online" (present on a page, in no space), or "in another <space word>" for `elsewhere`. A mark for "on the call". For a space the viewer belongs to and is not present in, an **<enter word>** button that enters it (never joining the call); none for an aside.
- **Inviting** (decision 20): an invite button per person, offered only while the viewer is present in a space, only for members of that space, and never for a person shown in an aside. Present nowhere, the button is not drawn, and the list says "Enter a <space> to start a private conversation."
- **Who's around stays on home** (decision 19), drawn from the same presence answer, with the same rules for its invite button.
- Live: the widget redraws on each `/api/presence` answer the page already asks for; on pages that do not poll presence, it asks every 30 seconds while the page is visible.

### Phase 3: the aside rules

Decisions 11, 20 and 25, for pull asides and private conversations alike.

**Server:**

- **A private conversation's parent** is the inviter's present space: `POST /api/asides/invite` sets the origin to it, so ending the conversation brings its people back there rather than to the Lobby. `POST /api/asides/return` falls back to the Lobby only for an aside whose origin is gone.
- **Who can be invited** (decision 20). `POST /api/asides/invite` answers 409 "Enter a <space> first to start a private conversation." when the inviter is in no space, and 403 "<Name> isn't in this <space>." when the invitee is not a member of the inviter's space.
- **One at a time.** Each refusal answers 409 with one plain sentence, built with the `aside` word:
  - `POST /api/asides` and `POST /api/asides/invite` when the initiator is in an aside: "Leave your <aside> first."
  - `POST /api/asides` when a person to pull is in an aside, and `POST /api/asides/invite` when the invitee is: "<Name> is in <an aside> right now. Try again once they're back."
  - `POST /api/token` for an aside when the caller is already in another aside (an invitation accepted after its invitee went into another aside): "Leave your <aside> first."
- **Unchanged:** `POST /api/asides/return` (anyone in it ends it, and everyone goes back to the parent), `POST /api/asides/recall` (an owner's Pull participants back), and `pruneAsides` (it closes when empty). The aside's record stays `{ id, members, origin, private, createdAt }`.
- **Stepped out.** The phase 2 presence shape (`space: <parent>, aside: true`) is what the parent's members read.

**Pages:**

- An aside's entry leaves the space list; asides are not on home or in the switcher. The parent's entry on home shows who is in an aside from it: "Thomas, Michelle · in an aside".
- **The space bar in an aside** is unchanged: **Rejoin call** (`returnFromAside()`) and **Leave** (`leaveSpace()`), for anyone in it, each ending it for everyone.
- **The parent's segment in the breadcrumb** does what **Rejoin call** does (decision 25): it ends the aside and lands everyone, you included, in the parent, keeping the call for those on it.
- **One at a time on the page.** The pull, private conversation and invite controls are never offered while you are in an aside (for everyone, not only owners), nor for a person shown in an aside. A refusal from the server is shown as its sentence.
- In the parent, who is here lists a person in an aside from it as "stepped out" (fixed words), under those present, with no call mark.

### Phase 4: present versus viewing, by option (a)

What "present" means: the page is connected to a space (or an aside) for presence and chat, on the call or not. One per page; entering another space moves it. What "viewing" means: what fills the window.

**The order of views**, each its own build and check:

1. **Home** (exists as `showSpaceList()`): add the pill and the history entry.
2. **Visiting another space** (new; below).
3. **The settings pages and module pages** (exist as `openOverlay()`): profile, Manage, a space's settings, a space's module settings, and every module page from the Modules slot. Their framed header shows the pill in place of the "Back to" button.

**Away** (decisions 2 and 24). Away is a call state only. A view opened while you are on the call sets Away, as `openOverlay()` and `showSpaceList()` do now; closing the view, the pill and the browser's Back clear it. A view opened while you are present but not on the call sets nothing. One function in `space.js` opens any view and one closes it, so no view forgets this.

**The return pill.** Drawn by `brand.js` in the anchor slot whenever the space page is present and a view is open. In a framed page (`?from=space`), the pill reads its state from the space page underneath (same origin: a function the space page puts on `window`, returning `{ name, aside, onCall, unread }`, and an event when it changes) and calls `closeProfileOverlay()`. `wireOverlayBack()` goes.

**The address and the Back button.** Each view while present adds one history entry with `history.pushState`, and the address shows it in the hash: `/#home`, `/#visit=<space id>`, `/#view=/profile` (the framed page's own path). The browser's Back closes the top view, clears Away and returns to the space; it never leaves the page while present. Forward reopens the view. A reload while present rejoins the space as today and opens no view. Present nowhere, the address and Back work as today: real pages, real navigation.

**The visit view** (decisions 15 and 21). Opened from the switcher, from home's entry for a space, from the online people list, or when a module opens an object in another space, always while present in a space. Present nowhere, those enter instead.

- **What it is.** A second canvas, for the visited space, over the present one: its name, its description, and the modules on in it, opened as that space opens for this person (their remembered layout, else `opensWith`). The Conference is not offered: there is no call to join from here.
- **Full editing, by the visited space's rules.** Each module is mounted for the visited space (`mountModule({ scope: 'space', spaceId: <visited> })`), with the person's role and permissions in that space, exactly as if they were there. No server change: the server already decides by role and membership in the space, never by presence. Only spaces the person belongs to can be visited (owners and the admin belong to all).
- **Unmistakable.** The anchor shows "Visiting <name>" beside the pill (see "Anchor states"). The space bar shows the visited space's name and a band across it, "Visiting <space>. Changes are saved here. You're still in <present space>.", with an eye icon and an accent from the theme tokens (never colour alone), and **<enter word>** in place of Leave. Modules learn it too: their context gains `visiting: true` (`host.info.visiting`), so a module may say so in its own words; nothing requires it to.
- **Presence and the call are untouched.** No connection to the visited space's call is made, and you stay present where you were. On the call, you are Away while visiting (decision 24). **<enter word>** moves your presence there (leaving the present space, never joining the call).
- **Visitors are seen** (decision 28). While the view is open, the page's heartbeat says what it is visiting: `POST /api/presence` takes `{ visiting: <space id> }` (an id the person belongs to; anything else is ignored), and `{}` or no body clears it; it lapses with the heartbeat (75 seconds) as presence does. `GET /api/presence` answers `visiting: <space id>` for a user, to viewers who belong to that space. In that space, who is here (`public/space-people.js`) lists visitors after the people present, each "visiting", with no call mark and no tile on the call; the count says "N here, M visiting". Who is here in the visit view itself shows the people there and the visitors, you among them.
- **Layout is remembered** (decision 29). Opening, closing or moving a module in the visit view saves your layout for that space (its `__open` and its canvas layout), exactly as being there does, so the next visit or entering opens it the same way.
- **Opening objects.** An object in the visited space opens in the visit view; an object in a third space opens a visit to that space; an object outside any space opens its module page as a view. `objects.open` from a visiting module never calls `openInSpace()`, which enters.
- **No call media in the visit view.** A module there that asks for the call gets "not connected" (`connection: { connected: false }`), never a viewer on the visited space's call or the present one.

Contract changes this needs, each part of step 8:

- **`createCanvas()` takes a root.** Today it is made once and finds its parts by document-wide ids; the visit view needs a second instance in its own container, so the canvas manager reads its parts from the root it is given. The present canvas keeps its ids and its call untouched underneath.
- **A second module stream.** Modules for the visited space share one more `/api/modules/stream?space=<visited>` connection, closed when the view closes. With the notification stream, the present space's stream and the call, that is four long connections from one page; TODO #23 ("Too many connections") already tracks the browser's limit. Check it in a browser with several modules open on both canvases.
- **Chat is relayed by the server** (decision 27). `POST /api/spaces/:id/chat`, and the routes that delete a message or clear the chat, also send the event on that space's module stream (`/api/modules/stream?space=<id>`): `chat` with the stored message, `chat-delete` with its id, `chat-clear`. The visit view's chat reads and posts through these; the people present keep the call's data channel as today and also take the stream's event, dropping a message they already have by its id, so each message shows once. A guest's chat is relayed the same way. Asides have no chat.
- **`host.info.visiting`** in the SDK context, documented for module authors.

**Present nowhere.** No pill, no Away, no visit: `/profile`, `/admin` and `/modules/<id>` are real pages, and a space entry enters.

**Phones.** Views fill the screen as the overlay does now. The pill is in the bar (decision 7). The visit view's space bar is the tab bar, with the visiting band above it and **<enter word>** where Leave is.

**Server:** nothing new for home, the settings pages or editing in the visit view. For the visit view: the chat relay and the `visiting` heartbeat and answer.

### Phase 5: notifications

Built on the store that exists (`ModuleHooks.deliver`, `/api/notifications`) and the bell from phase 1.

**Server:**

- A notice may carry a pointer to its object (`ref`, the same shape as linked objects), given by `host.notify({ ..., ref })`, so a click opens the object.
- `POST /api/notifications/read` with `{ all: true }` marks all read.
- **Mentions** (decision 22). `POST /api/spaces/:id/chat` finds mentions in the text, `@` followed by the display name of a member of that space, and raises a notice for each person mentioned (not the writer): from the host's own source `chat`, title "<writer> mentioned you in <space>", body the start of the message, `ref` to the message in that space's chat. The notification routes and the stream today keep only notices from an enabled module (`modules.enabled(n.module)`); they accept the host's `chat` as a source too, named and drawn as the Chat module is (its display name and icon). Asides have no chat, so no mentions there.

**Pages:**

- The bell's panel gains: a click on a notice opens its object (in its space, as a view or a visit when present, per phase 4) and marks it read; **Mark all read** at the top; the unread ones marked (bold and a dot with "unread" for a screen reader), no longer all marked read when the panel opens.
- **Mentions in the composer.** Typing `@` in the chat box offers the space's members by name, the way `/` offers commands ([plan-one-input](plan-one-input.md)); picking one writes `@Name`. A message that mentions you is marked in the chat.
- The per-module counts on home's tiles and in the Modules menu stay; the toast stays.

## Left to build, in order

1. **The `home` word and module pages on the server** (server-development). The key and its default in `words.js`, `branding()`, `PATCH /api/settings`, the template field and check, `check-names --words`, Manage's and the host editor's row; `GET /api/modules/nav` listing every environment-scope module page the viewer can read at environment level.
2. **The bar's layout and moves** (experience-design). The eight slots, the logo box, the Modules menu, the switcher, the breadcrumb and the space bar's name gone, the bell with updates and notices, the profile menu by role, the guest bar, the phone menu; the clock, the theme switch, Manage and the update count moved or removed; the top-bar path for module tools retired in `nav-bar.js` and `module-host.js`.
3. **Presence by membership** (server-development). The filtered `/api/presence` and its check.
4. **The online people widget** (experience-design). The widget, its list, entering from it, the invite rules there and in Who's around.
5. **The aside rules on the server** (server-development). The invite's parent, who can be invited, the one-at-a-time refusals (both start routes and the token), stepped out.
6. **The aside rules on the pages** (experience-design). Aside entries gone from home, the breadcrumb's parent segment, the start and invite controls hidden in an aside and for someone in one, the refusals shown, stepped out, the parent's entry on home.
7. **Views and the pill: home, the settings pages and module pages** (experience-design). One open and one close for every view, Away only on the call, the pill, the history entries, the framed pages' pill.
8. **The visit view.** 8a, server-development: the chat relay on the module stream, `visiting` on `POST` and `GET /api/presence`, and their checks. 8b, experience-design: `createCanvas()` with a root, the second canvas, modules mounted for the visited space, `host.info.visiting`, the visiting band and label, opening objects, no call media, Enter, live chat through the stream with no doubles, visitors in who is here, the layout remembered.
9. **Notifications** (server-development for `ref`, mark all and mentions; experience-design for the panel and the `@` in the composer).

Documentation after each step is content-manager's: [architecture-navigation](../architecture/architecture-navigation.md), the SDK reference (`host.nav.set` without the top bar and `surfaces.page.nav` ignored, after step 2; `host.info.visiting`, after step 8; `host.notify`'s `ref`, after step 9), the CHANGELOG's notes for module authors (steps 2 and 8), the spaces and accounts user guides, and plan-nav's status. For Thomas, not content-manager: CLAUDE.md's Names gains `home` (decision 13).

## Verify

- **Step 1.** Checked by a tool: `check-names --words` and `check-templates` with the `home` key, its default following the `space` word, an owner's and a template's own `home`, and its refusals; `GET /api/modules/nav` listing Places and the modules with tiles, leaving out Maps and Research (no environment page), and leaving out a module the viewer can read only in a space. Live with curl on a throwaway `DATA_DIR`: `branding()` with and without a template.
- **Step 2.** Checked by `tools/check-nav.mjs`: the slot order, the phone fold (`phoneZones()`), the profile menu's entries for each role and for a single and a hosted install (the entries as a pure function of the role, the install and the browser's offer), and a module tool with `bar: 'primary'` and `system: true` placed in the space bar, not refused. Live in headless Chromium at 1280, 1024 and 390 px, signed in as a member, a moderator, an owner and the admin, and on a guest link: each bar, the logo box with and without an uploaded logo, the Modules menu, the switcher and its "+ New", the breadcrumb in a space with no name in the space bar, the bell's count and panel (an owner with an update waiting, a member with a To-do reminder), the menu, Manage's overlay keeping `?from=space`.
- **Step 3.** Checked by a new case in a server check: a member sees only their spaces' names, `elsewhere` for the rest, an aside as its parent to the parent's members, and a guest only their own space. Live with curl as two members of different spaces.
- **Step 4.** Live in headless Chromium with the faked LiveKit: the widget, its list, the count, the enter button, the invite button shown only for members of your space and not when you are in no space. Entering from the list without joining the call needs a real call.
- **Steps 5 and 6.** Checked by a server check with the stand-in LiveKit: an invite from no space refused; an invite to a non-member refused; a pull and an invite from inside an aside refused; a pull of, and an invite to, someone in an aside refused with the sentence; a token for a second aside refused; an invite given the inviter's space as parent, and its return answering that space. Needs a real call with three people: ending a private conversation landing everyone in the space it was started from; the parent's segment landing everyone in the parent; the invite button gone for someone in an aside; the parent seeing "stepped out".
- **Step 7.** Checked by a tool: the anchor's state as a pure function of present, on the call and viewing, every row of "Anchor states". Live in headless Chromium with the faked LiveKit: each view on the call sets the `away` attribute, and off the call sets nothing; the pill; Back closes the view and clears Away; a reload. Needs a real call: hearing muted, microphone and camera held off and restored, and a late joiner seeing Away.
- **Step 8a.** Checked by a server check: a chat post, delete and clear sent on that space's module stream and not on another's; `visiting` stored only for a space the person belongs to, cleared by an empty heartbeat, lapsing with presence, and answered only to viewers who belong to that space.
- **Step 8b.** Live in headless Chromium with the faked LiveKit, two browsers: the visit view's layout, the band and the label; an edit saved in the visited space and refused where the person's role there forbids it; an object in a third space opening a visit; Enter moving presence without joining the call; the visitor shown as "visiting" in the other browser's who is here, with no call mark, and gone when the view closes; a chat message from the visitor arriving in the space and one from the space arriving in the visit, each once; a layout change in the visit kept on the next visit and on entering; the module stream closed when the view closes; the page's open connections counted with several modules on both canvases. Needs a real call: the call carrying on underneath while visiting and editing, Away while visiting, a message from someone on the call shown once in both places.
- **Step 9.** Checked by a server check: `ref` kept, mark all, a mention raising a notice for a member and not for the writer or a non-member, a `chat` notice listed and streamed. Live in headless Chromium: a To-do reminder, a Polls vote and a mention reaching the bell, the panel, opening the object.
- Not checked here, any step: a real screen reader, Firefox, Safari, a real phone.

## What is not decided

Nothing: Thomas answered every question (decisions 1 to 29).

Later, decided as later: all spaces in the online list with a "request" option; a space that is a "call" space; private conversations between two people outside any space (decision 20); the secondary nav's own spec, which takes the space's name out of the space bar (decision 14); final template words for asides.
