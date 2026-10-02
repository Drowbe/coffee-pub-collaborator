# Primary Nav Plan

**Audience:** Thomas, who decides what the top bar holds and how presence works, and the sessions that build it: experience-design (`public/brand.js`, `public/nav-bar.js`, `public/space.js`, `public/dashboard.js`, the styles) and server-development (`server/words.js`, `/api/presence`, the aside routes, the notification routes, the checks).

**Status:** draft for Thomas to approve, 2026-10-01; Thomas answered the bell, the SDK's top-bar tool and the aside rules on 2026-10-02 (decisions 9 to 11). Not built. From Thomas's "Primary Nav Spec" (October 1, 2026): "The primary nav is the environment-level bar. It shows on every page, keeps the same layout everywhere, and always tells the user where they are present and how to get back." Thomas's decisions on the spec are recorded below; on present versus viewing he chose option (a), "this was actually always the intent", "first choice pending details". This plan gives those details. It replaces the primary nav sections of [plan-nav](plan-nav.md) ("The model", the primary table, the phone rule for the primary nav, and "Open, zone by zone" for the primary zones). The secondary nav stays in plan-nav until its own spec comes. Answers three TODO items once approved: the invited private conversation with no origin, the aside's **Join** button on home, and "rethink navigating away and hanging up". Changes the module SDK: a module can no longer place a tool in the top bar (decision 10).

## What it is today

**The bar.** `renderTopbar()` in `public/brand.js` builds `.topbar` in three zones, drawn from the registry in `public/nav-bar.js`:

- Left: the environment's logo, its home icon (`data-brand="home-icon"`, the couch by default, the suitcase for Travel; this is the "lock or luggage" icon the spec removes) and its name, all one link to `/` (`#brand-home-link`); the crumb (`#topbar-crumb`, empty on the space page since September 23); the status line.
- Middle: **Spaces** (`spaces-link`, `word('space', { many: true, cap: true })`, with the home icon), then a link to each module page (`page-<module>`, `loadModuleNav()`).
- Right: the light or dark switch (`theme-mode-switch`), **Manage** (`#admin-link`, shown to owners and the admin, with the module update count), the clock (`#topbar-clock`), and your picture (`#whoami-link`), which opens View profile, Install as an app (when the browser offers it, never for guests) and Sign out.
- On a phone (640 px or less): the logo, the crumb and the menu button; everything else folds into the menu (`phoneZones()`).

**Module pages in the bar.** `loadModuleNav()` lists a module that has a page, has no dashboard widget and has not set `surfaces.page.nav: false`. Of the bundled modules that is Maps, Research and Stream. Calendar, Polls, To-do and Travel (Planner) are reached from their widget's heading on home. Places has `nav: false` and no link at all. Each page is mounted with `scope: 'environment'` and reads across the viewer's spaces. The SDK also lets a module put a `system: true` tool in the right zone (`cleanModuleTools()` in `nav-bar.js`, `host.nav.set`); no module does.

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
    - **Control belongs to the person who started it.** Only the starter ends it, and ending brings everyone back to the parent. Anyone else can leave at any time and goes back to the parent alone; the others stay. The aside also closes when the last person leaves.

## The bar

Seven slots, left to right, as the spec draws them (default words; a template changes only the words):

```text
[logo] [Sandbox]  [Spaces ▾] › [Disneyland] › [Aside: Michelle]        [people 4] [bell 2] [Thomas ▾]
```

| Slot | Shows | Click |
|---|---|---|
| Logo | the environment's logo (`/img/site/icon`) | home |
| Environment | its name, no icon | home |
| Spaces | the `home` word and a caret | the word: home; the caret: the space switcher |
| Anchor | the breadcrumb (up to two segments after the Spaces slot), or the return pill | a segment: that space; the pill: back to where you are present |
| Online people | up to three portraits and the count of everyone online | the list |
| Notifications | the bell and the unread count | the panel |
| Profile | your picture, your name and a caret | the profile menu |

