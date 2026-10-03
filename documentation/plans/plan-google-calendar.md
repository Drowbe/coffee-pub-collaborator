# Google Calendar Plan

**Audience:** Thomas, who decides which way events travel, what a person's address holds and who may turn it on, and the sessions that build it: server-development (the address, the feed route, the stored token, the reading of other calendars, the checks) and experience-design (the Profile section, Manage's switch, the Calendar module's changes).

**Status:** approved 2026-10-03 for GitHub #42, "Google Calendar sync (one way, per person)", with question 1 answered (c) and questions 2 to 6 as recommended (decisions 1 to 6). Not built. The issue records an earlier decision: "one way, each person connects their own Google account and picks calendars; events show in the Calendar read only", needing "a Google Cloud OAuth client (id and secret) from the host before it can run; a server-side hook, never a secret in a module." That decision is written up in [plan-google-sync](plan-google-sync.md), from before the Names and the secrets work; this plan supersedes it. The request that started this plan asked again which way events should travel, and for the simplest way that is still per person; Thomas kept #42's direction as Part 2 and put the address out first (decision 1).

## What it is today

- **The Calendar module** (`modules/calendar`, 1.19.3) keeps events as `event:<id>`, `{ title, start, end, allDay, desc, remind, repeat, by }`, in the environment's own store and in each space's (`server/module-data.js`). Its scopes are `environment` and `space`; it has no personal events. A repeat is `{ every: 'day' | 'week' | '2weeks' | 'month' | 'year', until }`, kept as one event and expanded in the page (`occurrences()` in `src/calendar-lib.js`), keeping the wall-clock time and, monthly, clamping to the last day of a shorter month.
- **Planner twins.** A dated Planner object has a twin, an ordinary `event` in the same space, kept in step by the server (`server/object-sync.js`, [plan-plan-calendar-sync](plan-plan-calendar-sync.md)). The Planner's kind declares `"dated"` and `"mirror": "out"`; the Calendar's declares `"dated"` and `"mirror": "in"` (`cleanDated()` in `server/modules.js`). So the server can already read any kind's title and dates without naming a module.
- **The Calendar destination** (`/calendar`, [plan-calendar-destination](plan-calendar-destination.md)) shows the environment's own events and those of each space the viewer is a member of where the Calendar is on and readable (decision 23 there).
- **Nothing leaves or enters.** There is no feed out, no reading of another calendar, and no Google code. `plan-google-sync.md` was designed but never started.
- **Secrets.** A single install seals its secrets with `DATA_DIR/secrets.key`, a hosted environment with `host.json`'s `secretsKey` (`encryptSecret()` and `decryptSecret()` in `server/auth.js`, AES-256-GCM; resolved in `server/index.js`, never near a module). Passwords are hashed with scrypt. The standing rule from #36: modules never handle secrets; anything needing a key is a server-side hook. `tools/check-secrets.mjs` checks who sees the personal link and the guest link, and that `app.json` and `ai.json` are private and hold no plain key.
- **A link that is a credential already exists.** The personal link (`linkToken`, `/j/<token>`) is stored in the clear on the user, shown again to the person and an owner, and turned off or replaced from Profile (`POST` and `DELETE /api/users/:key/link`). #64 proposes integration tokens stored hashed, shown once, named, revocable, with a last-used time.
- **Fetching a person's address safely** is solved once: `server/link-preview.js` resolves the host first and refuses private, loopback and link-local addresses, also after a redirect.
- **Profile** (`public/profile.html`, `profile.js`) has the Profile and Spaces tabs; the Profile tab holds the account, two-step sign-in and personal link rows, then Background, images and Call Settings. An owner opening someone else's profile sees their rows with owner actions.
- **Addresses.** `baseUrl(req)` builds an address from the request's host, so a hosted environment's addresses are on its own subdomain (`<slug>.<BASE_DOMAIN>`) and a single install's on its own host. The server's time zone is `TZ`.

## The options

### Which way events travel

