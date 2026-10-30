# The Call as a Module Plan

**Audience:** Thomas, deciding how the call becomes a true module; then server-development (the call service, the manifest, the routes), experience-design (the space page, the SDK, the module itself) and content-manager (the documents).

**Status:** Drafted 2026-10-30 by product-planner, for Thomas to decide. Nothing here is approved or built. From GitHub #377, which Thomas marked soon and critical: "it is known that this is coming soon and is a critical part of the product" (decision 7 of [plan-realtime-optional-livekit](plan-realtime-optional-livekit.md), whose steps 1 to 6 are built). The findings under "What it is today" were read in the code on this date; none were run against a LiveKit server.

## Why

Today the Conference is a built-in module: the host draws it, `public/space.js` holds its code, and Manage > Modules shows it as a card with one switch (`conferenceEnabled`). Every other tool beside the call is a module with a manifest, installed, enabled, turned on per space and given permissions the same way. The call should be one too, so that an environment without voice and video is simply an environment without that module, the space page stops carrying LiveKit, and other modules (the Stream module first) depend on the call the way they depend on the AI service.

The real-time plan made this possible: entering a space, chat, presence, away and the asides' nudges no longer use LiveKit. LiveKit is now only audio and video, joined by `POST /api/call/join`.

## What it is today

Everything below was read in the code. Line numbers are approximate and will drift.

### The server

- **The built-in card.** `BUILTIN_MODULES` in `server/index.js` (about line 272) lists `conference` (switchable, `setting: 'conferenceEnabled'`, `needs`, `turnOff`, `turnOn`) beside `chat`. `builtinView()` (about 4065) marks it `unavailable` with no call service.
- **The switch.** `conferenceEnabled` in `server/store.js` (default `true`, `updateSettings`), read by `branding()` (`conferenceEnabled`, `callService`), by the role check that clears the `conference` permission when it is off (`store.js` about 2048), by `callOffRefusal()` and `POST /api/call/join` ("voice and video are off"), and by `PATCH /api/settings`, which answers 503 when it is turned on with no call service.
- **Templates.** `server/templates.js` has `BUILTIN_MODULE_IDS = ['conference', 'chat']`; applying a template sets `conferenceEnabled` from whether `conference` is in its `modules`, and switching templates offers to turn it on but never off. Both shipped templates list `conference`.
- **The call service.** `HAS_CALL_SERVICE`, `mintToken()`, `callName()`, `participants()` and `mergeCall()`; `POST /api/call/join` (the calls cap, then the only person's token there is); `POST /api/token` (the OBS viewer's hidden token only); `runningCalls()`, `callsCapRefusal()`, `holdCallStart()` and the plan cap `calls`.
- **Asides.** `store.asides` (a level in Names: a call-only space), `callOffRefusal()`, `POST /api/asides`, `/api/asides/invite`, `/recall`, `/return`, `store.pruneAsides()`, and the four nudges on the live stream.
- **Moderation.** `canModerate()`; `POST /api/users/:key/kick` (out of the space and the call, both, decided in the real-time plan) and `POST /api/users/:key/mute` (the call only).
- **Presence.** The live register's `onCall` (the page's word, `PATCH /api/spaces/:id/presence`), merged with LiveKit's list for `inCall`, `micOn` and `cameraOn` in `GET /api/presence` and `GET /api/status` (`whereEveryone()`).
- **Permissions** (`ROLE_PERMISSIONS`, `server/store.js`): `conference` ("See and join the conference"), `react`, `shareScreen`, `privateCall`, `startAside`, `canMute`, `canKick`, and the image slot `image_background` ("Call background"). `canInvite` (the guest link) is not the call's, though the call's menu opens it.
- **Call settings** on the environment: `maxQuality`, `allowScreenShare`, `allowAsides`, `allowPrivate`, `allowReactions`, `autoJoinCall` and the `reactions` list, all in `branding()`. A person's own `callPrefs` (gain, noise suppression, push to talk, quality, mirror, background and the rest): `PATCH /api/me/call-prefs` and `/api/users/:key/call-prefs`.

