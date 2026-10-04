# Object Handoff Plan

**Audience:** Thomas decides. server-development builds the format, the manifest field, the bus and the routes;
experience-design builds the modules' mapping, the SDK helpers, Chat's import preview and **Send to...**;
content-manager documents.

**Status:** approved by Thomas, 2026-10-03, with every open question of the draft answered as recommended (decisions 8 to
19); steps 1-5 built 2026-10-03 and steps 6-8 on 2026-10-04, the rest not built. From two GitHub issues that share one question: what each module accepts,
in which shape, and how content maps into its fields.

- #182, the import from another AI. Thomas: "our prompt needs to include instructions for ANYTHING we support
  importing. A user may have AI send a full itinerary (which I did at one point and it worked, so not sure what
  happened since then)". An imported Southwest flight (MDW to SJC, 12:50 PM to 3:25 PM) became a Planner flight with
  every structured field empty and the whole text, as raw Markdown, in Notes.
- #181, **Send to...** on a chat message. Thomas: "It needs to be smart, so if, say, the chat message is an image and
  they choose research, it goes in as an image."

It builds on [plan-research-import](plan-research-import.md) (the objects format and the import), its "Later: more
destinations" section (a generic conduit for To-do and Calendar), [plan-one-input](plan-one-input.md) (Chat's input,
commands, paste import), [plan-chat-model](plan-chat-model.md) (message shapes), [plan-chat-links](plan-chat-links.md)
(Keep for links, `may` on the actions list) and [plan-kind-names](plan-kind-names.md) (the `objects` fence and file).

## What it is today

### The objects format

- `server/object-format.js` owns the format. An object is `icon`, `kind`, `title`, `content`, `tags`, `place`, `date`
  (`YYYY-MM-DD`) and `links`; `title` and `content` are required. `KINDS` is 13 words: `flight`, `train`, `bus`,
  `ferry`, `car`, `hotel`, `restaurant`, `cafe`, `bar`, `sight`, `museum`, `tour`, `show`. There is no `event`, `task`,
  `poll`, `note` or `link` kind, and no field for a time, a route, a booking reference or anything else a kind has.
- `objectRule` builds the text for both the copied instructions (`instructions()`, fence `objects`) and the in-app
  `/ai` rule (`SUMMARY_RULE` in `server/ai.js`, fence `card`). Both end "add no other fields" or "Leave out the optional
  parts you do not need". The AI in #182 obeyed: everything it knew went into `content`.
- `cleanObject` keeps only the listed fields; anything else is dropped. `readObjects` reads a paste, raw JSON or a
  `.objects.json` file, at most 50 objects. `schema()` is served at `GET /api/objects/format/schema`.

### Where an imported object goes

