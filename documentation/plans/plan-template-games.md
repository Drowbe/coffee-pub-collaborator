# Games Template Plan

**Audience:** Thomas, who decides what the gaming template sets; server-development builds the template file and the seed; experience-design uses both for the games page.

**Status:** drafted 2026-10-21 by product-planner; Thomas answered the first round the same day (see Decisions); nothing built. It is step 6 of [plan-product-pages](plan-product-pages.md) (decision 13: the template is made first, then the games page). Sibling of GitHub #351, the project and mentoring template. What Thomas has not yet decided is marked **OPEN** under "What is not decided"; everything in "The proposal" that is not under Decisions is a suggestion.

## What it is today

- **One bundled template,** `templates/travel.json` (version 7). It is the model: `words`, `icons.home`, `moduleNames`, `modules`, `settings`, `lobby`, `phases` and `spaceDefaults`, with the rules in [plan-environment-templates](plan-environment-templates.md).
- **No gaming material exists.** A search of `templates/`, `server/`, `public/` and `documentation/` finds only the product page's copy ("a space per campaign, side conversations for whispers, the calendar for session nights"), a user guide example of a home word ("Campaigns"), a "game master" and "players" example in the Words guide, and a check case using "Campaigns" (`tools/check-templates.mjs`). No template, no seed, no phases.
- **The home word follows the space word.** With no `home` word of its own, a space word of "campaign" gives "Campaigns" (`server/words.js`, `homeDefault()`). A template only needs a `home` entry to differ from that.
- **Bundled modules that exist** (`modules/`): Planner (`travel`), Places, Maps, Research, Calendar, Polls, To-do, Budget, Assistant and Stream. Stream installs itself in every environment. There is no Notes module: Research is where notes live.
- **A space's default profile is `roleplaying`,** which offers both the Participant and the Character pictures for OBS. That already fits a game; the template needs to set nothing.
- **Phases** (`phases` in a template) are read by the Planner and the journey bar and the countdown chip: a dated, ordered list with one main phase. They were made for a trip. The Planner works without them.
- **The shots seed** (`tools/shots-seed.mjs`) builds the travel environment for the product page screenshots, on a fixed day, 2026-10-15 (a Thursday).

## Decisions

Thomas's, 2026-10-21.