The left side is identity and location; the right is people and you. The three zones and the registry stay: the logo, environment, Spaces and anchor slots are the left zone; online people, the bell and the profile are the right zone. The middle zone is left empty in this plan; where module pages go is open (question 1).

### Anchor states

| You are | The anchor shows |
|---|---|
| on home, present nowhere | nothing after the Spaces slot |
| present in a space and looking at it | `Spaces ▾ › Disneyland`, the last segment current |
| present in an aside and looking at it | `Spaces ▾ › Disneyland › Aside: Michelle`; Disneyland leaves the aside for its parent |
| present in a space, looking at something else (home, another space, profile, Manage, a module page) | `Spaces ▾` and the pill `↩ Disneyland · 2 on the call` |
| present in an aside, looking at something else | `Spaces ▾` and the pill `↩ Aside: Michelle` |

The pill points to the deepest place you are present. It shows the call count when anyone is on the call and the space's unread chat count when there is any. It has a highlighted look from the theme tokens (an accent border and fill, never colour alone: the arrow icon and the words carry it).

## The contract

In Thomas's five phases (decision 8). "Left to build" splits them into steps that can each be built and checked alone; "Verify" and the questions use those step numbers.

### Phase 1: the bar's layout and moves

**Server** (server-development):

- **The `home` word.** A new key whose default is the capitalised plural of the `space` word, so an environment with nothing set reads **Spaces** as today, and an owner who calls a space "trip" reads **Trips** without setting `home`. Resolved like the others: the owner's, else the template's, else the default. Where it lives (in `words`, or beside it as `verbs` is) is question 2. Either way: `branding()` answers it; `PATCH /api/settings` takes it, with the same refusals as a word; the template file takes it (`server/templates.js`, `tools/check-templates.mjs`, the whole-template fingerprint counting it only when set); the host template editor and Manage > Template > Words get a row: "The name of the home page", blank for the template's or the default. `templates/travel.json` sets nothing (the default reads "Trips").
- Nothing else. The switcher's counts come from `GET /api/presence` as it is. "+ New" uses `POST /api/spaces` as it is (owners and the admin only; question 5).

**Pages** (experience-design):

- `renderTopbar()` draws the seven slots. Removed: the home icon from the logo link (`data-brand="home-icon"` there), the clock (`#topbar-clock`, `startClock()`), the light or dark switch and **Manage** from the right zone. The logo and the environment's name are two parts of one home link, as today.
- **The Spaces slot** replaces `spaces-link`: the `home` word as a link to home, and a caret button (`aria-haspopup="menu"`, title "Switch <space word>") that opens the switcher through `openHostMenu()`. On the space page, both keep today's in-page handling (`showSpaceList()`), so the call keeps running.
- **The switcher** lists the spaces the viewer belongs to (`mine` from `/api/presence`), in the space list's order. Each entry: the space's name, a mark on the space you are present in (an icon with a title, "You are here", not a coloured dot alone), and "N here" when anyone is. Asides are not listed. Last, after a divider, "+ New <space word>" for owners and the admin, which opens Manage > Spaces with the new-space form (over the space when present). A click on a space enters it with the template's enter word rules, as its entry on home does; once phase 4's visit view lands, a click on a space other than the one you are present in opens the visit view instead (question 4).
- **The breadcrumb** fills the anchor: on home, nothing; in a space, its name (`spaceDisplayName()`, the space's own icon as today's `spaceCrumbIcon()`); in an aside, the parent's name and "<Aside word>: <the other members' first names>". A segment that is not the current one is a link. Whether it shows while in a space is question 3; until Thomas answers, it follows the spec and shows.
- **The bell** (decision 9): an icon button in the right zone, between online people and your picture. For owners and the admin it counts the module updates available (`loadUpdateBadge()`, `GET /api/modules`'s `bundled[].update`), title "N module updates available"; its panel says "N module updates available" with a link to Manage > Modules (over the space when present). What it shows to everyone else until phase 5 is question 7; the suggestion in the contract is the notices the server already keeps. The count leaves your picture and the Manage entry.
- **The profile menu** (`accountMenuItems()`) by role:
  - every account: **View profile**; the light or dark switch as a checkbox entry ("Dark mode", `role="menuitemcheckbox"`); **Install as an app** while the browser offers it (as today, never a guest); **Sign out** last;
  - an owner: **Manage** (`/admin`, keeping `?from=space` and the overlay as today);
  - the admin: **Manage**; and, when the admin is the host admin's stand-in (`hostAdmin`), **Host console** (the host's address);
  - a moderator: nothing more (question 6).
