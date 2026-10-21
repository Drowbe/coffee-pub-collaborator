# Games Template Plan

**Audience:** Thomas, who decides what the gaming template sets; server-development builds the template file and the seed; experience-design uses both for the games page.

**Status:** drafted 2026-10-21 by product-planner, for Thomas to decide; nothing built. It is step 6 of [plan-product-pages](plan-product-pages.md) (decision 13: the template is made first, then the games page). Sibling of GitHub #351, the project and mentoring template. Thomas has decided two words: the product page is called "Games" and the space word is "Campaign". Everything else below is a proposal.

## What it is today

- **One bundled template,** `templates/travel.json` (version 6). It is the model: `words`, `icons.home`, `moduleNames`, `modules`, `settings`, `lobby`, `phases` and `spaceDefaults`, with the rules in [plan-environment-templates](plan-environment-templates.md).
- **No gaming material exists.** A search of `templates/`, `server/`, `public/` and `documentation/` finds only the product page's copy ("a space per campaign, side conversations for whispers, the calendar for session nights", `public/landing.html:82` and `94`), a user guide example of a home word ("Campaigns"), a "game master" and "players" example in the Words guide, and a check case using "Campaigns" (`tools/check-templates.mjs:128`). No template, no seed, no phases.
- **The home word follows the space word.** With no `home` word of its own, a space word of "campaign" gives "Campaigns" (`server/words.js`, `homeDefault()`). A template only needs a `home` entry to differ from that.
- **Bundled modules that exist** (`modules/`): Planner (`travel`), Places, Maps, Research, Calendar, Polls, To-do, Budget, Assistant and Stream. Stream installs itself in every environment. There is no Notes module: Research is where notes live.
- **A space's default profile is `roleplaying`,** which offers both the Participant and the Character pictures for OBS. That already fits a game; the template needs to set nothing.
- **Phases** (`phases` in a template) are read by the Planner and the journey bar and the countdown chip: a dated, ordered list with one main phase. They were made for a trip.
- **The shots seed** (`tools/shots-seed.mjs`) builds the travel environment for the product page screenshots, on a fixed day, 2026-10-15 (a Thursday).

## The proposal

All of this is a suggestion until Thomas decides it. The two decided words are marked.

### The words

| Key | Proposed one / many | Why |
|---|---|---|
| `space` | **campaign / campaigns** (decided) | |
| `home` | none: it follows the space word and reads "Campaigns" | A `home` entry would only repeat it. |
| `environment` | group / groups | The environment is what the people sign in to: the gaming group. |
| `aside` | whisper / whispers | A private side conversation; the product page already calls them whispers. |
| `owner` | game master / game masters | The person who runs the group. |
| `moderator` | co-GM / co-GMs | Runs one campaign when the game master allows it. |
| `member` | player / players | |
| `guest` | guest / guests | Left as it is: a guest at the table is a guest. |
| `canvas`, `module`, `object` | left as they are | "Module" and "canvas" read fine; an `object` here is a quest, a note or a session, so no one word is better. |

The product page's "Games" is the name of the page and of the template (`"name": "Games"`), not a word in `words`. Nothing in the template may use the old words listed in CLAUDE.md (Names); `check-names` fences "tavern" as a past product name, so the Lobby cannot be called the Tavern.

### The Lobby and the home icon

- The Lobby: name **Common room**, description **Everyone in every campaign.** (Travel has "Home base", "Everyone on every trip.")
- Home icon: `dice-d20` (a Font Awesome Free solid icon).

### Modules on by default

Claimed only from what ships. Everything listed is in `modules/` today.

| Module | On? | Shown as | What it does for a game |
|---|---|---|---|
| Chat, the call | On | | The core. The chat all week, the call on game night. |
| Calendar (`calendar`) | On | **Sessions** | Session nights, with reminders. It is allowed in the Lobby. |
| Polls (`polls`) | On | | Picking the night, voting on the next quest. |
| To-do (`todo`) | On | **Quests** | A shared list with due dates and reminders. |
| Research (`research`) | On | **Lore** | Notes, links and pictures, tagged and searchable; the AI can answer questions about them when the owner has set one up. |
| Stream (`stream`) | Already everywhere | | Every player as an OBS source. This is the other half of the product for a game, so the games page names it. |
| Planner (`travel`) | Off | | It is a day-by-day itinerary. Sessions as a Planner mode is #307, not planned yet, so nothing claims it. |
| Places and Maps (`places`, `maps`) | Off, offered | | Places and Maps draw the real world. A campaign map works only when the owner has set the environment's **Picture map** ([plan-map-image](plan-map-image.md): built, but not yet tried with WebGL), so it is not on by default. Maps needs Places. |
| Budget, Assistant | Off | | No fit. The Assistant needs the owner's AI key. |

