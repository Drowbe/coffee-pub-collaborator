# Home as the Lobby Plan

**Audience:** Thomas, who decides what Home becomes and what happens to the Lobby; the try builders who build each step on its own (server-development for the server half, experience-design for the pages); quality-assurance later, when Thomas names a production build.

**Status:** approved in part, 2026-10-14. Drafted the same day by product-planner at Thomas's request. Thomas has decided the Lobby's record, going Home from a space, the chat's scope, Home on a phone what the Modules column holds and what it is called (decisions 6 to 11). The other questions were not asked yet and are recorded as working assumptions (below). Nothing is built. Thomas's words: "I want to queue up the changes to the homepage/dashboard. The idea is that the 'lobby' goes away as a dedicated space and the homepage gets redesigned to have the persistent chat laid out like: [ chat ] [ Spaces ] [ Tools ] and we take advantage of the page width. We keep 'who's online' above the spaces still. Effectively this BECOMES the lobby." He attached a hand sketch, and confirmed the reading of it below (relayed by the project manager): "Sorry about the rotation. You got it right." Related plans: [plan-dashboard](plan-dashboard.md) (the tiles on Home, Who's around), [plan-one-bar](plan-one-bar.md) (the always-on column, step 6), [plan-chat-model](plan-chat-model.md) (one chat store, Discussion and Assistant), [plan-modules](plan-modules.md) ("the Lobby is for being together"), [plan-environment-templates](plan-environment-templates.md) (a template's `lobby` field), [plan-names](plan-names.md) (renames ship with a migration).

## What it is today

### Home

- Home is not a page of its own. It is `#join` in `public/space.html`, the same page as a space, drawn by `public/space.js`. Inside `.home`: `#dashboard` (a 300 px sidebar of tiles, hidden while empty) beside `.home-main`, which holds `#whos-around`, the heading row (`#space-list-title` with the `home` word, and **Add <space>**, `#home-add-space`) and the space cards (`#spaces`, `renderSpaces()`, from the `#space-choice` template).
- The page is held to `max-width: 1180px` (`.join` in `public/style.css`). At 760 px and below it is one column, the spaces first and the tiles below (`.home`, `.dashboard`).
- **Who's around** (`renderWho()` in `public/dashboard.js`) is a strip above the space cards: everyone online (the page heartbeat `POST /api/presence`, 75 seconds), where each is (`whereWords()`, `public/primary-nav.js`), the in-call mark, and an invite to a private conversation of two (`POST /api/asides/invite`).
- **The tiles** are what modules provide through the manifest's `surfaces.widget` (Calendar, To-do and Polls today), listed by `GET /api/modules/widgets` and mounted by `initDashboard()` at the environment scope. Thomas asked on 2026-09-30 to rename widgets to tiles; that renaming plan is not written ([TODO](../TODO.md), Planned).
- Signing in lands on Home. Nobody is entered into any space, and Home holds no call service connection of its own.
- **Home over a space.** From inside a space, the logo, Spaces or the phone menu's home show Home over the space without leaving it (`showSpaceList()`, `goHome()`): the page stays connected to that space's call, Away is set, and the space's card reads **Back to <space>**.

### The Lobby

