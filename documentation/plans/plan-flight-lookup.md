# Flight Lookup Plan

**Audience:** Thomas decides; server-development builds the airport list, the saved schedule and the route,
experience-design builds the SDK call and the Planner's form, quality-assurance checks it, content-manager documents it.

**Status:** Approved by Thomas, 2026-10-04, after two rounds of answers (decisions below). Built 2026-10-04, steps 1 to 8, and documented (step 9); see "Built" below. From GitHub
issue #188. Thomas,
2026-10-04: "Would it be possible to use fetch or something to pull flight info? Like enter a flight number and get flight
details (with a choose date) if possible?" The issue adds: fill in "airline, airports, scheduled times, terminal and gate
where known"; any key in an environment variable and the lookup made by the server, so a key never reaches a browser; and
with no key set, "the form looks and behaves as it does today".

The first draft (same day) recommended AeroDataBox. Thomas's answers, 2026-10-04: "WE are either using a free API or
writing it ourselves", and on a monthly limit, "No, since answer one said free for commercial use or we write our own."
That rules out AeroDataBox (its free plan is non-commercial) and every paid plan. The second draft looked for a free
source that allows commercial use, found none that can answer a future flight, and proposed getting the data ourselves.
Thomas chose that approach the same day, with one schedule for the whole host.

## What it is today