1. **Template name:** "Games" (`"name": "Games"`), matching the page and the sign-up choice. Description to use: "Run a campaign together: the chat, the calendar for sessions, a campaign planner, quests, lore and polls, and every player as an OBS source." (The planner's name in it follows open question 1.)
2. **Space word:** "Campaign" (earlier, [plan-product-pages](plan-product-pages.md) decision 15). The home word follows it and reads "Campaigns".
3. **Environment word:** group / groups. The environment is what people sign in to: the gaming group.
4. **Moderator word stays "moderator".** No "co-GM": the template sets no `moderator` word.
5. **Themed module names:** Calendar is shown as **Sessions**, To-do as **Quests**, Research as **Lore**.
6. **The Planner is turned on for the games template.** Thomas chose this, against the earlier recommendation to leave it for #307. It no longer waits on #307.
7. **Places and Maps are off but offered:** not in the template's modules, so an owner can turn them on.
8. **No phases,** unless the Planner needs them. The Planner does not (see "Phases"); the call is flagged as open question 2.
9. **The Lobby:** name **Common room**, description **Everyone in every campaign.**
10. **Home icon:** `dice-d20`.
11. **One extra OBS-view shot in the seed,** with the players' Character pictures.

## The proposal

All of this is a suggestion until Thomas decides it, except what is under Decisions.

### The words

| Key | One / many | State |
|---|---|---|
| `space` | campaign / campaigns | Decided |
| `home` | none: it follows the space word and reads "Campaigns" | Decided with the space word |
| `environment` | group / groups | Decided |
| `moderator` | none: stays "moderator" | Decided |
| `aside` | whisper / whispers | **OPEN** (question 5): a private side conversation; the product page already calls them whispers. |
| `owner` | game master / game masters | **OPEN** (question 5): the person who runs the group. |
| `member` | player / players | **OPEN** (question 5) |
| `guest` | guest / guests, left as it is | **OPEN** (question 5) |
| `canvas`, `module`, `object` | left as they are | **OPEN** (question 5): "module" and "canvas" read fine; an `object` here is a quest, a note or a session, so no one word is better. |

Nothing in the template may use the old words listed in CLAUDE.md (Names); `check-names` fences "tavern" as a past product name, so the Lobby cannot be called the Tavern.

### The Lobby and the home icon

Decided: the Lobby is **Common room**, "Everyone in every campaign."; the home icon is `dice-d20` (a Font Awesome Free solid icon).

### Modules on by default

Claimed only from what ships. Everything listed is in `modules/` today. The template's `modules` list would be `travel`, `calendar`, `polls`, `todo`, `research`, `chat`, `conference`.

| Module | On? | Shown as | What it does for a game |
|---|---|---|---|
| Chat, the call | On | | The core. The chat all week, the call on game night. |
| Calendar (`calendar`) | On | **Sessions** (decided) | Session nights, with reminders. It is allowed in the Lobby. |
| Polls (`polls`) | On | | Picking the night, voting on the next quest. |
| To-do (`todo`) | On | **Quests** (decided) | A shared list with due dates and reminders. |
| Research (`research`) | On | **Lore** (decided) | Notes, links and pictures, tagged and searchable; the AI can answer questions about them when the owner has set one up. |
| Planner (`travel`) | On (decided) | **OPEN**, question 1 | See "What the Planner does for a game". |
| Stream (`stream`) | Already everywhere | | Every player as an OBS source. This is the other half of the product for a game, so the games page names it. |
| Places and Maps (`places`, `maps`) | Off, offered (decided) | | Places and Maps draw the real world. A campaign map works only when the owner has set the environment's **Picture map** ([plan-map-image](plan-map-image.md): built, but not yet tried with WebGL). Maps needs Places. |
| Budget, Assistant | Off | | No fit. The Assistant needs the owner's AI key. |

A new campaign opens with the chat and the Sessions (`spaceDefaults.opensWith: ["chat", "calendar"]`, **OPEN**, question 4) and the `roleplaying` profile. The call is not joined on entering, as for travel.

Settings the template would set: `showCalendar` on, `calendarFeeds` on, `showMap` off (**OPEN**, question 6).

### What the Planner does for a game

This is the plan's own reading of the module (`modules/travel`, [userguide-planner](../userguides/userguide-planner.md)), stated plainly so the games page claims no more than is true.

- **What it is.** The Planner keeps one day-by-day plan for a space, from the earliest date to the latest. Calendar events, to-dos and polls that fall on a day join the plan on their own, so a campaign's Sessions, Quests with due dates and open polls appear together on one timeline. On top of that, people add objects of their own on a day: a note, a sight, a show, a meal or a drink, a stay, a journey, or a day marker. It has an Unscheduled list for things with no date.
- **What it gives a game.** One timeline of the campaign: when the sessions are, what is due before each, and the notes and places the group wants on a given night. That is real, and it needs nothing the module lacks.
- **What it does not give a game.** Its kinds and words are travel's. The add menu reads **Travel**, **Add a stay**, **Eat and drink**, **See and do** and **Add a note**; the Roles tab words its permissions "See the trip" and "Plan the trip"; the flight and stay forms have fields a game never uses. Of the kinds, a note, a sight (a place the party visits), a show and a bar (a tavern scene) fit; the rest would go unused. A template renames the module, not what is inside it. A game-shaped Planner, or sessions as a mode (#307), would be a change to the module and is not part of this plan.
- **The honest claim for the page:** "A day-by-day timeline of the campaign that gathers the sessions, quests and polls, with notes and places on the days." Nothing about flights, stays or itineraries.

### The Planner's name

The Planner cannot share a name with the Calendar's "Sessions". Options, with a suggestion (open question 1):

- **Campaign planner.** Says what it is and sits clearly beside Sessions, Quests and Lore. A longer name in the module list and the top bar.
- **Plot.** Short and in tone, but unclear alone: it could mean the story or a plot of land, and it hints at story tools the module does not have.
- **Planner** (no `moduleNames` entry). No new word to learn, and the module's own name stays. It is the least themed.

My lean, a suggestion only: **Campaign planner,** because it is plain about the module's job and "Plot" promises more than it does. The template would also set a `moduleIcons` entry for it, since the suitcase would look wrong beside a game (question 3).

### Phases

None. The Planner does not need them: without phases it shows **Edit dates** with an optional first and last day, and its days appear from the first date or the first object. A campaign has no main phase to count toward, and the sessions are on the Calendar. Phases for a campaign (for example "Session zero", "Running", "Break", "Finale", with "Running" as the main phase) would give the status strip a phase line and the Planner a phase tag on each day, but they would need dates the group has no reason to keep. Leaving them out is my call, flagged as open question 2.

### The seed for the product page screenshots

A second seed beside the travel one in `tools/shots-seed.mjs`, run on the same fixed day (2026-10-15, a Thursday), with the same rule: every date fixed, nothing drawn that the server makes.

- The `games` template. An environment, a game master (the admin) and three players, with invented names; no names from any published game.
- Two campaigns: a long one ("The Ashen Crown", players Mia, Sam and Lee) and a one-shot ("The Lantern Fair").
- **Sessions** (Calendar): weekly on Thursday nights, the last two done, the next two ahead (2026-10-22 and 2026-10-29) with a reminder.
- **Polls:** "Which night for session 14?", with votes in.
- **Quests** (To-do): five, two done, with due dates.
- **Lore** (Research): four notes, a place, a person, a rumour, a house rule, with tags.
- **The planner** (the Planner, under its themed name): in The Ashen Crown, four objects of its own on fixed days: a note "Recap of session 13" (2026-10-15), a sight "The Ashen Gate" (2026-10-22), a bar "The Drowned Lantern" (2026-10-22) and a note "Bring the map for the vault" (2026-10-29). The Sessions, the Quests with due dates and the poll join the timeline by themselves, so the shot shows a full timeline without more seeding.
- **The chat:** a short in-character exchange, a link card and an Assistant answer, written by `seedChat` as for travel.
- **Pictures:** a Character picture for each player, so the OBS view shows both boxes (decided: one extra shot of the OBS view with character art). The art is experience-design's, drawn flat in the product page's palette.

## Left to build, in order

1. **The template** (server-development): `templates/games.json` (version 1) with the decided words (`space`, `environment`), the three themed names and the Planner's (once decided), `modules` as listed above, the Lobby, `dice-d20`, no `phases`, `tools/template-versions.json`, `tools/check-templates.mjs` and `check-template-switch.mjs` cases, and the Dockerfile if the file list is not a glob. Only open questions 1 and 3 (the Planner's name and icon) hold it up; the rest can start now. Done when `npm run check` passes.
2. **The seed** (server-development): the games seed beside the travel one, including the Planner objects, selectable by `tools/shots.mjs`. Done when two runs give the same data.
3. **The shots and the games hero art** (experience-design; Thomas approves the art), including the OBS-view shot with character art and a shot of the planner's timeline, then **`/games`** ([plan-product-pages](plan-product-pages.md) steps 7 to 9). The page names the Planner only as in "The honest claim for the page".
4. **The documentation** (content-manager): the templates guide and architecture-environments.