- **Until question 7 is answered, a suggestion for everyone else's bell:** the module notices the server already keeps (`GET /api/notifications`'s `unread` and `notifications`, and the stream's `notification` event): the unread total on the bell, and a plain list in the panel, newest first, each marked read when shown. Owners and the admin see the update line above the same list. Phase 5 adds what is missing.
- **Module tools no longer reach the top bar** (decision 10). `cleanModuleTools()` drops `allowPrimary` and the `bar: 'primary'` path: a module's tools all go where the host puts them, which today is the space bar. A tool that still says `bar: 'primary'` or `system: true` is not refused; the two fields are ignored and the tool is placed like any other, so a module written against the old contract keeps working. `surfaces.page.nav` keeps only its other meaning, whether the module's page is listed. For module authors: the SDK reference's "Registering into the nav bars" loses the primary-bar paragraph, and the CHANGELOG says `bar` and `system` are ignored from this release.
- **Guests** (a guest link's page): the logo and the environment's name as plain text, not links (a guest has no home); the anchor shows the space's name; no Spaces slot, no online people, no bell, no profile menu. The page uses the environment's default theme and ignores a mode this browser remembers.
- **Phones** (640 px or less): the bar is the logo, the anchor or the pill (the last segment only, cut short with an ellipsis, the whole name as its title), the bell (with its count, as on a wider screen) and the menu button. The menu holds, in order: the environment's name, the Spaces slot (the home link, then the switcher's entries inline), online people (the count, opening the list), then your picture and name, the profile menu's entries for your role, and Sign out. `phoneZones()` keeps doing the folding.
- The clock setting stays in Manage. Its hint drops nothing: it already speaks of "every module". (Flag answered: removing the bar's clock does not leave the setting unused.)

### Phase 2: the online people widget

**Server:**

- `GET /api/presence` names a person's place only where the viewer belongs. For each user, `space` is the space's id only when the viewer is a member of it (`mine`: owners and the admin belong to every space, as the space list already treats them); otherwise `space` is null and `elsewhere: true` says they are in a space the viewer cannot see. A person in an aside reads `space: <the parent's id>, aside: true` to a member of the parent, and the aside's own id only to the aside's own members. `asides` lists only the asides the viewer is in. A guest's answer names only the guest's own space and the people in it.
- `GET /api/status` (the stream key, Studio) is unchanged.
- The space page's own uses of `space` (the counts on home's entries, `asideNow`, the bystander placeholders) keep working, since they are about spaces the viewer belongs to.

**Pages:**

- A widget in the right zone, `online-people` (an `element` tool, group `people`, before the bell): up to three square portraits in the style of who is here (`public/space-people.js`), then the count. Its title and accessible name: "N people online". "Just you" when alone.
- The list, under it, inside the window (the same placement as who is here): you first, then each person with their portrait, name and where they are: "in Disneyland", "in an aside" (the `aside` word, `a` form), "online" (present on a page, in no space), or "in another <space word>" for `elsewhere`. A mark for "on the call". For a space the viewer belongs to and is not present in, an **<enter word>** button that enters it (never joining the call); none for an aside. The invite to a private conversation (today's Who's around button) moves here as an icon button per person.
- Home: the Who's around strip is replaced by the widget (question 8).
- Live: the widget redraws on each `/api/presence` answer the page already asks for; on pages that do not poll presence, it asks every 30 seconds while the page is visible.

### Phase 3: the aside rules

Decision 11, for pull asides and private conversations alike.

**Server:**