| | Collaborator to Google: an address per person | Google to Collaborator: a pasted address | Google to Collaborator: OAuth and the Calendar API |
| --- | --- | --- | --- |
| How | Each person makes a private address on Profile and adds it in Google ("From URL"). Google fetches it. | Each person pastes their Google calendar's "Secret address in iCal format". The server fetches it. | Each person connects their Google account; the server keeps a refresh token and calls the API. |
| What a person gets | Sessions and Planner twins on their phone, beside their own events. | Their own Google events shown in the Calendar, to them only, read only. | The same, plus a list of calendars to tick. |
| Host setup | None. | None. | A Google Cloud OAuth client, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, a registered redirect per address, and Google's verification of the read-only calendar scope for more than 100 people. Unverified, people see a warning, and in testing mode Google expires refresh tokens after seven days. |
| Build | A route that writes iCalendar, a hashed token per person, a Profile row, a Manage switch. No change to the Calendar's drawing. | A safe fetcher (exists), an iCalendar reader with repeats, exceptions and time zones (new code or a new dependency), a refresh timer, a conduit to the Calendar, Calendar drawing other events. | All of the middle column except the reader, plus the OAuth flow, the token store, and the hosted callback problem (one Google client, many subdomains). |
| Works with | Google, Apple Calendar, Outlook, anything that subscribes to a URL. | Google, Outlook, Apple, Proton: any calendar with a private iCal address. | Google only. |
| Limits | Google refreshes a subscribed address on its own schedule, often 8 to 24 hours, and nobody can make it faster. The install must be reachable from the internet. | A Google Workspace account may have its secret address turned off by its administrator. The address is a credential to keep sealed. | The setup above. |

The simplest that is per person is the address out: no OAuth, no host setup, no stored third-party credential, and nothing new for the Calendar to draw. It is not what #42 decided, which is the other way. The simplest way to do what #42 decided is the pasted address, which needs none of the OAuth setup. A push into Google through the API (writing events) needs write scope on each person's account and conflict rules, and is left out.

### What the address holds

- Everything the person can read: the environment's own events and every space they are a member of, where the Calendar is on and readable (the destination's rule). One address, one calendar in Google.
- Spaces the person picks on Profile. More to build and to explain; a space added later needs a decision about whether it joins.
- One address per space. Google then shows each as its own calendar with its own colour and switch, but a person with five spaces adds five addresses, and each is its own secret.

### How a module offers a kind to the feed

- A new flag on the kind, `"feed": true` in `refs.produces[]`, beside `"dated"`. Explicit; the Calendar declares it, and a later module can.
- Inferred: every kind that declares `"dated"` and not `"mirror": "out"`. Nothing new in manifests, but every dated kind written later is published without its author choosing it.

## Decisions

From Thomas, 2026-10-03:

1. **The address out first, then other calendars in as Part 2.** Reason: the smallest useful step first, keeping what #42 decided.
2. **Other calendars connect by a pasted private address,** not OAuth. Reason: no host setup and not tied to Google; OAuth only if pasted addresses prove too hard for people (see "Not chosen: OAuth").
3. **The address holds everything the person can read:** the environment's own events and every space they are a member of where the Calendar is on and readable. Reason: one address, one calendar in Google; per-space addresses can be added later without changing this.
4. **A Manage switch, off by default, decides whether people may make an address.** Reason: an address shares events outside sign-in, and an owner should choose that.
5. **The token is hashed, shown once, and replaced with a new address when lost.** Reason: as #64 proposes for integration tokens, so a copied data folder exposes no address.
6. **A module offers a kind to the feed with `"feed": true` on the kind.** Reason: nothing is published without its module's author choosing it.

## The contract

Written for the decisions above.

### Part 1: the address out (Collaborator to Google)

#### What a person sees

**Profile, Profile tab**, a new section after Call Settings, **Calendar feed** (`#section-feed`), shown only when the environment allows feeds and at least one enabled module offers a kind to the feed that the person may read. A guest has no Profile and no feed.