## Verify

- **Step 1, checked by a tool:** `check-templates` (the file is valid, every module id is bundled, `chat` is listed, the icon names exist, applying twice gives the same result, a plan that leaves a module out records it as skipped); `check-template-switch`.
- **Step 1, live:** on `BASE_DOMAIN=localhost` with a throwaway `DATA_DIR` under `/tmp`, create an environment from the template and check that people read "campaign", "Campaigns", "group" and "moderator", that Calendar shows as Sessions, To-do as Quests, Research as Lore and the Planner under its themed name, that the Lobby reads "Common room", that Places and Maps are offered but off, that no phases show, and that a new campaign opens with the chat and the Sessions.
- **Step 2:** run the seed twice on empty data directories and compare; open the campaign's planner and check that the sessions, quests and poll appear on their days beside the four seeded objects.
- **Not checkable here:** the call on game night, and the Stream sources in OBS, which need a real LiveKit server and OBS. The picture map with WebGL is also unchecked.

## What is not decided

### Open questions

All of these are **OPEN**. Questions 1 to 4 and 7 are new from the decisions of 2026-10-21; only 1 and 3 hold up step 1.

1. **OPEN. The Planner's themed name (new).** It cannot be "Sessions". Options: **Campaign planner,** **Plot,** or leave **Planner**. Recommended: **Campaign planner.**
2. **OPEN. Phases (new).** Recommended: **none,** since the Planner works without them and a campaign has no main phase. The alternative is a short list (Session zero, Running, Break, Finale; main "Running") if Thomas wants a phase line on the status strip.
3. **OPEN. The Planner's icon (new).** The suitcase would look wrong. Recommended: `scroll`, through `moduleIcons`; alternatives `map-location-dot` or `timeline`. The name must exist in Font Awesome Free solid; `check-templates` checks it.
4. **OPEN. What a new campaign opens with (new).** Recommended: the chat and the Sessions, as drafted. Alternative: the chat and the Planner, if Thomas wants the timeline to be the first thing seen.
5. **OPEN. The remaining words:** `owner` game master, `aside` whisper, `member` player, `guest` left as guest, and `canvas`, `module`, `object` left as they are. Recommended: all as proposed in the table.
6. **OPEN. Does the template set `showMap` off,** or leave it as the environment's default? Recommended: **off,** so the top bar carries no Map for a template that has no Maps. An owner who turns Maps on may then want the Map back.
7. **OPEN. Accept the Planner's travel wording for now (new)?** The add menu and the Roles tab read "trip", "stay" and "travel" in a game. Recommended: accept it, claim only the timeline on the games page, and treat a game-shaped Planner or #307 as a later change to the module with its own plan. The alternative is to hold the games template until the module changes.
