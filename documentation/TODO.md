# To do

Work is tracked at <https://github.com/Drowbe/coffee-pub-collaborator/issues>. This page is an index of the open
issues, grouped, with a few words each; the issue holds the detail. See the Studio repository for that app's
side of things.

## In progress

- **Environment templates** ([plan-environment-templates](plans/plan-environment-templates.md)): done, except the live verification of addendum 2's steps 3a and 3b (#68). Addendum 3, editing a bundled template on the host console and Duplicate (#91), is built and its console was walked live (2026-09-30). Addendum 4, the word for entering a space, is built and verified live (2026-09-30).
  (September 25, 2026).
- **Calendar and Map in the top bar** ([plan-calendar-destination](plans/plan-calendar-destination.md), [plan-map-destination](plans/plan-map-destination.md)): built 2026-10-02, every build step of both plans. Open for Thomas:
  - On a wide screen the destination's name shows twice: as the entry in the middle of the bar and as the breadcrumb ("› Calendar").
  - On a phone the **Agenda** tab has the Calendar's icon, the same as the **Calendar** tab beside it (a tab's icon is its module's).
  - Map stays hidden while Maps' map is a file at a web address: only a map file on the server (or the host's folder) counts, though the plan said a web address does too.
  - The destination page reads the Calendar's **Open on** setting by its key (`defaultView` in `KINDS` in `public/destination.js`), so the host page knows one module's setting by name.
  - Owners and the admin who aren't members of a space don't see it in Calendar's or Map's filter, nor its events, tasks or places there: those follow the `spaces-data` membership rule, though elsewhere (presence) owners and the admin belong to every space.
  - Manage's reason for Map with no map file reads "Choose a file for "Map files" in Maps' settings first."; the plan had "Choose a map file in Maps' settings first.".