- **The Planner's flight form** is the editor in `modules/travel/src/travel.html` (`tpl-editor2`), driven by
  `openEditor` and `applyType` in `modules/travel/src/travel.js`. For a flight it shows: the departure day (`f-date`, a
  menu of the plan's days, "Not on a day yet", or a day "outside the plan" through `setPlaceMenu`), the departure time
  (`f-time`), the flight time (`f-hours`, `f-minutes`), **Arrival on the ticket** (`f-arrival`, a `datetime-local`),
  the airline (`f-operator`), the flight number (`f-number`), the two airport codes (`f-fromCode`, `f-toCode`) and
  names (`f-from`, `f-to`), the departure terminal and gate (`f-terminal`, `f-gate`), seat, class, reference, cost, who
  paid, notes, and a **Round trip** section with the same fields for the return (`f-back-*`). Everything is typed by
  hand.
- **Arrival on the ticket** is stored as `arrives`, the local day and time where the flight lands
  ("2026-11-14T15:25"), beside the flight time, so a flight across time zones shows both right
  ([plan-object-handoff](plan-object-handoff.md), decision 11; `ticketWhen`, `arrivalFits` and `datedArrives` in
  `modules/travel/src/travel-lib.js`). It may be at most 7 days after the departure and at most a day before (across
  the date line). Nothing in Collaborator knows an airport's time zone, so the form cannot work out the arrival from the
  departure and the flight time across zones.
- **The objects format** already describes a flight: `DETAILS.flight` in `server/object-format.js` is `airline`,
  `number`, `from` and `to` (points, `{ code, name }`), `departs` and `arrives` (a `when`, local, no zone), `minutes`,
  `terminal`, `gate`, `seat`, `class`, `reference`. `objectFields` in `modules/travel/src/travel-lib-object.js` turns
  such an object into the Planner's fields.
- **A pasted confirmation already works.** Pasting a booking confirmation into Chat and asking `/ai`, or bringing in an
  AI answer with **Bring in**, gives a flight object that the Planner keeps as a flight with its fields filled
  (`server/ai.js`; the Planner's user guide, "An object kept from an AI answer"). It needs the AI service set up and
  the confirmation in hand; it does not look anything up.
- **The server already builds data from use.** The place search (`server/geocode.js`) answers from the places the server
  has already seen, asks the outside service only when it has too few, and keeps what comes back:
  `DATA_DIR/modules/<module id>/geocode.json`, holding facts about places and "never what was searched for, who
  searched". A module asks for it by declaring `geocoder` in `module.json`; `host.geocode.search` becomes
  `GET /api/modules/:id/geocode`, counted against the module's `search` limit (`server/module-limits.js`). The saved
  schedule below follows the same pattern.
- **Nothing looks up flights.** No plan or TODO entry covers it.

## The free sources

Read on 2026-10-04 unless marked. The question each must answer: "WN 2483 on 2026-11-14: which airports, and what local
times?", for a date weeks or months ahead, under terms that allow a commercial, hosted Collaborator.

| Source | Future flight by number and date? | Commercial use on the free terms? |
|---|---|---|
| OpenSky Network | No: live positions and past flights only | No: needs a written license |
| adsb.lol | No: live positions only, no times | Yes: ODbL 1.0, with attribution |
| ADSB.fi | No: live positions only | No: "personal, non-commercial use only" |
| airplanes.live | No: live positions only (by its nature) | Not read: the site refused the request |
| AirLabs | No: schedules reach "10 hours ahead at most" | Not readable: the free plan's terms are drawn by script |
| Aviationstack | No: the free plan has no future flights | No: Free is "Personal use", "Non-Commercial Use" |
| FlightAware AeroAPI | Only `/schedules`, in UTC with no names, on the $5 free credit | No: Personal is "for personal or academic purposes only" |
| AeroDataBox (first draft) | Yes, up to a year ahead | No: free plan "Commercial use: Not allowed" |
| OurAirports data | No flights; airport names and codes | Yes: public domain |
| `mwgg/Airports` | No flights; airport names, codes and time zones | Yes: MIT license |
| VRS standing data | Routes by call sign, airports only, no times or dates | Yes: CC0 |
| US BTS on-time data | Past flights only (US carriers), with scheduled local times | Yes: a US government dataset |

**No free source whose terms allow commercial use can say what WN 2483 does on a future date.** The ones that can (AeroDataBox,
FlightAware's `/schedules`, Aviationstack's paid future flights, and the industry sources OAG and Cirium) are paid or
non-commercial on their free plans. Live sources (ADS-B) see a flight only while it is in the air. Open data covers
airports well, routes loosely, and past US flights; nothing open publishes airlines' future schedules.

The detail:

- **OpenSky Network.** The terms of use: "Any use by a for-profit or commercial entity ... requires a written license",
  and "Use of the REST API in any operational capacity, including integration into a live product, service, or automated
  system ... requires a previous written agreement, even for non-profit or governmental entities". The REST API has live
  state vectors and flights by time interval, aircraft or airport, where "arrivals are updated by a batch process at
  night, i.e., only arrivals from the previous day or earlier are available". Nothing ahead of today. Read:
  opensky-network.org/about/terms-of-use, openskynetwork.github.io/opensky-api/rest.html.
- **adsb.lol.** "The API is available to everyone", "API License: ODbL 1.0" (commercial use allowed, with attribution,
  and a database built from it must be shared under the same license). Its OpenAPI file has aircraft by call sign, hex,
  registration, type, squawk and area, all live; `POST /api/0/routeset` gives a call sign's airports from the VRS
  standing data. No times, no gate, no terminal. Read: adsb.lol/docs/open-data/api, api.adsb.lol/api/openapi.json.
- **ADSB.fi.** "adsb.fi open data is for personal, non-commercial use only", 1 request a second, live aircraft by hex,
  call sign, registration or area. Read: github.com/adsbfi/opendata (README).
- **airplanes.live.** airplanes.live/api-guide and its terms answered with a "Just a moment..." check that a server cannot
  pass; not read. Its data is ADS-B, so live only whatever its terms say.
- **AirLabs.** The Flight API returns "only one closest (live, scheduled or landed) flight"; the Schedules API "returns
  results up to 10 hours ahead at most"; the Routes database has weekly patterns, not dated flights. The pricing and the
  free plan's limits are drawn by script and could not be read; the terms of service (airlabs.co/terms-of-service) speak
  of a "Free Trial" and say nothing about commercial use on a free plan. It cannot answer the question in any case.
- **Aviationstack.** Pricing: "Free, Personal use, $0 ... 100 Requests, No Support, Non-Commercial Use", and "Basic level,
  commercial use" from $49.99 a month; "Future Flight" appears only on paid plans. Read: aviationstack.com/pricing.
- **FlightAware AeroAPI.** Personal tier: "Storage and distribution of derivative works for personal or academic
  purposes only", "up to $5 free per month". Standard (business use) has a $100 monthly minimum. Read:
  flightaware.com/commercial/aeroapi.
- **AeroDataBox, OAG, Cirium.** As in the first draft: AeroDataBox's free plan is "Commercial use: Not allowed"; OAG and
  Cirium sell by quote. Out under Thomas's answer.
- **OurAirports.** "All data is released to the Public Domain". `airports.csv` has the name, municipality, country, IATA
  and ICAO codes, position and `scheduled_service`, but **no time zone column** (checked against the file's header). Read:
  ourairports.com/data, ourairports.com/about.html, davidmegginson.github.io/ourairports-data/airports.csv.
- **`mwgg/Airports`** (github.com/mwgg/Airports). About 29,000 airports keyed by ICAO code, 7,918 with an IATA code,
  each with the name, city, state, country, position and an Olson time zone (`KMDW`: "Chicago Midway International
  Airport", "Chicago", `America/Chicago`). MIT license. One JSON file of about 9 MB, much less once cut to airports with
  an IATA code.
- **VRS standing data** (github.com/vradarserver/standing-data, also at vrs-standing-data.adsb.lol). CC0. `routes.csv`
  has 620,701 call signs, each with its airports in order (`SWA10`: `KCRP-KHOU-KDAL-KMCI`), built from what Virtual Radar
  Server users report; `airlines.csv` maps an airline's ICAO and IATA codes (`SWA`, `WN`, Southwest Airlines). No times,
  no dates, and it can be out of date: it lists `SWA2483` as Phoenix to Salt Lake City.
- **US BTS on-time data** (transtats.bts.gov, "Reporting Carrier On-Time Performance (1987-present)"). Each past flight
  of the large US airlines with `Flight_Number_Reporting_Airline`, `Origin`, `Dest`, `CRSDepTime` and `CRSArrTime`
  ("local time: hhmm"). "Latest Available Data: July 2026": past only, about two months behind, US carriers only.
- **An open airline schedule** of the kind buses and trains publish (GTFS): I found none. Airlines sell their schedules
  through OAG and Cirium.

## Getting the data ourselves

**(a) Read an airline's or airport's flight-status page.** Southwest's terms forbid it in so many words: no "deep-link,
page-scrape, robot, crawl, index, spider ... or other automatic device ... to use, access, copy, acquire information ...
or monitor any portion of the Service", and "You may not violate the restrictions in any robot exclusion header". Its
robots.txt disallows `/v2/` for every agent. Its flight-status page (southwest.com/air/flight-status) is an empty shell
filled by script, so reading it means calling its private interfaces, which change without notice. Each airline is a
separate scraper to keep working, most airlines' terms read like Southwest's, and a hosted Collaborator would be breaking
them on its customers' behalf. Read: southwest.com/robots.txt, southwest.com/about-southwest/terms-and-conditions. Not
recommended.

**(b) Build a schedule from what people save.** When someone saves a flight in the Planner with a number, both airports
and a departure time, the server keeps the schedule part: the number, the airline, the two airports, the departure and
arrival clock times, the flight time and the terminal, with the days it was seen. A later lookup of the same number
suggests it, for any day. Free, no third party, no terms, no upkeep beyond the code, and it follows the place search's
pattern. The limits, plainly: it knows only flights someone on this server has already saved, so the first person to
take a flight gets nothing; flight numbers change with the seasons and some carry several legs (Southwest's numbers often
stop on the way); and what it suggests is only as right as what someone typed. Its best case is a group whose members
take the same flight (the first enters it, the others look it up) and routes people fly again and again. On a hosted
server with many environments it would know more, and Thomas chose to share it between them (decision 7).

**(c) Read a pasted confirmation with the AI service.** Already works, through Chat and **Bring in** (above). It is the
answer for "fill the form from my booking" whenever the AI service is set up. Nothing to build; the form or the user
guide points to it (decision 9).

**(d) Live ADS-B data for flights within about a day.** adsb.lol allows commercial use (ODbL), but ADS-B carries a call
sign, a position, an altitude and a speed: **no gate, no terminal, no scheduled times**. It can say "airborne now" and,
through the VRS routes, which airports a call sign usually flies. That fills nothing the form needs that (b) or the
person does not already have, and adds a live outside dependency with attribution and share-alike duties. Not
recommended for this plan; it could serve "where is the plane now" later.

**(e) Combine them: an airport list with time zones, plus (b).** The airport list is useful on its own from the first day:
a code gives the airport's name and time zone, so a lookup (or a typed code) fills the name, and the arrival on the
ticket can be worked out from the departure and the flight time across zones, or the flight time from the two local
times. (b) then fills a whole flight once anyone on the server has saved it. The VRS routes and the BTS data could seed
(b) later; neither is needed to start, and Thomas chose neither for now (decision 9).

The recommendation, which Thomas took (decision 6), is **(e): the airport list and the saved schedule**, with (c)
kept as the way to fill a flight from a booking, and (a) and (d) left out. It is free, has no third party, no key and no terms to watch, and the airport list pays off even
when the schedule knows nothing yet. It does not do what the issue first asked, a first-ever lookup of a future flight
by number; nothing free and commercial can. If that becomes worth paying for, a provider can be added behind the same
function (below) without changing the route or the page.

## Decisions

Thomas, 2026-10-04, first round:

1. **Only a free source that allows commercial use, or our own.** "WE are either using a free API or writing it
   ourselves." No paid plan, and no free plan that forbids commercial use (so not AeroDataBox).
2. **No monthly limit.** "No, since answer one said free for commercial use or we write our own." There is no paid
   service to protect, so nothing counts calls by the month.
3. **Placement: its own row at the top** of the flight form, with its own number and day, since the departure day menu
   has "Not on a day yet" and a lookup always needs a date.
4. **Filling: schedule fields only.** The schedule's fields are replaced; the title only when empty; seat, class,
   reference, cost, people and notes never.
5. **Every other question from the first draft takes the recommendation** given there, as carried into the contract
   below: the return leg gets the row too; the stored number is the cleaned form ("WN 2483"); anyone who may edit the
   Planner may look up, not guests; following a flight (gate changes, delays) is left out. The recommendations about
   AeroDataBox (credit line, its caching rules, the aircraft, through flights as the provider reports them) fall away
   with it.

Thomas, 2026-10-04, second round:

6. **The approach: (e)**, the airport list and the schedule learned from saved flights, with (c) as the way to fill a
   flight from a booking. (a) and (d) are left out.
7. **One schedule for the whole host**, not one for each environment, so a busy hosted server learns faster.
8. **On by default**, with a Planner setting, **Suggest flights from earlier trips**, to turn it off.
9. **The rest take the recommendation:** a typed airport code fills the airport's name; no seeding from the VRS routes
   or the BTS data for now; a line in the Planner's user guide pointing to **Bring in** for filling a flight from a
   booking, nothing in the form; no paid or other outside service for now.

## Choices made in writing this

The coordinator's recommendation or mine, written into the contract; Thomas may overrule any of them.

- **An environment with the setting off neither suggests nor contributes.** Its flights are not added to the shared
  schedule, so an environment can keep its travel entirely to itself.
- **The terminal is kept.** It belongs to the flight, not to the person, and changes rarely; the gate changes daily and
  is never kept.
- **The airline's name is kept** beside the number, as typed in the form ("Southwest Airlines"). It is a fact about the
  flight, and without it a lookup could fill only the number. If Thomas would rather keep only the number, a bundled
  list of airline codes and names (the VRS `airlines.csv`, CC0) can fill the name instead.
- **The admin can clear the whole schedule or one number**, from the host console on a hosted server and from the
  admin page on a single-environment install. An environment's owner cannot clear the shared schedule.

## The contract

### One function for every source

`server/flight-lookup.js` exports `findFlights({ number, date, schedule, airports })`, which answers a list of entries
(below). Today it asks only the saved schedule. An outside service, should one ever be added, goes inside this function,
switched on by an environment variable holding its key (`FLIGHT_LOOKUP_KEY`); with no key set nothing outside is asked
and nothing changes. No variable is added by this plan.

### The airport list

- `server/airports.json`, built from `mwgg/Airports` by `tools/build-airports.mjs` and committed: every airport with an
  IATA code, keyed by it, each `{ icao, name, city, country, tz }`. The MIT notice is kept beside it
  (`server/airports-LICENSE`). Rebuilding is running the tool and committing the result, when an airport opens or a code
  changes; time zone names change rarely.
- `server/airports.js` reads it once and offers `airport(code)` (by IATA code, upper case),
  `localToUtc(when, tz)` and `minutesBetween(departs, fromTz, arrives, toTz)`, done with `Intl.DateTimeFormat` and no
  added package.
- A display name for a point: the airport's `name`, shortened by dropping a trailing "International Airport" or
  "Airport" ("Chicago Midway"), so it reads like the names people type today.

### The saved schedule

**Where it lives.** One file for the whole server, `flight-schedule.json`, in the root `DATA_DIR`:

- On a hosted install (`BASE_DOMAIN` set), the root `DATA_DIR` is the host's, beside `host.json`, and never inside an
  environment's folder (`DATA_DIR/environments/<slug>/`). It is not part of an environment's data, so it is not in an
  environment's export or backup, and deleting an environment leaves it as it is (nothing in it names an environment).
- On a single-environment install (no `BASE_DOMAIN`), the root `DATA_DIR` is the environment's, so the file sits there,
  beside `ai.json`.

Kept in memory, written a moment after a change.

**What it holds, and nothing else.** Keyed by the cleaned flight number (`WN2483`). Each number holds up to 5 schedules,
each:

| Field | Meaning |
|---|---|
| `airline` | The airline's name as saved with the flight ("Southwest Airlines"), or absent. |
| `from`, `to` | The two airports' IATA codes (`MDW`, `SJC`). Their names come from the airport list when answering. |
| `departs`, `arrives` | Local clock times at each airport (`"12:50"`, `"15:25"`). |
| `days` | How many days after it leaves it lands (`0`, `1`, `-1`). |
| `minutes` | The flight time, used when an airport's time zone is unknown. |
| `terminal` | The departure terminal, when one was saved. |
| `weekdays` | The days of the week it was seen leaving (`[1, 5]`, Monday is 1). |
| `lastSeen` | The latest departure date it was saved for (`"2026-11-14"`). |

Two saves are the same schedule when the airports and both clock times match; then `weekdays` gains the day, `lastSeen`
moves forward, and the terminal and airline take the newer value. Otherwise a new schedule is kept, and past 5 the one
seen least recently goes. At most 20,000 numbers, the one seen least recently dropped first.

**What it never holds:** who saved it, which environment or space it came from, the person's or anyone's name, the
seat, class, booking reference, cost, who paid, the people on it, the notes, the title or the gate. The server reads only
the fields above out of what it is sent and drops the rest before anything is written.

**Taught by** `POST /api/modules/:id/flight-lookup/remember` with `{ object }`, an object in the objects format. The
Planner calls it after a flight is saved (both legs of a round trip). The server cleans the object with `cleanObject` and
keeps it only when:

- the environment's Planner has **Suggest flights from earlier trips** on (off: `204`, nothing kept);
- the number cleans;
- both airport codes are in the airport list;
- the departure has a day and a time;
- it has an arrival or a flight time (with both time zones known, a missing arrival is worked out from the flight time).

Anything else answers `204` and keeps nothing; a person never sees a failure from it. Counted against the module's
`write` limit. Guests cannot call it (the module's `write` access, as below).

**Cleared by the admin.**

- Hosted install: `GET /api/host/flight-schedule` (`requireHostAdmin`) answers `{ numbers, schedules }`, the counts only.
  `DELETE /api/host/flight-schedule` empties it; `DELETE /api/host/flight-schedule?number=WN2483` removes one number.
  On the host console, a **Flight schedule** section: "This server has learned N flights from saved trips." with
  **Forget a flight** (a number input) and **Clear all**, which asks first ("Clear all learned flights? Lookups will find
  nothing until people save flights again.").
- Single-environment install: the same three routes at `/api/flight-schedule` (`requireOwner`), and the same section on
  the admin page. On a hosted install these routes answer 404, so an environment's owner cannot clear what other
  environments taught.

### The module's declaration

A module asks for the lookup in `module.json` with `"lookups": ["flight"]`. The Planner (`modules/travel/module.json`)
gains it, the setting below and a version bump. The routes answer 404 for a module without it.

### The server: `GET /api/modules/:id/flight-lookup`

Scoped like the place search (the module's usual `scope` and `space` query). Needs the module's `write` access (in the
Planner, `edit`: members and moderators by default, not guests). Counted against the module's `search` limit (40 a minute
for each person); over it, `429` with the existing `limitMessage()`.

- **No `number` and no `code`:** `200 { available }`, `false` when the environment's Planner has the setting off. How the
  page learns to offer the row.
- **`number` and `date`:**
  - `number` is cleaned to upper case without spaces and must be an airline code (2 or 3 letters or digits) and 1 to 4
    digits, with an optional letter (`WN2483`, `BA 117`, `U2 8123`); else `400 { error: "bad number" }`.
  - `date` must be a real `YYYY-MM-DD`; else `400 { error: "bad date" }`.
  - With the setting off: `200 { flights: [] }`, the schedule not read.
  - Answer: `200 { flights: [...] }`, empty when nothing is known (not found is an answer, not an error).
- **`code`:** `GET ...?code=MDW` answers `200 { airport: { code, name, city, tz } }` or `404`. Uses the airport list only,
  so it works with the setting off.

The schedules for the number are ranked: one whose `weekdays` include the asked date's day of the week first, then the
most recently seen. Each entry of `flights`:

```json
{
  "object": {
    "kind": "flight",
    "title": "Flight to San Jose",
    "date": "2026-11-14",
    "details": {
      "airline": "Southwest Airlines",
      "number": "WN 2483",
      "from": { "code": "MDW", "name": "Chicago Midway" },
      "to": { "code": "SJC", "name": "San Jose" },
      "departs": "2026-11-14T12:50",
      "arrives": "2026-11-14T15:25",
      "minutes": 275,
      "terminal": "1"
    }
  },
  "line": "MDW 12:50 to SJC 15:25",
  "sameWeekday": true,
  "lastSeen": "2026-10"
}
```

- `object` passes through `cleanObject`, so the Planner fills its form with the `objectFields` it already has. `departs`
  and `arrives` put the saved clock times on the asked date (and `days` after it). `minutes` is worked out again for
  that date from the two time zones, so a change of clocks between the saved day and the asked day is right; with a time
  zone missing it is the saved `minutes`. Airport names come from the airport list, else the code. `title` is "Flight to"
  and the arrival airport's city. No gate.
- `lastSeen` in the answer is the month only (`YYYY-MM`), so no one learns the day someone in another environment flies.

### The SDK

- `host.lookup.flight(number, date)` answers `{ flights }`, or throws with the route's `error` (`bad number`,
  `bad date`).
- `host.lookup.remember('flight', object)` sends a saved flight; it never throws.
- `host.lookup.airport(code)` answers `{ code, name, city, tz }` or `null`.
- `host.lookup.available('flight')` answers `true` or `false`.
- `public/module-host.js` gains the handlers, built like `'geocode.search'`.

### The Planner

- A setting, **Suggest flights from earlier trips**, on by default, for whoever manages the Planner's settings (like
  `linkPreviews`). Its help line: "Fill a flight from the same flight number saved before on this server. Flights saved
  here also help others; turn this off to keep them out." Off: no row, nothing remembered, the form exactly as today.
- On a flight's **Save**, with the setting on, the Planner calls `host.lookup.remember` with the saved object.

### The flight form

With the lookup available, the flight form (and only the flight type) has a row above the Journey group:

- **Look up a flight**: a "Flight number" input (placeholder "WN 2483"), a "Day it leaves" date input, and **Find**.
  The number starts as the form's flight number; the day as the form's departure day when it is one, else empty. Enter
  in either input finds.
- **One schedule found:** the form is filled at once.
- **Several:** a short list under the row, "Which one?", each a button with its `line` and "flies on this day of the
  week" or "last seen Oct 2026"; choosing one fills the form and closes the list.
- **Filling** (decision 4) sets the departure day (`setPlaceMenu`, so a day outside the plan shows as "outside the
  plan"), the departure time, the flight time, **Arrival on the ticket**, the airline, the flight number, both airport
  codes and names, and the terminal when known, replacing what was there. The gate is left as it is. The title only when
  it is empty. Nothing is saved until **Save**.
- After filling, a hint under the row: "Filled in from a flight saved here before. Check it against your booking."
- **A typed airport code** (`f-fromCode`, `f-toCode` and the return's) fills its name field when the name is empty and
  the code is in the airport list, on leaving the field. It works with the setting off.
- In the **Round trip** section, the same row for the return, filling the `f-back-*` fields, its day starting from the
  return day.

The words a person reads:

| When | Words |
|---|---|
| A number that cannot be one | "Enter the airline code and number, like WN 2483." |
| No day | "Choose the day it leaves." |
| Nothing known | "No flight WN 2483 saved here yet. Fill it in, and it will be suggested next time." |
| Too many at once | the existing `limitMessage()`, with the template's word for module |
| The server failed | "Flight lookup isn't working right now. Fill it in by hand." |

## Built

**Built 2026-10-04,** steps 1 to 8, as the contract above, with the Planner at 0.13.2 (was 0.12.0; 0.13.1 was the build, 0.13.2 the fixes from quality-assurance's notes, below). Documented (step 9) in [api-module-sdk](../api/api-module-sdk.md) ("Flight lookup"), [api-modules](../api/api-modules.md) (the manifest's `lookups`, "Flight lookup"), [architecture-modules](../architecture/architecture-modules.md) ("Flight lookup"), [architecture-environments](../architecture/architecture-environments.md) (the host's file, the migration, the host route), [userguide-planner](../userguides/userguide-planner.md) ("Look up a flight", the setting, and the line pointing to **Bring in research** for a flight nobody has saved yet), [userguide-modules](../userguides/userguide-modules.md) ("The flight schedule", for the admin page and the host console), [userguide-getting-started](../userguides/userguide-getting-started.md) (not in an environment's backup), the README's credits and the CHANGELOG.

- **Where the build differs from the contract,** for the record:
  - `findFlights({ number, date, schedule })` takes no `airports`; it reads `server/airports.js` itself.
  - `airport(code)` and `GET .../flight-lookup?code=` take an ICAO code (`KMDW`) as well as an IATA code. The Planner only sends three-letter codes.
  - The `code` lookup counts against the module's `search` limit, like a flight lookup. The call with no number, date or code (whether the lookup is offered) counts against nothing.
  - `POST .../remember` answers 429 over the module's `write` limit, and the module's usual access refusals, besides 204.
  - The return leg's row is headed **Look up the return flight**. It fills the return's day, time, flight time, number, both airports and, since 0.13.2, the return's own **Arrival on the ticket** (`f-back-arrival`, with the outbound's limit and its own refusal, "The return's arrival on the ticket can be at most 7 days after it leaves, and at most a day before."); the return has no airline or terminal field to fill.
  - The Planner remembers a saved flight only while the lookup is offered (the setting on), so with it off nothing is sent at all, not only nothing kept. What it sends holds the airport codes without their typed names.
  - The setting is one choice for the whole environment: if any installed module that declares the lookup has `suggestFlights` off, the environment neither suggests nor keeps flights through any module.
  - A second lookup replaces what an earlier lookup filled, and empties a lookup-filled terminal when the new schedule has none; it never touches what the person typed (`lookupApply()` in `travel-lib-object.js`). The stored number is the cleaned form, and one that doesn't clean is stored as typed (`numberToSave()`). A four-letter ICAO code fills the name and the code box then shows the IATA code.
  - The schedule keeps a save only if it departs no more than 400 days ahead and no more than 3 years back; when the file is read, a `lastSeen` too far ahead is clamped and one too old is dropped. An older save only adds its weekday. A file that is not a schedule is moved aside as `flight-schedule.json.bad-<time>` (mode 600); one over 40 MB is read-only until **Clear all** replaces it, and a failed replacement answers 500 "The flight schedule could not be cleared; the server log says why.". The not-found sentence for forgetting a number reads "No flight BA 117 is saved on this server." (the number as shown).
  - While it asks, the row says "Looking...".
  - `tools/build-airports.mjs` pins one commit of mwgg/Airports and checks its SHA-256; `--from <dir>` builds from a downloaded copy. The list has 7,918 airports.
  - The admin's section on a single install is on Manage's **Modules** tab; on a hosted server, on the host console's **Host** tab.
- **A gap older than this work, now closed:** the return leg had no **Arrival on the ticket**, so a return across time zones showed the right flight time but the wrong arrival. It was recorded in known-issues and is fixed in Planner 0.13.2.
- **Verified:** live by the builders in Chromium, on a single-environment and a hosted install, the fixes included. Checked by tool: `tools/check-flight-lookup.mjs` (37 checks, added to `npm run check`) and `tools/check-travel.mjs` (92 checks). Not checked: Firefox, Safari, a real screen reader, and how often real lookups find anything. Quality-assurance, 2026-10-04: passed with notes; the notes are the fixes listed above, and the builders verified them live in Chromium, the server's by `check-flight-lookup`.

## Left to build, in order

1. **The airport list** (server-development). `tools/build-airports.mjs`, `server/airports.json` with its notice,
   `server/airports.js`. Nothing calls it yet. Checked by `tools/check-flight-lookup.mjs`, added to `npm run check`.
2. **The host-wide schedule and `findFlights`** (server-development). `flight-schedule.json` in the root `DATA_DIR` on
   both kinds of install, loaded once at start beside `host.json` (not per environment); cleaning numbers, remembering
   only the listed fields, ranking, the entries above, the size limits, forgetting one number and clearing all. Nothing
   calls it yet; checked by the same tool.
3. **The module routes and the declaration** (server-development). `lookups` in the manifest, `GET .../flight-lookup`
   (lookup and `code`) and `POST .../flight-lookup/remember`, with their access, limits and the setting's effect;
   `"lookups": ["flight"]` and the **Suggest flights from earlier trips** setting in the Planner's `module.json`.
4. **The admin's routes** (server-development). `GET` and `DELETE /api/host/flight-schedule` on a hosted install,
   `/api/flight-schedule` on a single-environment install, each answering 404 on the other kind.
5. **The admin's section** (experience-design). **Flight schedule** on the host console and on the admin page: the
   count, **Forget a flight** and **Clear all**.
6. **The SDK and the Planner's row** (experience-design). `host.lookup.*` in `public/sdk/host.js` and
   `public/module-host.js`; remembering on **Save**; the **Look up a flight** row, the list, the filling and the words;
   the Planner's version bump.
7. **A typed code fills the airport's name** (experience-design).
8. **The return leg** (experience-design). The same row in the **Round trip** section.
9. **Documentation** (content-manager). `api-module-sdk.md` (`host.lookup`), `api-modules.md` (`lookups` and the
   routes), the host and admin API documents (the clearing routes), the architecture document for modules (the shared
   schedule, what it holds and never holds, where it lives), the Planner's user guide (the row, the setting, what is
   shared, and a line pointing to **Bring in** for filling a flight from a booking), the host console's and admin page's
   guides, the airport list's source and license, and the CHANGELOG.

## Verify

- **Steps 1 and 2, checked by a tool** (`check-flight-lookup`, no network): the airport list has MDW, SJC, LHR and NRT with
  the right time zones; minutes across zones, overnight, across the date line (landing the day before) and across a
  change of clocks; number cleaning (`wn 2483`, `WN2483`, `U2 8123` taken; `2483`, `Southwest 2483`, `WN 24835`
  refused); remembering a flight and finding it on another day; a save with an unknown airport or no time kept nowhere;
  two schedules under one number, ranked by weekday, then recency; the sixth schedule dropping the one seen least
  recently; forgetting one number and clearing all; and, after saving a flight with every field filled (seat, reference,
  cost, people, notes, gate, a title with a name in it), that the file holds only the listed fields.
- **Steps 3 and 4, checked by a tool** (a real server on a throwaway `DATA_DIR`): a module without `lookups` gets 404; a
  guest gets 403; bad number and bad date give 400; a remembered flight comes back; the `search` limit gives 429. On a
  hosted server (`BASE_DOMAIN`, two environments): a flight saved in one is found from the other; the file is in the root
  `DATA_DIR` and not in either environment's folder; with the setting off in one environment, its saves are not kept and
  its lookups answer nothing, while the other still works; an owner's `DELETE /api/flight-schedule` is 404 and the host
  admin's `DELETE /api/host/flight-schedule` works. On a single-environment server: the file is in `DATA_DIR`, and the
  owner's routes work while the host's answer 404.
- **Steps 5 to 8, checked by a tool and in a browser** (headless Chromium): the admin's section shows the count, forgets
  a number and clears all after asking; with the setting off the flight form is unchanged and saving remembers nothing;
  with it on, the row appears for a flight and not for a train; a saved flight is found on a later week and fills every
  listed field, leaving seat, class, reference, cost, notes and the gate alone; a typed title is kept; several schedules
  show the list; each message shows its words; a typed code fills an empty name; the return row fills the return.
- **Not checkable here:** how often real lookups find anything, which only use will show. No LiveKit call is involved,
  and no outside service is called.

## What is not decided

Nothing blocks the build. Left for later, each with its default:

1. **Seeding** from the VRS routes or the BTS data: not now (decision 9); either can be added inside `findFlights`.
2. **A paid or other outside service:** not now (decision 1); the function is ready for one.
3. **Following a flight** (gate changes, delays, a cancellation): left out; its own plan if wanted.
4. **The choices made in writing this** (above) stand unless Thomas overrules them.
