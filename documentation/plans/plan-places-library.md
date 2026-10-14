# Places Library Plan: one place in several spaces, and a real set of categories and types

**Audience:** Thomas, who decides how a place belongs to more than one space, what the default is, and what the category and type library holds; the try builders: server-development for step 1, experience-design for steps 2 to 5; content-manager when a production build lands it.

**Status:** drafted 2026-10-14 by product-planner from Thomas's feedback of the same day; nothing approved, nothing built. Thomas's words:

- "A place should be able to belong to more than one thing (e.g. the trip, the environment, the person), right? So it should not be a dropdown."
- "We should default places to being in the environment."
- "We need a far more robust set of default categories", with a proposal he pasted: separate categories (eleven, each with a colour) from pin types (about 130, each with an icon and aliases for search); the category gives the default colour and the type the icon, and a place can override either; a searchable picker ("coffee", "beach", "subway", "underground", "metro"); owners may rename or remove categories without deleting the types under them; a visit status (Want to go, Booked, Visited, Favorite) shown on a pin, not a category or a type; one icon family, Font Awesome Free solid; types kept as a registry such as `{ id: "cafe", label: "Café", category: "food-drink", icon: "mug-hot", aliases: [...], color: null }`; the eleven categories shipped with a curated type library.

Two bugs from the same feedback (the place form must be the SDK's editor window, not drawn inside the Maps frame; the Maps **+** menu shows **Add a place** twice) are being fixed separately as a try build and are not part of this plan. Steps 2 and 3 below assume that fix has landed.

## What it is today

- **Three stores, one place in one of them.** Places (`modules/places`, 0.10.11) keeps `place:<id>` in the environment's store, a space's store or a person's store (`server/module-data.js`: `environment.json`, `space-<id>.json`, `person-<key>.json`). The store decides who reads it: everyone in the environment with Places' `view` right; the space's members (and its guests on a guest link); the person alone, not even an owner (decision in [plan-places-views](plan-places-views.md)). A pointer names its store (`{ module, kind, id, scope, space? }`), and the Planner's objects hold such pointers.
- **The Where dropdown.** The place form (`select#f-where`, `places.js` around line 535) asks once where a new place goes: Mine, the environment's name, or a space where the viewer may add places. Save refuses until one is picked. An existing place shows its store, disabled. Moving a place is not possible; the place menu makes copies instead ("Share to <space>", "Save to mine"), and the copy is a separate place from then on.
- **The record.** `cleanPlace` in `places-lib.js`: `{ title, category, address, point?, notes, owners, by, ref? }`. `owners` are the people a place is for (the "whose" ticks), not where it is kept.
- **Categories.** Places' `categories` setting (type `list`, environment scope, the owner edits it in Places' settings) defaults to five rows: Things to do (`do`), Food (`eat`), Stay (`stay`), Travel (`travel`) and Other (`other`, fixed: it can be renamed, not removed), each with an icon and the grey `#888888` that means "automatic colour" (one of the eight theme tints, chosen from the id). A list setting holds at most 20 rows with labels up to 30 characters (`server/setting-list.js`). Taking a category off the list leaves the place's stored id alone; it shows under Other.
- **The summary.** Places' kind `place` maps `title`, `subtitle` (address), `place` (point) and `category`. The server keeps a summary's `category` only when it matches `/^[A-Za-z0-9-]{1,20}$/` (`server/index.js`, around line 5812), while a list setting's ids may be 30 characters: an owner's category named "Entertainment and Nightlife" gets the id `entertainment-and-nightlife` and loses its colour on the map today.
- **Maps** (0.8.12, `requires: ["places"]`) draws every pin with the producing module's icon and colours a place's pin by its summary's `category`, using the colours Places tells it through the local action `categoryColors`. A summary has no icon of its own. Pins come from `host.objects.search('', { has: 'place' })` in the space, plus Mine and the environment's by the Map's filter.
- **The SDK already has the picker this needs.** `host.ui.kindPicker` (built for the Planner, [plan-editor-window](plan-editor-window.md) Part 2) takes `groups: [{ label, options: [{ id, label, icon, color, words }] }]`, matches every typed word against the start of a word in the label or in `words`, ignores accents ("cafe" finds "Café"), ranks name matches above alias matches, keeps recent choices in the browser, and is a bottom sheet with 44 px rows on a phone. TODO.md already notes Places' Category could take it.
- **Font Awesome Free 7.3.1 is bundled** (`node_modules/@fortawesome/fontawesome-free/svgs/solid`, 2001 icons). Templates' icons are checked against that folder (`drawable()` in `server/templates.js`), and `tools/check-defaults.mjs` checks the default icon list in `server/default-lists.js` the same way.
- **The Planner** (`travel`, 0.15.23; "Itinerary" in the Travel template) has its own category ids `do`, `eat`, `stay`, `travel`, `other`, finer types (`STOP_TYPES` restaurant, cafe, bar, sight, museum, attraction, tour, show, hike, beach, shop, spa, other; `STAY_TYPES` hotel, rental, hostel, camp, other), a free-text `place` and pointers to places. It hands Budget its costs with plain words (`categoryNames`: stay to Lodging, eat to Food, do to Activities, travel to Travel), and Budget files them by name. "Save it as a place" (`sharedRef`, `travel.js` around line 1822) copies a person's private place into the space through `addPlace`.
- **Budget** (0.1.4) has its own `categories` list: Travel, Lodging, Food, Supplies, Services, Fees, Activities, Other.
- **Nothing is live.** No environment holds places that must be kept, so nothing here needs a data migration. Old shapes are still read sensibly (see "Stored data").