- Chat's paste import and an AI answer's **Keep** (`public/chat-input.js`) find two actions by name and input shape
  (`findKeepers`): `acceptSuggestion` (the Planner's, needs `title` and `kind`) for an object with a `kind`, else
  `saveNote` (Research's). To-do, Calendar and Polls are never offered. The person cannot choose.
- `suggestionInput` sends `title`, `kind`, `content` (with links and "External source" appended), `place` and `date`.
- The Planner's `fromSuggestion` (`modules/travel/src/travel-lib-plan.js`) turns `kind` into a journey, stay or stop
  type, `date` into the day, and `content` into `notes`. Nothing else. It cannot fill an airline, a flight number, the
  airport codes, a departure time, a length, a seat or a booking reference, though the Planner stores all of them
  (`cleanItem` in `travel-lib.js`: `operator`, `number`, `fromCode`, `toCode`, `from`, `to`, `time`, `minutes`,
  `terminal`, `gate`, `seat`, `travelClass`, `confirm`; for a stay `checkOut`, `checkOutTime`, `roomType`, `guests`,
  `address`; for a stop `partySize`, `reservationName`, `admissionCount`).
- The Planner shows Notes as Markdown on the plan (`setMarkup`), but its editor's Notes box shows the raw text, which
  is where Thomas saw `**markdown**`.
- **No date:** the object goes under **Not on a day yet** (since a77c549, 2026-09-26). **A date outside the plan:**
  the plan's days stretch to cover it (`stretchFor`). Past 60 days the object is saved with its date, a message says
  the day is left off, and the object then shows nowhere: `itemsByDay` skips a day outside the plan, and **Not on a
  day yet** lists only objects with no date.
- **Arrival:** a journey stores a departure `time` and a length `minutes`; the arrival is worked out from them
  (`arrivalOf`). There is no time zone, so a flight across zones cannot show both the ticket's arrival time and the
  true flight time.

### The modules' actions (`module.json`, `actions.provides`)

| Module | Action | Input | Local |
|---|---|---|---|
| Planner (`travel`) | `acceptSuggestion` | `title`, `kind?`, `content?`, `place?`, `date?` | no |
| Planner | `addStop`, `addToDay` | a title or a pointer, a day | no |
| Planner | `addFromText` | `text` (opens the form) | yes |
| Research | `saveNote` | `title`, `body?`, `tags?`, `icon?`, `kind?`, `ref?` | no |
| Research | `saveLink` | `url` (text), `title?`, `excerpt?`, `ref?` | no |
| Research | `addNote` | `text` | yes |
| To-do | `createTask` | `title`, `notes?`, `ref?` (no due date) | no |
| To-do | `setTaskDue`, `linkTask` | a task pointer and a date or pointer | no |
| Calendar | `createEvent` | `title`, `date` (required), `ref?`; always an all-day event | no |
| Polls | `addPoll` | `text` (opens the form) | yes |

Research keeps photos as uploads (`host.uploads.put`, `modules/research/module.json` `uploads`: JPEG, PNG, WebP, up to
10 MB) but has no action that takes one.

### The bus and the actions list

- `busInput` in `server/index.js` checks each input field by its declared type: `string` (200 characters), `text`
  (8000), `date`, `datetime` (turned into a UTC instant with `toISOString`, so a local time is lost), `boolean`,
  `number`, `ref`. There is no type for a nested object. A module may declare 10 actions with 10 input fields each.
- `GET /api/spaces/:id/actions` lists every placed module's actions with `may`: true for a local action, else whether
  the caller may write to that module here. A local action's `may` says nothing about a finer permission such as Polls'
  `create`.
- A non-local action runs on whichever page of the module claims it, and waits up to seven days for one to be open.

### Chat

- Message shapes ([plan-chat-model](plan-chat-model.md)): an ordinary message (`text`, maybe a `preview` of its first
  link and `kept`), a command echo (`kind: "command"`, `command`, `module`, `text` the words after the command), an AI
  answer (`kind: "ai"`, `text`, `summaries`: its objects, cleaned by `cleanObject`), and a picture. Messages can be
  public or private.
- Pictures are live only: shrunk in the sender's page (`shrinkImage`, at most 1600 pixels and about 1.5 MB, JPEG unless
  the original already fits; a small GIF stays a GIF), sent over LiveKit on the `chat-image` topic, and held as a
  `Blob` in each page that received it. They are never stored on the server; after a refresh they are gone.
- Each message's menu has **Send to...**, which does nothing (`public/space.js`, `onPick: () => {}`).

### Dropping

`host.objects.dropMenu` (`public/sdk/host.js`) offers a module's own choices plus actions of the dropped object's own
module, lets the person choose through `host.actions.pick`, and remembers the choice per kind of object and place in
the browser (`app:pick:<module>:<kind>:<place>`), listing it first with "last used". Calendar's drop is the documented
example ([userguide-calendar](../userguides/userguide-calendar.md), "Dropping something on the calendar").

## The regression question

Thomas remembers a full itinerary import working. Read as code only, from git (this repository's history starts at
8ddea49, the #78 merge on 2026-09-25; nothing earlier can be compared):

- **The format never carried times or structured details.** 8ddea49 already had today's fields and "add no other
  fields". [plan-research-import](plan-research-import.md) records the format before #78 (`SUMMARY_RULE`'s `card`
  blocks) with the same fields.
- **f06cddf** (2026-09-26) only changed the prompt from one fenced block per object to one block holding an array. The
  reader accepts both.
- **e3dc35f** (2026-09-27) and **1b2c273** (2026-09-30) renamed the fence (`magpie`, then `collaborator`, then
  `objects`) and the file marker. Since 1b2c273, a paste with an old `magpie` or `collaborator` block is refused whole
  with "that answer is in an older format". That is a refusal, not empty fields, so it is not what #182 saw, but anyone
  whose AI kept older instructions (a saved project or custom instructions) now gets nothing.
- **The Planner's import path is unchanged since 8ddea49:** `fromSuggestion` and `suggestionInput` are identical.

**Finding: no regression in what an import fills.** An itinerary with dates lands each object on its day, with the
right kind's look, then and now; flight numbers, times and airports were never filled. The earlier itinerary most
likely had dates; the Southwest example had none, so it went under **Not on a day yet**. Two later changes can make the
same attempt look worse: the refusal of old fences (1b2c273), and since 746d7b4 (2026-09-26) an object dated more than
60 days from the rest of the plan is saved but shown nowhere (above). None of this has been checked live.

## Decisions

From the two issues, in Thomas's words where he gave them (2026-10-03). Decisions 8 to 19 are the draft's open
questions, each approved as recommended on 2026-10-03.

1. **The prompt covers everything that can be imported:** flights, trains, buses, ferries, cars, stays, restaurants,
   sights, tours, shows, events, tasks, polls, notes and links, each with its fields. Reason: "our prompt needs to
   include instructions for ANYTHING we support importing."
2. **Full itineraries work:** many objects, each with its day and times.
3. **Structured details per kind are optional and loose:** a model that leaves them out still works as today.
4. **Each receiving module maps the details into its own fields:** the Planner's forms and its day and time placement,
   the Calendar's start and end, the To-do's due date.
5. **Markdown becomes plain text in plain-text fields.**
6. **Send to... is smart about what the message is:** a picture sent to Research arrives as an image. Reason: "It
   needs to be smart."
7. **Send to... lists only targets the person may write to, and says what will happen** ("Add to Research as an
   image").
8. **The server owns the kinds and their fields; modules declare which kinds they take.** The catalogue lives in
   `server/object-format.js`, each action declares `takes`, and the prompt lists only kinds some enabled module takes.
   Reason: one schema for every AI and every module, no clashes between modules, and the server still names no module.
9. **The format stays `formatVersion` 1.** `details` and the new kinds are additions. Reason: a version 2 file would be
   refused by an older server for no gain.
10. **A missing date is asked for in the import preview,** per object, optional, with "Same day for all"; the prompt also
    tells the AI to ask for dates and never guess. Reason: an undated itinerary is what made #182 look broken.
11. **The Planner stores a flight's arrival as on the ticket** (`arrives`, local day and time) beside `minutes`, and
    shows it when set. Reason: across time zones both the arrival and the flight time are then right, for one optional
    stored field and one editor field.
12. **An object dated beyond the plan's 60 days goes under Not on a day yet,** with "Dated <date>, outside the plan" in
    its notes, and the person is told. Reason: today it is saved and shown nowhere.
13. **Details travel on the bus as a new input type, `object`,** cleaned by the format's own checker. Reason: flat
    fields per action would exceed the 10-field limit for a flight.
14. **Send to... saves at once when the object has what the target needs,** otherwise opens the target's form filled
    in; Polls always opens its form. Reason: like Keep and dropping, with a form only where there is something left to
    say.
15. **A picture is uploaded into the target module's own uploads, then the action names the file's id.** Reason: it uses
    the uploads, limits and checks that exist.
16. **An AI answer with several objects:** the message's Send to... sends what each target takes, and each object's own
    Keep and menu send that one.
17. **No stored "sent" mark** beyond a link's existing "Kept by"; a short note confirms. Reason: as
    [plan-research-import](plan-research-import.md) chose no duplicate detection.
18. **Authors may send their private messages** anywhere they may write, with the hint that the space will see it.
19. **The Calendar takes only events, text and dated objects, not the travel kinds.** Reason: the Planner already puts
    every dated plan object on the Calendar, so a travel space gets no duplicates, and a flight still reaches the
    Calendar through the Planner.

## The contract

### 1. Kinds and their details

The objects format gains five kinds and one optional field. The kinds are the format's, not any module's, and stay in
`server/object-format.js`:

- `KINDS` becomes the 13 of today plus `event`, `task`, `poll`, `note` and `link`. `hotel` stays the word for a stay
  (an existing stored kind); a rental or hostel is a `hotel` and the Planner's own type picker can change it.
- `image` is a kind for handoffs between pages only (Send to... a picture). The prompt never names it, and
  `readObjects` drops it from an import.
- `details`: an optional JSON object whose fields depend on `kind`. An unknown field, a value of the wrong type, and
  `details` on an object without a kind are dropped silently, field by field, like every other field today.
- `content` is no longer required when `details` keeps at least one field (a flight is fully described by its
  details). `title` stays required.

**Value types.** Every field is optional.

| Type | Written as | Kept as |
|---|---|---|
| `when` | `YYYY-MM-DDTHH:MM`, `YYYY-MM-DD`, or `HH:MM` when the date is not known; 24-hour; local time where it happens; no zone or offset (a trailing `Z` or offset is dropped, keeping the clock time) | the same string, checked as a real date and time; seconds dropped |
| `point` | `{ "code": "MDW", "name": "Chicago Midway" }`, or a plain string | `code`: 2 to 5 letters or digits, upper-cased; `name`: up to 120 characters. A string of 3 capital letters is a code, any other string a name |
| `text:N` | a string | plain text, Markdown removed, cut at N characters |
| `count:N` | a whole number | 1 to N |
| `minutes` | a whole number | 1 to 10080 (7 days) |
| `flag` | `true` or `false` | as given |
| `options` | an array of strings | 2 to 10, each up to 80 characters, duplicates dropped |

**The catalogue.** Field names follow Thomas's words in #182 (`departs`, `arrives`, `checkIn`, `checkOut`,
`reference`).

| Kind | Fields |
|---|---|
| `flight` | `airline` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes` (time in the air), `terminal` text:30, `gate` text:30, `seat` text:30, `class` text:30, `reference` text:60 |
| `train` | `operator` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes`, `platform` text:30, `carriage` text:30, `seat` text:30, `class` text:30, `reference` text:60 |
| `bus` | `operator` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes`, `seat` text:30, `reference` text:60 |
| `ferry` | `operator` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes`, `cabin` text:30, `seat` text:30, `reference` text:60 |
| `car` | `company` text:60, `from` point (pick-up), `to` point (drop-off), `departs` when (pick-up), `arrives` when (drop-off), `class` text:30, `reference` text:60 |
| `hotel` | `address` text:200, `checkIn` when, `checkOut` when, `roomType` text:60, `guests` count:99, `reference` text:60 |
| `restaurant`, `cafe`, `bar` | `starts` when, `ends` when, `minutes`, `address` text:200, `partySize` count:99, `name` text:60 (the booking's name), `reference` text:60 |
| `sight`, `museum`, `tour`, `show` | `starts` when, `ends` when, `minutes`, `address` text:200, `tickets` count:999, `reference` text:60 |
| `event` | `starts` when, `ends` when, `allDay` flag, `address` text:200 |
| `task` | `due` when |
| `poll` | `options` options, `closes` when, `multiple` flag |
| `note` | none |
| `link` | none: the link is the first of `links` |
| `image` | `upload` (a file id, set by the sending page, never by an AI), `name` text:120 |

The object's own `date` stays: the day it belongs to. When `date` and a details date disagree, the details win; when a
`when` is a time alone, `date` supplies its day.

The schema (`schema()`) gains `details` as a `oneOf` per kind, built from the same catalogue. `cleanObject` gains
`cleanDetails(kind, raw)`; `readObjects`, `/ai` answers and the bus's `object` input (below) all go through it.

### 2. What modules declare

A provided action may declare what objects it takes, with a new optional `takes` on the action in `module.json`:

```json
{
  "name": "acceptSuggestion",
  "label": "Add it to the trip, properly typed",
  "input": { "title": "string", "kind": "string?", "content": "text?", "place": "string?", "date": "date?", "object": "object?" },
  "takes": [
    { "kinds": ["flight", "train", "bus", "ferry", "car"], "as": "{kind}" },
    { "kinds": ["hotel"], "as": "a stay" },
    { "kinds": ["restaurant", "cafe", "bar", "sight", "museum", "tour", "show", "event"], "as": "{kind}" },
    { "kinds": ["note"], "as": "a note" }
  ]
}
```

- `kinds`: kinds from the catalogue, `"*"` for any object (with or without a kind), or `"text"` for an ordinary
  message's words. Install refuses an unknown kind, naming the action.
- `as`: the words after "Add to <module> as", up to 40 characters; `{kind}` is the object's kind with "a" or "an".
- `permission` (optional): a key from the module's `permissions` the person must have, beyond the action's usual rule.
  `GET /api/spaces/:id/actions` folds it into `may`. Polls uses it so only someone who may create polls sees "Start a
  poll".
- An action with `takes` must have an input field of the new type `object` (install refuses it otherwise).
- `GET /api/spaces/:id/actions` returns `takes` on each action. Chat, the import preview and any module find targets
  by `takes`, never by a module's id or an action's name. `findKeepers`' name lookup stays only for an older
  module that declares no `takes`.

**The bus's `object` type.** `busInput` reads an `object` field with `cleanObject` (and `cleanDetails`), as an import
does, so a module receives exactly what the checker keeps: at most 6000 characters of `content` plus details, no HTML,
no control characters. An object whose `kind` is not one of the action's `takes` is refused with 400 "<module> cannot
take <a kind>".

### 3. The prompt

`instructions()` (the copied instructions) and `SUMMARY_RULE` (`/ai`) stay one function, `objectRule`, so they cannot
drift. It now lists only the kinds that some module enabled in this environment takes (any action's `takes`), each with
its catalogue fields; a field no module uses is still listed, since the catalogue is one schema. Text, with the
environment's words shown as "object" and an environment where every bundled module is on:

````text
I keep my plans and research in Collaborator. When I ask you to find or plan something, answer as you normally would, then put every thing worth keeping in one JSON array inside one single fenced block (exactly one, never one per object), at most 50:
```objects
[{"icon":"plane","kind":"flight","title":"Southwest 1234, Chicago to San Jose","content":"optional notes; plain prose, or simple Markdown","date":"2026-11-14","details":{"airline":"Southwest","number":"1234","from":{"code":"MDW","name":"Chicago Midway"},"to":{"code":"SJC","name":"San Jose"},"departs":"2026-11-14T12:50","arrives":"2026-11-14T15:25","reference":"ABC123"},"tags":["one","word"],"place":{"name":"optional"},"links":[{"title":"optional","url":"https://..."}]}]
```
One object per thing. A whole itinerary is one object for each flight, train, stay, meal, visit and event, in the order they happen; a return flight is its own object. Never fold several into one object's text.
Set "kind" to what the object is: flight, train, bus, ferry, car, hotel, restaurant, cafe, bar, sight, museum, tour, show, event, task, poll, note or link. Leave it out only when none fits.
Dates and times: copy them from what I gave you; never guess a date or a year. If something happens on a day you were not told, ask me for the date before you write the block; if I do not know, leave the date out. Write a date as YYYY-MM-DD and a date with a time as YYYY-MM-DDTHH:MM, 24-hour, in the local time where it happens, with no time zone. If you know only the time, write HH:MM. Put the day in "date" as well.
"details" holds what a booking or plan says. Every field is optional; leave out what you do not know, and write nothing in "content" that is already in "details":
- flight: airline, number, from and to ({"code","name"}), departs, arrives, minutes (time in the air), terminal, gate, seat, class, reference
- train: operator, number, from, to, departs, arrives, minutes, platform, carriage, seat, class, reference
- bus: operator, number, from, to, departs, arrives, minutes, seat, reference
- ferry: operator, number, from, to, departs, arrives, minutes, cabin, seat, reference
- car: company, from (pick-up), to (drop-off), departs (pick-up), arrives (drop-off), class, reference
- hotel: address, checkIn, checkOut, roomType, guests, reference
- restaurant, cafe, bar: starts, ends, minutes, address, partySize, name (the booking's name), reference
- sight, museum, tour, show: starts, ends, minutes, address, tickets, reference
- event: starts, ends, allDay (true or false), address
- task: due
- poll: options (2 to 10 short answers), closes, multiple (true or false)
- note and link: no details; a link's address goes in "links".
The icon is one of: <ICONS>. Keep each title under 80 characters and each content under 6000. Links must start with http:// or https://. Add no fields other than these.
If I ask for a file instead, write one JSON file named <something>.objects.json holding {"format":"objects","formatVersion":1,"objects":[...]}, with the same objects in that one list. Do not write a separate file or a separate fenced block for each object.
````

- `/ai` gets the same lines with its own fence, noun and `basis`/`sources` tail, as today. It grows by about 1,500
  characters per question.
- `GET /api/objects/format` is unchanged in shape; its `instructions` and `schema` follow the environment's modules.

### 4. Mapping into each module

Each module maps an `object` input in its own code. Shared rules:

- **Plain text.** A new SDK helper, `host.util.plain(markdown)`, turns Markdown into plain text (bold and italics
  unmarked, links as "text (address)", lists as lines starting "- "). Used for every field a module shows as plain
  text: titles, To-do notes, the Calendar's description, a poll's question and options, every details field. Fields a
  module draws as Markdown keep it: Research's note and excerpt, the Planner's Notes.
- **Nothing is lost.** A details field a module has no place for goes into its notes as one line, "Cabin: 4B", after
  the content.
- **"External source"** and **Links:** lines are added as `keptText` does today, for imports only.
- **A `when` with no date** uses the object's `date`; with neither, the object has no day.

**Planner** (`acceptSuggestion` with `object`; a new `fromObject` beside `fromSuggestion`):

| Kind | Becomes | Fields |
|---|---|---|
| `flight`, `train`, `bus`, `ferry` | journey, `mode` the kind | `operator` (airline or operator), `number`, `fromCode`/`from` and `toCode`/`to` from the points, `date` and `time` from `departs`, `terminal`, `gate`, `platform`, `carriage`, `seat`, `travelClass` (class), `confirm` (reference); `arrives` stored as on the ticket (decision 11) |
| `car` | journey, `mode` car | `operator` (company), `pickup` and `dropoff` (the points' names), `date` and `time` from `departs`, `minutes` from `arrives` minus `departs` (up to 7 days, else a notes line), `confirm` |
| `hotel` | stay, `type` hotel | `date` and `time` from `checkIn`, `checkOut` and `checkOutTime` from `checkOut`, `roomType`, `guests`, `address`, `confirm` |
| `restaurant`, `cafe`, `bar` | stop, `type` the kind | `date` and `time` from `starts`, `minutes` (or `ends` minus `starts`), `address`, `partySize`, `reservationName` (name), `confirm` |
| `sight`, `museum`, `tour`, `show` | stop, `type` the kind | `date`, `time`, `minutes` as above, `address`, `admissionCount` (tickets), `confirm` |
| `event` | stop, `type` other | `date`, `time`, `minutes` from `starts` and `ends`, `address` |
| `note` | note | title, notes |

Placement: on its day when it has one. With none, under **Not on a day yet** (or the import's chosen day, below). A day
outside the plan stretches the plan as adding by hand does, and past 60 days goes under **Not on a day yet** with its date in
the notes, and the person is told (decision 12). An object put on
the plan from the Planner's own drop keeps the drop's day over the object's.

**Calendar** (`createEvent` gains `object`; `date` becomes `date?`, refused when neither is given):

- Takes `event`, `"text"` and dated objects, never the travel kinds (`flight`, `train`, `bus`, `ferry`, `car`, `hotel`,
  `restaurant`, `cafe`, `bar`, `sight`, `museum`, `tour`, `show`), which reach the Calendar through the Planner
  (decision 19). An event runs from `starts` to `ends`, or `starts` plus `minutes`.
- A date with no time: an all-day event, `end` the last day. A time: a timed event. The Calendar stores a timed start
  as an instant, so the local time is read in the time zone of the browser whose Calendar carries the request out
  (documented, not solved here).
- `allDay: true` forces all day. Description: the plain text of the content, then the details lines a person would
  want ("Southwest 1234, MDW to SJC, confirmation ABC123").
- Any other object or message with a day becomes an all-day event on it; one without a day is not offered to the
  Calendar.

**To-do** (`createTask` gains `object` and `due: "date?"`):

- Takes `task`, `"*"` and `"text"`. Title from the title; notes the plain text of the content and links; `due` the date
  of `details.due`, else the object's `date` for a `task`. A time on `due` goes into notes (To-do keeps a day only).
  Other kinds become a task named after the object, with no due date.

**Research** (`saveNote` and `saveLink` gain `object`; a new `savePhoto`):

- `link`, or any message whose first link is set: `saveLink` with `url`, `title`, `excerpt`.
- `image`: `savePhoto`, input `{ object: "object" }`, `details.upload` naming a file already in Research's uploads for
  this space. Research checks the file exists and is not already a photo, makes its thumbnail when it carries the
  request out (`host.uploads.thumb`), and saves a photo with `details.name` as its title.
- `note`, `"*"` and `"text"`: `saveNote`, as today, the kind and icon kept.

**Polls** (a new local `draftPoll`, `permission: "create"`):

- Takes `poll` and `"text"`. Opens Polls' own form filled in (question from the title, options, closing time, more
  than one answer); nothing is saved until the person saves it. Being local, it runs only on the person's own open
  Polls, as `/v` does; closed, Chat says "Polls isn't open", as for a command.

### 5. The import preview in Chat

Bring in research (paste or file) and an AI answer's objects:

- Each object shows its details in one line under the title ("Southwest 1234 · MDW 12:50 → SJC 15:25 · ABC123").
- **Its destination:** each object's **Keep** keeps to its default target, the first action that takes its kind, with
  the last target the person chose for that kind first. A small menu beside it lists the other targets with their
  labels, the same list as Send to... **Keep ticked** keeps each ticked object to its own target; the confirm names
  them ("Keep 3 flights and 2 stays in Planner, 1 task in To-do?").
- **A missing date** (decision 10): an object of a kind that has a day (journeys, stays, stops, events, tasks) and
  no date shows "No day" with a date field. Filled in, it is sent as the object's `date`. Left empty, it is kept with no
  day. One "Same day for all" field fills every empty one.
- Pasting old `magpie` or `collaborator` blocks stays refused, with today's sentence.

### 6. Send to...

**What each message is.** Chat turns the message into one or more objects in the format, on the page, then offers every
action whose `takes` fits and whose `may` is true:

| Message | Becomes | Usually offered |
|---|---|---|
| Ordinary text | `"text"`: title the first line (80 characters), content the whole text, `date` from `host.util.parseWhen` when it finds one | Research note, To-do task, Planner (with a day), Calendar (with a day), Polls draft |
| Text with a link | as above, plus `links` the first link with the preview's title and description; offered first as `link` | Research link, then as ordinary text |
| Picture | `image`, `name` the picture's name | Research image |
| AI answer with objects | its objects, as stored | each target that takes at least one of them |
| AI answer without objects | `"text"` from the answer's text | as ordinary text |
| Command echo, including `/ai` questions | `"text"` from the words after the command | as ordinary text |

**The menu.** One list, built by one function shared with the import preview's Keep menu:

- One entry per target action, labelled "Add to <module's shown name> as <as>": "Add to Research as an image", "Add to
  To-do as a task", "Add to Planner as a flight". For several objects: "Add 5 to Planner", hint "3 flights, 2 stays";
  objects that target cannot take are named in the hint ("1 task left out").
- Only entries with `may: true`. With no entry, **Send to...** is not in the menu. An aside has no chat.
- The last choice for that kind of message (text, link, picture, objects) comes first, marked "last used", remembered
  in the browser as `host.actions.pick` does.
- Choosing one sends at once (decision 14). A short note confirms: "Added to Research as an image", or "Waiting:
  it is added when Research is next open".
- A Research link from a message with a preview uses the existing keep route, so its "Kept by" mark is set as today.

**Pictures** (decision 15). Only a page that still holds the picture can send it:

1. Chat uploads the bytes to the target's own uploads, as the person, with the space's place:
   `POST /api/modules/<target>/uploads?scope=space&space=<id>&name=<name>`. The target is the module whose action
   takes `image`, found by `takes`. The usual write check, storage cap, `upload` rate limit and the module's `uploads`
   rule (Research: JPEG, PNG or WebP, 10 MB) apply. A GIF or another type the module does not take is redrawn as a JPEG
   of its first frame first.
2. Chat requests the action with `{ object: { kind: "image", title, details: { upload: <file id>, name } } }`. The
   bytes never go on the bus.
3. A request that never runs leaves the upload behind; it is removed with the request after seven days
   (server-development adds that sweep).

After a refresh, or for someone who joined after it was sent, a picture is gone and **Send to...** does not list
Research for it.

**AI answers with several objects** (decision 16): the message's **Send to...** offers each target with the
objects it takes; each object's own **Keep** and its menu send just that one.

**Private messages** (decision 18): only their author sees them, so only the author can send them. Sending puts the
content where the space can see it; the menu's hint says "Everyone in this <space> will see it".

### 7. Server routes and fields, in one place

- `module.json`: `takes` on a provided action (`kinds`, `as`, `permission?`); the input type `object`. Validated in
  `cleanBus` (`server/modules.js`).
- `busInput`: the `object` type, through `cleanObject` and `cleanDetails`; refusal 400 for a kind the action does not
  take.
- `GET /api/spaces/:id/actions`: `takes` on each action; `may` honours `takes.permission`.
- `GET /api/objects/format` and `.../schema`: the instructions and schema built from the enabled modules' `takes`.
- `POST /api/modules/:id/objects/check` and the chat paste import: unchanged routes; objects now carry `details`.
- The upload sweep for unclaimed `image` requests.

## Migration

Nothing stored or linked breaks:

- **Objects files and blocks** stay `formatVersion` 1 (decision 9): `details` and the new kinds are additions,
  and the schema already says other fields are ignored. Every file and paste that reads today reads the same.
- **Stored AI answers and threads** (`chat.json`, `chat-private.json`, `ai-threads.json`) keep their `summaries`
  without details and read as today; new answers carry `details`.
- **Queued bus requests** in `bus.json` with today's inputs still run: every existing input stays, `object` is
  optional, and `fromSuggestion` stays for requests without it. `createEvent`'s `date` becomes optional, which old
  requests satisfy.
- **The retired Assistant module** and any module without `takes` keep working through `acceptSuggestion` and
  `saveNote` by name.
- **Planner plans** gain at most one optional stored field (`arrives`, decision 11); `cleanItem` reads old ones unchanged.
- **Remembered choices** keep their keys; Chat's new ones use their own.
- **`tools/check-ai.mjs`'s copy of `SUMMARY_RULE`** changes on purpose; the check's copy is updated in the same commit.
- **Versions:** Planner, Research, To-do, Calendar and Polls each get one bump, recorded in
  `tools/module-versions.json`.
- A single-environment install behaves the same, with the same kinds.

## Left to build, in order

1. **server-development: the catalogue.** `KINDS`, `cleanDetails`, `when` and `point` parsing, `content` optional with
   details, `image` dropped from imports, `schema()`. `tools/check-object-format.mjs` gains the cases below.
   *Built 2026-10-03.* In `server/object-format.js` (`TRAVEL_KINDS`, `KINDS`, `HANDOFF_KINDS`, `DETAILS`,
   `cleanDetails`); `image` is kept only when `cleanObject` is called with `handoff`. The schema points each kind's
   `details` at a `details-<kind>` definition through `if`/`then` in `allOf`, rather than the `oneOf` written above.
   Chat's **Keep** now sends only a travel kind to the typed keeper (`keeperFor` in `public/chat-input.js`), so the
   five new kinds go to the note keeper until step 9. Checked by `tools/check-object-format.mjs` (11 new cases) and
   `tools/check-chat-page.mjs`; not verified in a browser. The contract is in
   [api-modules](../api/api-modules.md), "The objects format".
2. **server-development: declarations.** `takes` and the `object` type in `cleanBus`; `object` in `busInput`; `takes`
   and the permission-aware `may` on `GET .../actions`. `tools/check-modules.mjs` and a curl check.
   *Built 2026-10-03.* `cleanTakes` and the `object` input type in `server/modules.js`; `cleanHandoff` and `takersOf` in
   `server/object-format.js`; `busInput`, `takerOf` and `takesFor` in `server/index.js`. A `takes` entry may also carry
   `except` beside `"*"`, which settles the Calendar question below; `"*"` never covers `image`. `GET /api/bus/actions`
   also returns `takes` and leaves out an action whose every entry is refused. `POST /api/spaces/:id/action` and
   `/command` now answer an input refusal with its own status rather than 500, and a body over 64 KB on those routes
   and the bus routes gets 413. Checked by `tools/check-modules.mjs` and the new `tools/check-object-handoff.mjs`, whose
   throwaway server with stand-in modules does the curl checks; not verified in a browser. The contract is in
   [api-modules](../api/api-modules.md), the manifest's `takes` and "Handing an object to a module".
3. **server-development: the prompt.** `objectRule` from the enabled modules' `takes`; `/ai` and the copied
   instructions; `tools/check-ai.mjs` updated. Needs steps 1 and 2 and at least one module with `takes` (a fixture).
   *Built 2026-10-03.* `kindsTaken` and the new `objectRule` in `server/object-format.js`, `summaryRule(kinds)` in
   `server/ai.js`, `promptKinds()` in `server/index.js`. Beyond the text above: while an enabled module still offers the
   older typed keeper (`acceptSuggestion` with a title and a kind, no `takes`), the 13 travel kinds are listed too; `/ai`
   cannot ask for a missing date, so it leaves it out and says which dates it needs; `hotel` is described as any stay;
   the last line is "Leave out tags, place and links when you have nothing for them, and content when "details" says it
   all." With every kind listed the copied instructions are about 3,600 characters. Checked by `tools/check-ai.mjs`,
   `tools/check-object-format.mjs` and `tools/check-object-handoff.mjs`; not yet tried with an outside AI.
4. **experience-design: the SDK.** `host.util.plain`, and a shared `when` reader for modules (`host.util.localWhen`:
   `{ date, time }` from a `when`).
   *Built 2026-10-03.* Both in `public/sdk/host.js`, and on `window.hostText` beside `esc` and `markdown`. `plain` also
   reads HTML (tags removed, block tags and `<br>` as line breaks, `<script>` and `<style>` with their contents dropped,
   entities read; an unclosed `<script>` or `<style>` loses only the tag), keeps a fenced block's lines as written, drops rules and a table's ruled line, and takes
   `{ line: true }` for a one-line field; every pattern is bounded, so it takes linear time. `localWhen(when, day)` also
   reads a space for the `T`, a one-digit hour and `am`/`pm`, drops seconds and a zone keeping the clock time, and gives
   null for an impossible day or time. Checked by `tools/check-travel.mjs`; the contract is in
   [api-module-sdk](../api/api-module-sdk.md).
5. **experience-design: the Planner.** `takes`, `fromObject`, the arrival (decision 11), past 60 days (decision 12),
   version bump. `tools/check-travel.mjs`.
   *Built 2026-10-03, Planner 0.12.0.* `objectFields` in the new `modules/travel/src/travel-lib-object.js` (`fromObject`
   in `travel-lib-plan.js` hands it the SDK's `plain` and `localWhen`); `takes` on `acceptSuggestion` as flights, trains,
   buses, ferries and cars "{kind}", hotels "a stay", meals, visits and events "{kind}", notes "a note". Beyond the table
   above: a non-flight journey's ends are "Name (CODE)"; a car's `class`, a ferry's `cabin`, an `arrives` with a day and
   no time, and an `ends` or car drop-off that gives no length within 7 days are notes lines; `allDay` drops an event's
   time; the title, and every details field, are plain, while the notes keep their Markdown. The arrival (decision 11) is
   the editor's **Arrival on the ticket** (`f-arrival`, flights, trains, ferries and buses); with it set the plan shows it
   and "the day before" across the date line. **Seat** now shows for buses and ferries and **Class** for trains, so an
   edit no longer drops a kept value. A dated ticket arrival must be at most 7 days after the departure and at most a day
   before (`arrivalFits`); outside that it is a notes line, "Arrives: ...", and the editor refuses it. Moving a journey to
   another day (drag, **Move to**, the editor's day, a drop on a day) moves a dated arrival by the same days. With no day
   ("Not on a day yet" or the line), `arrives` is stored relative to the departure day, a time with an offset of -1 to +7
   (`"06:30+1"`, `"13:00-1"`; +0 is the plain time), and is dated again on whatever day the journey goes back on; in the
   editor, picking a day fills **Arrival on the ticket**. Past 60 days
   (decision 12) applies to every object handed in, the flat form too (`addHandedIn`); a check-out or dated arrival that
   would take the plan past 60 days, with or without the trip's dates, is cleared into a notes line ("Check out: ...",
   "Arrives: ...") and the object stays on its day, which replaces the first build's keeping the check-out and cutting the
   plan. The person is told through the Planner's note and the action's `data.note`. Two fixes came with it:
   an object saved before with such a date, which showed nowhere, is listed under "Not on a day yet" with "Dated <day>,
   outside the plan", and opening an undated object's editor no longer moves it to "Before the first day". Chat's
   **Keep** sends the object itself to a keeper whose `takes` covers its kind (`objectInputOf`, `objectKeepInput` in
   `public/chat-input.js`) and the flat fields to one that doesn't; `keeperFor` is unchanged, so `event` and `note` still
   go to Research's note keeper until step 9, although the Planner takes them. Checked by `tools/check-travel.mjs` (81
   checks, including the fixes after QA) and `tools/check-chat-page.mjs`; the editor read as code only, not verified in a browser. The contract is in
   [api-modules](../api/api-modules.md), "The Planner's acceptSuggestion".
6. **experience-design: Research.** `takes` on `saveNote` and `saveLink`, `savePhoto`, version bump.
   *Built 2026-10-04, Research 0.3.0.* `objectNote`, `objectLink` and `savePhoto` in `research-lib.js`; the shared
   "Label: value" lines are a new SDK helper, `host.util.detailLines`, in the Planner's words. `saveNote` takes `note`,
   `"*"` and `"text"`; the kind (or the icon) picks the note's icon, and the tags, the day (a details day first) and a
   position are kept. `saveLink` takes only `link`, not "any message whose first link is set" (that is Send to...'s to
   decide), and keeps `url` required, since Chat's link keeper finds the action by it; the object fills what the flat
   fields leave out. `savePhoto` captions the photo with the file name. Its thumbnail is made by whichever Research page
   carries the request out, and the server lets only the uploader (or an owner) put one, so on another person's page the
   thumbnail is refused and the card shows the whole picture. Chat's **Keep** now sends Research the whole object, and
   adds an `/ai` answer's question as an "Asked:" line, as the flat fields did. `host.util.markdown` now draws the lines
   before a list above it. Checked by `tools/check-research.mjs`, `tools/check-travel.mjs` (`detailLines`, the markdown
   fix) and `tools/check-chat-page.mjs`; verified live in Chromium by the builder (Research). The contract is in
   [api-modules](../api/api-modules.md), "Research's saveNote, saveLink and savePhoto".
7. **experience-design: To-do, Calendar and Polls.** `createTask` with `due` and `object`; `createEvent` with `object`
   and times; Polls' `draftPoll`; one bump each.
   *Built 2026-10-04: To-do 1.14.0, Calendar 1.23.0, Polls 1.14.0.* `taskFromObject` (`todo-lib.js`),
   `eventFromObject` (`calendar-lib.js`) and `pollFromObject` (`polls-lib.js`). Where it differs from the text above:
   - The Calendar has one `takes` entry, `event`, `"*"` and `"text"` with the 13 travel kinds in `except`, and an
     undated object is refused when the request runs ("that needs a day to go on the calendar"), not left out of a menu.
     It adds `needs: ["date"]` to `createEvent`, which To-do's rules and Polls' buttons now honour: a closed poll's **Add
     it to the calendar** shows only when the winning option has a date, and is given it.
   - The day: for To-do a flat `due` wins over the object's day; for the Calendar the object's day wins over the flat
     `date`.
   - Polls also takes a message's short lines as options when the object has no `details.options`, and drops the
     object's `content` otherwise.
   Checked by `tools/check-object-handoff.mjs` (14 checks) and `tools/check-modules.mjs`; To-do, the Calendar and the
   Polls form verified live in Chromium by the builder. Chat's Keep reaches these three from step 8. The
   contract is in [api-modules](../api/api-modules.md), "What the bundled modules take".
8. **experience-design: the import preview.** Details line, per-object target and menu, missing dates, Keep ticked by
   `takes`.
   *Built 2026-10-04.* In `public/chat-input.js` (`keepTargets`, `keepTargetInput`, `detailsLine`, `needsDay`,
   `keepCountWords`, `drawObject`); `GET /api/spaces/:id/actions` now returns `needs`. As planned: the plain title and
   details line, "in <module>" after Keep with a menu of "Add to <module> as <a kind>" when there are several places,
   the last choice per kind remembered in the browser and marked "Last used", "No day" with a date field for a kind
   that has a day, "Same day for all" (shown with two or more undated objects, never overwriting a day the person
   picked), and Keep ticked keeping each object in its own place, its confirm naming the counts and places plus "N can't
   be kept here.". Beyond the text above:
   - An AI answer's objects use the same places; there, choosing from the menu keeps the object at once (decision 16).
   - Keep itself now follows `takes` everywhere, not only in the preview: any action whose `takes` covers the kind,
     honouring `except`, `may`, required inputs (a `title` from the object, a `url` from its first link) and
     `needs: ["date"]`. So notes and events go to the Planner with Research off. A module without `takes` keeps the
     old rule (`keeperFor`). A closed `local` module gives "<module> isn't open." This brings forward part of step 9's
     targeting for objects, not for a message's own words.
   - The order: last used, then an action naming the kind, the one naming the fewest kinds first (the specialist: a
     note to Research before the Planner, an event with a day to the Calendar, a flight to the Planner, whatever the
     install order), then the older typed keeper, then `"*"`/`"text"`, then the older note keeper; other ties in the
     server's order. Among "any object" places the note keeper comes first, so an object with no kind and a link with no
     address go to Research, and a form (Polls' draft) is never the default unless it names the kind (`placeRank`,
     `placeOrder`). *Open:* the specialist rule, Thomas to confirm.
   - Each row keeps the place it shows (`settlePlace`): "Last used" applies only when it is first drawn, and a row moves
     only when its place stops being allowed, which a single Keep and Keep ticked's confirm say.
   - Keep ticked leaves out a place that opens a form (Polls, one at a time with its own Keep), a closed `local`
     module, and an object nothing can keep, and says so in the confirm. A `local` Keep reads "Opened in <module>" and
     can be pressed again; Keep runs one at a time and stays off once kept or waiting.
   - The day is asked only where something here could keep the object with one; its words focus the field.
   - A kept or waiting row: its place is plain text, its day field off (Same day for all skips it), its Keep off.
     "Keep ticked (n)" counts only rows it would send; the preview refreshes the module list first.
   Checked by `tools/check-chat-page.mjs` and `tools/check-object-handoff.mjs`; verified live in Chromium by the
   builder, the rework included; the focus after a pick in an AI answer's menu is read as code only. The rules are in
   [api-modules](../api/api-modules.md), "Chat's Keep", and [Chat](../userguides/userguide-chat.md), "Where an object
   is kept".
9. **experience-design: Send to...** The message-to-object rules, the menu, last used, pictures (upload then
   request), several objects, private messages. **server-development** adds the upload sweep in the same step.
10. **quality-assurance:** every step as below. **content-manager:** [api-modules](../api/api-modules.md) (`takes`,
    `object`, the actions list), [api-module-sdk](../api/api-module-sdk.md) (`host.util.plain`,
    `host.util.localWhen`), the format in [architecture-modules](../architecture/architecture-modules.md), the Chat,
    Planner, Research, To-do, Calendar and Polls user guides, the CHANGELOG.

## Verify

- **Checked by a tool:**
  - step 1: each kind's details kept field by field; wrong types, unknown fields and details without a kind dropped;
    `when` in all three shapes, with a zone dropped, and an impossible date dropped; `point` from a string and an
    object; an object with details and no content kept, with neither dropped; `image` dropped from an import; the
    schema's `details` match the catalogue; every existing case still passes;
  - step 2: install refuses `takes` with an unknown kind, or on an action with no `object` input; `busInput` cleans an
    `object` and refuses a kind not taken; `may` false for a member without Polls' `create`;
  - step 3: the instructions name only kinds some enabled module takes, and every field of each; turning To-do off
    takes `task` out;
  - step 5: `fromObject` on a fixture of Thomas's Southwest flight gives `operator` Southwest, the number, `MDW` and
    `SJC`, departure 12:50 and arrival 15:25; one fixture per kind; a 10-object itinerary over 4 days lands on its days;
  - step 9: the message-to-object rules as a pure function, in `tools/check-one-input.mjs`.
- **Verified live in a browser, no LiveKit needed:** pasting a full itinerary, with and without dates, and keeping it;
  each object reaching its target with its fields in the module's form; the date field for undated ones; Send to...
  on text, a link, an AI answer and a command echo; "last used"; a guest seeing no entries; a closed module's
  waiting note.
- **Needs a real LiveKit call:** Send to... on a picture (pictures travel only over LiveKit), including one received
  from someone else, and a GIF.
- **Outside AIs:** paste the copied instructions into at least two (for example Claude and ChatGPT), ask each for a
  multi-day itinerary from a booking email, import the real answers, and say which were tried.

## What is not decided

- How `takes` says "any dated object except the travel kinds" for the Calendar (decision 19): an explicit list of the
  other kinds, or a way to exclude kinds. server-development settles it in step 2; it does not change what a person
  sees. *Settled in step 2 (2026-10-03):* a way to exclude kinds, `except` beside `"*"` in a `takes` entry, such as
  `{ "kinds": ["*", "text"], "except": [the 13 travel kinds], "as": "an event" }`.
- Time zones on the Calendar: a local time from an import is read in the zone of the browser that carries the request
  out. A real fix needs zones on events and is its own plan.
- Dropping a chat message or an object onto a module (the reverse of Send to...).
- Export of objects to a file.