- **The top bar** ([plan-primary-nav](plans/plan-primary-nav.md), approved 2026-10-02): nine steps. Steps 1 (the `home` word and the full list of module pages) and 2 (the bar's layout and moves) are built (2026-10-02), and so is step 2b, the Modules slot leaving the bar (decision 30), and step 3, presence filtered by membership (2026-10-02). Next is the online people widget; then the aside rules, views over the space with the return pill, the visit view and the bell's notifications. For Thomas: CLAUDE.md's Names gains `home` (decision 13).

## Planned

- #2 The first time: guidance, welcome cards, an owner's setup checklist ([plan-entering](plans/plan-entering.md)).
- #12 Object status: action required, tentative, confirmed ([plan-object-status](plans/plan-object-status.md)).
- #13 Planner changes shown in the Calendar. A dated plan object is now on the Calendar and kept in step (#96, [plan-plan-calendar-sync](plans/plan-plan-calendar-sync.md)); what #13 still asks beyond that is to be decided.
- #73 Research from any AI ([plan-research-import](plans/plan-research-import.md)): phase 1 (copy instructions, paste or file import into Research or the Planner) is done. Still to come: To-do and Calendar as destinations through a generic conduit, which needs its own plan; and phase 3, a direct connection for AI apps, which waits on #64.
- A rollup on each space's tile on home, starting with the Planner, chosen per space, in place of the removed Trips tile ([plan-dashboard](plans/plan-dashboard.md), phase 5): a direction from Thomas (2026-10-02) with open questions, not yet a contract.
- Rename the dashboard's widgets to **tiles** (Thomas, 2026-09-30): "widget" now means a live piece in the header's bars, such as who is here. A renaming plan with a data migration comes next; not written or built.
- The call-name fallback goes: `server/call-names.js` still reads the call names from before Names step 3 ([plan-names](plans/plan-names.md), step 10).
- #132 A document editor (ProseMirror) for the long prose fields: research notes and answers, plan notes, to-dos, places, and calendar details. Markdown stays what is stored. Chat stays a textarea. About two weeks. Building waits on a go-ahead.

## Verify in a real call

- The top bar (steps 1 and 2, [plan-primary-nav](plans/plan-primary-nav.md)): the breadcrumb in a real aside ("› Disneyland › Aside: Michelle", and clicking Disneyland, or picking it in the switcher, bringing everyone back to the space's call), the switcher and Manage over a running call, **Host console** on a hosted install (only its address was checked, as a pure function), **Install as an app** in the profile menu, a module card's heading on home opening over a running call (Away, then **Back to**), and the bar with a screen reader. Verified so far by `tools/check-nav.mjs` and in headless Chromium with a stand-in LiveKit at 1280, 1024 and 390 pixels.
- Calendar and Map in the top bar ([plan-calendar-destination](plans/plan-calendar-destination.md), [plan-map-destination](plans/plan-map-destination.md)): opening either over a running call (muted while Away, the microphone and camera held off, everything back on closing), a task dragged onto a day and an event onto the To-do, the map drawn with WebGL from real map tiles, and a place search with Photon. Verified so far by `tools/check-destinations.mjs`, `check-module-host`, `check-nav` and `check-drop`, and in headless Chromium with a stand-in LiveKit and a stand-in place search, without WebGL.
- Presence by membership (step 3, [plan-primary-nav](plans/plan-primary-nav.md)): with three people in two spaces, an aside and a private conversation pulled from one of them, check the space cards' "N here", the switcher, Who's around, the members' tooltips and "off stream", and the placeholder tiles (named for an ordinary aside, never for a private one, also after a reload). Verified so far by `tools/check-presence.mjs` (15 checks), `tools/check-nav.mjs`, and live against the API and in headless Chromium with a stand-in LiveKit.
- #29 Walk the call's layout, the canvas, snapping and the calls cap in a real call.
- #30 Modules with two people on a real server.
- Joining and pulls (Thomas's changes of 2026-09-30, [plan-entering](plans/plan-entering.md)): **Join the call** and the green phone with two people, **Currently on the call** and who is here following them live, the calls cap's refusal in **Not in a call**, and entering never asking for the microphone. An owner's pull into a real aside and back, and **Rejoin call**, keeping the call for those on it and not for those off it, including within the server's 15-second hold on a new call's place. Verified so far in headless Chromium with a faked LiveKit and by tools only.
- Pulled into an aside, then **Rejoin call** (fixed 2026-10-01): the pulled person's space bar shows **Rejoin call** and the top bar's breadcrumb reads "<space> › Aside: <names>" (since 2026-10-02; it was "<space> · Aside" in the space bar), and **Rejoin call** takes them back to the space's call, still on it if they were. Verified so far in headless Chromium with a stand-in LiveKit and by `tools/check-canvas.mjs`.
- #95 Planner phases: entering a Travel space opens the Planner and chat and joins no call.
- The chat's **Bring in N objects** button: offered for a pasted answer with an `objects` block, a `card` block or no fences, and not for an answer with an old-named block ([plan-kind-names](plans/plan-kind-names.md), step 5; the route behind it was checked).
- The fixes from Thomas's real call of 2026-10-01, verified so far with a faked LiveKit and by tools only. Join first, then have two people join without push to talk: no "muted" on their tiles, and muting and unmuting follows on every screen. Away: you hear nobody, the microphone button, **M** and push to talk don't open the microphone, and **Back** restores what was on. In the installed app, pop out, then minimise or cover the main window for more than 10 seconds: the videos in the pop-out keep moving. Also see whether audio in the pop-out is ever held back by the browser's autoplay rule (suspected, not seen). Away for late joiners: go away with a message, then have someone join, and someone reload; both see your tile as away with the message, and the camera button and **V** don't turn your camera on until **Back**. Drop someone's connection until it reconnects: the others keep their tile, and they still count as on the call.
- #3 Entering a space ([plan-entering](plans/plan-entering.md), Part 1, built 2026-09-30): **Enter** and **Back to** on the space list (and **Back to** an aside); what opens on a first and a second visit, and for a guest; the phone's first tab; the status line.

## Small fixes and checks

- Top bar follow-ups from steps 1 and 2 ([plan-primary-nav](plans/plan-primary-nav.md)):
  - `server/index.js` still sends `module.nav` in a module's context (about line 5533), from `surfaces.page.nav`, which nothing reads now; drop it.
  - The space list shown while still connected has an empty breadcrumb until the return pill (step 7).
  - A page opened from home over a space says "← Back to <space>", but it returns you to home, not the space. The wording should say where it goes.
  - Stream's environment page: list anything that belongs in its settings on Manage's Modules tab instead (decision 33).

- Walk linked objects and plan and calendar sync live, Planner and Calendar side by side in one space (the drag that keeps a link on its day, the live refresh, "Used by N.", a twin made, moved, retitled and deleted on each side), and the one-time backfill on a hosted install. Built in #98 to #104 and checked by tools only.
- #110 The old name, Magpie, is gone from the code, the templates and the guides, architecture, API and design documents, and the file formats are named by kind ([plan-kind-names](plans/plan-kind-names.md), built 2026-09-30). Still to do: the logo images (`public/assets/images/brand/logo-light.png` and `logo-dark.png` read "COFFEE PUB MAGPIE"; see [known-issues](known-issues.md)), and the plans that still say Magpie or name the old formats (17 plans, product-planner's).
- An accented product name loses its accents in the server's user-agent: `PRODUCT_NAME` "Café Pub" is sent as `Caf-Pub` (only printable ASCII is kept, `headerProductName()` in `server/product-name.js`).
- The product name guard in `tools/check-names.mjs` checks that `PAST_BLOCK_LABELS` is a frozen list of two; it should pin the two past labels exactly.
- A fixed-time check case for the old-fence pattern in `server/object-format.js` (`PAST_FENCE`) on a very long "> " prefix.
- #25 A check that compiles every `pattern` attribute the way browsers do.
- #26 Remove the unneeded fallback in the console's Save plans.
- #27 The console's top bar requests that answer 404.
- #23 Too many connections to the server from one page.
- The pop-out's video fix (`keepPoppedVideoLive()` in `public/space.js`) uses LiveKit's internal `observeElementInfo()`, not its public API. Check it still works whenever `livekit-client` is upgraded (now `^2.22.3`).
- `hereLabel()` and the who-is-here wording steps in `public/space-people.js` have no check in `tools/check-nav.mjs`.
- `tools/check-canvas.mjs` times `resettle` against budgets of 16 to 33 ms. They have four to five times headroom on the development machine, but could fail on a slow CI machine.
- A **Grid size** drag that ends without a `change` event leaves the previewed layout on screen but unsaved until the next save (`holdStore` in `public/canvas.js`).
- The SDK menu's link entries (`<a role=menuitem>` in `public/sdk/host.js`, `host.menu.show`) don't open on Space; Enter opens them. Buttons and other entries do.
- The **Modules** list, who is here and the space bar's **…**: check them with a real screen reader, in Firefox and Safari, and on a real phone. Verified in headless Chromium only.
- Pasting a picture into a picture box: check it in Firefox, Safari, on a real phone, with a real screen reader, and with a file (not a picture) copied from the computer's own file manager. Verified in headless Chromium only.
- Remove the old `away` data message next release: `sendAway()` still sends it and `DataReceived` still reads it in `public/space.js`, for pages on the script before the `away` and `awayMessage` attributes. Its check in `tools/check-canvas.mjs` goes with it.
- Outside away, changing the camera or quality while the camera is off but still published reopens the camera hardware (`restartCamera()` in `public/space.js`), and `setCameraEnabled(true)` does not pass `prefs.camId`, so the camera turned back on may not be the one chosen.
- Going away again while **Back** is still waiting can leave the away button's title and the old `away` data message out of order (`setAway()` in `public/space.js`). The microphone part is fixed (`keepMicOffWhileAway()`).
- Changing the microphone in Settings while away reopens the microphone pipeline. The publication stays muted, so nobody hears you, but the device is opened.
- The comment above `openOverlay()` in `public/space.js` says you don't see your own tile marked Away while your profile or Manage is open over the call; you do (`showAway()` draws your own mark from your own state).

## Sign-in and accounts

- #28 Passkeys, the second phase of two-step sign-in.

## Hosting and environments

- #48 A one-container install that runs LiveKit itself.
- #56 Run it on Windows and Mac.
- #49 A billing relay for a payment provider's webhook.
- #50 An environment's own domain, and one identity across environments.
- #51 The past-due sweep for a server that restarts often.
- The calls cap is enforced by the page only: the page asks `POST /api/call/join` before joining, but a token can publish as soon as it is minted, so a modified page could skip the check, as it could before. Making the cap binding means granting publish only after the check.
- The host console's environment list waits on LiveKit when any environment's plan caps calls (it counts each one's running calls, up to two seconds a request).
- #57 An About page.

## Streaming and OBS

- #52 A shared screen in the OBS view.
- #53 OBS sources for guests.
- #54 Choosing whose space the stream follows.
- #55 Several asides at once, and a director's switch.

## The call and the pages

- #37 Call time in the conference's titlebar.
- #38 A shorter header.
- #39 The nav colours in the theme editor.
- #31 Customising the dashboard's layout, and snapping on the spaces page.
- #58 One input in Chat ([plan-one-input](plans/plan-one-input.md)): every step is built. Still to come: the plan's live checks in a browser and a real call.
- Navigating away without hanging up: decided (2026-10-02), views over the space that set Away while on the call ([plan-primary-nav](plans/plan-primary-nav.md), steps 7 and 8).
- A private conversation started by invitation has no origin: decided (2026-10-02), its parent is the inviter's space ([plan-primary-nav](plans/plan-primary-nav.md), step 5).
- An aside's **Join** entry in the space list: decided (2026-10-02), asides leave the space list ([plan-primary-nav](plans/plan-primary-nav.md), step 6).
- For Thomas to confirm: members of the space an aside was pulled out of may see that it is private (`asidePrivate` in `GET /api/presence`), never who is in it. The project manager chose this while building step 3 of [plan-primary-nav](plans/plan-primary-nav.md); it keeps the "In a private conversation" placeholder that showed before step 3. The plan itself gives them only `aside: true`.
- `objectSync` (`server/object-sync.js`) is one event source shared by every environment on a hosted server, so a `refchange` from one environment reaches another's `GET /api/modules/stream` listeners when the module id and the scope key match. It carries only pointers, and modules ask again with their own permissions, but it should be scoped per environment. Found while fixing the schedule crash (2026-10-02).
- For Thomas to decide: every space's name and member list is still visible to anyone signed in (`GET /api/spaces`, and `spaces` in `GET /api/presence`). Step 3 filtered where people are, not which spaces exist or who belongs to them.
- Thomas's, for later: a **Clean Up** button that rearranges the modules on the canvas, and a way to choose and save layouts.
- With an empty dashboard, the space list sits in one column about 300 pixels wide at desktop widths, leaving the rest of the page empty. Seen while checking the word for entering a space (2026-09-30); it was like this before.

## Modules

- #34 Updating a module from an address, not only a zip.
- #35 A module's own activity on its card.
- #36 Storing and sending sensitive data such as passwords.
- #46 A hello-world example module.
- #47 Reminders for people who are away.
- #40 A Journal module.
- #41 Currency conversion beside a trip's currency.
- #42 Google Calendar sync.
- #43 Installing the Font Awesome Pro package.
- #44 A map in the Planner.
- #45 Reading booking confirmation emails into the Planner.
- #32 A module for Foundry.
- #33 A module for WhatsApp or SMS.
- Research's **Add a photo** could take a pasted picture too, as the picture boxes do. A small module change; Thomas hasn't decided.
