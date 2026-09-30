# To do

Work is tracked at <https://github.com/Drowbe/coffee-pub-collaborator/issues>. This page is an index of the open
issues, grouped, with a few words each; the issue holds the detail. See the Studio repository for that app's
side of things.

## In progress

- **Environment templates** ([plan-environment-templates](plans/plan-environment-templates.md)): done, except the live verification of addendum 2's steps 3a and 3b (#68). Addendum 3, editing a bundled template on the host console and Duplicate (#91), is built and its console was walked live (2026-09-30).
  (September 25, 2026).

## Planned

- #2 The first time: guidance, welcome cards, an owner's setup checklist ([plan-entering](plans/plan-entering.md)).
- #12 Object status: action required, tentative, confirmed ([plan-object-status](plans/plan-object-status.md)).
- #13 Planner changes shown in the Calendar. A dated plan object is now on the Calendar and kept in step (#96, [plan-plan-calendar-sync](plans/plan-plan-calendar-sync.md)); what #13 still asks beyond that is to be decided.
- #73 Research from any AI ([plan-research-import](plans/plan-research-import.md)): phase 1 (copy instructions, paste or file import into Research or the Planner) is done. Still to come: To-do and Calendar as destinations through a generic conduit, which needs its own plan; and phase 3, a direct connection for AI apps, which waits on #64.
- The call-name fallback goes: `server/call-names.js` still reads the call names from before Names step 3 ([plan-names](plans/plan-names.md), step 10).
- #132 A document editor (ProseMirror) for the long prose fields: research notes and answers, plan notes, to-dos, places, and calendar details. Markdown stays what is stored. Chat stays a textarea. About two weeks. Building waits on a go-ahead.
- The word for entering a space ([plan-environment-templates](plans/plan-environment-templates.md), Addendum 4, approved 2026-09-30): a `verbs` set, starting with `enter`, set by the template; the guest form and the space list use it, and an aside's button says Join. The server side is being built.

## Verify in a real call

- #29 Walk the call's layout, the canvas, snapping and the calls cap in a real call.
- #30 Modules with two people on a real server.
- #95 Planner phases: entering a Travel space opens the Planner and chat and joins no call.
- The chat's **Bring in N objects** button: offered for a pasted answer with an `objects` block, a `card` block or no fences, and not for an answer with an old-named block ([plan-kind-names](plans/plan-kind-names.md), step 5; the route behind it was checked).
- #3 Entering a space ([plan-entering](plans/plan-entering.md), Part 1, built 2026-09-30): **Enter** and **Back to** on the space list; what opens on a first and a second visit, and for a guest; the phone's first tab; the call control's count, **Join** and microphone hint; the status line.

## Small fixes and checks

- Walk linked objects and plan and calendar sync live, Planner and Calendar side by side in one space (the drag that keeps a link on its day, the live refresh, "Used by N.", a twin made, moved, retitled and deleted on each side), and the one-time backfill on a hosted install. Built in #98 to #104 and checked by tools only.
- #110 The old name, Magpie, is gone from the code, the templates and the guides, architecture, API and design documents, and the file formats are named by kind ([plan-kind-names](plans/plan-kind-names.md), built 2026-09-30). Still to do: the logo images (`public/assets/images/brand/logo-light.png` and `logo-dark.png` read "COFFEE PUB MAGPIE"; see [known-issues](known-issues.md)), and the plans that still say Magpie or name the old formats (17 plans, product-planner's).
- An accented product name loses its accents in the server's user-agent: `PRODUCT_NAME` "Café Pub" is sent as `Caf-Pub` (only printable ASCII is kept, `headerProductName()` in `server/product-name.js`).
- The product name guard in `tools/check-names.mjs` checks that `PAST_BLOCK_LABELS` is a frozen list of two; it should pin the two past labels exactly.
- A fixed-time check case for the old-fence pattern in `server/object-format.js` (`PAST_FENCE`) on a very long "> " prefix.
- #25 A check that compiles every `pattern` attribute the way browsers do.
- #26 Remove the unneeded fallback in the console's Save plans.
- #27 The console's top bar requests that answer 404.
- #23 Too many connections to the server from one page.
- `tools/check-canvas.mjs` times `resettle` against budgets of 16 to 33 ms. They have four to five times headroom on the development machine, but could fail on a slow CI machine.
- A **Grid size** drag that ends without a `change` event leaves the previewed layout on screen but unsaved until the next save (`holdStore` in `public/canvas.js`).
- The SDK menu's link entries (`<a role=menuitem>` in `public/sdk/host.js`, `host.menu.show`) don't open on Space; Enter opens them. Buttons and other entries do.

## Sign-in and accounts

- #28 Passkeys, the second phase of two-step sign-in.

## Hosting and environments

- #48 A one-container install that runs LiveKit itself.
- #56 Run it on Windows and Mac.
- #49 A billing relay for a payment provider's webhook.
- #50 An environment's own domain, and one identity across environments.
- #51 The past-due sweep for a server that restarts often.
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
- Joining the call on a phone must be something the person chooses to do, as part of the navigation work: showing or hiding the conference module is not joining (Thomas, 2026-09-30).
- Thomas's, for later: a **Clean Up** button that rearranges the modules on the canvas, and a way to choose and save layouts.
- Decided, no change (2026-09-30): on touch screens the microphone note stays a hover and focus hint.

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