- Off: the hint "Add your events from <environment name> to Google Calendar, Apple Calendar or Outlook. Anyone with the address can see them, so keep it private." and **Make an address**.
- Just made: the address in a `code` box with **Copy**, and "Copy it now. It will not be shown again." Then the steps for Google in three short lines: "In Google Calendar, choose Other calendars, then From URL. Paste the address. Google updates it about once a day."
- On, afterwards: "On, made <date>. Last read <time ago>." (or "Not read yet."), **New address** ("The old address stops working. Add the new one in Google again.", confirmed) and **Turn off** (confirmed).
- An owner looking at someone else's profile sees "Calendar feed: on, last read <time ago>" and **Turn off**, not the address.

**Manage, environment tab**, a switch **Calendar feeds** in the existing settings, help line "Lets people add this environment's events to their own calendar app with a private address." Off by default. Turning it off makes every address answer 404 at once, without deleting them; turning it on again brings them back.

**In Google** (or any calendar app): one calendar, named after the environment, holding:

- each event's title as the title;
- its start and end as stored (all day as dates; timed as instants), repeats as a rule;
- a description of the space's name (or the environment's), the event's description, and a link back to it (`/calendar#ref=<ref>` when the destination is shown, else the module's page);
- nothing else: no reminders (Google ignores them in subscribed calendars), no attendees, no `by`.

#### Server (server-development)

- **The setting:** `settings.calendarFeeds`, `true` or `false`, default `false`, in `GET` and `PATCH /api/settings` for owners and the admin; added to `SETTINGS` in `server/templates.js` as a boolean.
- **The stored token:** on the user, `calendarFeed: { hash, made, readAt }`. `hash` is the SHA-256 of a 32-byte random token (base64url), never the token. `readAt` is written at most once an hour. Removing the person removes it. A password change, a new personal link or a second factor does not touch it (it signs nobody in).
- **`GET /api/me/feed`**, signed in, not a guest: `{ allowed, on, made, readAt }`. `allowed` is the setting and whether any kind is offered to this person.
- **`POST /api/me/feed`**: 403 when not allowed; else makes a new token, replacing any old one, and answers `{ url, made }` once, `url` being `<baseUrl>/feed/<token>.ics`.
- **`DELETE /api/me/feed`**: removes it; 204.
- **`DELETE /api/users/:key/feed`**: an owner or the admin; 204. `GET /api/users/:key` gains `calendarFeed: { on, made, readAt }` for them, never the hash.
- **`GET /feed/:token.ics`**, no session: 404 (plain, no page) when the token is unknown, the setting is off, or the person is gone; 429 over 30 requests a minute per token; else `200`, `Content-Type: text/calendar; charset=utf-8`, an `ETag` from the data's versions, and `304` on a matching `If-None-Match`. Never a redirect to a sign-in page.
- **What it reads**, as the person whose token it is, with their current role and spaces each time (so leaving a space or losing a permission empties it on the next read): every enabled module with a kind marked `"feed": true` and `"dated"`, in the environment's store when the person holds the module's `read` permission there, and in each space the person is a member of where the module is on and readable (the `spaces-data` rule). Kinds without the flag (the Planner's `plan`) are not read, so a Planner object appears once, as its twin. Events whose end, or whose repeat's `until`, is more than 90 days past are left out; at most 2000 events.
- **The manifest:** `"feed": true` on a kind in `refs.produces[]`, accepted only with `"dated"` (`module.json: refs "<kind>" feed needs "dated"`). `"dated"` gains an optional `"repeat"` naming the field that holds `{ every, until }` in the Calendar's shape; the description comes from the kind's `summary.subtitle`.
- **Writing iCalendar** (`server/ics.js`, no module named): one `VCALENDAR` with `X-WR-CALNAME` the environment's name and `X-WR-TIMEZONE` the server's `TZ`; one `VEVENT` per event with `UID` `<kind>-<id>-<space id or "environment">@<host>`, `DTSTAMP` and `LAST-MODIFIED` from the stored time, `SUMMARY`, `DESCRIPTION`, `URL`. All day: `DTSTART;VALUE=DATE`, and `DTEND` the day after the last day. Timed: `DTSTART` and `DTEND` in UTC; with no end, no `DTEND`. A repeat: `RRULE` with `FREQ` `DAILY`, `WEEKLY`, `WEEKLY;INTERVAL=2`, `MONTHLY` or `YEARLY` and `UNTIL`; a timed repeating event is written with `TZID` set to `TZ` and a `VTIMEZONE`, so its wall-clock time holds across daylight saving; a monthly repeat on the 29th to 31st is written `BYMONTHDAY=28,...,<day>;BYSETPOS=-1` to match the Calendar's clamping, and a yearly one on February 29 likewise. Lines folded at 75 octets, `CRLF` endings, text escaped.
- **Hosted and single installs:** the same code. A token belongs to one person in one environment; it is looked up in the environment the request reached, so one environment's token is 404 at another. A person in two environments makes two addresses. A single install with the setting off behaves exactly as before.

#### The modules (experience-design)

- **Calendar 1.20.0:** `"feed": true` and `"repeat": "repeat"` on its `event` kind. Nothing it draws changes. Also in `tools/module-versions.json`.

#### Pages (experience-design)

- The Profile section and the owner's row above, in `public/profile.html` and `profile.js`, with the existing row styles of the personal link (`#link-row`).
- Manage's switch in `public/admin.html` and its script, beside the environment's other options.

### Part 2: other calendars in (Google to Collaborator), after Part 1

What #42 decided, by a pasted address rather than OAuth.

#### What a person sees

- **Profile, Profile tab**, a section **Other calendars** (`#section-external`) under Calendar feed, shown when an enabled module asks for them (below) and the environment allows feeds. **Add a calendar**: a name ("Work") and the address, with the hint "In Google Calendar's settings for that calendar, copy the Secret address in iCal format." Up to five. Each row shows its name, the address's host only, "Read <time ago>" or the last error in plain words ("Google said the address is wrong."), **Refresh** and **Remove**. The address is never shown again in full.
- **The Calendar**, in its destination and its own pages: the person's other calendars' events drawn among the others, read only, marked with the calendar's name in a muted style, each with its own entry in the filter (`#filters` and the destination's filter), remembered like the rest. Opening one shows its title, time and calendar name, and "From your <name> calendar. Only you see this." Never seen by anyone else, never in a space's store, never in the address out.