## Decisions

Only Thomas's feedback above, 2026-10-14. Everything else in this plan is proposed, and the questions at the end are his to answer.

## The two parts

**Part A, belonging:** a place can be in the environment, in one or more spaces and on a person's own list at once, and the form says so with ticks, not a dropdown. **Part B, the library:** eleven categories (colour) and a curated set of types (icon, aliases), a searchable picker, overrides on a place, and a visit status. The parts are independent; B can be built first.

## Part A: one place, several spaces

### The model (proposed; question 1)

**A place is one record with one home, and marks for everywhere else it shows.**

- **Home.** The store the record is kept in. The home alone decides who can read it and who can change it, exactly as today. Nothing else widens who can read a place.
- **Space marks.** `spaces: [<space id>, ...]` on the record: the spaces it is in. They are only filters for lists and maps; they let nobody read it who could not already.
- **Mine.** A private bookmark in the person's own store, `saved:<id>` holding the home pointer. It is never written on the shared record, so nobody, an owner included, can see who keeps a place on their list.
- **The home follows from the ticks,** widest first:
  - **Everyone** ticked: the environment's store, with any ticked spaces as marks.
  - **Spaces only:** one space ticked keeps the place in that space's store. Two or more spaces without Everyone is refused in the first build ("To show it in more than one <space>, it must be in <environment> too."), because one space's store cannot be read by another space's members (question 1 names the alternative).
  - **Only Mine:** the person's store, private, as today.

Why this over the alternatives (all three are in question 1): it keeps privacy where it is enforced today, in the store, so no server read path changes; each place is one record, so an edit is seen everywhere and the map draws it once; and the default (Everyone) is the case with no move and no copy.

### When the ticks change the home: a move

Ticking or unticking can move a place: Mine to a space or Everyone (sharing a private place); one space to Everyone (widening); Everyone to one space or to Mine (narrowing). A move keeps the place's id, writes it in the new store, and leaves a **forward** in the old one: `place:<id>` holding only `{ title, movedTo: { scope, space? } }`, no address, position or notes.

- A pointer to the old store (a Planner object, a link) still resolves, to the forward's title; opening it opens Places, which follows `movedTo` to the place, or says "This place is no longer shared here." when the viewer cannot read the new home.
- A forward has no position, so the map never shows it, and Places' lists hide it. Places moves its links (`host.objects.setLinks`) to the new pointer.
- Moving out of Mine breaks nothing: private places are never linked (`setLinks` refuses them).
- Narrowing takes the place away from people; it needs the same right as deleting it, and asks first: "People in <environment> will no longer see it." with **Keep it shared** and **Take it away**.
- Sharing a private place shows its notes to the new readers; the form says "Its notes will be seen by everyone in <where>." under the ticks before Save.

### What a person sees

The union of what they may read, each place once (rows and pins keyed by the home pointer, so a place reached through a mark and through the environment's list is one row and one pin):

- **In a space, "This <space>"**: the places kept in the space, plus the environment's places marked for it.
- **Everyone's** (the Map's filter, the view switch): the environment's places.
- **Mine:** places kept in the person's store, plus their bookmarks, each resolved through its pointer. A bookmark whose place is gone or no longer readable shows as "No longer shared with you" with **Take off my list**.
- **A row's marks:** the space chips show only the spaces the viewer belongs to; other spaces are not named or counted.

### The form control

The dropdown becomes a group of ticks at the top of the editor window, `fieldset#f-where` with the legend **Shows in**:

- **Everyone in <environment name>** (the name as the Map's filter shows it; "Everyone" when unknown).
- **<This space's name>** when the form is opened in a space.
- Beside the Map, and on a space's canvas under a **More <spaces>** disclosure: each other space where the viewer may add places.
- **Mine**, with the hint "On your own list. Only you see that you saved it."
- Under the group, one line generated from the ticks, tied with `aria-describedby`: "Everyone in Coffee Pub sees it.", "Only people in Staying Blonde see it.", "Only you see it."
- Nothing ticked: Save says "Pick at least one." A tick the viewer may not change is shown disabled with its reason in the hint.
- **An existing place** shows its ticks, changeable by anyone who may edit it (no longer a disabled field). Changing them may move it (above).
- Native checkboxes, not chips: each row 44 px tall on a phone, its label the whole row, so it is a plain list to a screen reader.

### The default (Thomas: "default places to being in the environment"; question 2)

**Proposed: Everyone, plus where you are.** Everyone is always ticked first when the viewer may add there; then:

- on a space's canvas or its Map: that space too (a mark, so the place shows in the trip's list and on its map);
- in the Mine view: Mine too (a bookmark);
- beside the environment's Map or on Places' own page: nothing more.

