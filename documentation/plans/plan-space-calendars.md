# Space Calendars Plan

**Audience:** Thomas, who decides what a space's calendar address holds, who may publish the environment's calendar, how members' busy times are shared and drawn, and where each setting lives; and the sessions that build it: server-development (the settings, the addresses, the busy times, the routes, the checks), experience-design (Calendar's Configure page, Profile's Calendars tab, the space's settings, the Calendar module's busy times) and bug-fixes (the two problems to fix first).

**Status:** approved by Thomas, 2026-10-03, with every open question of the draft answered as recommended (decisions 7 to 14); not built. For GitHub #179, "Calendar for spaces: a space's calendar address, members' busy times, one place to set it up". Thomas's words, 2026-10-03: "Calendars are primarily scoped to a space. For example, for travel a space would be a trip." "Members of that trip would want to do two things: 1) see the trip calendar as a google calendar. 2) Be able to see the available times of each other, so seeing their own calendar to leverage to mark their busy/free time" in the space. "At the environment level there might be a calendar published with all of the events from each of the spaces." On setup: "You have to go to so many places and switch things on: Environment > Modules … the configure button is disabled for this module. Environment > switch it on — why is this not in the module settings? Profile > Calendar feed … Profile > Other Calendars … The whole profile module settings are confusing." Builds on [plan-google-calendar](plan-google-calendar.md) (built 2026-10-03), whose rule "other calendars are never inside a space" this plan changes for busy blocks only (decision 5). #167, poll closing times and to-do due days on the Calendar, is its own plan, [plan-calendar-markers](plan-calendar-markers.md), since it shares no code with this one.

## What it is today

- **Three switches in three places, and a disabled button.** Manage's environment tab has **Calendar feeds** (`#set-calendar-feeds`, `settings.calendarFeeds`, default `false`), which allows both the address out and other calendars in. Manage's Modules tab shows Calendar's **Module Configuration** button disabled ("No settings."), because `isConfigurable()` in `public/admin.js` only counts settings of scope `environment` and the Calendar declares only a person setting (`defaultView`). **Show Calendar** sits in the **Top bar** section of the environment tab (`settings.showCalendar`, [plan-calendar-destination](plan-calendar-destination.md)).
- **The personal address** (Part 1 of plan-google-calendar): `user.calendarFeed: { hash, made, readAt }`, the SHA-256 of a token shown once; `GET /feed/<token>.ics` answers the environment's own events and those of every space the person is a member of where a kind with `"feed": true` is on and readable, checked at each read (`feedEvents()` in `server/index.js`, writing with `server/ics.js`). Profile's **Calendar feed** section (`#section-feed`); an owner sees on or off and **Turn off** on someone's profile and on Manage's Users tab.
- **Other calendars in** (Part 2): up to five pasted private addresses per person, `user.externalCalendars: [{ id, name, url, readAt, error }]`, `url` sealed. Read by `server/external-calendars.js` and `server/ics-read.js` into memory only, every 30 minutes for anyone seen in 14 days, 30 days back to 180 days ahead. A module reaches them through the admin-approved `external` hook (`GET /api/modules/:id/external-events`), the person's own only. The Calendar draws them only on environment mounts (`showsExternal` in `modules/calendar/src/calendar.js`), never in a space. Profile's **Other calendars** section (`#section-external`). The reader keeps `STATUS:CANCELLED` out but does not read `TRANSP` (whether an event is marked free).
- **Per person per space** data already exists: `user.spaces[<space id>]` holds the person's images and ticks (`moderator`) for that space (`setSpacePrefs()` in `server/store.js`), drawn on Profile's **Spaces** tab, one section per space. Removing someone from a space (`removeMember()`) takes them off `space.members` and leaves that entry.
- **Space settings** (`/spaces/<id>`, `public/space-settings.html`) are for owners and the admin; a space's moderators change its module settings on `/module-settings?space=<id>`.
- **Calendar 1.21.0** has the `schedule`, `notify` and `external` hooks, `"feed": true` on its `event` kind, and consumes `"*"`.

Known problems the issue asks to fix first, separately (bug-fixes, step 0 below): Profile's **Other calendars** shows no form even after the admin approves the hook; and the feed section should say that Google takes 8 to 24 hours to refresh a subscribed calendar.

## Decisions