A new campaign opens with the chat and the Sessions (`spaceDefaults.opensWith: ["chat", "calendar"]`) and the `roleplaying` profile. The call is not joined on entering, as for travel.

Settings the template would set: `showCalendar` on, `calendarFeeds` on, `showMap` off.

### Phases

None. Phases belong to a dated plan with a main phase, which a campaign does not have; a campaign has sessions on the Calendar instead. A template with no `phases` works, and the Planner is off anyway.

### The seed for the product page screenshots

A second seed beside the travel one in `tools/shots-seed.mjs`, run on the same fixed day (2026-10-15, a Thursday), with the same rule: every date fixed, nothing drawn that the server makes.

- The `games` template. An environment, a game master (the admin) and three players, with invented names; no names from any published game.
- Two campaigns: a long one ("The Ashen Crown", players Mia, Sam and Lee) and a one-shot ("The Lantern Fair").
- **Sessions** (Calendar): weekly on Thursday nights, the last two done, the next two ahead (2026-10-22 and 2026-10-29) with a reminder.
- **Polls:** "Which night for session 14?", with votes in.
- **Quests** (To-do): five, two done, with due dates.
- **Lore** (Research): four notes, a place, a person, a rumour, a house rule, with tags.
- **The chat:** a short in-character exchange, a link card and an Assistant answer, written by `seedChat` as for travel.
- **Pictures:** a Character picture for each player, so the OBS view shows both boxes. The art is experience-design's, drawn flat in the product page's palette.

## Left to build, in order

1. **The template** (server-development): `templates/games.json` (version 1), `tools/template-versions.json`, `tools/check-templates.mjs` and `check-template-switch.mjs` cases, and the Dockerfile if the file list is not a glob. Done when `npm run check` passes.
2. **The seed** (server-development): the games seed beside the travel one, selectable by `tools/shots.mjs`. Done when two runs give the same data.
3. **The shots and the games hero art** (experience-design; Thomas approves the art), then **`/games`** ([plan-product-pages](plan-product-pages.md) steps 7 to 9).
4. **The documentation** (content-manager): the templates guide and architecture-environments.

## Verify

- **Step 1, checked by a tool:** `check-templates` (the file is valid, every module id is bundled, `chat` is listed, the icon names exist, applying twice gives the same result, a plan that leaves a module out records it as skipped); `check-template-switch`.
- **Step 1, live:** on `BASE_DOMAIN=localhost` with a throwaway `DATA_DIR` under `/tmp`, create an environment from the template and check that people read "campaign", "Campaigns", "game master" and "player", that Calendar shows as Sessions and Research as Lore, that the Lobby reads "Common room", and that a new campaign opens with the chat and the Sessions.
- **Step 2:** run the seed twice on empty data directories and compare.
- **Not checkable here:** the call on game night, and the Stream sources in OBS, which need a real LiveKit server and OBS. The picture map with WebGL is also unchecked.

## What is not decided

### Open questions

1. **The environment word: "group"?** The environment is the thing people sign in to, so it reads in the sign-in line and the invitation. Recommended: **group / groups.** Alternative: leave it as "environment".
2. **Moderator: "co-GM"?** The abbreviation is short but plain only to people who play. Recommended: **co-GM,** since the template is for a gaming group. Alternative: leave it as "moderator".
3. **Themed module names: Sessions, Quests and Lore?** These rename Calendar, To-do and Research for this template only; Manage shows the module's own name beside them. Recommended: **yes to all three.** A risk: "Sessions" for the Calendar may surprise someone who looks for a general calendar; the owner can change it back.
4. **Places and Maps off, offered?** Recommended: **off,** because they draw the real world, and the games page then names them once under "and more you can turn on". Alternative: on, if Thomas wants the picture map to be part of the pitch.
5. **No phases?** Recommended: **none,** since the Planner is off and a campaign has no main phase. Phases for a campaign (such as "Session zero", "Running", "Break", "Finale") would only be useful if the Planner gained a sessions mode (#307).
6. **Is a Planner for sessions wanted?** Recommended: **leave it for #307.** Do not turn the Planner on for a game until it has a mode that makes sense for one.
7. **The Lobby: "Common room"?** Recommended: **"Common room", "Everyone in every campaign."** It cannot be "Tavern" (a fenced past name).
8. **The home icon: `dice-d20`?** Recommended: **yes.** Alternatives: `scroll`, `dragon`.
9. **Does the template set `showMap` off,** or leave it as the environment's default? Recommended: **off,** so the top bar carries no Map for a template that has no Maps.
10. **Template name: "Games"?** Recommended: **"Games",** matching the page and the sign-up choice, with the description "Run a campaign together: the chat, the calendar for sessions, quests, lore and polls, and every player as an OBS source."
11. **Should the seed also draw the OBS view,** with the players' Character pictures, for the games page? Recommended: **yes,** as one extra shot; it needs character art, which experience-design drafts with the hero art.
