# Budget Module Plan: spending as its own module, for any space

**Audience:** Thomas, who decides what Budget holds, who may see and change it, and how the Planner hands money to it; experience-design, which builds the module, the Planner's change and the Set up field; server-development, which changes the target's rules, the template and the checks; content-manager, which documents it once built.

**Status:** drafted 2026-10-14 by product-planner. Thomas made the four main decisions (Decisions below); the rest is proposed and marked for him (What is not decided). Nothing is built. Each step below is meant as a try build (one builder, one pass, its own checks, a patch version bump for each module it changes) unless Thomas names another kind. The request, as relayed: today the budget is split, the target on the space and the spending inside the Planner's Money view; Thomas wants Budget as its own module "so it also serves project planning, real estate, small business".

## What it is today

The budget was built by [plan-space-story-strip](plan-space-story-strip.md) step 6 and 7 (#216, `a6f3a00`, hardened after QA in `cf02588`).

- **The target** is a field on the space record, `budget: { amount, currency? }` (`budgetOf()` and `budgetProblem()`, `server/store.js` 64 to 87; written by `updateSpace`, 1848). A positive amount of at most 12 digits, rounded to cents; the currency is an optional three-letter code. Only an owner or the admin may send it: `MODERATOR_SPACE_FIELDS` (`server/index.js`, `PATCH /api/spaces/:id`) is `phases`, `opensWith` and `defaultLayout`, so a moderator's `budget` is refused "owners only".
- **Who reads the target** (the rule QA hardened in `cf02588`): it is kept out of every general view of a space. `withoutBudget()` and `shownSpace()` (`server/index.js` 1446 to 1462) take it out of `GET /api/spaces`, the presence list, the stream's status and a guest's view; `answeredSpace()` gives it back only to an owner or the admin after their own `PATCH`; `GET /api/spaces/:id` (Set up's read) is `requireOwner`. A module reads it from its context (`GET /api/modules/:id/context`, `space.budget`, line 7607) when the person is signed in and may read that module; a guest always gets `null`. The page drops it from its own records (`public/space.js` 2303) and tells mounted modules of an owner's save with the `space` event (`announceBudget`, 2057). `tools/check-facts.mjs` (350 to 391) asserts all of this.
- **The manifest flag.** `"budget": true` (`server/modules.js` 873) says a module reads the target, so Set up offers the Budget field in every space while that module is on (`budgetWanted()`, `public/space-setup.js` 107). Only the Planner declares it.
- **The spending** lives only in the Planner (`modules/travel`, 0.15.15). A Planner object has `cost` and `paidBy` (`cleanItem`, `travel-lib.js` 139) and `owners` (who shares it). `costItems()` and `balances()` (649 to 700) work out the total, each person's paid, share and net, and the fewest payments that settle it. The Money view (`renderMoney()`, `travel.js` 996) shows those. There is no planned amount, no category and no date of payment.
- **The strip fact.** The Planner reports `spent` (`stripFacts()`, `travel-lib.js` 713), marked `budget: true`: "Spent $X" without a target, "$X of $Y" with one, a progress fill, "$Z left" or "over" with a warning icon. Pressing it opens the Planner. The facts store (`server/facts.js`) keeps at most 6 facts per module, 40 characters of words, 24 of value, and drops a report older than 7 days.
- **Currency.** `planCurrency()` (`travel.js` 1076) is the target's currency, else the trip's, else the server's (`46376c0`).
- **#216** is open: the first version shipped as the progress fill in the chip; "a burndown overlay is not built yet".
- **Templates.** A template's `modules` list says which modules are on (`templates/travel.json`, version 6: `travel`, `places`, `maps`, `research`, `calendar`, `chat`, `conference`). There is no other template yet.
- **Settings lists.** Places keeps its categories as an environment `list` setting with a fixed `other` (`modules/places/module.json`, `categories`); that is the pattern for an editable list.

## Decisions

Thomas, 2026-10-14.

1. **Budget becomes its own module, usable in any space, not only trips.** The Budget module holds its own objects, each with a planned and an actual amount, a category, a payer and a date. The space's target stays on the space, so the status strip's spent-of-target fact keeps working. The Planner's Money view feeds into Budget or becomes a view of Budget objects (how, below). A template decides whether Budget is on by default: a trip gets it, a business space opts in. Reason: the same money tracking serves project planning, real estate and small business, not only travel.
2. **No migration.** Nothing is live and there is no trip data to carry over, so the Planner's money fields and Money view are replaced outright. Reason: there is nobody's data to keep.
3. **Every member of the space may view the budget.** They all drive it; that is the point. This reverses the earlier rule that the target is the owner's and the admin's only and is kept out of general views (What changes, below). Who may edit the target is proposed below for Thomas to decide.
4. **The Planner's modes are a separate issue.** A separate issue tracks modes for the Planner (travel, design, project). This plan does not plan them; Budget must stay independent of them and use no travel-only words.

## Migration

None, because nothing is live (decision 2). The Planner stops reading `cost` and `paidBy` (`cleanItem` drops them), and the Money view goes. A development server's stored Planner costs are left in storage, unread; nothing converts them.

## What changes in who sees the target

Decision 3 reverses the rule above. What it touches:

- **The module context** already gives the target to any signed-in member who may read the module (`budget: (who.user && here.budget) || null`). It stays, and is now the intended rule rather than a side door: Budget's members read the target here.
- **`withoutBudget()` and `shownSpace()`.** Proposed: keep the target out of the general lists anyway (`GET /api/spaces`, the presence list, the stream's status, access-key and stream-key views). Members reach it through Budget's context, so nothing a member needs is missing, and nothing new reaches an OBS view, a stream key or someone outside the space. The comments change from "owners only" to "members read it through the module". See Not decided 2.
- **`answeredSpace()` and `GET /api/spaces/:id`.** If moderators may edit the target (Not decided 1), Set up must read it for them: the moderator's `PATCH` answer carries `budget`, and Set up reads the target from a moderator-allowed read (lean: `GET /api/spaces/:id` answers a moderator of that space with `budget` and the moderator's fields only; the rest stays owners only).
- **`MODERATOR_SPACE_FIELDS`** gains `budget` if moderators may edit it.
- **`announceBudget()`** fires on any permitted save, not only an owner's.
- **The manifest flag `"budget": true`** keeps its meaning (this module reads the target; Set up offers the field). Budget declares it; the Planner drops it (it no longer reports money; it can still read `host.space().budget.currency` for its words, as every module can).
- **Guests:** no (assumed, below). The context keeps answering `null` for a guest, Budget's `view` permission defaults off for guests, and the facts store already refuses guests.
- **`tools/check-facts.mjs`** 350 to 391: the moderator cases flip (a moderator may set it, and their answer carries it); the "no budget in `/api/presence` and `GET /api/spaces`" cases stay if Not decided 2 goes as leaned.

## Proposed: what Budget is

**Name and icon.** Budget, code name `budget` (`modules/budget/`). Icon lean: `wallet` (Font Awesome Free solid; `coins` is the strip's spent icon and `sack-dollar` names one currency). A template may rename it through `moduleNames` as it does the Planner ("Itinerary"), so a business template could call it Costs.

**Its object.** One kind, lean `cost` (key `cost:{id}`, space storage), shown to a person as "a cost". Fields:

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

- **Overview:** the target, spent, expected and left, a bar of spent against the target, and each category's planned against actual. Without a target: spent and expected only, and, for someone who may set one, a "Set a target" button that opens Set up at the Budget field.
- **Costs:** every cost by date, each with its category, amounts, payer; filter by category through `host.menu.show`.
- **Settle up** (Not decided 3): each person's paid, share and net, and the fewest payments that settle it, as the Money view does today.

**Adding.** `host.add.set` with one leaf, "Add a cost"; the editor is the shared editor window. A person without `edit` gets an empty list (no **+**). `host.toolbar.set` holds the category filter. `host.status.set` shows the count and the expected total ("14 costs · $3,120 expected").

**Settings.** `categories`, an environment `list` setting with `fixed: ["other"]`, as Places does. Lean default list, words fit for any space: Travel, Lodging, Food, Supplies, Services, Fees, Other. Per-template defaults: Not decided 4.

**Permissions** (module `permissions`, `access`): `view` "See the budget" (member, moderator: on; guest: off) and `edit` "Add and change costs" (member, moderator: on; guest: off). Anyone with `edit` may change any cost, as in the Planner. The target is not a module permission; it is the space field (Not decided 1).

**Phone.** One column; the view switch at the head; the Overview's bar full width; costs as rows; the **+** in the titlebar as on every module. No new phone parts.

**Words.** No travel words: cost, target, planned, paid, spent, left, paid by, shared by, settle up. None of room, table, stage, pane, item or card, in code or in words (`check-names` fails on them).

**Independence from the Planner's modes.** Budget names no module and no Planner mode. The Planner (in any mode) reaches it only through Budget's declared action and object pointers, found by what the action takes, never by module id. A Planner mode that has no costs simply never asks.

## Proposed: the Planner and Budget

Decision 1 leaves open whether the Planner's money feeds Budget or becomes Budget. Options:

1. **Budget is the one store (lean).** The Planner drops `cost`, `paidBy` and the Money view. A booking's editor offers "Add a cost" when `host.actions.list()` offers Budget's action; it asks Budget's `addCost` (`title`, `planned?`, `actual?`, `date?`, `ref`: the booking) with `{ wait: true }`, and Budget keeps a `cost` pointing at the booking. The Planner shows the cost on the booking by reading the costs that point at it (the builder confirms the call; this likely needs a new summary field `amount`, Not decided 6). Costs: an action request opens Budget on the canvas when nobody has it open (that is how actions are carried out), which a person may find surprising; Planner and Budget must both be on. Rules out: a cost in the Planner without Budget.
2. **The Planner keeps its costs, Budget reads them.** The Planner keeps `cost` and `paidBy` and publishes them on its summary (new summary fields); Budget lists its own costs plus every object in the space whose summary carries an amount. Costs: new shared summary fields; two places a cost can be edited; Budget's fact goes stale when a cost changes in the Planner while Budget is closed. Rules out: nothing; any module could feed Budget later.
3. **Both, kept apart.** The Planner keeps Money; Budget is for other spaces. Rules out decision 1's "feeds into or becomes".

**Object handoff** ([plan-object-handoff](plan-object-handoff.md)): no new catalogue kind in the first version (Chat cannot turn a receipt into a cost yet). Budget's `addCost` is an ordinary action with a typed input; a `takes` entry (any object, "as a cost") would let a dropped object or a Chat message become a cost, which is a small later step.

## Proposed: the strip and attention

- **Facts.** Budget reports one fact, `spent`, marked `budget: true`, the same shape the Planner sends today ("$2,340 of $4,000", progress, "$1,660 left" or "over" with the warning icon; "Spent $2,340" without a target). Pressing it opens Budget. The Planner stops reporting `spent` and keeps `next`. The facts store needs no change: one fact is well inside 6, the words inside 40, and a report is renewed each time Budget is open or carries out an action.
- **Staleness.** A fact older than 7 days is dropped, so a budget nobody opens for a week leaves the strip. Accepted for the first version (Risks).
- **Attention.** None in the first version. A later step could report "You owe Ann $120" as the person's own attention entry once settle-up is decided.
- **The burndown (#216).** The chip's progress fill is the first version and stays. A burndown (spent over time against the target line, by `date`, with the space's phase bands behind it from `host.space().phases`) belongs in Budget's Overview, where there is room, not in the 44 px strip; the facts store carries no series and is not asked to. Thomas to say whether that closes #216 (Not decided 8).

## The contract

**Server (server-development):**

- `MODERATOR_SPACE_FIELDS` gains `budget` (if Not decided 1 goes as leaned); `answeredSpace()` carries `budget` for an owner, the admin and a moderator of that space; Set up's read answers a moderator of that space with `budget`. A member's `budget` in a `PATCH` stays 403 "owners only".
- `withoutBudget()` stays on the general lists (if Not decided 2 goes as leaned); its comment and the context's comment say members read the target through the module.
- If Not decided 5 goes as leaned, `budgetOf()` and `budgetProblem()` take `{ currency }` alone (a currency without a target): "The budget's currency is a three-letter code, such as USD." stays the refusal; `{}` is still refused.
- If option 1 of the Planner choice needs it, `SUMMARY_FIELDS` (`server/modules.js` 69) gains `amount` (a number, rounded to cents).
- `templates/travel.json`: `modules` gains `budget`; `version` 7. An existing travel environment is offered the change as any template update is.
- `tools/check-facts.mjs` updated as listed above.

**Budget (experience-design):** `modules/budget/module.json` at 0.1.0 (`scope: ["space"]`, the canvas surface docking and floating, `"budget": true`, the two permissions, `refs.produces` the `cost` kind, `actions.provides` `addCost`, `settings` `categories`); `src/` with `budget-lib.js` pure; the views, editor, add, toolbar, status line and fact above; an entry in `tools/module-versions.json`; `node tools/build-module.mjs modules/budget` builds its zip.

**Planner (experience-design):** under option 1, `cost` and `paidBy` leave `cleanItem` and the editor; the Money view, `costItems()`, `balances()` and `stripFacts()`'s `spent` go; `"budget": true` leaves the manifest; the editor's "Add a cost" asks the action; the booking shows its cost. A version bump in `module.json` and `tools/module-versions.json`.

**Set up (experience-design):** the Budget field shows while Budget is on (the flag, as today), for an owner, the admin and a moderator; its hint names Budget by its shown name. Budget's "Set a target" opens Set up at that field for those who may.

## Left to build, in order

1. **The target's rules** (server-development; medium, it changes who may write a space field). The moderator field and answer, the moderator's Set up read, the comments, the currency-alone rule if decided, the `amount` summary field if decided, `check-facts` updated. Blocks on Not decided 1, 2 and 5. Thomas may want this one as a feedback build, since it is a permissions change.
2. **The Budget module** (experience-design; medium). Manifest at 0.1.0, `budget-lib.js`, the views, add, editor, filter, status line, fact, settings and `addCost`; `tools/module-versions.json`; a new `tools/check-budget.mjs` for the pure arithmetic (totals, categories, settle-up, the fact's words at the 40-character limit) in `npm run check`. Blocks on Not decided 3 and 7 (settle-up, the object's name) only for those parts.
3. **The Planner hands money to Budget** (experience-design; medium). As the contract says for the chosen option; `tools/check-travel.mjs` loses the money cases (they move to `check-budget`); a version bump. Blocks on the Planner choice.
4. **Set up** (experience-design; low). The field for moderators, the hint, opening at the field from Budget.
5. **The travel template** (server-development; low). `modules` gains `budget`, version 7; `tools/check-templates.mjs`.
6. **The burndown in Budget's Overview** (experience-design; low). Only if Thomas wants it there (Not decided 8); a patch bump of Budget.
7. **Documentation** (content-manager). `api-module-sdk.md` (Budget's action, and `host.facts`, which that document does not yet describe), `api-modules.md`, `architecture-modules.md`, a user guide page for Budget, [plan-space-story-strip](plan-space-story-strip.md)'s status (its "owner and admin only" rule superseded here), `TODO.md`, `known-issues.md`, the CHANGELOG.

## Verify

- **Checked by a tool:** step 1 by `check-facts` (a moderator sets the target and reads it back; a member is refused; a guest's context is `null`; a stream key and the presence list carry no target); step 2 by `check-budget` (spent, expected, left, a category with no costs, an unknown category under Other, settle-up with uneven cents, the fact over and under the target and in another currency) and `check-module-versions`; step 3 by `check-travel` and a check that `addCost` refuses a guest and a member without `edit`; step 5 by `check-templates`. `check-names` on every step.
- **Live in headless Chromium** with the local server: Budget's three views at 1280 and 390 px; adding, changing and removing a cost; the strip's chip changing and opening Budget; the Planner's "Add a cost" opening Budget and the cost showing on the booking; Set up's field for a moderator and not for a member.
- **Only Thomas, on a real server:** a real phone; two people adding costs at once; a screen reader on the Overview. No LiveKit call is involved in any step.

## Risks

- **Budget opening by itself.** Under option 1, the Planner's "Add a cost" opens Budget on the canvas if nobody has it open. Useful (the fact renews) but possibly unwelcome on a crowded canvas.
- **Stale or vanished fact.** The chip is as fresh as the last time someone opened Budget, and leaves the strip after 7 days without one.
- **A wider audience for money.** Every member now sees every cost, its payer and the target. That is decision 3, but people who entered costs under the Planner did not expect a separate module listing them; nothing is live, so nobody is affected yet.
- **Two modules in step.** Option 1 makes the Planner's costs depend on Budget being on in the space; a travel space with Budget turned off has no costs.
- **The template update.** Adding `budget` to the travel template's `modules` offers every travel environment an update; that is intended.

## Assumed, for Thomas to confirm

1. Guests do not see Budget or the target (limited rights): Budget's `view` is off for guests by default, and the context answers them `null`.
2. One currency per space; a cost paid in another currency is entered converted, as today.
3. Recurring costs and per-person budgets are out of the first version.
4. Budget is space-scoped only; no environment page listing every space's budget in the first version.
5. Anyone with Budget's `edit` may change any cost, not only their own.
6. Budget reports no attention in the first version.

## What is not decided

Each carries a suggestion, which is not a decision. **Blocks** marks those that stop a step.

1. **Who may edit the target.** **Blocks step 1.** Suggestion: the owner, the admin and the space's moderators edit it in Set up; members view it and add costs.
2. **Whether the target joins the general space views** (the presence list, `GET /api/spaces`) now that members may see it. **Blocks step 1.** Suggestion: no; members read it through Budget's context, and nothing new reaches a stream key, an OBS view or someone outside the space.
3. **Settle-up: in Budget for every space, or a travel extra.** Blocks the Settle up view in step 2. Suggestion: in Budget, as its third view, shown once any cost has a payer; shared costs among people are as common in a shared house or a club as on a trip.
4. **Categories.** Suggestion: an editable environment list with a fixed Other, as Places does, with one general default list (Travel, Lodging, Food, Supplies, Services, Fees, Other). Per-template defaults would need a new template field for module settings and its fingerprint handling; later.
5. **Currency without a target.** **Blocks step 1** (the store rule). Today a currency is kept only with an amount. Suggestion: the space's `budget` may hold a currency alone, so Budget and the Planner word every amount in it before anyone sets a target.
6. **How the Planner and Budget share money:** option 1 (Budget is the one store), 2 (Budget reads the Planner's costs) or 3 (kept apart). **Blocks step 3.** Suggestion: option 1, with a new `amount` summary field so the Planner can show a booking's cost.
7. **The object's code name and words.** Suggestion: `cost`, "a cost". Alternatives: `expense`, `entry`.
8. **The burndown (#216).** Suggestion: a chart in Budget's Overview, not in the strip; the chip's progress fill stays. Whether that closes #216.
9. **The module's name and icon.** Suggestion: Budget, `wallet`.
10. **Attention for settle-up** ("You owe Ann $120"). Suggestion: not in the first version.
11. **Recurring costs and per-person budgets.** Suggestion: out of scope for the first version (Assumed 3).
12. **The kind of build for step 1.** Suggestion: a feedback build, since it changes who may write a space field.