#### Server (server-development)

- **Stored** on the user: `externalCalendars: [{ id, name, url, readAt, error }]`, `url` sealed with `encryptSecret()` and the environment's secrets key, so it moves with the other secrets when an install becomes hosted (`secretsToHostKey()` learns this field). `tools/check-secrets.mjs` gains: no plain address in `app.json`, and none in any answer.
- **Routes:** `GET /api/me/external-calendars` (`[{ id, name, host, readAt, error }]`), `POST` (name and address; `webcal:` becomes `https:`; `http:` refused; 400 over five), `POST /:id/refresh`, `DELETE /:id`.
- **Reading:** on adding, on Refresh (at most once a minute), and every 30 minutes for anyone signed in during the last 14 days. Through the guard in `server/link-preview.js` (private addresses refused, also after a redirect), 15 seconds, 5 MB. An iCalendar reader for `VEVENT` with `DTSTART`, `DTEND` or `DURATION`, `RRULE`, `EXDATE`, `RECURRENCE-ID` and `TZID`, expanded from 30 days back to 180 days ahead, at most 2000 events per calendar. Kept in memory only and read again after a restart; nothing written to disk but the sealed address.
- **The conduit, naming no provider:** a hook in the manifest, `"hooks": { "external": true }`, approved by the admin as `schedule` and `notify` are. `GET /api/modules/:id/external-events?from=&to=` answers the signed-in person's own: `{ calendars: [{ id, name }], events: [{ calendar, uid, title, start, end, allDay }] }`; 403 without the approved hook; guests get none. SDK: `host.external.events({ from, to })` and an `external` event on the shared stream when a refresh changes them.

#### The modules (experience-design)

- **Calendar 1.21.0:** the hook, and drawing other calendars' events as above.