- A space with the fixed id `lobby` (`LOBBY` in `server/store.js`), seeded as "Lobby", "Where everyone meets." when an environment has none. Every user belongs to it (the `spaces` getter computes its members as everyone, and `isLobby: true`). It is always first in Manage > Spaces and cannot be reordered (`reorderSpaces()`) or deleted (`removeSpace()`: "the Lobby cannot be deleted"). Its members can't be changed (`removeMember()`), it takes no per-person space settings (`setSpacePrefs()`), it has no calendar address (`setSpaceCalendarFeed()`) and it is never in the published calendar.
- **On Home it is a space card like any other,** first in the list, because everyone is a member. A person reaches it by pressing its Enter button, like any space.
- **What lives in it:**
  - its chat, under `spaces.lobby` in `DATA_DIR/chat.json` and `chat-private.json` (`server/chat-history.js`: the last 500 per space, none older than 30 days), and the Assistant's private messages there;
  - its call: the call service name is `lobby` (`<slug>.lobby` on a hosted install, `server/call-names.js`);
  - only the modules whose manifest says `surfaces.canvas.lobby: true` (`ModuleManager.lobbyAllowed()`, `refusedInLobby()` and `lobbyRefusal()` in `server/index.js`): today only the Calendar (`modules/calendar/module.json`). Its events placed there are in `modules/calendar/data/space-lobby.json` and are read across spaces like any space's. Other modules' old Lobby data is kept and read nowhere ([plan-modules](plan-modules.md), decision 2);
  - its own settings through Set up (`public/space-setup.js`, which already leaves out Delete, members and the calendar switch for `space.isLobby`): name, description, picture, profile, Opens with, guest link, the browser's remembered layout (`app.canvas.lobby`).
- **The Lobby as the fallback.**
  - The stream follows the first online owner's space, and the Lobby when none is in a call (`activeSpaceId()`).
  - An aside returns to the Lobby when its origin space is gone (`POST /api/asides/return`).
  - `POST /api/token` and `POST /api/call/join` take the Lobby when no space is sent.
  - `join()` in `space.js` defaults to `lobby`.
  - The Stream module's box shows the Lobby while its person is away (`modules/stream/src/stream-keyed.js`).
  - `host.media.watch` defaults to `space: 'lobby'` (`public/sdk/host.js`).
  - Coffee Pub Studio reads `isLobby` from `GET /api/status`.
- **Guests.** Nothing refuses a guest link for the Lobby (`enableGuestLink()` has no Lobby case), so a guest link to the Lobby may exist and be in use.
- **Templates.** A template's `lobby: { name, description }` (`server/templates.js`) is applied once and offered on a switch (`templates.offerFor()`, `public/template-offer.js`). The host console's template editor has **Lobby name** and **Lobby description** (`public/host.html`, `public/host-templates.js`). The travel template names it "Home base", "Everyone on every trip."
- **Words.** "Lobby" is not one of the Names levels in `CLAUDE.md`. It is a space's id and its default name, and `check-names` does not fence it. Pages that refer to it use its stored name, for example `lobbyName()` in `public/admin.js` and `lobbyRefusal()` on the server. Manage's descriptions ("Everyone belongs to the Lobby", "they land in the Lobby") and the module hints ("(not in <Lobby>)", "keeps only chat, the call and modules made for it") name it in words.

### The chat and the always-on column

- Chat travels live over the call service's data channel (`publishData` with the `chat` topic in `space.js`). The sender also posts each message to `POST /api/spaces/:id/chat` so that anyone who comes in later can read it. Deletes, clears and visibility changes reach other pages through the server's `tellChat()`, which sends over that same channel. **A page receives chat live only while it is connected to that space's call.** On Home today it is connected to none.
- Inside a space, `#side-column` holds, from top to bottom: the call as a strip of tiles (or **Join the call**), Online (`who-here`), and `#chat` with the **Discussion | Assistant** tabs (`#chat-views`). It can collapse to a rail. It is not drawn at 640 px and below, where the phone keeps its tabs ([plan-one-bar](plan-one-bar.md), step 6). There is one `#chat` element in the page, wired by `attachChatInput()` (`public/chat-input.js`) to the current space (`getSpace`).
- The chat belongs to a space: each space has its own history, and Assistant threads are kept per space and person. An aside has no chat.

## Decisions

Thomas, 2026-10-14.

1. **The Lobby goes away as a dedicated space; Home becomes the Lobby.** Reason, in his words: "Effectively this BECOMES the lobby."
2. **Home is laid out as [Chat] [Spaces] [Modules] and uses the page's width.** His reason: "we take advantage of the page width." (His sketch's word for the third column was "Tools"; see decision 11.)
3. **Who's online stays above the spaces.**
4. **The chat on Home is the persistent chat.**
5. **The sketch, as read and confirmed** ("Sorry about the rotation. You got it right."), turned so its writing is upright:
   - on the left, a column the full height of the page, labelled LOBBY CHAT, about a quarter to a third of the width;
   - in the middle, the space cards in a grid two cards wide, labelled SPACES, with a wide, short panel above them labelled "whose online" that holds a small picture and a name at its left end and a list;
   - on the right, a narrower column of three stacked cards (the Modules), the lowest one small and marked with a "T".