### The pages

- **`public/space.js` (7,762 lines)** imports the LiveKit client on line 2 and holds one `call` connection for the page. The call's parts, read as code and not counted exactly, come to well over a third of the file: the tiles and screen tiles (`tileFor`, about 765 to 1010), the layouts and ordering (`applyLayout`, `fitTiles`, `spotlight`, drag to reorder), Join call (`paintJoinCall`, `autoJoinOnEntry`), the call's place in the always-on column (`callPlaceFor`, `syncCallPlace`, `popOutCall`, `setCallPosition`, the call's titlebar and time, about 1637 to 1855), the screen share lift (`syncShareLift`), attaching tracks and the muted and camera marks (about 3651 to 3752), reactions (about 4719 to 4800), the settings popover, the conference's `registerBuiltin` (about 4857), the microphone graph and push to talk (about 4959 to 5154), the call's LiveKit events (about 5154), `startCall`, `stopCall`, `hangUp`, the toggles, deafen, mirror, background, camera restart, the floating toolbar's overflow, keeping popped-out videos live (`keepPoppedVideoLive`), and away's microphone, camera and hearing part (about 7532 to 7626).
- **The always-on column** (`#side-column` in `public/space.html`) is the host's, but its top is the call's: `#call-head`, `#side-column-strip`, the strip and side splitters, `#call-out`, and the rail's faces. The chat fills the rest.
- **`public/space.html`** holds the conference's markup: `#conference` with its titlebar, `#no-call`, the aside, recall and away overlays, `#toolbar`, `#react-tray` and `#settings`. Its import map points `livekit-client` and `@mediapipe/tasks-vision` at `/lib/`.
- **`public/canvas.js`** treats built-ins apart (`builtins`, `registerBuiltin`) and the conference by name in places: `order: -1`, `flex`, a layout never closes it while on the call (`keepCall`), the screen share lift, and a guest's default open list `['conference', 'chat']`.
- **Smaller files:** `public/opens-with.js` (`conferenceAllowed`, `shouldAutoJoin`), `public/call-toolbar.js`, `public/gate-worklet.js`, `public/background-picker.js`, `public/space-people.js` (the on-call marks in who is here), `public/nav-bar.js` (the pinned Join, Rejoin call and Pull participants back items, the phone's call tab).
- **`public/style.css`:** about 230 lines match the call's selectors (tiles, the conference, the toolbar's `.fbtn`, `#no-call`, the tray, the column's strip). A grep, not an exact count.
- **Manage** (`public/admin.js`): the Conference card and the Conference tab (the call settings above, and the reactions list editor). **Profile** (`public/profile.js`): the Conference tab (a person's microphone, camera and background).

### Modules and the SDK

- **`host.media.watch`** (`public/module-host.js`) loads the LiveKit client itself, takes the OBS viewer's token, and answers `unavailable` at once when `branding().callService` is false.
- **The Stream module** (0.1.15) is the only bundled module that touches the call: its keyed page watches one person with `host.media.watch` and follows them with `host.presence`. With no call service it draws pictures only.
- **What a module cannot do** (from [plan-stream-module](plan-stream-module.md), still true): add a server route, mint a LiveKit token, or run code on the server. A bundled module runs in the page (`runModeOf`), in a shadow root, built from one HTML file.
- **`hooks.ai`** is the pattern to follow: `true` (cannot be turned on without the service) or `"optional"` (works without it); `modules.missingFor()` names `ai`, `modules.aiDependents()` lists what to turn off with the service, and `host.ai.available()` tells an optional module.

### Checks

`tools/check-canvas.mjs` runs the call's event handlers against a stand-in call and holds the column's sizes; `tools/check-call-bars.mjs` the call's bars; `tools/check-live.mjs` the register and `onCall`; `tools/check-module-host.mjs` push to talk while away; `tools/shots-livekit-stub.mjs` stands in for LiveKit for screenshots.

## The target

- The call is a bundled module with its own manifest, installed, enabled, turned on in spaces, given a display name and icon, and uninstalled like any other. Turning it off is turning the module off; there is no `conferenceEnabled`.
- The space page holds no call code and does not load LiveKit unless the call module is there and someone joins.
- What a person sees on the call does not change: the tiles, the toolbar, the column, the pop-out with its overlaid bars, asides, reactions, away.
- Other modules say whether they need the call or use it when it is there, as with the AI service.
- A server with no LiveKit keys behaves as it does now, and the call module's card says why it cannot be turned on.
- No data migration: the product is not released. `conferenceEnabled` and the built-in card are removed, not kept beside the module.

## Options

Each choice has two or three options, what each costs and what it rules out. **Lean** marks a suggestion only; nothing here is decided until Thomas says so.

### 1. Where the server half lives

A module has no server code. The call needs tokens, the calls cap, kick and mute through LiveKit's server API, and asides.

- **A. The host keeps a call service, as it keeps the AI service.** Everything in `server/index.js` that talks to LiveKit stays, unchanged in shape. The module is the page half: it asks the host for a token and draws the call. Costs: little on the server. Rules out: a third party replacing the call's server side (another media server) without changing the host.
- **B. Modules get server code.** A new extension system: a module ships server files the host loads. Costs: large, and a security boundary the product does not have (an uploaded module running on the server). Gains: the call, server and all, in one package.
- **C. Keep the built-in, give it a manifest.** A manifest-shaped definition inside the host, listed and switched like a module. Costs: small. It is not a true module: the code stays in `space.js`, and the issue asks for more than this.

**Lean:** A. The host is not the call; it offers a call service, as it offers AI, storage and place search. Nothing on the server names the module.

### 2. What moves into the module, page side

- **A. All of the call's drawing and media; the host keeps space-level things.** The module holds the tiles, layouts, toolbar, microphone graph, push to talk, camera, background, screen share, reactions (a LiveKit data message, decided in the real-time plan), the settings popover, **Not in a call**, the call's time, and keeping popped-out videos live. The host keeps: the always-on column and its slot for the call, the phone's tabs and the pinned Join, Rejoin call and Leave items, the app's Pop out, presence and who is here, away as a state, asides (records, routes, moves between spaces), kick and mute (the routes; the buttons on a tile are the module's and call the host), and the calls cap.
- **B. A thin module.** Only the tiles move; the toolbar, the microphone and the join stay in the host. Costs less now, but the space page still carries LiveKit and the call's logic. Not a true module.
- **C. Everything, asides included.** The module also owns asides and moves people between spaces. Not possible without server code (option 1 B): asides are host records and a level in Names.

**Lean:** A.

### 3. The surface: where the module is drawn

- **A. A new surface, `surfaces.call`: the call's slot in the always-on column.** The host draws the column, the call's titlebar (the shared module frame), the splitters, the 45% and 55% rule, the rail and the phone tab; the module fills the content. Its modes are the column (with the call positions top, bottom and left), floating over the Workspace, and a window of its own. Only one enabled module may claim it, as only one may claim a keyed path. Costs: a new surface type in the manifest and in `canvas.js`. Keeps [plan-one-bar](plan-one-bar.md) decision 2 (the call and chat always on, in the column).
- **B. An ordinary `surfaces.canvas` module, docked or floating.** No new surface, but the call leaves the column and becomes a Workspace window, against plan-one-bar decision 2.
- **C. The module draws the whole column, chat too.** The chat is the host's, so this would take the chat with it. Rules out the chat staying built in.

**Lean:** A.

### 4. How the module runs

The call needs the microphone and camera, an audio worklet, the background processor, video elements moved into a pop-out window, and LiveKit's internal watch on popped-out videos.

- **A. In the page only.** `surfaces.call` requires the page run mode, as a keyed page does (`public/keyed.js` refuses a frame). The module loads `/lib/livekit-client.esm.mjs` as `host.media.watch` does now.
- **B. In a sandboxed frame too**, with `allow="microphone; camera; display-capture"`. A sandboxed frame has an opaque origin; device prompts, the pop-out window and moving video between documents would each need work, and none of it can be checked here.

**Lean:** A.

### 5. How other modules depend on it

- **A. `hooks.call`, like `hooks.ai`:** `true` (needs the call; cannot be turned on while it is off) or `"optional"` (uses it when it is on). The call is "on" when the server has a call service and an enabled module claims `surfaces.call`. `call` becomes a reserved id, named in `missing` as "voice and video". `host.call.available()` answers `{ available, why }`. The Stream module declares `"optional"`; the call module itself declares `true`, which replaces the card's `unavailable` special case.
- **B. `requires: ['conference']`.** Already exists. But it names a module, so a replacement call module would break every dependent; and it says nothing about the LiveKit keys.

**Lean:** A. Nothing names a module.

### 6. On per space, or for the whole environment

- **A. Like any module:** enabled for the environment, then on in every space or in chosen spaces, the Lobby included (`surfaces.call.lobby: true`). A planning space can have no call. Asides follow: none from a space where the call is off.
- **B. Environment-wide only,** as `conferenceEnabled` is today: enabled means on everywhere.

**Lean:** A. It is what a true module does, and the space's Modules list already handles it.

### 7. Permissions

- **A. The host keeps them**, as it keeps `useAi`: `conference`, `react`, `shareScreen`, `privateCall`, `startAside`, `canMute`, `canKick` stay on the Roles tab, shown only while the call is on. The server enforces the join, asides, kick and mute, so it reads its own permissions.
- **B. The module declares its own** (`module.conference.join` and the rest), and the call service reads them through a field in `surfaces.call` that names which permission means what. A true module's own permissions, at the cost of a mapping the host must trust.
- **C. Split:** the server-enforced ones stay the host's; the page-only ones (`react`, `shareScreen`) become the module's.

**Lean:** A. Kick also removes from the space, which is not the call's alone.

### 8. Settings

- **A. Call-only settings move to the module.** `maxQuality`, `allowScreenShare`, `allowReactions`, `autoJoinCall` and the reactions list become the module's environment settings (its Module Configuration page), and a person's `callPrefs` become its person settings (the Profile's Conference tab goes; the module's settings take its place). `allowAsides` and `allowPrivate` stay the host's, since asides are the host's.
- **B. All stay host settings,** read by the module through `branding()`. Less to move; the Manage Conference tab stays a special case.

**Lean:** A. Stored values are reset, not carried over (no migration).

### 9. The id and the name

- **A. Keep `conference` and "Conference".** Templates, display names, the `conference` permission and stored layouts already use it. The project rule is no renaming for its own sake.
- **B. Rename to `call` and "Call".** Matches `POST /api/call/join` and the code's `call`, but `call` would then be both the module's id and the reserved service name of option 5.

**Lean:** A.

### 10. The SDK

- **A. Two parts.** For every module: `host.call.available()`, and the existing `host.presence` (`onCall`) and `host.media.watch`. For the module that claims `surfaces.call` only: `host.call.join()`, `host.call.said()`, the column, away, asides and moderation calls in the contract below. Any other module calling those gets 403.
- **B. Expose everything to every module.** Simpler, but any module could take a token and publish a microphone.

**Lean:** A.

## The contract

This follows the leans. Where Thomas picks otherwise, the matching part changes. Names are for the builders to keep.

### The manifest

- `surfaces.call`: `{ entry, modes, lobby }`. `modes` lists `column`, `float` and `window` (at least `column`). `lobby` as `surfaces.canvas.lobby`. Needs the `space` scope; a `space` module needs `surfaces.canvas` or `surfaces.call`. Refused at install: a frame-only module (switching a claimant to sandboxed answers 400 "this module draws the call and must run in the page").
- One claimant per environment: enabling a second answers 409 "<name> already draws the call. Turn it off first."
- `hooks.call`: `true` or `"optional"`; anything else refused with a sentence, as `hooks.ai`. `call` is a reserved id.
- The Conference module's own manifest (`modules/conference/module.json`): id `conference`, scope `space`, `surfaces.call` with all three modes and `lobby: true`, `hooks.call: true`, `install.auto: true`, the settings of option 8, no permissions of its own (option 7 A).

### Server

- `callOn()`: a call service and an enabled claimant. `callOn(spaceId)`: and the claimant on in that space. `callOffRefusal()`, `POST /api/call/join`, `PATCH /api/spaces/:id/presence` (`onCall: true`), the aside routes and the role check read it instead of `conferenceEnabled`. The sentences stay: 503 "voice and video are not set up on this server", 403 "voice and video are off".
- `modules.missingFor()` names `call` for a `hooks.call: true` module while `callOn()` is false; `modules.callDependents()` lists them, turned off with the call as `aiDependents()` are with the AI service. Enabling the Conference module with no call service answers 409 with the no-call sentence.
- The space's module list for the canvas carries the claimant's `call: { entry, modes, lobby }` and `runMode`.
- `branding()`: `conferenceEnabled` goes; `callService` stays; `call: { on, module }` added (`module` the claimant's id, or null). The call settings of option 8 leave `branding()`.
- Removed outright: the `conference` entry of `BUILTIN_MODULES`, the `unavailable` special case in `builtinView()`, `conferenceEnabled` in the store, `PATCH /api/settings` and `templates.js`, `PATCH /api/me/call-prefs` and `/api/users/:key/call-prefs` (with option 8 A). `BUILTIN_MODULE_IDS` becomes `['chat']`; a template's `conference` is a bundled module id like any other.
- Unchanged: `POST /api/call/join`, `POST /api/token`, the calls cap, asides, kick, mute, presence and `GET /api/status`.

### The SDK

For every module:

- `host.call.available()` answers `{ available, why }`; `why` is a sentence when false ("Voice and video are not set up on this server.", or "Voice and video are off here.").
- `host.media.watch` answers `unavailable` when the call is not on, not only with no call service.

For the claimant only (others get 403 "only the module that draws the call may do this"):

- `host.call.join()`: the token from `POST /api/call/join`, with the guest pass for a guest. `host.call.said({ onCall })`: the presence PATCH. The host keeps `onCall` false for anyone else.
- `host.call.on('space', fn)`: entered, leaving, moving (with `keepCall` for a pull), so the module joins, hangs up or rejoins. `host.call.on('join', fn)`: the host's Join or Start call was pressed, or auto-join applies.
- `host.call.on('away', fn)`: away on or off with its message; the module pauses and restores the microphone, camera and hearing.
- `host.call.place`: the current place (`column` with its position, `float`, `window`), `popOut()`, `bringBack()`, `setPosition()`, and a `change` event; the column's strip height is the host's.
- `host.call.state({ onCall, shareActive, faces })`: what the host draws outside the module (the crumb, the phone tab's mark, Leave's wording, the rail's faces, the screen share lift).
- `host.asides.pull(keys, { private })`, `host.asides.recall()`, `host.asides.return()`: the routes as today; the moves stay the host's.
- `host.moderate.kick(key)`, `host.moderate.mute(key, muted)`: the routes as today.

What the module may not do: take a token for anyone else or for another space, change presence beyond `onCall`, set away, read or send chat (it may use `host.chat` like any module), move the page to another space, or draw outside its frame except through `host.menu.show` and the popovers inside its own content.

### What a person sees

- With the call on: what they see today, in the same places. The call's titlebar is the shared module frame's, with the module's display name and icon, its time, Pop out and its menu.
- The popped-out call window keeps its overlaid bars: the titlebar slides up and the toolbar down when the window is idle, and the tiles take the whole window. The host's frame gives the window mode an `overlay` option for this; the module styles its toolbar from the frame's `idle` class.
- With the call off in a space, or no call service: no call in the column, no Start call, no asides or private conversation, no reaction tray, no Online's on-call marks. Nothing says LiveKit.
- Manage > Modules: Conference is an ordinary bundled module's card (Enable, Disable, Uninstall, Shown as, the spaces it is on in). With no call service its switch cannot be turned on and it says "Voice and video are not set up on this server." once. Its settings are on its Module Configuration page.
- Turning it off with people on a call hangs everyone up at once, as the switch does today.
- All colors from the theme tokens, which reach into the module's shadow root.

## Data

None to migrate. `conferenceEnabled`, the built-in card and (with option 8 A) `callPrefs` and the call settings in `store.settings` are removed; test data may be reset. Every environment gets the Conference module once through `install.auto` on its first start after the update, which is an install, not a migration.

## Left to build, in order

Each step leaves the product working and is built and checked on its own. Sizes are S, M and L.

1. **`hooks.call` and `callOn()`** (S, server-development). The hook, the reserved id, `missingFor`, `callDependents()`, `host.call.available()`'s route, and every `conferenceEnabled` read going through `callOn()`. The built-in still counts as the claimant for now.
2. **`surfaces.call` in the manifest and the registry** (M, server-development). The surface, its refusals, one claimant, the space's module list, `branding().call`.
3. **A generic call slot in the page** (L, experience-design, larger model). `canvas.js` and the column draw "the claimant" instead of `conference` by name: `order`, `flex`, `keepCall`, the share lift, the guest's default, `conferenceAllowed`. The built-in conference is registered through the same path, so nothing changes for a person.
4. **The SDK's claimant calls** (M, experience-design; S, server-development for the 403s). `host.call.*`, `host.asides.*`, `host.moderate.*` in `public/module-host.js` and `public/sdk/host.js`.
5. **The Conference module** (L, experience-design, larger model). `modules/conference/`: the call code out of `space.js`, `space.html` and `style.css` into the module, LiveKit's import out of the space page, `call-toolbar.js`, `gate-worklet.js` and the background picker with it. The built-in registration is deleted. The riskiest step.
6. **Manage and templates** (M, server-development; S, experience-design). `conferenceEnabled` and the built-in card removed, `BUILTIN_MODULE_IDS` to `['chat']`, the template switch offer, `install.auto`.
7. **Settings** (M, experience-design; S, server-development), with option 8 A. The Manage Conference tab and the Profile Conference tab become the module's settings; the call-prefs routes go.
8. **The Stream module** (S, experience-design). `hooks.call: "optional"`, `host.call.available()`, a version bump.
9. **The documents** (M, content-manager). architecture-canvas (the conference and the column), architecture-overview, architecture-modules (`surfaces.call`, `hooks.call`), api-modules, api-module-sdk (`host.call`), the call user guide, the CHANGELOG.

## Verify

- **Steps 1, 2, 6:** `tools/check-modules.mjs` and `tools/check-hooks.mjs` gain cases: `hooks.call` values, the reserved id, `surfaces.call` refusals, a second claimant refused, a sandboxed claimant refused, dependents turned off with the call. `tools/check-templates.mjs` and `tools/check-template-switch.mjs`: `conference` as a bundled module. `tools/check-live.mjs`: `onCall: true` refused while the call is off. `tools/check-startup.mjs`: with no LiveKit keys the Conference module cannot be enabled. Checked by a tool.
- **Step 3:** `tools/check-canvas.mjs` and `tools/check-call-bars.mjs` pass unchanged, then gain a case for a claimant with another id. Seen in a browser locally: the column, the positions, the rail, the phone tabs.
- **Step 4:** `tools/check-module-host.mjs`: a non-claimant gets 403 for each claimant call. Checked by a tool.
- **Step 5:** `tools/check-canvas.mjs`'s stand-in call moves into a check of the module's script; `npm run check` passes; `tools/check-module-layout.mjs` holds the module to the shared frame. Locally, with LiveKit keys set and no LiveKit running: Start call shows "Could not reach..." as now, the column draws, the pop-out opens with its bars. With no keys: no call anywhere, no LiveKit loaded by the space page (the network panel).
- **Steps 7 and 8:** the settings pages seen locally; the Stream module's box draws pictures with the call off.
- `npm run check:docs` and `node tools/check-names.mjs` after step 9.

**Needs a real LiveKit, and can't be checked here:** the call itself after the move (tiles, audio, video, speaking, the muted mark), screen share and its lift, reactions on tiles and OBS boxes, the microphone graph and push to talk, background blur, the pop-out window's live videos, pulls into and out of asides on the call, kick and mute on a live call, the calls cap, and an OBS view's video. Thomas or a QA pass on a real server, on a desktop and a phone, before step 5 counts as done.

## Risks

- **The space page is 7,762 lines** and the call is well over a third of it, threaded through leaving, moving, away and the column. Step 3 makes the seam first, with the built-in still behind it, so step 5 is a move, not a redesign.
- **Layout.** The column, its splitters, the 45% and 55% rule, the call positions, the share lift and the phone tabs are the host's and the module's together. The seam (`host.call.place`, `host.call.state`) must carry all of it, or the call's look will drift.
- **Asides are call-only spaces.** The host keeps them and the module only asks for them; an aside's screen is the column alone, so in an aside the page is the call module and nothing else. A space whose call is off has no asides, and an aside whose parent's call is turned off while people are in it must send them back.
- **Running in the page with a shadow root.** Video elements and the whole content move into a pop-out window; the module must find its elements through `host.root`, never `document`, and the pop-out's document is another one. LiveKit's `observeElementInfo()` is internal API, as noted in architecture-canvas.
- **One file.** A page-run module is one HTML file; the call's code is large. The module build (`tools/build-module.mjs`) already inlines `src/` parts for Maps; the call does the same.
- **Real calls cannot be checked here.** Everything after step 5 rests on a test on a real LiveKit server.

## Already decided (other plans)

- The call is only audio, video and reactions; entering, chat, presence, away and asides' nudges are the live stream's; reactions stay on LiveKit and are never stored. Thomas, 2026-10-26, [plan-realtime-optional-livekit](plan-realtime-optional-livekit.md), decisions 1 to 3.
- A kick removes a person from the call and the space, both. Same plan, decision 5.
- With no call service the Conference is hidden in spaces and its card says once: "Voice and video are not set up on this server." Same plan, decision 6.
- The call becomes a true module, soon, as a critical part of the product. Same plan, decision 7, and GitHub #377.
- The call and the chat are always on in the always-on column. [plan-one-bar](plan-one-bar.md), decision 2.
- Entering a space never joins the call; only a click does. Thomas, 2026-09-30.

## Decisions

None yet. Thomas decides the questions below.

## Open questions

1. **Where the server half lives** (option 1): the host keeps a call service (A), modules get server code (B), or a built-in with a manifest (C)? Lean A. Blocks everything.
2. **What moves into the module** (option 2): all the call's drawing and media, with the host keeping the column, asides, presence, away and moderation routes (A), or a thin module (B)? Lean A. Blocks steps 3 to 5.
3. **The surface** (option 3): a new `surfaces.call` slot in the always-on column (A), or an ordinary canvas module (B)? Lean A. Blocks steps 2 and 3.
4. **Run mode** (option 4): in the page only (A), or a frame too (B)? Lean A. Blocks step 2.
5. **Dependents** (option 5): `hooks.call` true or optional (A), or `requires: ['conference']` (B)? Lean A. Blocks step 1.
6. **Per space** (option 6): on in chosen spaces like any module (A), or environment-wide only (B)? Lean A. Blocks step 1.
7. **Permissions** (option 7): the host keeps them (A), the module declares them (B), or split (C)? Lean A. Blocks step 2.
8. **Settings** (option 8): call-only and person settings move to the module, asides' switches stay (A), or all stay host settings (B)? Lean A. Blocks step 7 only.
9. **Id and name** (option 9): keep `conference` and "Conference" (A), or `call` and "Call" (B)? Lean A. Blocks step 2.
10. **Who may claim the call:** any module that runs in the page, one at a time, an uploaded one only after the existing "Run in the page" warning (A); only a bundled module (B)? Lean A, which keeps the host call-agnostic. Blocks step 2.
11. **The chat** stays built in, its own later plan (A), or moves in this plan (B)? Lean A. Blocks nothing.
12. **Kind of build:** a production build (full flow, QA on a real LiveKit before step 5 lands) (A), or try builds per step (B)? Lean A, given the size and that it is critical. Blocks nothing in the plan, but sets how it ships.