### Not chosen: OAuth

Kept here so the cost is known. Environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, both required, the feature off without them. On a hosted install Google needs every redirect address registered exactly, so the callback would live once on the host (`https://<BASE_DOMAIN>/oauth/google/callback`) with a signed state naming the environment, and a single install registers its own. Refresh tokens sealed like the other secrets. Google's verification of the read-only calendar scope before more than 100 people, and seven-day tokens until then. It would replace only how Part 2 connects; the conduit and the Calendar's drawing would be the same.

## Left to build, in order

1. **The address out, server** (server-development): `settings.calendarFeeds` and its template field; `"feed"` and `dated.repeat` in `cleanManifest`; the stored token and the `/api/me/feed` and `/api/users/:key/feed` routes; `GET /feed/:token.ics` with `server/ics.js`. A new check, `tools/check-feed.mjs`, in `npm run check`, and cases in `tools/check-secrets.mjs`.
2. **Calendar 1.20.0** (experience-design): the two manifest fields and the version.
3. **The address out, pages** (experience-design): the Profile section, the owner's row, Manage's switch.
4. **Documentation** (content-manager): api-modules (`feed`, `dated.repeat`, the routes), architecture-modules, the user guides (Profile, Manage, how to add the address in Google and Apple), the CHANGELOG. Part 1 is usable from here.
5. **Other calendars, server** (server-development): the stored addresses, the routes, the reader, the refresh, the hook, `GET /api/modules/:id/external-events`, the stream event; the move of sealed addresses in `secretsToHostKey()`. Cases in a new `tools/check-external-calendars.mjs` against a local stand-in serving iCalendar.
6. **SDK and Calendar 1.21.0** (experience-design): `host.external.events`, the Profile section, drawing and filtering other calendars' events.
7. **Documentation** (content-manager) for Part 2.

## Verify

- **Step 1**, checked by `tools/check-feed.mjs` on a throwaway single-environment server: 404 with the setting off, for an unknown token, after Turn off, after New address (the old one), after an owner turns it off, and after the person is deleted; no token in `app.json`, only its hash; a member of space A and not B sees A's events and the environment's, not B's; nothing from a space where the Calendar is off or the person lacks `read`; a guest cannot make one; a Planner object appears once, as its twin; an all-day event of three days has `DTEND` the day after; a timed event in UTC; each repeat's `RRULE`, including monthly on the 31st and a timed weekly repeat with `TZID` across a daylight saving change; line folding, escaping and `CRLF`; `304` on a matching `ETag`; `429` past the limit; a manifest with `"feed"` but no `"dated"` refused. A second case with `BASE_DOMAIN` and two environments: one environment's token is 404 at the other.
- **Steps 2 and 3**: `check-module-versions`; in headless Chromium, the Profile section's states, the address shown once, Copy, New address and Turn off with their confirmations, the owner's row, Manage's switch hiding the section.
- **Not checkable here**: Google actually subscribing to the address, which needs the install reachable from the internet, and how soon Google shows a change (hours, by Google's schedule). To be checked by Thomas on the real server with a Google account, and once with Apple Calendar. No LiveKit call is involved anywhere in this plan.
- **Step 5**, checked by a tool against a stand-in: a Google-shaped file with a weekly repeat, an `EXDATE`, a moved occurrence (`RECURRENCE-ID`) and a `TZID`; a private address refused, also behind a redirect; the 5 MB and 15 second limits; the address sealed and never answered; one person's events never in another's answer; a module without the approved hook refused.
- **Step 6**: headless Chromium with the stand-in. **Not checkable here**: a real Google secret address, and a Workspace account where it is turned off.


## What a leaked address exposes

For the record: the titles, times, repeats, descriptions and space names of every event the person can read in that environment, read only, until the address is turned off or replaced, or the person loses access. It does not sign anyone in, list people, or reach any other module. Profile's "Last read" is the only sign of use. Turning it off, a new address, the Manage switch, an owner's Turn off and deleting the person each stop it at once on the server; Google keeps what it last fetched until its next refresh.