6. **The Lobby's record stays as Home's hidden backing** (option A, no data migration). Thomas, 2026-10-14. Home's chat is the Lobby's chat: the same id, the same stored history and the same Assistant threads. Nothing stored is renamed. Every fallback above, Studio's `isLobby`, the OBS stream and the Calendar's Lobby events keep working. What goes away is the Lobby as a place a person enters, its card, and its Set up.
7. **Going Home from a space is a view over the space.** Thomas, 2026-10-14 (option A). The person stays in the space's call, with Away set, as today. Home's chat can't depend on the call service, so it gets new messages from the server's event stream. A side benefit is that Home's chat can be checked locally, where there is no LiveKit.
8. **Each place keeps its own chat.** Thomas, 2026-10-14 (option A). Home shows Home's chat (the Lobby's history). A space's column shows that space's chat, as today. The chat does not follow you between them. Home's unread count shows on the Home link.
9. **On a phone, Home has three tabs, Chat | Spaces | Modules, opening on the spaces.** Thomas, 2026-10-14 (option A). The middle tab carries the `home` word, as the Spaces slot does.
10. **The Modules are what the Home has today.** Thomas, 2026-10-14, in his words (the word "tools" is his, from before decision 11): "The tools are what we have on the home today." The Modules column is today's Home tiles (the dashboard widgets: Calendar, To-do, Polls and the others, as they are now), moved into the right-hand column. It is not a launcher for every module, and this plan adds no new links to it.
11. **The right-hand column and the phone's third tab are called Modules.** Thomas, 2026-10-14. His sketch's word "Tools" was shorthand. His words: "when did we rename all of the modules to tools? I don't remember authorizing or asking for that." He then chose "Modules" for the column and the tab. In words a person reads, a module shows as its name or the template's themed module name when one is set (`CLAUDE.md`, Names), so the column's heading and the tab's label use the themed name when the template sets one, else "Modules". Nothing in code is named "tools".

## Working assumptions: not asked yet

Thomas did not answer these questions on 2026-10-14. Each is the product-planner's recommendation, used so the build can go on. They are not decisions, and Thomas can change any of them. The options are in the questions at the end.

- **No call on Home for now** (question 1). The Lobby's call is kept, unreached from Home, until Thomas decides whether Home gets a call strip.
- **The Lobby's name and the template's `lobby` field are kept as stored and no longer shown** (question 2). Templates still accept the field, so imported templates don't fail.
- **Existing guest links made for the Lobby keep working** (question 3), with the chat relayed both ways between the guest and Home. Manage stops offering a new one.
- **The chat column on Home is the same chat as a space's column.** It is the one `#chat` element, moved into Home's column and pointed at `lobby` while Home shows, and moved back into `#side-column`, pointed at the space, when a space shows. The two are never drawn as separate copies of the chat code.

## The contract

Written for decisions 6 to 11 and the working assumptions above. Where Thomas changes an assumption, the affected step changes and the questions say how.

### Server

- **The Lobby's record stays.** Its id is `lobby`, its stored keys and `isLobby` are kept, and it can't be deleted, as today. `GET /api/spaces`, `GET /api/presence` and `GET /api/status` keep listing it with `isLobby: true`, so Studio, OBS and old pages read what they read today. The pages decide not to show it.
- **Home's chat live, without the call service:** `GET /api/spaces/lobby/chat/stream`, an event stream for signed-in people. It answers 401 "sign in first" when signed out. For a guest, an access key or any other space it answers 404 "no such <space>". Its events carry what `tellChat()` sends today, as `{ type, ... }`:
  - a new public message (`chat`, with the message as stored);
  - `chat-delete`, `chat-clear`, `chat-clear-some` and `chat-visibility`;
  - a link's preview and Keep once they are stored.

  A private message never goes on the stream: it was only ever on its author's page, and the author's page draws it from the answer to its own request.