Thomas, 2026-10-03, in #179 and the request for this plan:

1. **Calendars belong mainly to a space.** For travel a space is a trip. Reason: that is how people plan.
2. **Each space has its own calendar address, which members and above can get** (not guests). Reason: a trip's members want "Lisbon trip" as its own calendar in Google.
3. **Keep the personal everything-address as an option**, beside the space addresses. Reason: some people want one calendar for all of it.
4. **The environment may publish one calendar with every space's events.** Reason: an environment-wide view, outside sign-in.
5. **Members share busy times from their own calendars into a space**, so the space can find open times. Busy blocks always show, since they are an input to planning; in a space, people can hide or show them per member.
6. **One place to set it up:** the owner's switches in Calendar's own configuration, the space's calendar options with the space, and a Profile a person understands. Reason: the setup is scattered today (Thomas's words above).

Thomas, 2026-10-03, approving the plan (the draft's questions 1 to 8, each as recommended):

7. **Three owner switches:** private addresses (the personal and space addresses), other calendars and busy times, and the published calendar; the Travel template turns on the first two. Reason: publishing and reading people's calendars are different risks.
8. **The published calendar is one address,** made, replaced and turned off by owners and the admin, who hand it out as they choose; every space is in it unless an owner leaves it out. Reason: a per-person address with every space would show people spaces they are not members of.
9. **What counts as busy:** events marked free ("Show as free", so Google's all-day events unless marked busy) are left out, and blocks are rounded outward to the quarter hour. Reason: free time is not busy, and rounding hides the exact shape of someone's day.
10. **A member gets a space's address and shares busy times on Profile's Calendars tab,** opened on that space from the Calendar's menu in the space. Reason: one place for everything about a person's calendars.
11. **Show Calendar moves into Calendar's Configure, and Show Map into Maps',** so Manage's Top bar section goes. Reason: a module's switches live in its own configuration.
12. **Hiding a member's busy times is remembered per browser,** as the destination's filter is. Reason: the same as the destination's choices.
13. **Find a time is Free for everyone shading in Week and Day,** not a separate view. Reason: the simplest that answers "when can we all meet".
14. **Busy times have their own hook, `busy`,** which the admin approves once on the Calendar's update, rather than riding on `external`, which was approved as "only to them". Reason: the admin consents to what is actually shared.

## The contract

Written for the decisions above. Nothing here changes what a single install with nothing set does: every new switch is off until an owner turns it on.

### 1. A space's calendar address

**One token per person per space**, not one per space. Reasons:

- Leaving a space, being removed from it, or losing the Calendar's `read` permission there ends that person's address and nobody else's. With one shared token per space, removing one person would mean a new address for everyone.
- Each address can be turned off or replaced by its owner without touching the others, and "Last read" means one person's calendar app.
- It reuses the personal address's shape (hashed, shown once, replaced when lost; plan-google-calendar decision 5) and its route.

**What it holds:** the events of every enabled kind marked `"feed": true` and `"dated"` in that one space, read with the person's rights at each read, as `feedEvents()` reads one space today. Not the environment's own events, not other spaces, never busy blocks, never anyone's other calendars. The calendar's name in Google is the space's name (`X-WR-CALNAME`). Each event's `UID` is the one the personal address gives it (`<kind>-<id>-<space id>@<host>`), and its description omits the space's name.

**Who may get one:** a signed-in person, not a guest, who is a member of the space (any role from member up), where the Calendar is on and they hold its `read` permission there, while the environment allows addresses (decision 7). An owner or the admin who is not a member gets none, as in [plan-calendar-destination](plan-calendar-destination.md) decision 23 ("being able to manage a thing and being a member of a thing are different").

**Revocation:** at each read the server checks the person still exists, is still a member, and still reads the Calendar there; otherwise 404. Removing someone from a space, and deleting a space, also delete the stored token. The person can **Turn off** or make a **New address**; an owner or the admin can **Turn off** someone's, never see it.

**Relation to the personal address:** independent. A person may have both; the hint says "Your everything address already holds this <space>, so you only need one of them." when they have the personal one.

### 2. The environment's published calendar

The shape (decision 8): **one address for the environment**, made, replaced and turned off by owners and the admin, who hand it to whoever should have it. It is a publication, not a person's view: anyone with the address sees what it holds, without signing in.

**What it holds:** the environment's own events and the events of every space where the Calendar is on, except spaces an owner leaves out (below). Asides hold no modules and are never in it. Never busy blocks, never other calendars. Named after the environment. The description of each event names its space.

**Leaving a space out:** each space's settings page gains a **Calendar** section with a switch **In the published calendar**, on by default, shown only while publishing is on. Stored on the space as `publishCalendar: false` when turned off (absent means on).

**Relation to the personal address:** the personal address holds what one person may read (their spaces); the published calendar holds every space not left out, whoever reads it. It is not shown to members on Profile.

**Revocation:** **New address**, **Turn off**, the switch in Calendar's Configure, and turning the Calendar off each stop it at once.

### 3. Busy times in a space

**Opt-in, per person, per space.** On Profile's Calendars tab (section 4), each space the person is a member of has **Share my busy times**, a list of their other calendars to tick. Nothing is ticked at first, and adding a new other calendar ticks it nowhere. Stored as `user.spaces[<space id>].busy: [<calendar id>, ...]`; an empty list or none means not sharing. Removing an other calendar takes it out of every list.

**Busy blocks only.** The server turns the ticked calendars' events into blocks of time and sends only `start` and `end`:

- events marked free (`TRANSP:TRANSPARENT`, which is Google's "Show as free" and its default for all-day events) are left out, and so are cancelled ones (decision 9);
- all-day events marked busy block the whole day in the server's `TZ`;
- blocks from all of a person's ticked calendars are merged, overlaps and touching blocks joined, and each rounded outward to the quarter hour (decision 9), so the count and exact length of events is not shown;
- from the start of today to 90 days ahead.

Never a title, place, description, attendee, `UID`, calendar name, or how many calendars or events lie behind a block. Not in any address out, any summary, search, chat, AI request, notification or log; nothing written to disk.

**Who sees them:** members of that space, from member up, through the Calendar mounted in that space. Not guests, not owners who are not members, not on the Calendar destination or any environment page, where several spaces' members would mix. A person sees their own blocks too, as "You".

**When they stop:** at once when the person unticks their calendars, removes the other calendar, leaves or is removed from the space, or when the owner turns off other calendars; the next read answers none. A block already on someone's screen goes on the next refresh (within a minute; the stream event below).

**Drawn in the space's Calendar** (canvas, popped out, and its page with `?space=`):

- **Week and Day:** each shown member's blocks as a narrow hatched lane down the left edge of each day column, one lane per member in the space's member order, in muted member tints from the theme tokens; the events keep the rest of the width. Hovering or focusing a lane block says "<name>: busy 9:00 to 11:00". More than six members shown: one combined lane whose shade deepens with how many are busy, saying "3 busy: Ana, Ben, Cy".
- **Month and Agenda:** no blocks.
- **Hide or show per member:** a **Busy** button in the Calendar's toolbar (`host.toolbar.set`), opening `host.menu.show` with one entry per member who shares, each checked when shown, plus **Show all** and **Hide all**. Everyone sharing is shown by default. The choice is remembered per browser and per space (decision 12). Someone who starts sharing later shows by default.
- **Find a time** (decision 13): in Week and Day, a toggle **Free for everyone** in the same menu shades the hours where none of the shown members is busy, within the hours the view shows. No separate view.

**The rule that changes.** plan-google-calendar Part 2 says another calendar's events are "never seen by anyone else, never in a space's store, never in the address out". This plan keeps that for events, and adds one exception: a person may choose to let a space's members see when they are busy, from calendars they pick, with no detail ever. On approval, content-manager notes the exception in plan-google-calendar's status and in the architecture document.

### 4. One place to set up

**Calendar's Configure page** (`/module-config.html?id=calendar`), for owners and the admin. Its **Module Configuration** button is no longer disabled: the server says a module is configurable when it has environment settings or takes part in calendar sharing (a kind with `"feed": true`, or the `external` or `busy` hook). The page gains a host-drawn section **Calendar sharing** above the module's own settings, so the host still names no module and stores the switches in `store.settings`:

- **Private addresses** (`settings.calendarFeeds`, the existing key): "Lets each person add this <environment>'s events, or one <space>'s, to their own calendar app with a private address."
- **Other calendars and busy times** (`settings.otherCalendars`, new): "Lets each person see their own calendars beside these events, only to them, and share when they are busy with a <space>'s <members>, never what they are doing."
- **Published calendar** (`settings.publishedCalendar`, new, default `false`): "One address with every <space>'s events, for anyone you give it to." When on: the address once just made, **Copy**, "Made <date>. Last read <time ago>.", **New address**, **Turn off**.
- **Show in the top bar** (`settings.showCalendar`, moved from Manage's Top bar section, decision 11).
- When the module lacks an approved hook a switch needs: the switch is shown off and disabled, with "Waiting for the <admin> to approve <Calendar>'s update." and, for the admin, a link to the Modules tab.

Manage's environment tab loses the **Calendar feeds** panel (`#calendar-feeds-settings`); its place shows one line, "Calendar sharing is set in <Calendar>'s configuration." with the link, for one release.

**The space's settings** (`/spaces/<id>`) gain the **Calendar** section of section 2, shown only while publishing is on. Members find the space's own options in the space: the Calendar's toolbar in a space gets **Add to my calendar app** and **Share my busy times** in its menu, each opening Profile's Calendars tab on that space's row (`/profile#calendars&space=<id>`), as a view over the space (decision 10). The Calendar never handles the token: the host draws the address.

**Profile, a new tab Calendars** (`data-tab="calendars"`, beside Profile and Spaces), shown to anyone who is not a guest when the Calendar is on and at least one switch is on, or when they still hold an address or an other calendar. Three sections, in this order, under one line at the top: "Calendars coming in are only for you. Addresses going out let your calendar app show events from here."

1. **Your calendars, coming in** (`#section-external`, moved): the existing list and form. Hint: "Their events show in your Calendar, only to you. In a <space>, you can share when you are busy, never what you are doing."
2. **Addresses, going out** (`#section-feed`, moved and widened): first **Everything** (the personal address, as today, its hint naming what it holds), then one row per space the person may get an address for, each with the space's icon and name, on or off, "Last read", **Make an address**, **New address** and **Turn off**. The address shows once, in the row, with **Copy** and the steps for Google and Apple, ending "Google can take 8 to 24 hours to show a change."
3. **Busy times in your <spaces>**: one row per space where the person is a member and the Calendar is on, with the ticks of their other calendars, saved as they are ticked. With no other calendars: "Add one of your calendars above first."

Profile's Profile tab keeps its other sections; **Module settings** stays there (Calendar's **Open on** with it). An owner opening someone's profile sees, on the Calendars tab, each address's on or off with **Turn off**, and which spaces they share busy times with, never the calendars or blocks.

**"Why can't I" states.** Every section that cannot be used says why, in place, from a `reason` the server answers (below), never by hiding the whole tab:

| State | What the person reads |
| --- | --- |
| Calendar off in the environment | "<Calendar> is off in <environment>." (no tab at all when they hold nothing) |
| A switch off, to a member | "<Owners> have not turned on private addresses in <environment>." (or other calendars) |
| A switch off, to an owner | the same, with "Turn it on in <Calendar>'s configuration." as a link |
| Waiting for the admin's approval | "Waiting for the <admin> to approve <Calendar>'s update." |
| Calendar off in a space, or no `read` there | that space's row: "<Calendar> is off in this <space>." |
| A guest | no Profile, as today |
| An address whose switch was turned off | "Private addresses are off in <environment> for now, so this address does not work." with **Turn off** still offered |

### Server (server-development)

- **Settings:** `settings.otherCalendars` and `settings.publishedCalendar`, booleans, in `GET` and `PATCH /api/settings` for owners and the admin and in `SETTINGS` in `server/templates.js`. `otherCalendars` absent reads as `calendarFeeds` (so an environment that allowed other calendars today still does, with nothing rewritten); `PATCH` writes it from then on. `calendarFeeds` now governs the personal and space addresses only; `otherCalendars` governs other calendars and busy times (the routes of Part 2 move from `calendarFeeds` to it).
- **Configurable:** `GET /api/modules` gains `sharing: true` on a module with a `"feed": true` kind or the `external` or `busy` hook, and `sharingReasons` for the Configure page (which switch waits on which hook). `isConfigurable()` counts it.
- **Space addresses:** stored as `user.spaces[<space id>].calendarFeed: { hash, made, readAt }`. `GET /api/me/calendars` answers the whole Calendars tab in one: `{ switches: { addresses, otherCalendars, busy }, reasons: { ... }, everything: { allowed, on, made, readAt }, spaces: [{ id, name, icon, svg, address: { allowed, reason, on, made, readAt }, busy: { allowed, reason, calendars: [<id>] } }], external: { allowed, calendars } }`. `POST /api/me/spaces/:id/feed` (201 `{ url, made }`, once; 403 with the reason), `DELETE /api/me/spaces/:id/feed` (204), and `DELETE /api/users/:key/spaces/:id/feed` for owners and the admin (204). `GET /api/users/:key` gains each space's `calendarFeed: { on, made, readAt }` and `busy: true | false` for owners and the admin, never a hash or a calendar.
- **The published calendar:** `settings.publishedCalendarFeed: { hash, made, readAt }`. `POST /api/settings/published-calendar` (owners and the admin; 201 `{ url, made }`, once; 403 while the switch is off), `DELETE` (204). `PATCH /api/spaces/:id` takes `publishCalendar`.
- **One route for every address:** `GET /feed/:token.ics` looks the hash up in the personal addresses, then the space addresses, then the published one, and answers 404, 429, 304 and 200 exactly as today. What it reads: the personal address as today; a space address that space only, with the membership and `read` checks at each read; the published one as the environment with every space's events where the module is on, except `publishCalendar: false`, with no person's rights involved. The same 2000-event and 90-days-past limits. `removeMember()`, deleting a space and deleting a person delete the tokens they hold.
- **Busy times:** the reader keeps `TRANSP` (`transparent: true` on an event) and drops it from every answer to a module. `user.spaces[<space id>].busy` set by `PUT /api/me/spaces/:id/busy` with `{ calendars: [<id>] }` (only the person's own calendar ids; 403 when the switch is off, the Calendar is off or unreadable there, or they are not a member). A new hook, `"busy": true`, approved by the admin like `external`, with the line "See when a <space>'s <members> are busy, never what they are doing" (decision 14). `GET /api/modules/:id/busy?from=&to=`, on a space mount only, for a member of that space (not a guest): `{ people: [{ key, name, blocks: [{ start, end }] }] }`, blocks merged and rounded as in section 3, between today and 90 days ahead; `[]` with the switch off. A `busy` event on the shared stream to that space's members when someone's blocks there change (a read, a tick, a removal), carrying no data. The reads keep happening only for people seen in 14 days, as today; a sharing person not seen in 14 days shares no blocks until they are seen again, and Profile says so on their busy row ("Paused until you next sign in.").
- **Hosted and single installs:** the same code; each token is looked up in the environment the request reached.

### SDK and pages (experience-design)

- **SDK:** `host.busy.get({ from, to })` and `host.on('busy', fn)`, present only with the approved hook on a space mount.
- **Calendar's next minor version:** the `busy` hook; the toolbar's **Busy** menu, the lanes, **Free for everyone**; the menu entries **Add to my calendar app** and **Share my busy times** in a space. Also in `tools/module-versions.json`.
- **Pages:** the Configure page's **Calendar sharing** section (`public/module-config.html` and `.js`); Manage's pointer line; Profile's Calendars tab (`public/profile.html`, `profile.js`), moving `#section-feed` and `#section-external` with their ids; the owner's view of someone's Calendars tab; the space settings' **Calendar** section; Manage's Users tab keeps its **Turn off** for the personal address.

## Migration

Nothing stored is rewritten, and nothing a person has subscribed to breaks:

- `settings.calendarFeeds` keeps its key and its value. `otherCalendars` is read from it until an owner sets it. `showCalendar` keeps its key; only where it is set moves.
- `user.calendarFeed` and every existing personal address keep working at the same address.
- `user.externalCalendars` is unchanged; the reader's new `transparent` field lives in memory only.
- New keys only: `settings.otherCalendars`, `settings.publishedCalendar`, `settings.publishedCalendarFeed`, `space.publishCalendar`, `user.spaces[<id>].calendarFeed`, `user.spaces[<id>].busy`.
- Element ids `#section-feed`, `#section-external` and their children are kept, moved to the new tab. `#set-calendar-feeds` moves to the Configure page with its id.
- The Calendar's update asks the admin to approve the `busy` hook once; until then everything but busy times works, and the Configure page says what waits.

## Left to build, in order

0. **The two known problems** (bug-fixes), separately and first: Profile's **Other calendars** form not showing after the hook is approved; the feed section's wording about Google's 8 to 24 hours.
1. **Settings and Configure, server** (server-development): `otherCalendars` with its read-time default and the move of Part 2's routes to it; `publishedCalendar`; `sharing` and `sharingReasons` in `GET /api/modules`; `calendarFeeds` and `otherCalendars` on in `templates/travel.json` (decision 7). Cases in `tools/check-feed.mjs` and `tools/check-external-calendars.mjs`.
2. **Configure page** (experience-design): the **Calendar sharing** section, the button no longer disabled, Manage's pointer, **Show in the top bar** moved here and **Show Map** into Maps' Configure, and Manage's Top bar section removed (decision 11).
3. **Space addresses, server** (server-development): storage, the routes, `GET /api/me/calendars`, the feed route's lookup, the removal of tokens, the owner's routes. Cases in `tools/check-feed.mjs`.
4. **Published calendar, server** (server-development): its token, routes, `publishCalendar`, and what the feed reads for it. Cases in `tools/check-feed.mjs`.
5. **Profile's Calendars tab and the space's settings** (experience-design): the tab, the owner's view, the "why" states, the space settings' **Calendar** section. Usable from here for addresses.
6. **Busy times, server** (server-development): `TRANSP` in the reader; the opt-in route; the `busy` hook; `GET /api/modules/:id/busy`; the stream event. A new `tools/check-busy.mjs` in `npm run check`, against a local stand-in serving iCalendar.
7. **Busy times, SDK and Calendar's next minor version** (experience-design): `host.busy`, the opt-in rows on Profile, the lanes, the **Busy** menu, **Free for everyone**, the space menu's two entries.
8. **Documentation** (content-manager): api-modules (the routes, the `busy` hook, `sharing`), api-module-sdk (`host.busy`), architecture-modules and architecture-environments (the addresses, the exception to the other-calendars rule), userguide-calendar, userguide-accounts and userguide-environment-settings, plan-google-calendar's status, the CHANGELOG.

## Verify

- **Steps 1 and 3 to 4**, checked by `tools/check-feed.mjs` on a throwaway server: an environment with `calendarFeeds: true` and no `otherCalendars` still allows other calendars; a space address holds only that space's events, under the space's name; 404 after leaving the space, after removal (and the token gone from `app.json`), after the Calendar is turned off there, after losing `read`, after **Turn off**, **New address**, an owner's **Turn off** and the person's deletion; no address for a guest or for an owner who is not a member; one environment's space address 404 at another (`BASE_DOMAIN`); the published calendar holds every space but one with `publishCalendar: false`, holds no busy block, and is 404 after **Turn off** and with the switch off; only hashes in `app.json`; a single install with nothing set answers as before.
- **Step 6**, checked by `tools/check-busy.mjs` against a stand-in: a "Show as free" event and a default all-day event make no block; a busy all-day event blocks the day in `TZ`; overlapping events from two calendars make one block; 9:05 to 9:50 becomes 9:00 to 10:00; no title, `UID`, calendar name or count in any answer; a guest, a non-member owner and an environment mount get none; unticking, removing the calendar, leaving the space and the switch off each empty the next answer; no busy data on disk; a module without the approved hook refused.
- **Steps 2, 5 and 7**, in headless Chromium: the Configure page's switches and their disabled reasons; each "why" state on the Calendars tab; the address shown once in a space's row; the owner's view showing no address; busy lanes with the stand-in, the **Busy** menu hiding and showing a member and remembering it on reload, more than six members combining, **Free for everyone** shading; `check-module-versions` for Calendar's next minor version.
- **Needs a real Google account, on Thomas's server reachable from the internet:** subscribing to a space address and to the published calendar in Google Calendar (and once in Apple Calendar), with the space's name showing; a real Google secret address's "Show as free" and all-day events giving the right busy blocks; a Google Workspace account where the secret address is turned off; how long Google takes to drop a turned-off address. No LiveKit call is involved anywhere in this plan.

## What is not decided

Nothing Thomas was asked: decisions 7 to 14 answer every question of the draft. Applied from [plan-calendar-destination](plan-calendar-destination.md) decision 23, not asked again: an owner or the admin who is not a member of a space gets no address for it and sees no busy times there.
