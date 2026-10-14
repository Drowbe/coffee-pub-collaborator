# Space Story Strip Plan: the status strip tells the space's story

**Audience:** Thomas, who decides what the strip says, what it shows and where each fact comes from; experience-design, which draws the strip, the facts and the Planner's reports; server-development, which builds the facts store, the weather lookup and their checks.

**Status:** approved in part, 2026-10-14. Thomas decided the look, the facts slot, the budget and the weather's destination (Decisions below); the weather provider, who chooses what shows, units and the rest are still open (Not decided). Nothing is built. Thomas, on the plan: "I like the plan. We can try B but I am not convinced it is visual enough. This should be the at-a-glance widget." Drafted 2026-10-14 by product-planner. It builds on [plan-space-status-strip](plan-space-status-strip.md) (step 1 built, `0fe4945`; the attention store, step 2, built, `ac26938`). Each step below is meant as a try build (one builder, one pass, its own checks, a patch version bump for each module it changes). Thomas, looking at the built strip ("● Planning · day 20 of 20 ▾" and the progress track): "The beginnings of planner is good. We don't need the 'down' caret since it isn't opening a menu. We can do far more with this visually and have it tell a better story. We will want to add some more info to that bar like maybe running budget? Could be more too... like weather at the destination?"

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
2. **The strip should tell a better story and carry more facts.** Running budget and weather at the destination are the first he named, "could be more too".
3. **The look: "Visual B: a taller journey bar".** Keep B's sentence, but make the strip taller, about 44 px (the token `--status-strip-h` changes from 28 px). The track gets each phase's name and an icon in its band, a big today marker, the days to go, and fact chips with icons. It still collapses to a slim line on narrow screens and the phone. Reason: "This should be the at-a-glance widget"; he is "not convinced" plain B "is visual enough", wants it to read at a glance, and is open to going more visual after he sees it. The built strip is the test: this is a try, not a final look.
4. **The facts slot: a new `host.facts` call.** Not an extension of `host.attention`, and not declared in the manifest. Reason: attention is per person; facts are the space's.
5. **Budget: spent so far, plus a target the owner can set.** The target is a new trip field, set by the owner or a moderator in Set up. Without a target the strip shows spent only.
6. **Weather's destination: the place the Planner marks as the destination.** The Planner reports one place; if it reports several, the owner picks one in Set up.

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

Thomas chose B, drawn taller and more visual (decision 3). A and C are kept here as what was weighed; A's idea of names in the bands is now part of B. As drafted, all three kept one 28 px line, the chip as a button opening the sheet, and the count at the right; the height is now about 44 px.

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

## The chosen look: a taller journey bar