- **One path in for Home's chat.** `POST /api/spaces/lobby/chat`, and the command and Assistant routes, stay as they are. For `lobby` the server also does what the sender's page does in a space: it puts the new public message on the stream, and also sends it on the `lobby` call's data channel, so that anyone still in the Lobby through a guest link or an old page sees it. A message published in the `lobby` call by such a page is already posted to the history by that page. The history's `add()` is the single point that puts it on the stream, so nothing is sent twice.
- **Old addresses.** `/#join=lobby` and a reload that remembers `lobby` (`app.space` in `sessionStorage`) open Home instead of entering the Lobby. `/?setup=lobby` opens Manage at the Home section (below). `/modules/<id>?space=lobby` (the Calendar popped out of the Lobby) keeps working as today. Pages do the first two; the server changes none of these routes.
- **Words in sentences the server writes.** `lobbyRefusal()` reads "<Module> can't be turned on in <Lobby's name>". Proposed: it stays as it is, because no person can reach the Lobby's canvas any more to see it, and only Manage and the API show it.

### Pages

- **Home's layout,** wider than a phone:
  - three columns in `#join`. **Chat** on the left: `#chat` with the Discussion | Assistant tabs, the full height under the top bar, about 360 px wide, resizable and remembered in the browser as the space column's width is. **Spaces** in the middle, filling what is left: Who's around, then the heading row (the `home` word and **Add <space>**), then the space cards. **Modules** on the right (decision 11): the tiles as they are today (decision 10), about 320 px wide, in the order the server lists them, with no new links or launchers added;
  - no `max-width: 1180px`; the page uses the window's width. The ids `#join`, `#whos-around`, `#spaces`, `#space-list-title`, `#home-add-space` and `#dashboard` are kept. `#dashboard` moves to the right and keeps its id.
- **The Lobby's card is not drawn** (`renderSpaces()` leaves out `isLobby`). The Lobby is not offered in the space switcher, in the Lobby's Set up, or as "Back to <Lobby>".
- **Home's chat.** While Home shows (signed in, not a guest), `#chat` sits in Home's chat column, pointed at `lobby`: history from `GET /api/spaces/lobby/chat`, live from the stream above, sends through the existing routes. Discussion, Assistant, commands, Clear… and visibility all work as they do in a space. Commands are the ones on in the Lobby: the core ones and the Calendar's. When a space shows, `#chat` goes back to `#side-column`, pointed at the space. Home over a space shows Home's chat; going **Back to <space>** shows the space's chat again.
- **Unread.** Messages that arrive on Home's chat while a space shows are counted, from the server stream (decision 7). The count shows on the top bar's Home link (the Spaces slot), and nothing shows in the space's column (decision 8).
- **Who's around** stays above the spaces, unchanged in what it says. A person on Home is "online" with no place, as today. Someone in the Lobby's call (by a guest link or an old page) reads as "in <Lobby's name>", as today.
- **Narrow widths.** Below about 1200 px the Modules column moves under the space cards, in the middle column. At 760 px and below the chat column becomes a strip at the top of Home: the last message and the unread count, which opens the chat over the page. At 640 px and below Home has three tabs at the foot, **Chat | <home word> | Modules**, using the phone's tab bar ([plan-phone-space-bar](plan-phone-space-bar.md)), and opens on the home word's tab (decision 9).
- **Manage.** The Lobby's row on the Spaces tab becomes a **Home** row, first, not reorderable, with only what still means something: a description of who sees the chat ("Everyone in the <environment>"), and Clear… for owners. Name, description, picture, profile, Opens with and the guest link leave it (working assumption, question 2). The texts that name the Lobby in Manage, Set up, the template offer and the host console are reworded or removed in the same step (listed in step 5).
- **Guests** have no Home, as today. A guest link already made for the Lobby keeps working as it does today, its chat relayed both ways (working assumption, question 3).

