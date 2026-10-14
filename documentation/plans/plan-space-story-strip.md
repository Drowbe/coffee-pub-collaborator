# Space Story Strip Plan: the status strip tells the space's story

**Audience:** Thomas, who decides what the strip says, what it shows and where each fact comes from; experience-design, which draws the strip, the facts and the Planner's reports; server-development, which builds the facts store, the weather lookup and their checks.

**Status:** drafted 2026-10-14 by product-planner; nothing here is approved and nothing is built. It builds on [plan-space-status-strip](plan-space-status-strip.md) (step 1 built, `0fe4945`; the attention store, step 2, built, `ac26938`). Each step below is meant as a try build (one builder, one pass, its own checks, a patch version bump for each module it changes). Thomas, looking at the built strip ("● Planning · day 20 of 20 ▾" and the progress track): "The beginnings of planner is good. We don't need the 'down' caret since it isn't opening a menu. We can do far more with this visually and have it tell a better story. We will want to add some more info to that bar like maybe running budget? Could be more too... like weather at the destination?"

## What it is today

- **The strip** (`public/space.js` 1355 to 1496, `public/style.css` `status-strip:start` 8692 to 8886): one 28 px line (`--status-strip-h`). The chip `#phase-chip` holds a dot and the words from `chipWords()` (`public/phases.js` 283), "Planning · day 20 of 20"; beside it the track (`.status-track`), one segment per dated phase sized by `bandShares`, today's filled with a mark at `todayPercent`. Both open the phase sheet (`openPhaseSheet`, a dialog). On a phone it is a line under the top row: the dot, the phase's name alone (`.phase-chip-short`) and the track as a 2 px line along its foot.
- **The caret.** The code at `0fe4945` draws no caret: the chip's markup is the dot, the label and the short label. The "▾" survives only in comments (`space.js` 1356, `style.css` 8693) and in [plan-one-bar](plan-one-bar.md) decision 8. If Thomas still sees one, the page he saw was likely from before step 1 or a cached build; step 1 below confirms it live.
- **What the words say.** `chipWords()` names the current phase and its day ("day 20 of 20"). Because the first phase starts on the space's created day and the phases are contiguous, a space is almost always inside a phase, so the "12 days to go" form rarely shows. Nothing says what comes next, when the main phase starts, or that tomorrow is a boundary. "Planning · day 20 of 20" is in fact "Booking starts tomorrow", and the strip does not say so.
- **Attention.** The store is built (`server/attention.js`, `GET /api/spaces/:id/attention`, `PUT` and `DELETE /api/spaces/:id/attention/:module`, per space, person and module, `DATA_DIR/attention.json`, 7-day drop). Not built: `host.attention` in the SDK, the count in the strip, its list, and Polls reporting (status strip steps 3 and 4).
- **Money in the Planner** (`modules/travel`, 0.15.7). A Planner object has `cost` (a positive amount, rounded to cents) and `paidBy` (a person's key), and `owners` (who shares it; everyone when empty) (`cleanItem`, `travel-lib.js` 139). The trip has one `currency` (`cleanTrip`, 400), else the environment's (`settings.currency`, `server/store.js` 306). The Money view (`renderMoney`, `travel.js` 833) shows a total, each person's paid, share and net, and the payments that settle it. Its total counts only costs that have a payer (`balances`, `travel-lib.js` 593: a cost with no `paidBy` is listed but not added). There is no budget target, no "planned" against "paid", and no conversion between currencies. No other module holds costs.
- **Bookings in the Planner.** Journeys (`mode`, `operator`, `number`, `fromCode`, `toCode`, `date`, `time`) and stays (`date`, `checkOut`) are objects with dates; the Bookings view lists them (`bookings()`, 579). A booking reference is `confirm`. Object status (`action`, `tentative`, `confirmed`, [plan-object-status](plan-object-status.md)) is approved, not built.
- **Where a trip goes.** The trip has `destination`, free text of up to 80 characters, with no position. A Planner object's `place` and `address` are text. A position exists only on a Places object (`summary.place: "point"`), which a Planner object can point at. Place search runs on the server for a module whose manifest declares `geocoder` (`server/geocode.js`; only Places does; `host.geocode.search` in the SDK).
- **People.** The Planner's travellers are `host.people()`. Nobody is marked as coming or not; nothing like an answer to "are you in?" exists.
- **Outside services.** The flight lookup ([plan-flight-lookup](plan-flight-lookup.md), `server/flight-lookup.js`) asks only its own saved schedule; it says an outside service "goes inside it, switched on by an environment variable holding its key". Place search asks a Photon address the admin chose and keeps what comes back. The pattern for both: the server asks, a browser never does, and nothing about a person is sent or kept.
- **The limits that shape this plan.** The host names no module (`server/templates.js`: "nothing in the code knows which template names which module"); a module never runs code on the server (`server/module-hooks.js`), so it reports only while it is open in someone's browser. `host.status` is taken: it is the module window's own status line. Only one template ships, `templates/travel.json`, with six phases and `trip` as the main one.
- **Related direction.** [plan-dashboard](plan-dashboard.md) phase 5 wants a rollup of what is happening in a space on its tile on home (the phase and days to go, the next event, what needs a vote). Whatever feeds this strip could feed that tile too.

## Decisions

Thomas, 2026-10-14.

1. **No caret.** The chip opens the phase sheet, not a menu, so it shows no down caret.
2. **The strip should tell a better story and carry more facts.** Running budget and weather at the destination are the first he named, "could be more too". How each is shown and where it comes from is not decided; everything below is proposed.

Earlier decisions this plan keeps (plan-space-status-strip, Thomas, 2026-10-13): one line only, no jump; phases only inform and the strip edits nothing; the strip holds only durable things about this space, never a toast's confirmation or a bell event.

## Proposed: what "a better story" looks like

The story is four things, read left to right: **where we are**, **what is next**, **how far to the main event**, and **what needs us**. The first three come from the phases the host already has; the fourth is the attention count. Facts from modules (money, the next booking, weather) follow.

**The words** (a new pure `storyWords(bands, today)` beside `chipWords()` in `public/phases.js`; the template's phase labels, so no new template words are needed):

| When | Words |
|---|---|
| Inside a phase, the next one more than a day away | "Planning · Booking in 6 days · Trip in 41 days" |
| The day before a boundary | "Booking starts tomorrow · Trip in 35 days" |
| Inside the main phase | "Trip · day 3 of 10" |
| The main phase's last day | "Trip · last day" |
| After the main phase | "Post-trip · back 2 days" |
| No main phase in the template | "Build · day 4 of 12 · Launch in 9 days" (the next phase only) |

"Trip" is the main phase's label, so a template whose main phase is "Launch" or "Session" reads the same way without new fields. A space with no phases has no headline; there the strip shows only what modules report (see "Not decided").

### Three ways to draw it

All three keep one 28 px line, the chip as a button opening the sheet, and the count at the right.

**A. The journey line.** The track grows to most of the row and becomes the story: each band carries its phase's name inside it where it fits, the main band drawn heavier, today a mark, the days to go at its end. Facts sit at the right.

```text
| Planning   ▮|  Booking     |Buf| Pre-trip | ███ Trip ███ |Post|  41 days   $2,340 · 18° Lisbon · (!) 2 |
```

Costs: the most visual; names inside 28 px must be 11 px and vanish under about 600 px; a screen reader still needs the words elsewhere. Rules out: much room for facts at 1000 px.

**B. The sentence first.** The chip's words become the story sentence; the track stays as today, beside it, shrinking first; facts follow as small icon-and-words pieces, each a button.

```text
| ● Booking starts tomorrow · Trip in 35 days  ▬▬▬|▬▬▬▬▬▬▬▬  (coins) $2,340 of $4,000  (sun) 18° Lisbon  (!) 2 need action |
```

Costs: least new drawing; reads the same to a screen reader as to the eye; works for any template. Rules out: nothing; less striking than A.

**C. The stepper.** The track becomes one small dot per phase (past filled, today ringed, main larger), only today's phase named; the sentence and facts after it.

```text
| Booking ●●◉○◎○  Trip in 35 days  |  $2,340 spent  |  18° Lisbon  |  (!) 2 |
```

Costs: compact, and the dot count shows the shape of the plan; loses the bands' lengths, which is what the track shows best. Rules out: seeing how long each phase is.

**Lean (a suggestion, not a decision): B, with A's names drawn inside the track's bands when the track has 360 px or more.** The sentence is the story and survives every width; the bands get their names where there is room, which gives most of A's picture without making it the only carrier.

**Narrow widths (B), in the order things give way:** the lowest facts drop one by one; the track's names go; the track shrinks to 48 px, then goes; the sentence drops its last clause ("Booking starts tomorrow"); the count never drops. At 1280 px: the sentence, the track and three facts. At 1000 px: two facts. At 700 px: one fact, no track names.

**The phone line:** "● Booking tomorrow · 35 d" and the count, with the 2 px track along its foot as today; no facts on the line. The phase sheet, which the line opens, gets the facts as a short list at its head, so a phone still reaches them in one tap. This adds a part to the sheet, which today holds only the phases.

## Proposed: the facts, and where each would come from

| Fact | Exists today | Its source | What is new |
|---|---|---|---|
| Phase, what is next, days to the main phase | phases on the space, `chipWords()` | the host | `storyWords()` |
| Needs action ("2 need action") | the store; not the SDK or the count | every module, `host.attention` | status strip steps 3 and 4, unchanged |
| Money ("$2,340 spent", "$2,340 of $4,000") | `cost`, `paidBy`, `currency`, Money | the Planner | a report; a target is a new trip field |
| Next booking ("Flight UA 123 · Thu 8:15") | journeys and stays with dates | the Planner | a report |
| Weather at the destination ("18° Lisbon") | nothing | the host asks an outside service, for a place a module reports | a provider, a cache, a route, a place |
| Who is coming ("4 of 6 confirmed") | nothing | no module holds it | a new idea; a poll could stand in |
| Open decisions | the Planner's Decisions view | the Planner, through `host.attention` | belongs in the count, not a fact |

### Money

**What a running budget needs:** what is planned (every cost), what is paid (costs with a payer, today's Money total), optionally what is booked (costs on confirmed objects, once object status lands) and a target. All in the trip's one currency; a cost in another currency has to be entered converted, as today.

**Options for its owner:**

1. **The Planner reports it** from its own Money. Costs: a report from the Planner; a target is a new `budget` field on the trip in the Edit trip form. Rules out: costs held by any other module.
2. **A Budget module** that holds the target and reads Planner objects' costs through `objects.search`. Costs: a new module and a new summary field (`cost`) on the shared object summary so it can read them; most work. Rules out: nothing; fits templates other than travel.
3. **A `cost` on the shared summary only**, with the host adding costs from every module. Costs: the host would be adding module data; breaks "the host names no module" in spirit.

**Lean: 1 now; 2 only if a second module ever holds costs.** The strip would show "$2,340 spent" without a target and "$2,340 of $4,000" with one, the amount paid; planned shows in the Money view, not in the strip. Pressing it opens the Planner on Money.

**Permissions:** the fact is shown only to people who may read the Planner in that space (the `view` permission), as the facts store's read rule below holds. Guests never see the strip.

### Weather

**Which place is "the destination".** Options:

1. **The Planner reports it:** during the main phase, today's stay's place; before it, the first night's stay; failing both, the trip's destination. Costs: a position is needed, and today only a stay that points at a Places object has one; the trip's destination would need a place picker (the Planner declaring `geocoder` and using `host.geocode.search`). Handles a trip with several stops.
2. **The space has one destination**, a place picked in Set up. Costs: a new field on the space and a host place picker, which needs the server's place search outside a module. Works for every template; one place only.
3. **A Weather module** placed on a space, with its own place. Costs: a whole module; the strip reads its report like any other.

**Lean: 1,** because it keeps the module as the source of where the trip is and gives the right place on each day of a trip with several stops. The host only asks for the weather at a position a module reported, so the outside call and any key stay on the server.

**The source.** Two free services fit, both as known when drafting, for the builder to confirm against their current terms:

- **Open-Meteo:** no key for non-commercial use, about 10,000 calls a day; a paid key for commercial use; a forecast up to 16 days; a historical archive from which usual temperatures for a month can be worked out; open source and can be run on one's own server; CC BY 4.0, so its name must be shown.
- **MET Norway (api.met.no):** no key; asks for an identifying User-Agent and that answers be cached as its headers say; about 9 days ahead; CC BY 4.0.

**Lean: an Open-Meteo-compatible address in an environment variable,** as place search takes a Photon-compatible one. `WEATHER_ADDRESS` (unset: no weather anywhere, so every install behaves as before) and `WEATHER_KEY` (optional, for a paid plan). A hosted install that charges for environments is commercial use and needs the paid key or its own Open-Meteo; Thomas to decide.

**How it is asked and kept.** The server asks, never a browser. It sends only the position, rounded to 2 decimals (about 1 km), and the day; never the place's name, the space, the environment or a person. Answers are kept in `DATA_DIR/weather.json` at the host's level, as the flight schedule is, keyed by rounded position and day: a forecast for 3 hours, usual temperatures for 30 days. One answer serves every space going to the same town.

**Before the forecast reaches.** A forecast is shown only for a day within 7 days (the provider gives more, but it is not worth reading further out). Before that, either nothing or the usual range for that month ("Usually 14 to 22° in May"). **Lean: nothing in the first build; the usual range as a later step.**

**What it says:** "18° Lisbon" with the condition's icon, the high for the day shown; pressing it shows the low, the condition in words and the provider's credit in a small popover (the shared menu). Units are an open question: there is no temperature setting today.

### Next booking

The Planner reports the next journey or stay with a date from today on: "Flight UA 123 · Thu 8:15", "Hotel Alfama · check in Fri". It reports the date and time, not the words "in 2 days", so the host words it against today and the fact does not go stale overnight. Pressing it opens the object (`host.objects.open`).

### Who is coming

Nothing holds it. Making it a fact needs a new idea (each person marks themselves going, maybe, out) that belongs to the space or a module, which is a plan of its own. **Lean: leave it out;** a Poll can ask meanwhile.

## The contract (proposed)

### How the strip gets facts without knowing modules

Options:

1. **Extend `host.attention`** with facts beside the count. Costs: the least new code. Rules out: attention is per person ("your vote"); money and weather are the space's, so every person would store the same report, and a person who never opened the Planner would see nothing.
2. **A new slot, `host.facts`,** stored per space and module, read by anyone who may read that module there. Costs: a second small store and two routes, much as attention's. Keeps attention for "needs you" and facts for "how it stands".
3. **Declared facts in the manifest** that the server works out from stored data (as `refs.summary` maps fields), so nothing waits for a module to be open. Costs: a small query language (sum this field, the next of these dates) that would grow; the Planner's rules (a return shares its outbound's cost) do not fit it.

**Lean: 2.** The host draws; modules stay the source; a fact is as fresh as the last time someone opened the module, which for a plan being worked on is often.

**In the SDK:** `host.facts.set([...])` and `host.facts.clear()`. A module sends at most 3 facts, each:

- `id`: a code name, unique in the module (`spent`, `next-booking`, `destination`);
- `icon`: a Font Awesome Free solid icon;
- `words`: at most 32 characters ("$2,340 of $4,000");
- `when`: optional, a day or a day and time; the host adds the words relative to today ("Thu 8:15", "tomorrow") and drops the fact once it has passed;
- `place`: optional, `{ name, lat, lon }`, which marks it as a place the host may ask the weather for;
- `object`: optional, an object reference opened on press; without it, the module opens.

**On the server:** `PUT /api/spaces/:id/facts/:module` (requires `write` in that module in that space; 400 with a sentence for a bad shape), `DELETE` the same, and `GET /api/spaces/:id/facts` answering only the modules this person may read there: `{ modules: [{ module, name, facts, at }] }`. Kept in `DATA_DIR/facts.json` per environment, per space and module, never who sent it; a report older than 30 days is dropped. Weather: `GET /api/spaces/:id/weather?module=<id>&fact=<id>` takes the place from that stored fact, answers `{ day, high, low, condition, words, credit }`, or 204 when there is no place, no `WEATHER_ADDRESS` or the day is out of reach.

**Caps and order.** The strip draws at most three facts at its widest, plus the count. The order is the space's choice (below), else the template's, else the order modules answer in. Facts that do not fit drop from the end; the count never drops.

**Choosing what shows.** Options:

1. **The owner chooses per space** in Set up, a "Status line" section: each available fact on or off, dragged into order; moderators too, as for phases. Stored on the space record (`strip: ["travel:spent", "weather", ...]`).
2. **The template chooses, and nobody changes it.**
3. **Each person chooses** for themselves.

**Lean: 1, with the template's list as the default for new spaces.** A template field (`strip`) is a new field in `FIELDS` (`server/templates.js`); like `verbs` it must be left out of the fingerprint when absent, or every edited bundled template's notice opens.

**Accessibility.** The sentence and the count stay in the one polite status, written only when they change. Facts are buttons after the count in tab order, each named by its words; they are not in the status, so a weather update is not read aloud.

## Left to build, in order (proposed)

1. **No caret, and the sentence** (experience-design; low risk). `storyWords()` in `public/phases.js` and the chip using it; the "▾" gone from the comments; `tools/check-phases.mjs` cases for each row of the words table. Checks the caret live.
2. **The track drawn as chosen** (experience-design; medium: `space.js`, `style.css`, `check-nav.mjs`). Option B with names in the bands where they fit, or whichever Thomas picks; the order things give way; the phone line.
3. **Status strip steps 3 and 4,** as planned there: `host.attention`, the count and its list, Polls reporting. Not changed by this plan; needed before facts so the count's place is settled.
4. **The facts store** (server-development; low). `server/facts.js`, the three routes, the read rule, the 30-day drop; a new `tools/check-facts.mjs` in `npm run check` on a throwaway server.
5. **Facts in the strip** (experience-design; medium). `host.facts` in `public/sdk/host.js` and the module host; drawing up to three, the relative words for `when`, dropping a passed fact, pressing to open; the facts at the head of the phase sheet on a phone.
6. **The Planner reports money and the next booking** (experience-design; low). From Money and Bookings, on load and after each change; a patch bump of `travel` in `module.json` and `tools/module-versions.json`. The budget target, if Thomas wants one, is a new trip field and better done as a feedback or production build, since a try build only bumps the patch.
7. **Choosing what shows** (server-development for the space field, the template field and its fingerprint; experience-design for the Set up section). Medium: the template fingerprint.
8. **Weather** (server-development; medium: an outside service, privacy, a key). `server/weather.js`, `WEATHER_ADDRESS` and `WEATHER_KEY` read at start, the cache, the route, a check with a stand-in provider; then experience-design draws it and the Planner reports its place (another patch bump).
9. **Usual temperatures before the forecast** (server-development; later, only if Thomas wants it).

## Verify

- **Checked by a tool:** step 1 by `check-phases` (each words row, a template with no main phase, a one-day phase, the day before a boundary); step 4 by `check-facts` (a member with `write` allowed, a guest refused, a bad shape 400, a person without `view` getting nothing from that module, the 30-day drop); step 7 by `check-templates` (a template without `strip` keeping its fingerprint); step 8 by a check against a local stand-in provider (rounding, the cache, 204 with no address, nothing sent but the position and day).
- **Live in headless Chromium,** at 1280, 1000, 700 and 390 px, with the stand-in LiveKit: no caret; the sentence; facts giving way in order; the count never dropping; the phone line and the sheet's facts; pressing a fact opening the Planner or the object; a guest and an aside with no strip.
- **Only Thomas, on a real server:** a real call with the strip, a real phone, a screen reader hearing the sentence once and not the weather, Firefox and Safari; and weather from the real provider, which a container without the provider's address cannot reach.

## Risks

- **Stale facts.** A fact is as fresh as the last time someone opened its module. Money changed by a drop from another module, or a linked object changed elsewhere, shows the old figure until the Planner is opened. Dates are worded by the host, so they do not go stale; amounts can.
- **Crowding.** Three facts, a sentence and a track in one 28 px line is a lot; the strip can become a second top bar. The caps hold it; Thomas may want fewer.
- **Weather's terms.** Open-Meteo's free use is non-commercial; a hosted, paid install needs a key or its own server. The credit must be shown somewhere a person can find.
- **Privacy.** A trip's destination goes to a third party from the server. Rounded and without names, but Thomas may want Manage to say that weather is on and who provides it.
- **The template fingerprint.** Adding `strip` to `FIELDS` changes every template's fingerprint unless handled as `verbs` was.
- **Channels drifting.** Facts are durable and about this space; a "Saved" or "Ann added a hotel" must never become one. The step-5 check of the status strip plan should cover facts too.

## Assumed, for Thomas to confirm

1. The caret is already gone from the drawn chip, and only the comments and plan-one-bar's decision 8 still carry it.
2. The phase words come only from the template's labels, so no new template words are needed for the sentence.
3. Facts are the space's, not each person's; a personal figure (your share of the costs) is left out.
4. Pressing a fact opens its module or object. The status strip plan said the strip opens nothing but the sheet for phases; this reads that as about phases only.
5. The Planner is the only fact source in the first builds.
6. No weather unless `WEATHER_ADDRESS` is set, so every install behaves as before.

## Not decided

Each of these is Thomas's to answer; those marked **blocks** stop a step until answered.

1. **Which drawing:** A, B or C (lean B with names in the bands). **Blocks step 2.**
2. **Facts slot:** extend attention, a new `host.facts`, or declared facts (lean `host.facts`). **Blocks steps 4 and 5.**
3. **Money:** spent only, or spent against a target; and who may set the target (anyone who may edit the Planner, or owners and moderators). **Blocks the target in step 6.**
4. **Who owns the budget:** the Planner now, or a Budget module (lean the Planner).
5. **Which place is the destination:** the Planner reports it, the space has one, or a Weather module (lean the Planner). **Blocks step 8.**
6. **Weather source and use:** Open-Meteo or MET Norway; whether a hosted install pays for a key; whether Manage says weather is on. **Blocks step 8.**
7. **Before the forecast reaches:** nothing, or the usual range for the month.
8. **Units:** Celsius or Fahrenheit, from a new environment setting or the person's language.
9. **Who chooses what shows:** the owner per space, the template only, or each person (lean the owner, the template's as default). **Blocks step 7.**
10. **How many facts** at the widest: three, or fewer.
11. **A space without phases:** whether facts alone make the strip show (it would appear on more spaces, and the status strip plan shows it there only once something needs action).
12. **Who is coming:** left out, or planned as its own idea.
13. **The home tile's rollup** ([plan-dashboard](plan-dashboard.md) phase 5): whether it reads the same facts.
