# Budget Module Plan: spending as its own module, for any space

**Audience:** Thomas, who decides what Budget holds, who may see and change it, and how the Planner hands money to it; experience-design, which builds the module, the Planner's change and the Set up field; server-development, which changes the target's rules, the template and the checks; content-manager, which documents it once built.

**Status:** steps 1, 2, 4 built; 3 decided and in progress (2026-10-14). Steps 1, 2 and 4 were built 2026-10-14 (the target's rules; Budget 0.1.0; Set up's field). Step 3 was revised 2026-10-14 after Thomas answered the Planner and Budget question (decision 8 now says Budget pulls the Planner's costs in; the Planner keeps them), and he answered its three open questions the same day (decisions 13 to 15). Step 5 (the travel template) is not built; step 6, the burndown, was built with step 2 in Budget 0.1.0; step 7 (documentation) is written, bar the exception below, and its Planner and Budget pages describe the old step 3, so content-manager revises them when the new step 3 lands. Until step 3 the Planner still reports its own `spent` and Budget does not yet pull costs in, so a space with both modules on can show two money facts on the strip. Drafted the same day by product-planner; Thomas has answered every decision (Decisions below). One question is still open: the kind of build for step 1 (What is not decided). Unless Thomas names another kind, each step is meant as a try build (one builder, one pass, its own checks, a patch version bump for each module it changes). The request, as relayed: today the budget is split, the target on the space and the spending inside the Planner's Money view; Thomas wants Budget as its own module "so it also serves project planning, real estate, small business". The revision, in Thomas's words: "In a space without Budget, the Planner's cost stays as a cost line and then gets pulled into the budget tool if enabled later. Same if they turn Budget off. We do not destroy data."

**Built, and where it differs from the plan** (read from the code and the QA findings, 2026-10-14):

- **Step 1.** `MODERATOR_SPACE_FIELDS` has `budget`; a moderator of the space reads `GET /api/spaces/:id` (their fields only) and their `PATCH`'s answer carries the target; a currency alone is accepted; a currency sent alone replaces the whole target; an `amount` that is sent but is not a good number is refused, so a bad entry cannot clear a stored target. `host.budget.can()` and `.set()` are new, only for a module with `"budget": true`; `set()` needs an explicit target or `null`. `GET /api/modules/for-space` carries `budget` on each module. `check-facts` (245 checks) and `check-nav` hold it.
- **Step 2.** `modules/budget/` at 0.1.0: Overview with the burndown, Costs, Settle up, the `addCost` action, the `categories` list setting with a fixed Other, the `cost` kind, the `spent` fact, `"budget": true`. `tools/check-budget.mjs` (16 tests). Deviations: **Set a target** (and **Edit target**) opens an editor inside the module, not Set up at the field; the category filter is a button that opens a menu of the categories, with a second for who paid; the summary's `amount` field is declared in `module.json` but the server's `SUMMARY_FIELDS` (`server/modules.js`) does not carry it yet, so it waits for step 3.
- **Step 4.** Set up's Budget field shows for moderators, on the Phases tab, else the tab named for the space, else First visit; a currency without an amount is saved. A changed currency is sent with the stored amount.
- **Step 7, written:** `userguide-budget.md`, `api-modules.md` ("The budget target", the manifest's `budget`, `for-space`), `api-module-sdk.md` ("The budget target"), `architecture-modules.md`, `architecture-canvas.md` ("Set up"), `userguide-spaces.md`, `userguide-planner.md`, the CHANGELOG, TODO and known-issues. Not written: `host.facts`, which `api-module-sdk.md` still does not describe.
- **Open:** #216 (the burndown) can be closed by Thomas now that the burndown is in Budget's Overview; the issue is his to close.

## What it is today

*This section is as drafted, before steps 1, 2 and 4 were built; where it says only an owner or the admin may send the target, or that Set up's read is for owners, steps 1 and 4 changed it (see the Status).*

The budget was built by [plan-space-story-strip](plan-space-story-strip.md) step 6 and 7 (#216, `a6f3a00`, hardened after QA in `cf02588`).

- **The target** is a field on the space record, `budget: { amount, currency? }` (`budgetOf()` and `budgetProblem()`, `server/store.js` 64 to 87; written by `updateSpace`, 1848). A positive amount of at most 12 digits, rounded to cents; the currency is an optional three-letter code, kept only with an amount. Only an owner or the admin may send it: `MODERATOR_SPACE_FIELDS` (`server/index.js`, `PATCH /api/spaces/:id`) is `phases`, `opensWith` and `defaultLayout`, so a moderator's `budget` is refused "owners only".
- **Who reads the target** (the rule QA hardened in `cf02588`): it is kept out of every general view of a space. `withoutBudget()` and `shownSpace()` (`server/index.js` 1446 to 1462) take it out of `GET /api/spaces`, the presence list, the stream's status and a guest's view; `answeredSpace()` gives it back only to an owner or the admin after their own `PATCH`; `GET /api/spaces/:id` (Set up's read) is `requireOwner`. A module reads it from its context (`GET /api/modules/:id/context`, `space.budget`, line 7607) when the person is signed in and may read that module; a guest always gets `null`. The page drops it from its own records (`public/space.js` 2303) and tells mounted modules of an owner's save with the `space` event (`announceBudget`, 2057). `tools/check-facts.mjs` (350 to 391) asserts all of this.
- **The manifest flag.** `"budget": true` (`server/modules.js` 873) says a module reads the target, so Set up offers the Budget field in every space while that module is on (`budgetWanted()`, `public/space-setup.js` 107). Only the Planner declares it.
- **The spending** lives only in the Planner (`modules/travel`, 0.15.15). A Planner object has `cost` and `paidBy` (`cleanItem`, `travel-lib.js` 139) and `owners` (who shares it). `costItems()` and `balances()` (649 to 700) work out the total, each person's paid, share and net, and the fewest payments that settle it. The Money view (`renderMoney()`, `travel.js` 996) shows those. There is no planned amount, no category and no date of payment.
- **The strip fact.** The Planner reports `spent` (`stripFacts()`, `travel-lib.js` 713), marked `budget: true`: "Spent $X" without a target, "$X of $Y" with one, a progress fill, "$Z left" or "over" with a warning icon. Pressing it opens the Planner. The facts store (`server/facts.js`) keeps at most 6 facts per module, 40 characters of words, 24 of value, and drops a report older than 7 days.
- **Currency.** `planCurrency()` (`travel.js` 1076) is the target's currency, else the trip's, else the server's (`46376c0`). Because a currency is kept only with an amount, a space with no target cannot choose its currency today; decision 7 fixes that.
- **#216** is open: the first version shipped as the progress fill in the chip; "a burndown overlay is not built yet".
- **Templates.** A template's `modules` list says which modules are on (`templates/travel.json`, version 6: `travel`, `places`, `maps`, `research`, `calendar`, `chat`, `conference`). There is no other template yet.
- **Settings lists.** Places keeps its categories as an environment `list` setting with a fixed `other` (`modules/places/module.json`, `categories`); that is the pattern for an editable list.

## Decisions

Thomas, 2026-10-14.

1. **Budget becomes its own module, usable in any space, not only trips.** The Budget module holds its own objects, each with a planned and an actual amount, a category, a payer and a date. The space's target stays on the space, so the status strip's spent-of-target fact keeps working. A template decides whether Budget is on by default: a trip gets it, a business space opts in. Reason: the same money tracking serves project planning, real estate and small business, not only travel.
2. **No migration.** Nothing is live and there is no trip data to carry over. Reason: there is nobody's data to keep. (Decision 8, revised, now keeps the Planner's money fields, so nothing is replaced either.)
3. **Every member of the space may view the budget.** They all drive it; that is the point. This reverses the earlier rule that the target is the owner's and the admin's only.
4. **The Planner's modes are a separate issue.** A separate issue tracks modes for the Planner (travel, design, project). This plan does not plan them; Budget must stay independent of them and use no travel-only words.
5. **Who edits the target: the owner, the admin and the space's moderators.** Members view it and add costs. Reason: a moderator manages the space's money as they manage its other settings; members drive the costs, not the goal.
6. **The target does not join the general space lists** (the presence list, `GET /api/spaces`, the stream's status and the OBS and stream views). Members read it through Budget, and through the strip chip, which carries the words and the progress, not the target. Reason: nothing new reaches an OBS view, a stream key or someone outside the space. What it means for the module context and the `"budget": true` flag is under "What changes in who sees the target".
7. **A space may hold a currency without a target amount.** The server accepts it. Reason: a space with no budget can then still choose its currency, which closes the Planner-currency gap.
8. **Revised 2026-10-14: Budget pulls costs in; it does not own the Planner's.** (This replaces "Budget is the one store; the Planner's Add a cost hands the cost to Budget".) A cost on a booking stays on the booking in the Planner, in its own cost fields (`cost`, `paidBy`, as today), whether Budget is off or on. When Budget is on in the space, it pulls every priced booking in, beside Budget's own costs (the ones entered in Budget). Turning Budget off removes nothing: the Planner's costs stay on their bookings, Budget's own costs stay stored and return when it is turned on again. No data is ever deleted by enabling, disabling or switching. Thomas: "In a space without Budget, the Planner's cost stays as a cost line and then gets pulled into the budget tool if enabled later. Same if they turn Budget off. We do not destroy data." Reason: no data is destroyed, and the Planner works alone.
9. **Settle-up lives in Budget, for every space.** It shows only when a cost has a payer and the space has more than one person. Reason: shared costs are as common in a shared house or a club as on a trip.
10. **Categories are an editable list with a fixed Other,** set in Budget's settings like Places' categories. One general default list for now (Travel, Lodging, Food, Supplies, Services, Fees, Other); defaults per template come later.
11. **The burndown is built in Budget's Overview and closes #216 when it ships.** The strip chip's progress fill stays.
12. **Names and scope.** The module is named Budget, the object's code name is `cost` (shown as "a cost"), and the icon is `wallet`. The first version has no recurring costs, no per-person budgets and no settle-up attention.

Thomas, 2026-10-14, on step 3:

13. **With Budget on, the Planner's Money view and its Spent chip give way to Budget's.** One money fact, one home. With Budget off, the Planner keeps both, as today. The booking's cost fields stay in both cases. Reason: the strip never shows two money facts and one place holds the totals.
14. **Pulled-in costs show only to people who can also read the Planner.** Budget leaves out the ones a person could not see in the Planner, and says so with a plain note: "Some costs are from a module you can't see." Reason: Budget must not show a person a booking cost that the Planner hides from them, and the note keeps the totals from differing silently.
15. **Pulled-in booking costs have no category and count under Other.** A later step may map a booking's kind to a category. Reason: a booking's kind is not a Budget category, and the first version stays simple.

## Migration

None, because nothing is live (decision 2), and under decision 8 (revised) nothing is converted or moved: the Planner keeps its `cost` and `paidBy`, and Budget reads them where they are. A development server's stored Planner costs show in Budget as soon as Budget is on.

## What changes in who sees the target

Decisions 3, 5, 6 and 7 change the rule above. What they touch:

- **The module context** already gives the target to any signed-in member who may read the module (`budget: (who.user && here.budget) || null`). It stays, and is now the intended rule rather than a side door: members read the target through Budget's context, and no other route. A guest still gets `null`.
- **`withoutBudget()` and `shownSpace()`** keep the target out of the general lists (decision 6): `GET /api/spaces`, the presence list, the stream's status, access-key and stream-key views. The comments change from "owners only" to "members read it through the module".
- **`answeredSpace()` and `GET /api/spaces/:id`.** Moderators edit the target (decision 5), so Set up must read it for them: the moderator's `PATCH` answer carries `budget`, and `GET /api/spaces/:id` answers a moderator of that space with `budget` and the moderator's fields only; the rest stays owners only.
- **`MODERATOR_SPACE_FIELDS`** gains `budget`. A member's `budget` in a `PATCH` stays refused.
- **`announceBudget()`** fires on any permitted save, not only an owner's.
- **The manifest flag `"budget": true`** keeps its meaning (this module reads the target; Set up offers the field). With the target out of the general lists, the flag and the module context are how a member's module sees it, and the only module that needs it is Budget. Budget declares it. The Planner keeps declaring it while it reports `spent` with Budget off (see The Planner and Budget); it only reads the target for its own chip. The Planner may still read `host.space().budget.currency` for its words, as every module can, and with decision 7 that currency is set even when no target is.
- **The currency alone** (decision 7). `budgetOf()` and `budgetProblem()` accept `{ currency }` with no `amount`; a bad currency is still refused with "The budget's currency is a three-letter code, such as USD."; an empty `{}` is still refused. Set up's field lets a person choose the currency with the target left empty.
- **Guests:** no (assumed, below). The context keeps answering `null` for a guest, Budget's `view` permission defaults off for guests, and the facts store already refuses guests.
- **`tools/check-facts.mjs`** 350 to 391: the moderator cases flip (a moderator may set it, and their answer carries it); a member is still refused; the "no budget in `/api/presence` and `GET /api/spaces`" cases stay; a currency-alone case is added.

## What Budget is

**Name and icon.** Budget, module id `budget` (`modules/budget/`), icon `wallet` (Font Awesome Free solid; `coins` is the strip's spent icon and `sack-dollar` names one currency). A template may rename it through `moduleNames` as it does the Planner ("Itinerary"), so a business template could call it Costs.

**Its object.** One kind, `cost` (key `cost:{id}`, space storage), shown to a person as "a cost". Fields:

| Field | What it is |
|---|---|
| `title` | 1 to 120 characters |
| `category` | an id from the categories list; an unknown id shows under Other and is kept (as Places) |
| `planned` | the amount expected, or none |
| `actual` | the amount paid, or none |
| `paidBy` | a person's key, or none |
| `sharedBy` | people's keys; empty is everyone in the space (only settle-up reads it) |
| `date` | YYYY-MM-DD, when it is paid or due |
| `notes` | text |
| `ref` | an optional pointer to the object the cost is for (a Planner booking, a task) |

Amounts are positive, rounded to cents, at most 12 digits (the target's rule), in the space's one currency. Summary for refs: `title`, `subtitle` the category's label, `when` the date, `done` true once `actual` is set.

**The totals.** Spent is the sum of `actual`. Expected is, per cost, `actual` when set, else `planned`. Left is the target less spent. These live in a pure `budget-lib.js`, with `balances()` and the settle-up arithmetic moved from `travel-lib.js` (renamed off "items").

**Its views** (`host.ui.viewSwitch`):

- **Overview:** the target, spent, expected and left, a bar of spent against the target, each category's planned against actual, and the burndown (decision 11): spent over time against the target line, by `date`, with the space's phase bands behind it from `host.space().phases`. Without a target: spent and expected only, and, for someone who may set one (owner, admin, moderator), a "Set a target" button that opens Set up at the Budget field.
- **Costs:** every cost by date, each with its category, amounts, payer; filter by category through `host.menu.show`.
- **Settle up** (decision 9): each person's paid, share and net, and the fewest payments that settle it, as the Money view does today. The view appears only when at least one cost has a payer and the space has more than one person.

**Adding.** `host.add.set` with one leaf, "Add a cost"; the editor is the shared editor window. A person without `edit` gets an empty list (no **+**). `host.toolbar.set` holds the category filter. `host.status.set` shows the count and the expected total ("14 costs · $3,120 expected").

**Settings.** `categories`, an environment `list` setting with `fixed: ["other"]`, as Places does, set in Budget's settings (decision 10). Default list: Travel, Lodging, Food, Supplies, Services, Fees, Other. Defaults per template would need a new template field for module settings and its fingerprint handling; later.

**Permissions** (module `permissions`, `access`): `view` "See the budget" (member, moderator: on; guest: off) and `edit` "Add and change costs" (member, moderator: on; guest: off). Anyone with `edit` may change any cost, as in the Planner. The target is not a module permission; it is the space field, edited by owner, admin and moderators (decision 5).

**Phone.** One column; the view switch at the head; the Overview's bar full width; costs as rows; the **+** in the titlebar as on every module. No new phone parts.

**Words.** No travel words: cost, target, planned, paid, spent, left, paid by, shared by, settle up. None of room, table, stage, pane, item or card, in code or in words (`check-names` fails on them).

**Independence from the Planner's modes.** Budget names no module and no Planner mode. The Planner (in any mode) reaches it only through Budget's declared action and object pointers, found by what the action takes, never by module id. A Planner mode that has no costs simply never asks.

## The Planner and Budget

Decision 8 (revised 2026-10-14): the cost stays on the booking; Budget pulls it in.

**In the Planner.** Nothing is dropped. A booking keeps `cost` and `paidBy` (`cleanItem`, `travel-lib.js` 139), its editor fields, `costItems()` and `balances()`. There is no "Add a cost" hand-off: the Planner never calls Budget, and works alone in a space without it.

- **Budget off:** the Planner keeps its Money view and its `spent` chip, as today.
- **Budget on (decision 13):** the Planner's own Money view and `spent` chip give way to Budget's, so the strip never shows two money facts. The Planner finds out through the `space` event or the module list (is a module offering the `budget` flag on in this space), not by naming Budget. The booking's cost field and its editor stay in both cases; only the Planner's own totals step aside. The costs are the same, so nothing is lost by hiding the view.

**What Budget needs from the Planner.**

- **A cost summary.** The Planner's booking summary carries `amount` (the booking's `cost`, a number rounded to cents), `when` (the booking's date) and `title`. `SUMMARY_FIELDS` (`server/modules.js` 69) gains `amount`; the Planner's `summary` for a booking sets it only when the booking has a cost. The module manifest already declares the field. This is the one server change step 3 needs.
- **Who pays.** Settle-up needs the booking's `paidBy`. The summary can carry only the fixed fields, so the builder chooses: add a second field (`paidBy`) to `SUMMARY_FIELDS`, or have Budget read the object itself when it opens settle-up. Suggestion: add `paidBy` and `sharedBy` with `amount` so a summary is enough, and so a future module can offer the same.
- **The read.** Budget lists the module summaries that have an `amount` through the existing objects API (`GET /api/objects/search`, `server/index.js` 5971, which already filters on a summary field), once on open and again on the `object` change events it receives. It writes nothing back.
- **General, not Planner-specific.** Budget reads every module in the space that offers a cost summary (a kind whose summaries carry `amount`), found by that field and not by module id or kind name. A future project module could offer costs the same way and Budget would show them with no change.

**How a pulled-in cost shows.** In the Costs list it sits among Budget's own, marked with its source (the module's shown name and the object's title, for example "Hotel Aurora, from Itinerary"), the booking's date, `amount` as the actual, and the payer. In the Overview it counts to spent and, by category, under Other (decision 15: a pulled-in cost has no category; a later step may map a booking's kind to one). Its row opens the booking (`host.objects.open`, as a ref does). Its amount is read-only in Budget: the row has an "Open in Planner" link, not an editor. Editing the amount, date or payer happens on the booking.

**No double counting.** A Budget cost is never a copy of a booking: Budget stores no `cost` object for one, and a pulled-in cost is derived at read time from the booking, never saved in Budget's storage. A Budget cost's `ref` may still point at a booking for a note ("this is the deposit for that hotel"), but then both are the person's choice and Budget's own cost is counted once as its own. The totals are Budget's own costs plus pulled-in costs, each counted once.

**Totals, burndown and settle-up.** All three include pulled-in costs. Spent is the sum of `actual` over Budget's costs plus `amount` of the pulled-in ones; expected adds the same `amount` (a booking has no planned figure, so it counts as actual). The burndown plots a pulled-in cost on the booking's `when`; a booking with a cost but no date counts to the totals and is left off the burndown, as a Budget cost with no date is. Settle-up uses the booking's `paidBy`; a pulled-in cost is shared by everyone in the space, or by the booking's `sharedBy` (the booking's `owners`) if the summary carries it.

**Turning Budget off and on.** Nothing is removed (decision 8). Off: the Planner's costs stay on bookings and its Money view and chip return; Budget's own costs stay in storage, unread. On again: Budget lists its own costs and pulls in the bookings' costs again. Switching a space's template or modules does the same. Pulled-in costs are never stored in Budget, so there is nothing to clean up.

**`addCost`.** The action stays in Budget for any module that wants to add into Budget's own list (a future Chat or a task module). The Planner does not use it. An action request still opens Budget on the canvas when nobody has it open.

**Who sees pulled-in costs (decision 14).** Budget's `view` permission is "See the budget". A member who may view Budget but not the Planner would otherwise see booking costs that the Planner hides from them. Budget shows a pulled-in cost only to a person who may also read the source module (`GET /api/objects/search` already filters by what the person may read, so the read gives this for free). A person who cannot read the Planner sees Budget's own costs and the pulled-in ones they may read, and a plain note on the Overview and the Costs list says "Some costs are from a module you can't see." The note shows only when the server left something out, so the page needs to know that: the search answer carries a count of the summaries with an `amount` it withheld, or the builder finds another way that leaks no title or figure. Where everyone can read both, which is the default, everyone sees the same and there is no note.

**Object handoff** ([plan-object-handoff](plan-object-handoff.md)): no new catalogue kind in the first version. A `takes` entry on `addCost` would let a dropped object or a Chat message become a cost; a small later step.

## The strip and attention

- **Facts.** Budget reports one fact, `spent` (its own costs plus the pulled-in ones), marked `budget: true`, the same shape the Planner sends today ("$2,340 of $4,000", progress, "$1,660 left" or "over" with the warning icon; "Spent $2,340" without a target). Pressing it opens Budget. With Budget on, the Planner stops reporting `spent` and keeps `next`; with Budget off, the Planner reports `spent` as today (decision 8). The strip never carries both. The progress fill stays (decision 11). The facts store needs no change: one fact is well inside 6, the words inside 40, and a report is renewed each time Budget is open or carries out an action.
- **Staleness.** A fact older than 7 days is dropped, so a budget nobody opens for a week leaves the strip. Accepted for the first version (Risks).
- **Attention.** None in the first version (decision 12).
- **The burndown (#216).** Built in Budget's Overview (step 6), not in the 44 px strip; the facts store carries no series and is not asked to. #216 closes when it ships.

## The contract

**Server (server-development):**

- `MODERATOR_SPACE_FIELDS` gains `budget`; `answeredSpace()` carries `budget` for an owner, the admin and a moderator of that space; Set up's read (`GET /api/spaces/:id`) answers a moderator of that space with `budget` and the moderator's fields only. A member's `budget` in a `PATCH` stays 403 "owners only".
- `withoutBudget()` stays on the general lists; its comment and the context's comment say members read the target through the module.
- `budgetOf()` and `budgetProblem()` take `{ currency }` alone (a currency without a target). The refusal "The budget's currency is a three-letter code, such as USD." stays; `{}` is still refused.
- `SUMMARY_FIELDS` (`server/modules.js` 69) gains `amount` (a number, rounded to cents), and, by suggestion, `paidBy` (a person's key) and `sharedBy` (keys). `GET /api/objects/search` keeps filtering by what the person may read, and supports listing summaries that carry `amount` (a `has=amount` filter like `has=place`, up to the same cap). For decision 14 it also tells the caller that some summaries with an `amount` were withheld (a count, no titles or figures), so Budget can show its note.
- `templates/travel.json`: `modules` gains `budget`; `version` 7. An existing travel environment is offered the change as any template update is.
- `tools/check-facts.mjs` updated as listed above.

**Budget (experience-design):** `modules/budget/module.json` at 0.1.0 (`scope: ["space"]`, the canvas surface docking and floating, `"budget": true`, the two permissions, `refs.produces` the `cost` kind, `actions.provides` `addCost`, `settings` `categories`); `src/` with `budget-lib.js` pure; the views, editor, add, toolbar, status line and fact above; an entry in `tools/module-versions.json`; `node tools/build-module.mjs modules/budget` builds its zip.

**Planner (experience-design):** keeps `cost`, `paidBy`, the editor fields, `costItems()` and `balances()`. Its booking summary carries `amount`, `when`, `title` (and `paidBy`, `sharedBy` if added). With a module that offers the `budget` flag on in the space, its Money view and `spent` fact give way (the fact is not sent; the view is hidden or points to Budget); with it off, both return. `"budget": true` stays in the manifest for the chip. A version bump in `module.json` and `tools/module-versions.json`.

**Budget, step 3 additions (experience-design):** a read of pulled-in costs through the objects API, which returns only what the person may read; rows marked with their source and read-only, with "Open in Planner" (the module's shown name) opening the booking; totals, burndown, categories (all under Other, decision 15) and settle-up include the ones the person may see; the plain note "Some costs are from a module you can't see." when some were left out (decision 14); no storage of them. `budget-lib.js` takes the pulled-in costs as a list so the arithmetic stays pure and checkable. A patch bump.

**Set up (experience-design):** the Budget field shows while Budget is on (the flag, as today), for an owner, the admin and a moderator; it accepts a currency with the amount left empty; its hint names Budget by its shown name. Budget's "Set a target" opens Set up at that field for those who may.

## Left to build, in order

1. **The target's rules** (built; server-development; medium, it changes who may write a space field). The moderator field and answer, the moderator's Set up read, the comments, the currency-alone rule, the `amount` summary field if needed, `check-facts` updated. Not blocked by a decision; the kind of build is the open question below.
2. **The Budget module** (built; experience-design; medium). Manifest at 0.1.0, `budget-lib.js`, the views including Settle up, add, editor, filter, status line, fact, settings and `addCost`; `tools/module-versions.json`; a new `tools/check-budget.mjs` for the pure arithmetic (totals, categories, settle-up, the fact's words at the 40-character limit) in `npm run check`.
3. **Budget pulls costs in; the Planner keeps them** (revised 2026-10-14, not built; server-development then experience-design; medium). Decided 2026-10-14 (decisions 13 to 15); in progress. First, server-development: `SUMMARY_FIELDS` gains `amount` (and `paidBy`, `sharedBy` if kept), the `has=amount` search filter with the count of withheld summaries, `tools/check-facts.mjs` or the check that covers summaries. Then, experience-design: the Planner's summary and its Money view and chip stepping aside when a module with the `budget` flag is on; Budget's read, rows, totals, burndown and settle-up as the section above says; `tools/check-travel.mjs` keeps its money cases (they stay true); `check-budget` gains the pulled-in cases; a version bump for each module. Needs step 2.
4. **Set up** (built; experience-design; low). The field for moderators, the currency without an amount, the hint, opening at the field from Budget.
5. **The travel template** (not built; server-development; low). `modules` gains `budget`, version 7; `tools/check-templates.mjs`.
6. **The burndown in Budget's Overview** (built with step 2; experience-design; low). A patch bump of Budget; closes #216.
7. **Documentation** (content-manager; written, see the Status). `api-module-sdk.md` (Budget's action, and `host.facts`, which that document does not yet describe), `api-modules.md`, `architecture-modules.md`, a user guide page for Budget, [plan-space-story-strip](plan-space-story-strip.md)'s status (its "owner and admin only" rule superseded here), `TODO.md`, `known-issues.md`, the CHANGELOG.

## Verify

- **Checked by a tool:** step 1 by `check-facts` (a moderator sets the target and reads it back; a currency alone is kept; a member is refused; a guest's context is `null`; a stream key and the presence list carry no target); step 2 by `check-budget` (spent, expected, left, a category with no costs, an unknown category under Other, settle-up with uneven cents and its rule for when it shows, the fact over and under the target and in another currency) and `check-module-versions`; step 3 by `check-travel` (the cost fields and the Money view are unchanged with Budget off; the summary carries `amount`, `when`, `title`), `check-budget` (pulled-in costs counted once and never stored; a pulled-in cost and an own cost of the same title both counted; the burndown with and without a date; settle-up with a booking's `paidBy`; pulled-in costs gone and back when Budget is turned off and on), a server check that `amount` is carried, that search hides a source the person cannot read and reports only a count of what it hid, `check-budget` cases for the note (shown when something was left out, absent when not) and for a pulled-in cost counting under Other, and the existing check that `addCost` refuses a guest and a member without `edit`; step 5 by `check-templates`. `check-names` on every step.
- **Live in headless Chromium** with the local server: Budget's three views at 1280 and 390 px; adding, changing and removing a cost; the strip's chip changing and opening Budget; a priced booking appearing in Budget's Costs with its source and opening the booking, its amount read-only in Budget; the Planner's Money view and chip giving way when Budget is on and returning when it is turned off; a member who can read Budget but not the Planner seeing the note "Some costs are from a module you can't see." and none of those costs; a pulled-in cost under Other in the category view; and Budget's own costs returning when it is turned on; Set up's field for a moderator and not for a member; choosing a currency with no target.
- **Only Thomas, on a real server:** a real phone; two people adding costs at once; a screen reader on the Overview. No LiveKit call is involved in any step.

## Risks

- **Stale or vanished fact.** The chip is as fresh as the last time someone opened Budget, and leaves the strip after 7 days without one.
- **A wider audience for money.** Every member who may view Budget sees every cost, its payer and the target. That is decision 3, but people who entered costs under the Planner did not expect a separate module listing them; nothing is live, so nobody is affected yet. Decision 14 keeps booking costs from people who cannot read the Planner.
- **Two views of one cost.** A pulled-in cost is edited in the Planner and read in Budget; the read-only row and its link must make that plain.
- **The Planner stepping aside.** Hiding the Planner's Money view with Budget on must not look like lost data; the cost field on the booking stays.
- **The summary's size.** `amount`, `paidBy` and `sharedBy` widen every module's summary field list; only a module that sets them carries them.
- **The template update.** Adding `budget` to the travel template's `modules` offers every travel environment an update; that is intended.

## Assumed, for Thomas to confirm

1. Guests do not see Budget or the target (limited rights): Budget's `view` is off for guests by default, and the context answers them `null`.
2. One currency per space; a cost paid in another currency is entered converted, as today.
3. Budget is space-scoped only; no environment page listing every space's budget in the first version.
4. Anyone with Budget's `edit` may change any cost, not only their own.

## What is not decided

1. **The kind of build for step 1.** Suggestion: a feedback build (one short QA pass for regressions), since it changes who may write a space field. This is a suggestion, not a decision.