## Left to build, in order

Each step is a try build: one builder, one pass, its own checks. Each one leaves the app working. Steps 1, 2, 4 and 6 are unblocked by Thomas's answers of 2026-10-14. Step 3 was never blocked. Step 5 rests on working assumptions (question 2). Steps 1 and 2 can be built in either order. Steps 3 to 6 each build on the one before.

1. **Home's chat stream** (server-development; medium risk; the smaller model will do; unblocked by decisions 6 and 7). `GET /api/spaces/lobby/chat/stream`. `chat-history.js`'s `add()`, removals, visibility, preview and Keep put the public events for `lobby` on it. `tellChat()` for `lobby` also sends on the stream. A post for `lobby` is also sent on the `lobby` call's data channel. Check cases in a new `tools/check-home-chat.mjs`, in `npm run check`, run on a throwaway server: a post seen on the stream, a private message never on it, a delete, a clear, a guest and an access key refused, another space's id refused. Nothing in the pages reads the stream yet.
2. **The Lobby leaves the pages' lists** (experience-design; small risk; the smaller model will do; unblocked by decision 6).
   - The Lobby's card, its switcher entry and its Set up are not drawn.
   - `/#join=lobby` and a remembered `lobby` open Home.
   - `/?setup=lobby` opens Manage > Spaces at the Home row.
   - Asides that fall back to the Lobby (`POST /api/asides/return` answering `lobby`) land on Home instead of entering the Lobby.

   Until step 4 Home has no chat, so the Lobby's chat can't be reached from the pages between steps 2 and 4. Proposed: build 2 and 4 back to back, or hold step 2 until step 4 is built.
3. **The three columns** (experience-design; layout, so the larger model). `#join`'s new layout at full width: Who's around and the cards in the middle, the tiles on the right, an empty chat column on the left with its width and resize, and the fold below 1200 px. `check-nav` is unchanged. Live in headless Chromium at 1920, 1440, 1280 and 1000 px.
4. **Home's chat** (experience-design; the riskiest step, so the larger model; unblocked by decisions 7 and 8). `#chat` moves between Home's column and `#side-column`. `attachChatInput`'s `getSpace` answers `lobby` while Home shows. Home's chat reads the history and the step-1 stream, and sends through the routes. Unread on the Home link. Home over a space and **Back to <space>** swap the chat both ways without dropping the space's call.
5. **The Lobby's words and Manage's Home row** (experience-design; small risk; the smaller model will do; built on the working assumption of question 2). Manage > Spaces: the Home row. The texts that name the Lobby are reworded or removed:
   - `public/admin.html`: "Everyone belongs to the Lobby" and "they land in the Lobby";
   - `public/admin.js`: `WORD_ABOUT.space`, `notInLobby()` and the hint "(not in <Lobby>)";
   - `public/space-setup.js`: "Its members stay in the Lobby";
   - `public/template-offer.js`: the Lobby row and "keeps only chat, the call and modules made for it";
   - `public/host.html`: the template editor's Lobby fields (kept as stored, no longer shown; question 2).

   Every changed sentence is listed in the builder's report for content-manager.
6. **Phones and narrow widths** (experience-design; layout, so the larger model; unblocked by decision 9). The chat strip at 760 px and below, and the three tabs, Chat | Spaces | Modules, at 640 px and below, opening on the spaces. Live at 390 px.
7. **A call on Home** (only if Thomas chooses it, question 1). Not designed here.

There is no data-migration step, because nothing stored is renamed or moved (decision 6).

## Verify