- **Who started it.** The aside's record gains `startedBy`, the starter's user key: the initiator of a pull, the inviter of a private conversation. `sanitizeAside()` keeps it; an aside from before it has none and reads as started by its first member. `GET /api/presence` gives `startedBy` to the aside's own members only.
- **Every aside has a parent.** `POST /api/asides/invite` sets the origin to the inviter's present space. When the inviter is present nowhere, or the invitee is not a member of that space, see question 9.
- **One at a time.** Each refusal answers 409 with one plain sentence, built with the `aside` word:
  - `POST /api/asides` and `POST /api/asides/invite` when the initiator is in an aside: "End or leave your <aside> first."
  - `POST /api/asides` when a person to pull is in an aside, and `POST /api/asides/invite` when the invitee is: "<Name> is in <an aside> right now. Try again once they're back."
  - `POST /api/token` for an aside when the caller is already in another aside (an invitation accepted after its invitee went into another aside): "End or leave your <aside> first."
- **Ending.** `POST /api/asides/end`, the starter only (403 "Only the person who started <the aside> can end it." for anyone else): every other member gets the `aside-return` nudge to the parent, and the answer is the parent. The aside is then removed.
- **Leaving.** `POST /api/asides/return` sends only the caller back: it answers the parent and nudges nobody. The others stay. When the caller was the last one in it, the aside closes (as `pruneAsides` does now, without waiting for its grace).
- **The starter dropping or leaving without ending.** Question 10. The suggestion: after the same 20-second grace `pruneAsides` gives (long enough for a reload or a reconnect), the server ends it as `POST /api/asides/end` would, and everyone returns to the parent.
- **An owner's Pull participants back** (`POST /api/asides/recall`) is unchanged (question 15).
- **Stepped out.** The phase 2 presence shape (`space: <parent>, aside: true`) is what the parent's members read.

**Pages:**

- An aside's entry leaves the space list; asides are not on home or in the switcher. The parent's entry on home shows who is in an aside from it: "Thomas, Michelle · in an aside".
- **The space bar in an aside** (Thomas left the labels to the plan): the starter has **End <aside>** (the `aside` word, `fa-circle-xmark`), which calls `POST /api/asides/end` and takes everyone, the starter included, back to the parent, keeping the call for those on it. Everyone else has **Leave** (`fa-circle-left`, title "Back to <parent>"), which calls `POST /api/asides/return` and takes only them back. **Rejoin call** (`#rejoin-call`) goes. Leaving the space itself is done from the parent.
- **The parent's segment in the breadcrumb** does the same as the space bar: Leave for a member; for the starter it asks first, "End <the aside> for everyone?", since it brings everyone back.
- **One at a time on the page.** The pull, private conversation and invite controls are never offered while you are in an aside (for everyone, not only owners), and the invite button in the online people list is not offered for a person shown in an aside. A refusal from the server is shown as its sentence.
- In the parent, who is here lists a person in an aside from it as "stepped out" (fixed words), under those present, with no call mark.

### Phase 4: present versus viewing, by option (a)

What "present" means: the page is connected to a space (or an aside) for presence and chat, on the call or not. One per page; entering another space moves it. What "viewing" means: what fills the window.

**The order of views**, each its own build and check:

1. **Home** (exists as `showSpaceList()`): add the pill and the history entry.
2. **Visiting another space** (new).
3. **The settings pages** (exist as `openOverlay()`): profile, Manage, a space's settings, a space's module settings, module pages. Their framed header shows the pill in place of the "Back to" button.

**Away.** Every view while present sets Away, as `openOverlay()` and `showSpaceList()` do now; closing the view, the pill and the browser's Back clear it. One function in `space.js` opens any view and one closes it, so no view forgets Away.

**The return pill.** Drawn by `brand.js` in the anchor slot whenever the space page is present and a view is open. In a framed page (`?from=space`), the pill reads its state from the space page underneath (same origin: a function the space page puts on `window`, returning `{ name, aside, onCall, unread }`, and an event when it changes) and calls `closeProfileOverlay()`. `wireOverlayBack()` goes.