**What is drawn** (Thomas's list; the sizes and the exact arrangement are the builder's to propose and Thomas's to judge once he sees it):

- The sentence, as the first part and the carrier for a screen reader (`storyWords()`, above).
- The track, tall enough to read: each band carries its phase's name and an icon where they fit, the main band drawn heavier, and a big today marker.
- The days to go, to the main phase, drawn large beside or at the end of the track ("41 days").
- Fact chips with icons, each a button (money, next booking, weather), then the attention count.
- Height about 44 px. `--status-strip-h` becomes 44 px; the narrow line needs its own token (lean `--status-strip-h-slim`, 28 px, as built today).

Everything still comes from phases and facts; nothing new is written by the strip, and it still opens only the sheet, a fact's module or an object.

**Phase icons.** A template phase has only `id`, `label` and `main` (`server/templates.js`, `PHASE_KEYS`), so there is no icon to draw. See Not decided.

**Narrow widths, in the order things give way:** the lowest facts drop one by one; the icons and names in the bands go; the track shrinks to 48 px, then goes; the sentence drops its last clause ("Booking starts tomorrow"); the count never drops. When it is too narrow for the tall bar, it collapses to the slim line (the strip as built today, 28 px); where that switch happens is not decided, lean 700 px, the same as the old rule of one fact and no names. At 1280 px: the sentence, the track with names and icons, days to go and three facts. At 1000 px: two facts.

**The phone line:** the slim line: "● Booking tomorrow · 35 d" and the count, with the 2 px track along its foot as today; no facts on the line. The phase sheet, which the line opens, gets the facts as a short list at its head, so a phone still reaches them in one tap. This adds a part to the sheet, which today holds only the phases.

**Dependence on the first strip plan.** [plan-space-status-strip](plan-space-status-strip.md) decision 9 fixes the height at 28 px as a new token. That is superseded here for the wide strip: its token is 44 px and the slim line keeps 28 px. Its step 1 (built) drew the 28 px row; step 2 below redraws it. Its other decisions (one line, no jump, informs only, placement in the `secondary` bar's left zone, the count at the right, hidden on asides and for guests) stand.

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

**Decided (decision 5): spent so far, and a target the owner can set.** Without a target the strip shows "$2,340 spent"; with one, "$2,340 of $4,000". "Spent" is the amount paid (costs with a payer, today's Money total); planned shows in the Money view, not in the strip. Pressing the chip opens the Planner on Money.

**Who reports it** is still the suggestion: the Planner, from its own Money (option 1 above), and a Budget module only if a second module ever holds costs. Thomas did not choose between these; see Not decided.

**The target.** A new trip field, `budget`, a positive amount in the trip's currency. It is set by the owner or a moderator in Set up (not by anyone who can edit the Planner). Where it is stored is open: the trip is the Planner's data, written from the Planner's own form, while Set up is the host's. Suggestion: store it on the space record and let the host read it, so Set up can write it without the Planner open; the host then words "of $4,000" itself from the Planner's `spent` amount. This would mean the `spent` fact carries an amount as well as words. See Not decided.

**Permissions:** the fact is shown only to people who may read the Planner in that space (the `view` permission), as the facts store's read rule below holds. Guests never see the strip.

### Weather

**Which place is "the destination".** Options:

1. **The Planner reports it:** during the main phase, today's stay's place; before it, the first night's stay; failing both, the trip's destination. Costs: a position is needed, and today only a stay that points at a Places object has one; the trip's destination would need a place picker (the Planner declaring `geocoder` and using `host.geocode.search`). Handles a trip with several stops.
2. **The space has one destination**, a place picked in Set up. Costs: a new field on the space and a host place picker, which needs the server's place search outside a module. Works for every template; one place only.
3. **A Weather module** placed on a space, with its own place. Costs: a whole module; the strip reads its report like any other.

**Decided (decision 6): the place the Planner marks as the destination.** One place is reported by the Planner; if it reports several, the owner picks one in Set up. This is closer to option 1 than option 2, but it is one place per trip, not the day-by-day place the earlier suggestion gave; the "today's stay" and "first night's stay" rules above are not decided and are not needed. How the Planner marks the destination is not decided (see Not decided; suggestion: the trip's `destination` text gets a place picked with `host.geocode.search`, so the Planner reports `{ name, lat, lon }`). The host only asks for the weather at a position a module reported, so the outside call and any key stay on the server.

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

## The contract

The slot is decided (`host.facts`); the shapes below are the proposal that follows from it, for Thomas to correct.

### How the strip gets facts without knowing modules

Options weighed:

1. **Extend `host.attention`** with facts beside the count. Costs: the least new code. Rules out: attention is per person ("your vote"); money and weather are the space's, so every person would store the same report, and a person who never opened the Planner would see nothing.
2. **A new slot, `host.facts`,** stored per space and module, read by anyone who may read that module there. Costs: a second small store and two routes, much as attention's. Keeps attention for "needs you" and facts for "how it stands".
3. **Declared facts in the manifest** that the server works out from stored data (as `refs.summary` maps fields), so nothing waits for a module to be open. Costs: a small query language (sum this field, the next of these dates) that would grow; the Planner's rules (a return shares its outbound's cost) do not fit it.

**Decided: 2** (decision 4). The host draws; modules stay the source; a fact is as fresh as the last time someone opened the module, which for a plan being worked on is often.

**In the SDK:** `host.facts.set([...])` and `host.facts.clear()`. A module sends at most 3 facts, each:

- `id`: a code name, unique in the module (`spent`, `next-booking`, `destination`);
- `icon`: a Font Awesome Free solid icon;
- `words`: at most 32 characters ("$2,340 of $4,000"); for the budget the fact also carries `amount` (the number paid) so the host can word the target, if the target is stored on the space (see Money);
- `when`: optional, a day or a day and time; the host adds the words relative to today ("Thu 8:15", "tomorrow") and drops the fact once it has passed;
- `place`: optional, `{ name, lat, lon }`, which marks it as a place the host may ask the weather for;
- `object`: optional, an object reference opened on press; without it, the module opens.

**On the server:** `PUT /api/spaces/:id/facts/:module` (requires `write` in that module in that space; 400 with a sentence for a bad shape), `DELETE` the same, and `GET /api/spaces/:id/facts` answering only the modules this person may read there: `{ modules: [{ module, name, facts, at }] }`. Kept in `DATA_DIR/facts.json` per environment, per space and module, never who sent it; a report older than 30 days is dropped. Weather: `GET /api/spaces/:id/weather?module=<id>&fact=<id>` takes the place from that stored fact, answers `{ day, high, low, condition, words, credit }`, or 204 when there is no place, no `WEATHER_ADDRESS` or the day is out of reach.

**Caps and order.** The strip draws at most three facts at its widest (a lean; Thomas has not set the number), plus the count. The order is the space's choice (below), else the template's, else the order modules answer in. Facts that do not fit drop from the end; the count never drops.

**Choosing what shows.** Options:

1. **The owner chooses per space** in Set up, a "Status line" section: each available fact on or off, dragged into order; moderators too, as for phases. Stored on the space record (`strip: ["travel:spent", "weather", ...]`).
2. **The template chooses, and nobody changes it.**
3. **Each person chooses** for themselves.

**Lean: 1, with the template's list as the default for new spaces.** A template field (`strip`) is a new field in `FIELDS` (`server/templates.js`); like `verbs` it must be left out of the fingerprint when absent, or every edited bundled template's notice opens.

**Accessibility.** The sentence and the count stay in the one polite status, written only when they change. Facts are buttons after the count in tab order, each named by its words; they are not in the status, so a weather update is not read aloud.

## Left to build, in order

Steps 1 to 6 can start now; 7 and 8 wait for the answers marked **blocks**. Each is a try build.

1. **No caret, and the sentence** (experience-design; low risk). `storyWords()` in `public/phases.js` and the chip using it; the "▾" gone from the comments; `tools/check-phases.mjs` cases for each row of the words table. Checks the caret live.
2. **The taller journey bar** (experience-design; medium: `space.js`, `style.css`, `check-nav.mjs`). `--status-strip-h` to 44 px and a slim-line token at 28 px; the track with names and icons in the bands, a big today marker, days to go, room for fact chips; the order things give way; the collapse to the slim line and the phone line. Phase icons wait for their answer (until then, names only). Thomas sees it and decides whether to go more visual. `check-nav.mjs` is updated to the two heights.
3. **Status strip steps 3 and 4,** as planned there: `host.attention`, the count and its list, Polls reporting. Not changed by this plan; needed before facts so the count's place is settled.
4. **The facts store** (server-development; low). `server/facts.js`, the three routes, the read rule, the 30-day drop; a new `tools/check-facts.mjs` in `npm run check` on a throwaway server.
5. **Facts in the strip** (experience-design; medium). `host.facts` in `public/sdk/host.js` and the module host; drawing up to three, the relative words for `when`, dropping a passed fact, pressing to open; the facts at the head of the phase sheet on a phone.
6. **The Planner reports money and the next booking** (experience-design; low). From Money and Bookings, on load and after each change; a patch bump of `travel` in `module.json` and `tools/module-versions.json`. Spent only, to start. The budget target is a new trip field (decision 5), so it is a separate step, 7.
7. **The budget target** (server-development for the field and its check; experience-design for the Set up control, owner or moderator only, and the Planner's `spent` fact reading it). Blocks on where the field is stored (Not decided). A new field is more than a try build's patch bump; Thomas to name the kind of build (suggestion: a feedback build).
8. **Choosing what shows** (server-development for the space field, the template field and its fingerprint; experience-design for the Set up section, which also holds the destination pick when the Planner reports several places). Medium: the template fingerprint. Blocks on who chooses.
9. **Weather** (server-development; medium: an outside service, privacy, a key). `server/weather.js`, `WEATHER_ADDRESS` and `WEATHER_KEY` read at start, the cache, the route, a check with a stand-in provider; then experience-design draws it and the Planner reports the destination as a `place` (another patch bump). Blocks on the provider and how the Planner marks the destination.
10. **Usual temperatures before the forecast** (server-development; later, only if Thomas wants it).

## Verify

- **Checked by a tool:** step 1 by `check-phases` (each words row, a template with no main phase, a one-day phase, the day before a boundary); step 4 by `check-facts` (a member with `write` allowed, a guest refused, a bad shape 400, a person without `view` getting nothing from that module, the 30-day drop); step 7 by a check that only an owner or moderator may set the target and that no target shows spent only; step 8 by `check-templates` (a template without `strip` keeping its fingerprint); step 9 by a check against a local stand-in provider (rounding, the cache, 204 with no address, nothing sent but the position and day).
- **Live in headless Chromium,** at 1280, 1000, 700 and 390 px, with the stand-in LiveKit: no caret; the 44 px bar with names, today marker and days to go; the collapse to the 28 px slim line; the sentence; facts giving way in order; the count never dropping; the phone line and the sheet's facts; pressing a fact opening the Planner or the object; a guest and an aside with no strip.
- **Only Thomas, on a real server:** a real call with the strip, a real phone, a screen reader hearing the sentence once and not the weather, Firefox and Safari; and weather from the real provider, which a container without the provider's address cannot reach.

## Risks

- **Stale facts.** A fact is as fresh as the last time someone opened its module. Money changed by a drop from another module, or a linked object changed elsewhere, shows the old figure until the Planner is opened. Dates are worded by the host, so they do not go stale; amounts can.
- **Crowding and height.** Three facts, a sentence and a track with names in one 44 px line is a lot, and 16 px more of every view is taken from the canvas on every wide screen. The caps and the slim line hold it; Thomas may want fewer facts. Whether plain B is visual enough is for Thomas to judge on the built strip.
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
7. The 44 px height is for the wide strip; the slim line keeps the 28 px of the built strip and the phone is unchanged.

## Not decided

Each of these is Thomas's to answer; those marked **blocks** stop a step until answered. Each carries a suggestion, which is not a decision.

1. **Weather provider and its terms.** **Blocks step 9.** Open-Meteo's free use is non-commercial; a hosted install that charges for environments is commercial and needs its paid key or its own Open-Meteo. Suggestion: an Open-Meteo-compatible address in `WEATHER_ADDRESS` with an optional `WEATHER_KEY`, off when unset; the builder confirms the current terms, and the credit is shown in the weather popover. MET Norway is the keyless fallback (about 9 days, an identifying User-Agent, cached as its headers say). Also whether Manage says weather is on and who provides it (suggestion: yes).
2. **Who chooses what shows.** **Blocks step 8.** The owner per space in Set up (moderators too), the template only, or each person. Suggestion: the owner, with the template's list as the default for new spaces.
3. **Celsius or Fahrenheit.** Blocks the weather's words. Suggestion: an environment setting for the unit, defaulting from the language; a per-person choice later if wanted.
4. **Where the budget target is stored.** **Blocks step 7.** The trip's data in the Planner (written from the Planner's form) or the space record (written from Set up). Suggestion: the space record, so Set up can write it for an owner or moderator without the Planner open.
5. **Who reports the money:** the Planner now, or a Budget module. Suggestion: the Planner.
6. **How the Planner marks the destination.** **Blocks step 9.** Suggestion: the trip's `destination` text gets a place picked through `host.geocode.search`, reported as the `destination` fact's `place`. Whether Set up's pick (when several places are reported) is stored on the space record follows from step 8.
7. **Phase icons.** A template phase has no icon. Options: an optional `icon` on each phase in the template (a Font Awesome Free solid icon, checked as `moduleIcons` are; the bundled template's fingerprint changes once and its notice opens, so the field must be handled as `verbs` was), or icons chosen by the host from the phase's place in the order. Suggestion: the optional template field, with names only where a phase has none. Blocks the icons in step 2, not the bar.
8. **Where the tall bar gives way to the slim line:** suggestion 700 px.
9. **How many facts** at the widest: three, or fewer. Suggestion: three.
10. **Before the forecast reaches:** nothing, or the usual range for the month. Suggestion: nothing first.
11. **A space without phases:** whether facts alone make the strip show. Suggestion: yes only once a module has reported a fact, and no strip otherwise.
12. **Who is coming:** left out, or planned as its own idea. Suggestion: left out.
13. **The home tile's rollup** ([plan-dashboard](plan-dashboard.md) phase 5): whether it reads the same facts. Suggestion: yes, later.
14. **The first plan's 28 px.** [plan-space-status-strip](plan-space-status-strip.md) decision 9 and step 1 still say 28 px; this plan supersedes that for the wide strip. Product-planner left that file unchanged because it is a separate approved plan; Thomas to say whether it gets a line pointing here.