- **Step 1:** checked by the tool (`check-home-chat`), and with curl and an open stream on a throwaway `DATA_DIR` under `/tmp`. The relay to the `lobby` call's data channel can't be checked without LiveKit. The builder reports it as read as code only.
- **Steps 2, 3, 5 and 6:** live in headless Chromium on a throwaway server, as an owner, a moderator, a member and a guest, at the widths named in each step. Each step also runs `npm run check`; the two `check-names` cases that fail under root are known.
- **Step 4:** live in headless Chromium with two signed-in people on Home: a message, a delete, a clear, a visibility flip, an Assistant question, and a reload that reads the history. Home over a space needs a call connection. With the stand-in LiveKit it can be checked as far as the chat swapping columns. That the space's call keeps running underneath is something only Thomas can check.
- **Only Thomas, on a real server with LiveKit:**
  - a message from Home reaching someone in the Lobby by a guest link, and the reverse;
  - Home over a space with a real call running;
  - the OBS stream following an owner who goes Home;
  - Coffee Pub Studio after the change;
  - Home on a real phone.

## Risks

- **`space.js` is 6,595 lines,** and `#chat` is wired to the current space and to the call in many places. Step 4 is the one most likely to need a second pass. It is kept to the chat's element, its space and its live source.
- **A second live path for one chat.** Home's chat arrives by the server's stream while every space's arrives by the call. If the two drift (a new message kind added to one only), Home's chat misses it. Step 1 sends `tellChat()`'s own payloads, so a kind added there reaches both.
- **The gap between steps 2 and 4** hides the Lobby's chat from the pages (step 2's note).
- **"Lobby" stays in the code** as the record's id and the fallback. That keeps everything stored and linked working. The cost is that the code keeps a space that people no longer see as one, and its special cases stay.

## Assumed, for Thomas to confirm

- **The strip across the top of the sketch is the app's top bar,** not a call strip: a small square and a name at its left end (the logo and the environment's name), small round controls and what looks like a sign-out at its right end. Read the other way, it would be a call strip with mic and camera controls, which is question 1.
- **The small card marked "T"** at the foot of the right column is a module among the others, not a heading.
- **"Who's online" is the existing Who's around,** unchanged.
- **"Persistent chat" means the chat that is always there,** Discussion | Assistant as in a space's column, not a new kind of chat.
- **Home's chat is the Lobby's chat,** carrying over its history (decision 6). A fresh chat for Home, with the Lobby's left behind, would lose what people said.

## Questions for Thomas

Answered on 2026-10-14 and moved to Decisions: the Lobby's record (decision 6), going Home from a space (decision 7), the chat's scope (decision 8), Home on a phone (decision 9), the Modules (decision 10) and their name (decision 11). The rest were not asked yet. Each shows its working assumption, which is the recommendation.

1. **A call on Home?** Not asked yet. Working assumption: A.
   - (A) None in the first build; the Lobby's call is kept, unreached.
   - (B) A call strip on Home (Join the call, faces), which needs Home connected to the call service.
   - (C) Later, once Home is in use.

   Recommended: A, then C. Does not block steps 1 to 6.
2. **The Lobby's name and the template's `lobby` field?** Not asked yet. Working assumption: A.
   - (A) Retired from view: kept as stored, still accepted in templates (so imported templates don't fail), no longer shown or offered; Home's chat is headed Discussion | Assistant as in a space.
   - (B) The name becomes the heading of Home's chat ("Home base").

   Recommended: A. Step 5 is built on A; B would change its wording work.
3. **A guest link made for the Lobby?** Not asked yet. Working assumption: A.
   - (A) Keeps working: the guest enters the Lobby as today and its chat is Home's chat, relayed both ways.
   - (B) Turned off, with a sentence that says so.

   Recommended: A, since nothing linked should break; Manage stops offering a new one. Does not block.

## What is not decided

- Who moderates Home's chat. Proposed: owners and the admin, as with the Lobby today, since the Lobby has no moderators of its own.
- Whether the Calendar's events placed on the Lobby are still offered as a choice for new events from the Calendar destination, or only kept and shown.
- Whether the tiles' renaming plan ([TODO](../TODO.md)) and this plan land together, so the right column is named once.
- The Lobby's call: whether it is ever reached again, if question 1 stays at A.