**The address and the Back button.** Each view while present adds one history entry with `history.pushState`, and the address shows it in the hash: `/#home`, `/#visit=<space id>`, `/#view=/profile` (the framed page's own path). The browser's Back closes the top view, clears Away and returns to the space; it never leaves the page while present. Forward reopens the view. A reload while present rejoins the space as today and opens no view. Present nowhere, the address and Back work as today: real pages, real navigation.

**The visit view.** Opened from the switcher, from home's entry for a space, or from a link in a module that names another space. It shows the visited space's name, its description and its canvas with the modules on in it, laid out as that space opens for this person (their remembered layout, else `opensWith`). It does not connect to that space's call or presence: nobody there sees you, and who is here shows the people there from `/api/presence`. Its space bar holds the module chooser, who is here (read only), and in place of Leave an **<enter word>** button that moves presence there (leaving the current space, never joining the call). Whether the visited space's modules are read only, and how an object comes out of it, is question 11; the contract for the SDK follows from the answer (`host.info.visiting: true` and refused writes, if read only).

**Present nowhere.** No pill, no Away, no change: `/profile`, `/admin` and `/modules/<id>` are real pages, and a space entry enters.

**Phones.** Views fill the screen as the overlay does now. The pill is in the bar (decision 7). The visit view's space bar is the tab bar, with **<enter word>** where Leave is.

**Server:** nothing new for home and the settings pages. For the visit view, only what question 11's answer needs.

### Phase 5: notifications

Built on the store that exists (`ModuleHooks.deliver`, `/api/notifications`).

**Server:**

- A notice may carry a pointer to its object (`ref`, the same shape as linked objects), given by `host.notify({ ..., ref })`, so a click opens the object.
- `POST /api/notifications/read` with `{ all: true }` marks all read.
- Mentions in chat raise a notice from the host itself (module `chat`), if Thomas wants them in this phase (question 12).

**Pages:**

- The bell (drawn since phase 1): the unread total (`9+` above nine), title "Notifications, N unread".
- The panel, under it: the newest first, each with its module's icon and name, title, body, time and whether read; a click opens the object (in its space, as a view when present) and marks it read; **Mark all read** at the top; "Nothing new." when empty.
- The per-module counts on module links and home's tiles stay as they are; the toast stays.
- For owners and the admin, the module update line stays at the top of the panel, and the count on the bell is the unread notices plus the updates.

## Left to build, in order

1. **The `home` word** (server-development). The key, its default, `branding()`, `PATCH /api/settings`, the template field and check, Manage's and the host editor's row.
2. **The bar's layout and moves** (experience-design). The seven slots, the switcher, the breadcrumb, the bell with the module updates (and, per question 7, the notices that exist), the profile menu by role, the guest bar, the phone menu; the clock, the home icon, the theme switch, Manage and the update count moved or removed; the top-bar path for module tools retired in `nav-bar.js` and `module-host.js`, with `tools/check-nav.mjs`'s cases changed to match.
3. **Presence by membership** (server-development). The filtered `/api/presence` and its check.
4. **The online people widget** (experience-design). The widget, its list, entering and inviting from it, home's strip replaced.
5. **The aside rules on the server** (server-development). `startedBy`, the invite's parent, the one-at-a-time refusals (both start routes and the token), `POST /api/asides/end`, `/return` for the caller alone, the starter's drop, stepped out.
6. **The aside rules on the pages** (experience-design). Aside entries gone from home, End and Leave in place of Rejoin call, the breadcrumb's parent segment, the start and invite controls hidden in an aside, the refusals shown, stepped out, the parent's entry on home.
7. **Views and the pill: home and the settings pages** (experience-design). One open and one close for every view, Away on both, the pill, the history entries, the framed pages' pill.
8. **The visit view** (experience-design, and server-development or the SDK for read only if question 11 says so).
9. **Notifications** (server-development for `ref`, mark all and mentions; experience-design for the panel's full form).

Documentation after each step is content-manager's: [architecture-navigation](../architecture/architecture-navigation.md), the SDK reference (`host.nav.set` without the top bar, after step 2; `host.notify`'s `ref`, after step 9), the CHANGELOG's note for module authors (step 2), the spaces and accounts user guides, and plan-nav's status.

## Verify

- **Step 1.** Checked by a tool: `check-names --words` and `check-templates` with the `home` key, its default following the `space` word, and its refusals. Live with curl on a throwaway `DATA_DIR`: `branding()` with and without a template.
- **Step 2.** Checked by `tools/check-nav.mjs`: the slot order, the phone fold (`phoneZones()`), the profile menu's entries for each role (the entries as a pure function of the role and the browser's offer), and a module tool with `bar: 'primary'` and `system: true` placed in the space bar, not refused. Live: the bell's update count for an owner with an update waiting, none for a member, and neither on your picture nor on Manage. Live in headless Chromium at 1280, 1024 and 390 px, signed in as a member, an owner and the admin, and on a guest link: each bar, the switcher, the menu, Manage's overlay keeping `?from=space`.
- **Step 3.** Checked by a new case in a server check: a member sees only their spaces' names, `elsewhere` for the rest, an aside as its parent to the parent's members, and a guest only their own space. Live with curl as two members of different spaces.
- **Step 4.** Live in headless Chromium with the faked LiveKit: the widget, its list, the count, the enter button. Entering from the list without joining the call needs a real call.
- **Steps 5 and 6.** Checked by a server check with the stand-in LiveKit: a pull and an invite from inside an aside refused; a pull of, and an invite to, someone in an aside refused with the sentence; a token for a second aside refused; an invite given the inviter's space as parent; `startedBy` kept; End refused to anyone but the starter; `/return` nudging nobody. Needs a real call with three people: the starter's End bringing everyone back, on the call if they were; a member's Leave bringing only them back while the others stay; the last one out closing it; the starter dropping; the parent seeing "stepped out".
- **Step 7.** Checked by a tool: the anchor's state as a pure function of present and viewing, every row of "Anchor states". Live in headless Chromium with the faked LiveKit: each view sets the `away` attribute and the pill; Back closes the view and clears it; a reload. Needs a real call: hearing muted, microphone and camera held off and restored, and a late joiner seeing Away.
- **Step 8.** Live in headless Chromium: the visit view's layout, its enter button, and (if read only) a refused write. Needs a real call: the call carrying on underneath while visiting, and nobody in the visited space seeing you.
- **Step 9.** Checked by a server check: `ref` kept, mark all. Live in headless Chromium: a To-do reminder and a Polls vote reaching the bell, the panel, opening the object.
- Not checked here, any step: a real screen reader, Firefox, Safari, a real phone.

