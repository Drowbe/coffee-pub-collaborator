# Chat Clear Plan

**Audience:** Thomas decides; server-development and experience-design build; content-manager documents.

**Status:** Approved 2026-10-03 (GitHub issue #166), with every open question answered as recommended (decisions 3
to 11). Not built. Thomas: "Replace the single
AI-only clear with a **Clear…** submenu in Chat. It offers a choice for each type of message: chat, AI, and each
module command type (to-do, poll, and so on). This lets people scrub whatever they see." It builds on the chat model
([plan-chat-model](plan-chat-model.md), #157), which is built, and replaces that plan's **Delete your private
messages** (its decision 13).

## What it is today

- **One store, two files.** `server/chat-history.js` keeps every message of a space in one list in memory, written
  to `DATA_DIR/chat.json` (public messages) and `DATA_DIR/chat-private.json` (private ones). A message carries `id`,
  `at`, `by` (the author's user key, `guest` for every guest), `who`, `text`, and optionally `visibility: "private"`,
  `kind` (`command` or `ai`), `command` and `module`. A private message is only ever returned to its author; an
  admin, owner or moderator never sees anyone else's (plan-chat-model, "Who reads what").
- **The types, as stored.** An ordinary chat message has no `kind`. An `/ai` question is `kind: "command"`,
  `command: "ai"`; an AI answer is `kind: "ai"` (the store's `isAi` helper takes both). A module's command echo is
  `kind: "command"` with `command` (for example `t`) and `module` (for example `todo`). A guest's command echo is never
  stored. Pictures are never stored; they live on the pages that received them.
- **The delete routes** (`server/index.js`, the chat history section):
  - `DELETE /api/spaces/:id/chat`: **Delete the chat**. Needs `chatRead` and `chatModerator` (an owner or admin,
    through `hasOwnerRights`, or a member with the space's `moderator` flag). Empties the space's chat for everyone,
    **private messages included**, records `cleared`, and sends `{ type: "chat-clear" }` to the call.
  - `DELETE /api/spaces/:id/chat/private`: **Delete your private messages**. Needs `chat`, signed in, not a guest.
    Deletes every private message of the caller's in the space (`removePrivate`); returns `{ ok: true, deleted }`.
  - `DELETE /api/spaces/:id/chat/:messageId`: one message. The author deletes their own; a moderator deletes any
    public one; someone else's private message answers 404, for a moderator too. A public one is told to the call as
    `{ type: "chat-delete", id }`.
  - `tellChat` sends a notice on the call's `chat` topic; the page also sends the same notice itself
    (`publishChat`), so a call with no server-side data still hears it.
- **The menu.** Chat's **⋮** (`#chat-more`, `public/space.js`) offers **Save the chat**; **Delete the chat** for
  `canModerateChat()`; and **Delete your private messages** for a signed-in non-guest when the page shows one of
  their private messages. Both deletes use `openConfirmMenu` (`public/module-host.js`), which re-opens the same host
  menu as an armed confirm. `openHostMenu` (`public/host-menu.js`) has no submenus: a "submenu" is the same menu
  opened again from the same button, with new entries, as the confirm already does.
- **How roles are modelled.** An account's `role` is `admin`, `owner` or `member`; `admin` and `owner` both have every
  right (`hasOwnerRights`, `OWNER_RIGHTS` in `server/store.js`), so the code does not tell them apart today. A
  moderator is a member with the `moderator` flag on one space (`spaceFlags`, `SPACE_PERMISSIONS`), which grants the
  Moderator role's permissions there only. A guest is not an account and has the guest role's permissions.
- **Checks.** `tools/check-chat-model.mjs` covers the store and the routes above.

## Decisions

From Thomas, in issue #166:

1. **A Clear… submenu replaces "Delete your private messages".** It offers a choice for each type of message: chat,
   AI, and each module command type. Reason: people can scrub whatever they see, by type.
2. **Who can clear what:** an admin can clear any messages; a moderator of a space can clear any messages in that
   space; a member can clear only their own; a guest can clear none.

Approved 2026-10-03, each as recommended in the draft:

3. **An environment's owner clears everyone's messages in every space of their environment, as an admin does.**
   Reason: the code already gives owners every right an admin has (`hasOwnerRights`), and owners already use
   **Delete the chat**.
4. **Nobody clears someone else's private messages by type.** Reason: #157 made a private message its author's
   alone, unseen by any role, and clearing what you cannot see is clearing blind.
5. **A moderator picks yours or everyone's in the confirm,** "Clear yours (n)" and "Clear everyone's (n)". Reason:
   one short list, and the choice comes with its count.
6. **Delete the chat stays as it is,** the one whole reset, private messages included, its hint naming them.
   Reason: it is #157's approved reset, a separate deliberate act, and #166 does not need it changed.
7. **Clearing ignores the All | Private | Public filter:** a type clears public and private alike. Reason: the
   filter "changes only what you see" (#157), and the confirm states the count.
8. **Clearing removes only the messages, never the objects they made.** Reason: the object belongs to its module
   and may be shared and edited by others by now.
9. **Always an armed confirm with the count, and a one-line, unstored notice for others only when someone clears
   everyone's.** Reason: a clear cannot be undone, and people in the call should know why messages vanished.
10. **A module's type is its module id,** not its command name. Reason: a module may have several commands, two
    modules may share a name, and the name, icon and colour already come from the module.
11. **The route is a new path, `DELETE .../chat/messages`,** not a query on `DELETE /chat`. Reason: a request that
    loses its query must never fall through to deleting the whole chat.

Each part of the contract that rests on one of decisions 3 to 11 names it.

## The contract

### Types

A type is what the menu lists and what the route takes. A message belongs to exactly one:

| Type | `type` value | Which messages |
|---|---|---|
| Chat | `chat` | no `kind`: ordinary messages, public or made private by their author |
| AI | `ai` | `kind: "ai"`, or `kind: "command"` with `command: "ai"` (questions and answers together) |
| A module's commands | `module`, with `module=<id>` | `kind: "command"` and that `module` (every command the module registered) |
| Everything | `all` | every message of the three above |

A module's type is keyed by its module id, not its command name (decision 10): a module may register more than one command,
two modules may share a name, and the colour and icon already come from `module`.

### Scope (decisions 4 and 5)

- `mine`: the caller's own messages of that type, public and private (`by` is the caller's key).
- `everyone`: every **public** message of that type, whoever wrote it, plus the caller's own private ones. Never
  anyone else's private message, for any role (decision 4). This keeps #157's rule that a private message is its author's
  alone; it cannot be seen by a moderator, so it is not theirs to clear.

### Who may (decision 3)

| Who | `mine` | `everyone` |
|---|---|---|
| Admin (`admin`) | yes | yes, in any space of the environment |
| Owner (`owner`) | yes | yes, in any space of their environment, as an admin (decision 3) |
| Moderator (`moderator` flag on this space) | yes | yes, in that space only |
| Member (`member`) | yes | no: 403 |
| Guest (`guest`) | no: 403 | no: 403 |

"Admin or owner or flagged moderator" is exactly today's `chatModerator(who, space)`; the route reuses it. A guest
is refused both because Thomas said so and because every guest is stored as the one sender `guest`, so "a guest's
own" cannot be told apart.

### The route (decision 11)

`DELETE /api/spaces/:id/chat/messages?type=<chat|ai|module|all>&scope=<mine|everyone>[&module=<id>]`

- Reached like the other chat routes (`chatSpaceFor`, needing `chatRead`): 401 `sign in first`; 404 for no such
  space or an aside (an aside has no chat); 403 `you are not in that space` (in the environment's words).
- 400 `type is chat, ai, module or all` for a missing or unknown `type`; 400 `which module` when `type=module` has no
  `module`; 400 `scope is mine or everyone`. A `module` that matches no message is not an error: it deletes nothing.
- 403 for a guest: `guests can't clear messages` (the `guest` word, plural).
- 403 for `scope=everyone` without `chatModerator`: `only an owner or a moderator can clear everyone's messages` (the
  `owner` and `moderator` words), the same shape as **Delete the chat**'s refusal.
- 200 `{ ok: true, deleted: <count> }`, `deleted` 0 when nothing matched. The `cleared` time is **not** changed:
  that marks only a whole delete, and an old local copy in a browser is shown only when the server cannot be
  reached.
- Registered before `DELETE /api/spaces/:id/chat/:messageId`, as `/chat/private` is. A separate path, rather than a
  query on `DELETE /chat`, so a request that loses its query can never fall through to **Delete the chat** (decision 11).
- After a delete with at least one public message gone, `tellChat` sends
  `{ type: "chat-clear-some", ids: [<public ids gone>], by: <caller's key>, who: <caller's name>, scope, type, module? }`.
  Private ids are never sent: a private message was only ever on its author's page. At most 500 public messages
  exist per space, so the list fits one reliable data packet.
- In the store: a new `ChatHistory.clearByType(spaceId, { type, module, scope, by })` that removes the matching
  messages in one pass, flushes once, and returns the removed messages (the route counts them and picks the public
  ids). `removePrivate` and `clear` stay as they are.
- `DELETE /api/spaces/:id/chat/private` and the `ai/thread` delete routes stay, for anything that still calls them.
  The page stops using `/chat/private`.

### What clearing removes (decision 8)

Only the chat messages. The task, poll, event, note or other object a command made stays in its module. An AI
answer's previews that were never kept (**Keep**) go with the answer; anything already kept stays where it was kept.
When a person clears their own AI questions but a public answer of theirs is cleared by nobody, that answer simply
loses its one-line quote (the store's `shown` already drops it when the question is gone).

### Delete the chat (decision 6)

**Delete the chat** stays as it is: a moderator's whole reset, every message for everyone, private ones included,
as #157 decided. It is the one exception to decision 4, and its hint says so plainly: "Every message goes, for everyone,
private ones too." It stays a separate entry in the ⋮ menu, after **Clear…**.

### What a person sees (decisions 5, 7 and 9)

- **The ⋮ menu** (`#chat-more`): **Save the chat**; **Clear…** (icon `eraser`); **Delete the chat** (moderators
  only). **Clear…** shows for a signed-in non-guest in a space (not an aside) when the page holds at least one
  stored message they could clear. **Delete your private messages** is removed.
- **Clear…** opens the same host menu again from the same button (`openHostMenu`, no new component), listing the
  types that have something the person could clear, each with its count as the item's `badge`:
  - **Chat messages** (`comment`);
  - **AI** (`robot`, gold);
  - one line per module with messages, in the module's shown name (`shownModule`, the template's themed name when
    there is one) and its icon; a module the page no longer has placed reads as its command, for example "/t";
  - a divider, then **All of them**.
  The counts come from what the page holds: for a member, their own; for a moderator, every public message plus
  their own private ones.
- **Ignores the filter (decision 7).** Clearing a type takes public and private messages alike, whatever **All | Private |
  Public** shows; the confirm line says how many.
- **Confirm (decisions 5 and 9).** Picking a type opens an armed confirm in the same menu, with **Keep it** last:
  - a member: one danger entry, "Clear your 12 AI messages?";
  - a moderator, owner or admin: two danger entries, "Clear yours (3)" and "Clear everyone's (12)", the second with
    the hint "Private messages of others stay." Either one acts at once.
  The armed confirm follows `openConfirmMenu`'s look and keyboard; it may need a variant that takes two choices
  (experience-design's call, built on `openHostMenu`).
- **After clearing.** The page drops the cleared messages it holds (`dropChatMessage`) and recounts the unread
  number. For type `chat` or `all` it also drops pictures: its own for `mine`; every picture for `everyone`.
  Pictures are not stored, so this is the page's own work; the server is not told.
- **Others in the call (decision 9).** On `chat-clear-some` a page drops each listed id it holds, and for type `chat` or
  `all` drops the matching pictures (by `by` for `mine`, all for `everyone`). When the clear was someone else's
  `everyone` clear, it adds one line, not stored and not counted as unread: "<who> cleared the AI messages." (the
  type's shown name). A person who clears their own messages leaves no line, as a single delete leaves none today.
  An old page that does not know `chat-clear-some` ignores it and shows the messages until its next load.
- An error from the route shows in the confirm's place, as `openConfirmMenu` does today.

## Left to build, in order

1. **server-development:** `ChatHistory.clearByType` in `server/chat-history.js`; the route
   `DELETE /api/spaces/:id/chat/messages` in `server/index.js`, before `/chat/:messageId`, with the refusals above and
   `tellChat` sending `chat-clear-some`; cases in `tools/check-chat-model.mjs`.
2. **experience-design:** in `public/space.js`, **Clear…** replacing **Delete your private messages** in the ⋮ menu,
   the type list with counts, the confirm (one choice or two), dropping cleared messages and pictures, the
   `chat-clear-some` handler beside `chat-delete`, and the one-line notice; **Delete the chat**'s hint updated.
   A two-choice confirm, if needed, beside `openConfirmMenu` in `public/module-host.js`.
3. **content-manager:** [api-modules](../api/api-modules.md) (the new route, `/chat/private` kept but unused by the
   page), [userguide-chat](../userguides/userguide-chat.md) (Clear… in place of **Delete your private messages**),
   the CHANGELOG, and this plan's status.

## Verify

- **Checked by a tool** (`npm run check`), step 1, in `tools/check-chat-model.mjs`:
  - each type removes exactly its messages: `chat` leaves commands and AI; `ai` takes questions and answers, public
    and private; `module=todo` leaves another module's echoes with the same command name; `all` takes all three;
  - `mine` takes the caller's public and private messages and nobody else's;
  - `everyone` takes every public message of the type and the caller's own private ones, and never another
    person's private message, for an admin, an owner and a flagged moderator alike;
  - a member's `everyone` is 403; a guest is 403 for both scopes; a moderator of another space is 403 for `everyone`;
  - 400 for a bad or missing `type`, `scope`, or `module`; 404 for an aside; `deleted` is the count, 0 when none;
  - `cleared` is unchanged; after a restart the cleared messages are gone from both files;
  - `DELETE /chat` still empties everything, private messages included; `/chat/private` still answers as before;
  - a single-environment install behaves as before.
- **Verified live in a browser, no LiveKit needed:** the ⋮ menu for a member, a moderator and a guest (no
  **Clear…**); the type list with module names, icons and counts; both confirms; messages gone after a refresh;
  the filter left as it was; objects still in To-do, Polls and the other modules after their commands are cleared.
- **Needs a real LiveKit call:** a second person's page dropping the cleared public messages at once, the one-line
  notice on an `everyone` clear and none on a `mine` clear, pictures dropped on both pages, and a second person's
  private messages still there after a moderator's `everyone` clear.

## What is not decided

Nothing blocks the build. Every question was answered on 2026-10-03 (decisions 3 to 11).