When the viewer may not add to Everyone, the default is where they are. `addPlace` from another module (the Planner's "Save it as a place", **Send to...**) takes the same default for the space it is asked from, and answers the home's pointer. Its input gains an optional `in: ["environment", "space", "person"]` for a module that needs another choice.

### Who may do what (question 3)

- **Read and change:** the home's rights, as today. In the environment's store that is everyone with Places' `edit` right ("everyone means everyone who can edit", [plan-places-views](plan-places-views.md)). This plan keeps that, because the default puts members' places there; making Everyone owner-only would mean members could not use the default.
- **Add or remove a space mark:** someone who may change the place and may add places in that space.
- **Share a private place** (move it out of Mine): only its person, the only one who can see it.
- **Narrow or delete:** anyone who may change the place, after the question above.

### The place menu

"Share to <space>" and "Save to mine" (the copies) go; the ticks do that now. The menu gains **Take off <this space>** (in a space, when the place is in more than this space; removes the mark), **Add to my list** or **Take off my list**, and **Delete**, which removes the place for everyone and, when it shows in more than one place, says so: "Delete it for everyone? It is in Staying Blonde and Everyone in Coffee Pub." Copies made before this keep being separate places; nothing merges them.

### Editing by several people

One record, so the existing version check and conflict bar answer as they do today. A change of marks only (a tick added or removed) is retried once on a 409: Places reads the place again and applies the same add or remove, so two people ticking two spaces at once both win. Any other conflict shows the bar.

### Search, summaries and handoff ([plan-object-handoff](plan-object-handoff.md))

- The summary carries the marks (`spaces`, server step 1), and `host.objects.search` takes `in: <space id>` with `scope: 'environment'`: the environment's objects marked for that space. Maps and the Planner's suggestions use it to find a space's places kept in the environment.
- A dragged place, a pointer in the Planner, a link and an AI summary all name the home, never a bookmark, so a place dragged from Mine that is really the environment's is not copied.
- The Planner's `sharedRef` stops copying a private place: it asks Places to share it (`sharePlace`, step 5) to Everyone and the space, and says "It will be shared with <space>." Its pointer then works for the space.
- Search inside Places (the filter field) looks at the title, address, notes, and now the type's label and aliases.

### Stored data

Nothing is live, so there is no migration. The code still reads every old shape: a record without `spaces` means no marks (an environment place in no space; a space's place in that space alone; a person's place private), and the old categories are read as in Part B. A Set up or template that lists Places changes nothing here.

### Guests on a guest link (question 4)

A guest on a guest link has no account and cannot read the environment's store. With the default above, a trip's guest does not see the trip's places kept in the environment, and a Planner object pointing at one shows as unavailable to them. Places kept in the space itself are unchanged.

## Part B: the library

### Categories (the owner's list, colour)

The `categories` list setting stays the mechanism, edited by the owner in Places' settings as now. Its default becomes eleven rows. The ids are short, so they fit the summary's limit and read well in code:

| id | Label | Icon |
|---|---|---|
| `food` | Food & Drink | `utensils` |
| `stay` | Accommodations | `bed` |
| `sights` | Sights & Culture | `landmark` |
| `nature` | Nature & Outdoors | `tree` |
| `activities` | Activities & Experiences | `ticket` |
| `nightlife` | Entertainment & Nightlife | `masks-theater` |
| `shopping` | Shopping | `bag-shopping` |
| `transport` | Transportation | `train` |
| `services` | Services & Essentials | `circle-info` |
| `health` | Health & Wellness | `heart-pulse` |
| `other` | Personal & Other | `location-dot` (fixed: renamed, never removed) |

- **Colour (question 5).** Each row keeps a colour; the default ships every row grey, meaning "automatic", which takes one of the eight theme tints. With eleven rows, three tints are shared.
- **The default replaces the old five for new environments.** An environment that already has a stored list keeps it; nothing is rewritten. The setting's help is reworded: "How places are grouped and coloured. Taking a category off the list removes no place and no type: its places show under Other, and its types stay in the picker."
- **The old ids are read as new ones** wherever a place or a request carries them: `eat` as `food`, `do` as `activities`, `travel` as `transport` (`stay` and `other` are unchanged). This is only for `addPlace` input and old records; nothing is rewritten.

### Types (the library, icon)

- **A bundled file,** `modules/places/src/places-lib-types.json`, versioned with the module: `[{ id, label, category, icon, aliases, color, osm? }]`. `category` is one of the eleven ids; `icon` a Font Awesome Free solid name; `aliases` the words it is also found by; `color` null (the category's) unless the library wants one; `osm` optional OpenStreetMap tags such as `["amenity:cafe"]`, so a saved search result (Photon's `osm_key:osm_value`, already in `server/geocode.js`) gets its type at once.
- **Getting it into the page.** The module build inlines only `.js` lib files today. Server step 1 extends `server/module-build.js`: a `src/<id>-lib-<name>.json` is inlined before the lib code as `const LIB_<NAME> = <json>;` (here `LIB_TYPES`). The file stays plain data that a check reads directly.
- **The first library** is in the appendix: 153 types across the eleven categories, every one Thomas named among them, every icon checked present in the bundled Font Awesome Free 7.3.1. Thomas may cut it.
- **Checked by a tool.** `tools/check-places.mjs` fails on: a duplicate id, an id not matching `^[a-z][a-z0-9-]{0,29}$`, a category not among the default ids, an icon missing from `svgs/solid`, a label over 30 characters, more than 12 aliases or an alias over 30 characters, more than 300 types.
- **Owners do not edit types in this plan.** A category taken off the list leaves its types in place: in the picker they group under Other, so removing Shopping still lets a place be a Souvenir Shop with its gift icon. Custom types are under "What is not decided".
- **Per template, later.** A template's own library (a fantasy set for a picture map: tavern, dungeon, shrine) is not part of this plan; templates cannot carry module settings today.

### A place's look, and the override order

The record gains `type` (a type id, optional), `icon` and `color` (optional overrides), and `status`. What is drawn:

- **Icon:** the place's own `icon`, else its type's, else its category's.
- **Colour:** the place's own `color`, else its type's (null in every shipped type), else its category's chosen colour, else the category's automatic tint.
- **Category:** the place's `category`; picking a type sets it to the type's category, and the person may change it after.
- Places stores the drawn icon on the record (`icon`, with `iconOwn: true` when the person chose it), so the server can put it on the summary without knowing the library. A later library change reaches a place when it is next saved.

### The form

- **Type** comes first after the name: `host.ui.kindPicker` with one group per category on the owner's list (in its order, Other last), each option `{ id, label, icon, color, words: aliases }`, recent first. "coffee" finds Café, "metro", "subway" and "underground" find Metro Station. No type is valid ("Custom Location" is in the list too).
- **Category** stays a choice of the owner's list, set by the type.
- **Look** (a disclosure, closed by default): **Icon**, a second `kindPicker` over every icon the library uses plus the environment's icon list (`settings.icons`), with the types' labels and aliases as its words, so "beach" finds the umbrella; **Colour**, the eight tints plus **Category's colour**. No 2000-icon browser.
- **Status** (below).

### Visit status (a mark on the pin, not a category or type)

`status`: `want` (Want to go, `bookmark`), `booked` (Booked, `calendar-check`), `visited` (Visited, `circle-check`), `favorite` (Favorite, `star`), or none. One at a time, shared by everyone who sees the place (assumed; see "Assumed"). It is a row of four toggle buttons in the form and a **Status** submenu in the place menu, shown in a list row as its icon and word, and on a pin as a small badge in the pin's corner. The words are defaults the environment's words may change later. It is separate from the object status of [plan-object-status](plan-object-status.md) (action, tentative, confirmed), which is about deciding, not visiting.

### Limits

Categories: 20 rows, labels 30 characters, ids 30 characters (and the summary's limit raised to 30 in step 1). Library: 300 types, labels 30, 12 aliases of 30 characters each. A place: 20 space marks; a person: 1000 bookmarks. These sit well inside a value's 60 KB and a module's 5 MB.

## Budget, the Planner and the words

- **Do not share one registry with Budget.** Budget's categories say what money went on (Fees, Supplies); Places' say what a place is (Nature & Outdoors). The overlap (food, lodging, transport, activities) is real but partial, and the words already travel by name: the Planner's `categoryNames` hand Budget "Lodging" or "Food", and nothing in this plan touches that. If Places ever produces a cost (an entry fee on a place), it declares its own `categoryNames` (`food` to Food, `stay` to Lodging, `transport` to Travel, the rest to Activities) and Budget files it as it files the Planner's.
- **The Planner keeps its own ids.** Its `do`, `eat`, `stay`, `travel` are kinds of plan objects, not places. The two meet in two maps, both in step 5:
  - **"Save it as a place"** passes a type: restaurant, cafe, bar, museum, beach, tour, spa as the same ids; sight and attraction as `landmark`; show as `theater`; hike as `trailhead`; shop as `market`; hotel, rental, hostel as the same ids; camp as `campsite`; a flight's airport as `airport`, a train's station as `train-station`, a ferry's as `ferry-terminal`, a car's pick-up as `car-rental`; anything else none.
  - **A place on the plan** (dropped, a link) shows the summary's new `icon` where the plan draws it, so a café looks like a café in the Itinerary too.
- **Words per environment.** The module's own name follows the environment ("Locations" in Thomas's environment) as today; the form's words do not use the module name. Category labels are the owner's. Type labels and aliases are English library words; another language is a later library, not a setting.
- **Picture maps.** Everything here works on a picture map: types and status are not geographic. `osm` is unused there because the outside search is off. Some types (EV Charging, ATM) simply go unused in an invented world.

## Maps and Places: one module or two (question 6)

Asked before and still open. The options:

1. **One module with Map and Places views.** One thing to switch on. Moving `place:` keys or retiring the `maps` id breaks the Planner's `places:place` pointers and the Map files setting's home unless the merged module keeps the `places` id and takes Maps' settings with a migration. The largest change.
2. **A paired switch in Set up.** Turning Maps on turns Places on; turning Places off asks and turns Maps off; Set up shows them as one row ("Places and map", with the environment's names). Small, Set up only, nothing stored moves.
3. **Leave as is.** Maps `requires: ["places"]` and the Modules tab says why.

**Lean: 2.** It removes the confusion Thomas met without moving data, and the composite ([plan-map-places](plan-map-places.md)) already shows them as one thing on the Workspace. This plan works under all three: Places owns the data, the library and the form; Maps only draws what the summaries say.

## Left to build, in order

Each step is a try build: one builder, its own checks, pushed at once, a patch or minor version bump for each module it changes.

1. **The server pieces** (server-development; first). Summary fields: `icon` (a Font Awesome Free solid name, kept only when the icon exists in `svgs/solid`), `visit` (kept only when `want`, `booked`, `visited` or `favorite`), `spaces` (up to 20 ids of spaces that exist); the `category` limit raised from 20 to 30. `host.objects.search(q, { scope: 'environment', in: <space id> })` and its route's `in` query. `server/module-build.js` inlines `src/<id>-lib-<name>.json` as `const LIB_<NAME>`. The manifest check lists the new summary fields. Cases in `tools/check-links.mjs` (summaries), `tools/check-modules.mjs` (the build and the manifest) and `tools/check-places.mjs` for a summary with each field. No module bump.
2. **The library in Places** (experience-design). `places-lib-types.json` from the appendix; the eleven default categories; `cleanPlace` reads `type`, `icon`, `iconOwn`, `color`, `status` and the old category ids; the Type and Look pickers and the Status buttons in the form; list rows with the drawn icon and colour and the status; the summary maps `icon`, `visit` and `category`; saving a search result picks a type by `osm`; `categoryColors` also answers type colours. `check-places` checks the library as above. Places 0.11.0.
3. **Belonging in Places** (experience-design; after question 1, 2 and 3). The **Shows in** ticks and their line; the home rule and the refusal of two spaces without Everyone; marks, bookmarks (`saved:`), moves with forwards, the narrowing question; the place menu's new entries; the lists' union and the space chips; `addPlace`'s default and its `in`; the marks-only retry on 409; `sharePlace` (provided, not local: `{ place: ref, in: [...] }`, answering the new pointer). `check-places` gains the home rule, a move with its forward, a bookmark to a gone place, and two spaces refused. Places 0.12.0.
4. **Maps** (experience-design). Each pin once by its home pointer; the summary's `icon` on the pin, the colour by the override order, the status badge; in a space, "This <space>" also asks `in: <space id>`; a forward never drawn. `check-maps`. Maps 0.9.0.
5. **The Planner** (experience-design). "Save it as a place" passes the type and uses `sharePlace` for a private place in place of the copy; a place on the plan shows its `icon`. `check-travel`. The Planner's minor bump. Budget: no change.

Optional later: three more theme tints (question 5); Set up's paired switch (question 6, a Set up change, its own step).

## Verify

- **Step 1** by the checks named there, and live with curl: a place summary with an icon that exists and one that does not, a search with `in`, a module zip built with a lib JSON and opened.
- **Step 2** live in headless Chromium on a space's canvas and the Map's panel: "coffee" and "metro" in the Type picker, an icon override and a colour override, each status, a category taken off the list with its types under Other, the old ids `eat` and `do` through `addPlace`. `check-module-versions`, `check-places`.
- **Step 3** live with two accounts and a guest link: a place made on a trip lands in Everyone and the trip; the second account outside the trip sees it in Everyone's list without the trip's chip; a second trip ticked; two trips without Everyone refused; a private place shared, its forward followed from a Planner object; narrowing with the question; a bookmark, then the place deleted; two people ticking at once. `check-places`, `check-links`, `check-drop`.
- **Step 4** in headless Chromium without WebGL (list state) and by `check-maps`; the pins themselves need WebGL.
- **Step 5** by `check-travel` and live: "Save it as a place" on a hotel booking gives a Hotel.
- **Only Thomas can check:** the pins' icons and badges drawn with WebGL from real map tiles; the Type picker as a sheet on a real phone (the keyboard, 44 px rows, scrolling a 150-type list); the ticks with VoiceOver or TalkBack; Safari and Firefox; real Photon results getting their type. None of this needs a LiveKit call.

## Risks

- **Moves are the new failure mode.** A move is two writes in two stores; a failure between them must leave the place readable in one of them. Places writes the new home first, then the forward, and the check covers a failed second write.
- **Guests and the environment default** (question 4): the default makes trip places invisible to guest-link guests.
- **The summary's `spaces` field** names space ids to everyone who reads the environment's places. Space names are already listed to every member, so nothing new is revealed, but a check must make sure no other field of a space (its members) comes with it.
- **`kindPicker` with about 150 options** has not been tried at that size; step 2 measures opening and typing on a slow phone.
- **Step 3 and the separate try build** both change the place form; step 3 waits for that build.

## Assumed (Thomas can change these)

- **The visit status is one value shared by everyone who sees the place.** "Booked" is a fact about the trip; a personal Favorite could live in the bookmark later.
- **Status is set by hand.** A place a Planner booking points at is not marked Booked automatically.
- **`owners` stays** as the people a place is for, separate from where it shows.
- **The Planner shares a private place** rather than copying it (step 5), telling the person.
- **The drawn icon is stored on the record**, so a library change reaches a place only when it is next saved.

## What is not decided

Questions for Thomas, in the order they block the build. Each lean is a suggestion.

1. **The model** (blocks steps 3 to 5). A, one place with one home and marks (lean, above). B, copies in each store tied by an origin id: no moves, but copies drift, one edit is not seen everywhere, and it is today's behaviour Thomas asked to replace. C, one record in the environment's store with a list of who may read it, enforced by the server on every read (list, change events, resolve, search, links, exports): the only way to put a place in two spaces but not everyone, and it lets guests see it, but it changes the server's read path everywhere and is the riskiest.
2. **The default on a trip** (blocks step 3). Everyone and this trip (lean: the person working on the trip expects it in the trip's list and on its map) or Everyone only (closest to Thomas's words; the trip's map then shows it only with Everyone's switched on).
3. **Who may add to Everyone** (blocks step 3). Everyone with Places' `edit` right (lean, today's rule, needed for members to use the default) or owners and moderators only, in which case a member's default is the trip.
4. **Guests on a guest link** (does not block). Accept that they do not see the trip's places kept in the environment (lean, for the first build), or add a server rule letting a space's readers read the environment's places marked for that space (a narrow form of C).
5. **Category colours** (does not block; step 2 ships automatic). Automatic tints with three shared (lean for now), fixed colours in the defaults (not theme-aware, against the theme rule), or three new theme tints so each category has its own (a theme change, later step).
6. **Maps and Places** (does not block). One module, a paired switch in Set up (lean), or as is.

Not in this plan: custom types and type editing by the owner; a per-template library; per-person status; deriving Booked from the Planner; importing a list of places.

## Appendix: the first type library

Each entry: label (`id`, `icon`): aliases. All icons are Font Awesome Free solid names present in the bundled 7.3.1.

**Food & Drink (`food`)**, 19 types:

- Restaurant (`restaurant`, `utensils`): dinner, lunch, eatery, bistro, diner.
- Café (`cafe`, `mug-hot`): coffee, espresso, coffee shop.
- Bakery (`bakery`, `bread-slice`): bread, pastry, patisserie, boulangerie.
- Bar (`bar`, `martini-glass`): cocktails, drinks, lounge.
- Pub (`pub`, `beer-mug-empty`): tavern, beer, brewpub, inn.
- Brewery (`brewery`, `beer-mug-empty`): beer, craft beer, taproom.
- Winery (`winery`, `wine-glass`): wine, vineyard, wine tasting, cellar door.
- Wine Bar (`wine-bar`, `wine-bottle`): wine, enoteca.
- Fast Food (`fast-food`, `burger`): burger, takeaway, takeout.
- Pizzeria (`pizza`, `pizza-slice`): pizza.
- Ice Cream (`ice-cream`, `ice-cream`): gelato, dessert, frozen yogurt.
- Street Food (`street-food`, `hotdog`): food truck, food stall, hawker.
- Food Hall (`food-hall`, `bowl-food`): food court, market hall.
- Breakfast & Brunch (`breakfast`, `egg`): brunch, breakfast.
- Tea House (`tea-house`, `mug-saucer`): tea, tearoom.
- Seafood (`seafood`, `fish`): fish, oysters, sushi.
- Dessert (`dessert`, `cake-candles`): cake, sweets, patisserie.
- Grocery Store (`grocery`, `basket-shopping`): supermarket, groceries, food shop.
- Deli (`deli`, `cheese`): delicatessen, sandwiches.

**Accommodations (`stay`)**, 10 types:

- Hotel (`hotel`, `hotel`): lodging, accommodation.
- Hostel (`hostel`, `bed`): dorm, backpackers.
- Vacation Rental (`rental`, `house`): airbnb, apartment, holiday home, villa, cottage.
- Bed & Breakfast (`bnb`, `bed`): b&b, guesthouse, inn.
- Resort (`resort`, `umbrella-beach`): all inclusive.
- Campsite (`campsite`, `campground`): camping, tent, campground.
- RV Park (`rv-park`, `caravan`): caravan, motorhome, camper.
- Cabin (`cabin`, `house-chimney`): lodge, chalet.
- Motel (`motel`, `bed`): motor inn.
- Friends & Family (`friends`, `house-user`): staying with, host.

**Sights & Culture (`sights`)**, 18 types:

- Landmark (`landmark`, `landmark`): sight, attraction, sightseeing.
- Museum (`museum`, `building-columns`): gallery, exhibition.
- Art Gallery (`art-gallery`, `palette`): art, gallery, exhibition.
- Castle (`castle`, `chess-rook`): fort, fortress, palace.
- Monument (`monument`, `monument`): memorial, statue.
- Church (`church`, `church`): cathedral, chapel, basilica.
- Temple (`temple`, `place-of-worship`): shrine, pagoda, worship.
- Mosque (`mosque`, `mosque`): masjid.
- Synagogue (`synagogue`, `synagogue`): temple.
- Historic Site (`historic-site`, `archway`): ruins, heritage, archaeological.
- Viewpoint (`viewpoint`, `binoculars`): lookout, scenic view, overlook, vista.
- Old Town (`old-town`, `city`): historic district, quarter.
- Bridge (`bridge`, `bridge`): crossing.
- Tower (`tower`, `tower-observation`): observation deck.
- Library (`library`, `book`): books, archive.
- Cemetery (`cemetery`, `cross`): graveyard.
- University (`university`, `graduation-cap`): college, campus.
- Neighborhood (`neighborhood`, `map-location-dot`): district, area.

**Nature & Outdoors (`nature`)**, 17 types:

- National Park (`national-park`, `tree`): park, reserve, nature reserve.
- Park (`park`, `tree`): garden, green space.
- Garden (`garden`, `seedling`): botanical garden, gardens.
- Beach (`beach`, `umbrella-beach`): seaside, coast, shore, sand.
- Trailhead (`trailhead`, `person-hiking`): hike, hiking, trail, walk.
- Mountain (`mountain`, `mountain`): peak, summit.
- Lake (`lake`, `water`): pond, reservoir.
- River (`river`, `water`): stream, canal.
- Waterfall (`waterfall`, `water`): falls, cascade.
- Hot Spring (`hot-spring`, `hot-tub-person`): onsen, thermal bath, geothermal.
- Cave (`cave`, `dungeon`): cavern, grotto.
- Forest (`forest`, `tree`): woods, woodland.
- Island (`island`, `umbrella-beach`): isle.
- Wildlife Spot (`wildlife`, `binoculars`): birdwatching, safari, animals.
- Picnic Spot (`picnic`, `basket-shopping`): picnic.
- Ski Area (`ski-area`, `person-skiing`): ski, skiing, snowboard, slopes.
- Campfire (`campfire`, `fire`): bonfire, fire pit.

**Activities & Experiences (`activities`)**, 23 types:

- Theme Park (`theme-park`, `ticket`): amusement park, rides, roller coaster.
- Zoo (`zoo`, `hippo`): animals, safari park.
- Aquarium (`aquarium`, `fish`): sea life, oceanarium.
- Water Park (`water-park`, `person-swimming`): waterpark, slides.
- Snorkeling (`snorkeling`, `person-swimming`): snorkel, reef.
- Diving (`diving`, `water`): scuba, dive.
- Swimming (`swimming`, `person-swimming`): pool, swim, lido.
- Surfing (`surfing`, `water`): surf.
- Boat Tour (`boat-tour`, `sailboat`): cruise, boat trip, sailing.
- Kayaking (`kayaking`, `sailboat`): canoe, paddle, rafting.
- Guided Tour (`tour`, `flag`): tour, walking tour, guide.
- Cooking Class (`cooking-class`, `kitchen-set`): cooking, culinary class.
- Class or Workshop (`class`, `chalkboard-user`): workshop, lesson, course.
- Cycling (`cycling`, `bicycle`): bike, bike rental, biking.
- Golf (`golf`, `golf-ball-tee`): golf course.
- Climbing (`climbing`, `mountain`): rock climbing, bouldering.
- Horse Riding (`horse-riding`, `horse`): riding, stables.
- Fishing (`fishing`, `fish`): angling.
- Sports Venue (`sports`, `futbol`): stadium, arena, football, soccer.
- Bowling (`bowling`, `bowling-ball`): bowling alley.
- Escape Room (`escape-room`, `key`): puzzle room.
- Playground (`playground`, `children`): kids, play area.
- Photo Spot (`photo-spot`, `camera`): photography, instagram.

**Entertainment & Nightlife (`nightlife`)**, 11 types:

- Theater (`theater`, `masks-theater`): theatre, play, musical, opera.
- Concert Venue (`concert-venue`, `music`): concert, live music, gig.
- Cinema (`cinema`, `film`): movies, movie theater.
- Nightclub (`nightclub`, `compact-disc`): club, dancing, disco.
- Casino (`casino`, `dice`): gambling, slots.
- Comedy Club (`comedy-club`, `face-laugh`): stand-up, comedy.
- Jazz Club (`jazz-club`, `guitar`): live music, blues.
- Karaoke (`karaoke`, `microphone`): sing.
- Festival (`festival`, `champagne-glasses`): fair, celebration, carnival.
- Arcade (`arcade`, `gamepad`): games, video games.
- Event Venue (`event-venue`, `ticket`): venue, hall.

**Shopping (`shopping`)**, 11 types:

- Shopping Mall (`shopping-mall`, `bag-shopping`): mall, shopping centre, shopping center.
- Local Market (`market`, `store`): market, farmers market, bazaar, souk.
- Souvenir Shop (`souvenir-shop`, `gift`): souvenirs, gifts.
- Boutique (`boutique`, `shirt`): clothes, fashion, clothing.
- Bookshop (`bookshop`, `book-open`): bookstore, books.
- Department Store (`department-store`, `building`): department.
- Outlet (`outlet`, `tags`): outlet mall, discount.
- Antiques (`antiques`, `chair`): antique shop, vintage, thrift.
- Wine Shop (`wine-shop`, `wine-bottle`): liquor store, off licence, bottle shop.
- Duty Free (`duty-free`, `cart-shopping`): tax free.
- Convenience Store (`convenience-store`, `shop`): corner shop, bodega, 7-eleven.

**Transportation (`transport`)**, 15 types:

- Airport (`airport`, `plane`): flight, terminal, airfield.
- Train Station (`train-station`, `train`): railway, rail, station.
- Metro Station (`subway`, `train-subway`): subway, underground, metro, tube.
- Tram Stop (`tram`, `train-tram`): tram, streetcar, light rail.
- Bus Station (`bus-station`, `bus`): bus stop, coach.
- Ferry Terminal (`ferry-terminal`, `ferry`): ferry, port, harbour, harbor.
- Car Rental (`car-rental`, `car`): hire car, rental car, rent a car.
- EV Charging (`ev-charging`, `charging-station`): charger, electric car, charging point.
- Gas Station (`gas-station`, `gas-pump`): petrol, fuel, service station.
- Parking (`parking`, `square-parking`): car park, garage, parking lot.
- Taxi Stand (`taxi`, `taxi`): cab, rideshare, uber.
- Cable Car (`cable-car`, `cable-car`): gondola, funicular, ropeway.
- Bike Rental (`bike-rental`, `bicycle`): bike share, scooter.
- Marina (`marina`, `anchor`): harbour, harbor, dock, port.
- Border Crossing (`border-crossing`, `passport`): border, customs.

**Services & Essentials (`services`)**, 14 types:

- Tourist Information (`tourist-info`, `circle-info`): visitor center, information, tourist office.
- ATM (`atm`, `money-bill`): cash machine, cash point, bank.
- Bank (`bank`, `building-columns`): money exchange.
- Currency Exchange (`currency-exchange`, `money-bill-transfer`): bureau de change, money exchange.
- Luggage Storage (`luggage-storage`, `suitcase-rolling`): left luggage, bag storage, lockers.
- Post Office (`post-office`, `envelope`): mail, post.
- Laundry (`laundry`, `shirt`): laundromat, dry cleaning, laundrette.
- Wi-Fi (`wifi`, `wifi`): internet, wireless.
- Restrooms (`toilets`, `restroom`): toilet, wc, bathroom, loo.
- Police (`police`, `shield-halved`): police station.
- Embassy (`embassy`, `flag`): consulate.
- Phone Shop (`sim-card`, `sim-card`): sim, mobile, phone.
- Coworking (`coworking`, `laptop`): cowork, office, workspace.
- Drinking Water (`water`, `faucet-drip`): water fountain, refill.

**Health & Wellness (`health`)**, 8 types:

- Hospital (`hospital`, `hospital`): emergency, er, a&e.
- Pharmacy (`pharmacy`, `prescription-bottle-medical`): chemist, drugstore.
- Clinic (`clinic`, `stethoscope`): doctor, medical centre, gp.
- Dentist (`dentist`, `tooth`): dental.
- Spa (`spa`, `spa`): massage, wellness, sauna.
- Gym (`gym`, `dumbbell`): fitness, workout.
- Yoga (`yoga`, `person`): yoga studio, pilates, meditation.
- Veterinarian (`veterinary`, `paw`): vet, animal hospital.

**Personal & Other (`other`)**, 7 types:

- Home Base (`home-base`, `house`): home, base, home base.
- Meeting Point (`meeting-point`, `people-group`): meet up, rendezvous, meeting place.
- Friend's Place (`friends-place`, `user-group`): friend, family.
- Work (`work`, `briefcase`): office, workplace.
- Favorite Spot (`favorite`, `star`): favourite, special.
- Idea (`idea`, `lightbulb`): maybe, someday.
- Custom Location (`custom`, `location-dot`): pin, other, custom.