## Module pages: where they go

Open (question 1). Thomas is torn. Today Maps, Research and Stream sit in the bar's middle zone, and Calendar, Polls, To-do and the Planner are reached from their tile's heading on home. The spec's seven slots have no place for them. Under option (a) each still opens as a view while present (`data-overlay-link`, as today), whichever way is chosen.

- **A. A Modules slot.** An eighth slot after the anchor: the environment's word for module (plural) and a caret, listing every module page the viewer may open. Costs: one more slot than the spec, and on a phone one more section of the menu. Gives: one click from anywhere, and every module page in one place, the ones with tiles included. Rules out nothing.
- **B. Inside the Spaces switcher.** A second section of the same menu, after the spaces and before "+ New": "Across all <space word, many>", then each module page. Costs: the switcher holds two kinds of thing, and is longer. Gives: the spec's seven slots kept; the menu is about "where you can go in this environment", which a cross-space module page is; on a phone it is already in the menu.
- **C. Only from home.** Home lists every module page: the tiles as today, and a row of links for modules with a page but no tile (Maps, Research, Stream). Costs: two steps from a space (home, then the page), and a module page is found only by someone who looks at home. Gives: the simplest bar, and one place for cross-space things.

Suggestion, for Thomas to decide: **B**, with home keeping its tiles and gaining C's row of links. It keeps the spec's layout, keeps every module page one click from the bar, and costs no slot on a phone. `surfaces.page.nav` then means "listed among the environment's module pages".

**The SDK's top-bar tool** is decided (decision 10): retired; see phase 1.

## What is not decided

Questions for Thomas, the ones that block a step first. Renumbered 2026-10-02: the old 9, 10, 13 and 14 are answered (decisions 9 to 11).

1. **Module pages** (blocks step 2): A, B or C above, or another.
2. **Where `home` lives** (blocks step 1). (a) In `words`, beside the levels, with a `one` and a `many`; CLAUDE.md's Names gains a line for it, since the vocabulary is the Names. (b) Beside `words` as its own one-string map, as `verbs.enter` is, so the vocabulary stays exactly the levels and roles. Suggestion: (b), since home is a page, not a level, and has no plural; it is still a code name that never changes.
3. **The breadcrumb in a space** (blocks step 2). The spec shows it, which reverses the September 23 decision (the crumb hidden at the space, since the space bar names it). Show it, and the space bar stops repeating the name (a change to the secondary nav, ahead of its spec)? Or keep it hidden in a space until the secondary spec, showing only the pill when viewing elsewhere?
4. **A click on a space in the switcher** (blocks step 2's wording, decides step 8). Present nowhere: enter it, or open the visit view with an enter button there? Present elsewhere: the visit view (the spec's rule 2), or enter? Suggestion: enter when present nowhere; visit when present elsewhere.
5. **Who sees "+ New <space>"** (blocks step 2). Owners and the admin only, as `POST /api/spaces` allows today? Or a role permission so members can make a space (a server change)? Suggestion: owners and the admin only for now.
6. **The profile menu for a moderator** (blocks step 2): nothing more than a member (their tools are per space, in the space bar), or a list of the spaces they moderate? And on a single install, is **Manage** the admin's "host settings", with no Host console entry? Suggestion: nothing more for a moderator; yes on a single install.
7. **What the bell shows to members and moderators before phase 5** (blocks step 2). (a) The module notices the server already keeps (Calendar, Polls and To-do raise them today): their unread total and a plain list. (b) Nothing: no count, and a panel that says "Nothing new." (c) No bell for them until phase 5. Suggestion: (a); it costs only page work, uses routes that exist, and a bell that never counts anything teaches people to ignore it.
8. **Home's Who's around strip** (blocks step 4): replaced by the online people widget, or kept beside it?
9. **An invited private conversation's parent, at the edges** (blocks step 5). The parent is the inviter's present space (decision 11). (a) The inviter is present nowhere (on home): the parent is the Lobby, which everyone belongs to; or the invite is not offered until the inviter enters a space. (b) The invitee is not a member of the inviter's space: the invite is not offered to them; or the parent becomes the Lobby; or each returns to where they were before. Suggestion: the Lobby for (a); for (b), the invite offered only to members of the inviter's present space, since the spec lets only the parent's members into an aside, and the online people list already knows which spaces the viewer shares.
10. **The starter drops or leaves without ending** (blocks step 5). (a) After a 20-second grace (a reload or a reconnect keeps it), the aside ends and everyone returns to the parent. (b) Control passes to the person who has been in it longest. Suggestion: (a); control stays with one known person, nobody is handed a role they did not ask for, and the others land where End would have put them.
11. **The visit view** (blocks step 8). Read only, or usable as your role allows? And how does an object come out of it: not at all at first; a "Copy to <present space>" action on an object; or dragging onto the pill? Suggestion: read only, with "Copy to <present space>" through the modules' existing actions, as a later step if it is not needed at once.
12. **Mentions** (blocks step 9): in the notifications step, or later? The spec lists them; chat has no mentions today.
13. **The home icon.** With the luggage icon gone from the bar and no icon on the Spaces slot, `settings.homeIcon` and a template's `icons.home` show nowhere in the bar. Keep them for home's own heading, or retire them?
14. **Away for someone present but not on the call.** Option (a) sets Away on every view. With no call there is nothing to mute, but who is here would show them away. Intended?
15. **An owner's Pull participants back** against the starter's control. It brings back every private conversation from the owner's space, whoever started it. Keep it as the owner's override? Suggestion: keep it; the owner runs the space, and its 10-second countdown already warns the people in it.

Later, decided as later: all spaces in the online list with a "request" option; a space that is a "call" space; the secondary nav's own spec; final template words for asides.
