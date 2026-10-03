# Chat Links Plan

**Audience:** Thomas decides; server-development and experience-design build; content-manager documents.

**Status:** Built 2026-10-03. Approved 2026-10-03 (GitHub issue #158), with every open question answered as recommended (decisions 7 to
13). Not built. Thomas, 2026-10-02: "if someone
posts a link in the chat, treat it as if they were adding a Research link." The message shows the link as a preview,
"title, description and picture, the way Research shows a link", with a **Keep** action that saves it into Research,
and it honours Research's **Fetch link previews** setting. It builds on [plan-chat-model](plan-chat-model.md)
(#157), which left a place for it: a preview is an optional field on a message, and **Keep** is open to anyone who can
see the message.

## What it is today

- **A link in a chat message is only a link.** `renderMarkup` in `public/space.js` calls `window.hostText.markdown`
  (`public/sdk/host.js`), which links `[text](https://...)` and bare `http://` or `https://` addresses and nothing more.
  Nothing is fetched and nothing can be kept.
- **Posting.** `sendChatText` in `public/space.js` posts the text to `POST /api/spaces/:id/chat`, which stores an
  ordinary public message through `chatHistory.add` (`server/chat-history.js`), then publishes `{ type: "chat", id,
  text, at, who, by }` on LiveKit's data channel, topic `chat`. Others draw it from that notice. The server only keeps
  the history; it reaches the call itself with `tellChat` (a server data packet), as the delete and visibility routes
  do, and the author's page sends the same notice too.
- **The store.** One message is `{ id, at, by, who, text }` plus the chat model's optional fields (`visibility`,
  `kind`, `command`, `module`, `summaries`, `replyTo`). Public messages live in `DATA_DIR/chat.json`, private ones in
  `DATA_DIR/chat-private.json`. An earlier release reading `chat.json` ignores fields it does not know.
- **Research's link previews.** `server/link-preview.js` is the one page reader: `fetchPreview(url)` returns `{ title,
  description, image }` (title up to 120 characters, description up to 2000), and `fetchImage(url)` returns the
  picture (up to 1 MB, kept in memory 10 minutes, 40 at most). Both accept only `http:` and `https:` with no user name
  or password; refuse `localhost`, `.local`, `.internal` and numeric host names; resolve the name and refuse it if any
  address is private, loopback, link-local, carrier-grade or multicast; pin the request to the addresses they checked,
  so a second lookup cannot swap them; check every redirect the same way (3 at most); read at most 256 KB of a page;
  and give up after 8 seconds. A picture address in the page is checked before it is returned.
  `tools/check-link-preview.mjs` covers all of it.
- **The routes Research uses.** `POST /api/modules/:id/link-preview` (module write access; 404 unless the module
  declares a `linkPreviews` setting; `{ enabled: false }` while it is off; limited by `overLimit(module, person,
  "search")`) and `GET /api/modules/:id/link-image` (module read access; 404 while off). The SDK calls are
  `host.preview.link` and `host.preview.image`.
- **The setting.** Research's `linkPreviews`, labelled **Fetch link previews**, environment scope, on by default since
  Research 0.2.32 (`modules/research/module.json`, read with `moduleSettings.values(manifest, "environment", {})`).
- **Keep today.** An AI answer's objects carry **Keep** (`objectPreview` and `keepOne` in `public/chat-input.js`).
  Chat names no module: it reads `GET /api/spaces/:id/actions` and picks an action by name and input shape
  (`findKeepers`), then calls `POST /api/spaces/:id/action`. A non-local action needs write access to its module.
  The request waits on the bus (`server/module-bus.js`) until someone has that module open; the button then reads
  "Waiting: it is kept when that module is next open".
- **Research's `saveLink`.** Provided by the space's Research (`modules/research/src/research-lib.js`, `provide`):
  input `{ url: "string", title: "string?", excerpt: "text?", ref: "ref?" }`, saved as a Research link. Two things in
  it matter here:
  - it records the link as `me || ctx.by`, the person whose Research page carries out the request, not the person who
    asked; the AI answer's **Keep** has the same flaw today;
  - `busInput` in `server/index.js` cuts a `string` field at 200 characters, so a longer address is saved cut short,
    while Research itself accepts addresses up to 500 (`cleanUrl`).
- **`GET /api/spaces/:id/actions`** lists actions from modules the caller can read, but does not say whether the
  caller may carry them out, so Chat cannot tell a guest's missing write access before the click.

## Decisions

From Thomas, 2026-10-02 (issue #158), and from the approved [plan-chat-model](plan-chat-model.md) (1 to 6), and from
Thomas, 2026-10-03, approving the recommendations (7 to 13):

1. **A link posted in Chat is treated as a Research link being added.** The message shows a preview: title,
   description and picture, as Research shows a link, with **Keep**. Reason: what a group finds in Chat is often what
   it wants to keep.
2. **It honours Research's Fetch link previews setting.** Off, the link shows plainly, nothing is fetched, and Keep
   still saves the address. Reason: one setting decides whether this server reads other sites.
3. **The same protections as Research.** Private and local addresses are never fetched
   (`tools/check-link-preview.mjs`).
4. **Keep saves into the space's Research, as the person who kept it.**
5. **The preview wears Research's colour,** from the chat model's module colours.
6. **The preview is an optional field on the message, and Keep is open to anyone who can see the message**
   (plan-chat-model, "Left open for #158"). Nothing already stored changes.
7. **The author's page asks for the preview,** with a new preview route, after posting; the server does not fetch in
   the background. Reason: the result is in the answer, so a tool can check it, and the author's page can pass it on
   if the server's notice does not arrive.
8. **One preview per message, for the first link only.** Reason: one fetch per message, and a chat line stays short.
9. **With no Research on in the space, there is no preview and no Keep;** the link stays plain. Reason: the fetch
   belongs to the module that keeps links.
10. **Keep is hidden from someone who cannot write to Research** (a guest, by default). Reason: Chat already hides what
    a person cannot do.
11. **A link is kept once per message,** shown to everyone as "Kept by <name>". Reason: two people should not keep the
    same link twice from one message.
12. **`saveLink`'s `url` input becomes `"text"`,** up to Research's own 500 characters. Reason: today an address over 200
    characters is saved cut short without a word.
13. **No preview is fetched for a poster who cannot write to Research** (a guest, or a reader). Reason: the same rule as
    Research's own fetch.

## The contract

Where a part rests on one of decisions 7 to 13, it names it.

### Words

- **The keeper**: the module on in the space that provides an action named `saveLink` taking `input.url`. Today that
  is Research. Chat and the server find it by that shape, never by name. With several, the first in the space's
  module order is the keeper.
- **A link**: in an ordinary message's text, the first `http://` or `https://` address, written bare or as
  `[text](https://...)`, by the same pattern `hostText.markdown` links. Not inside `` `code` ``, a fenced block or a `>`
  quoted line (a reply quotes the message it answers, and that link belongs to the other message). Trailing
  punctuation is left off as `hostText.markdown` does. No user name or password, and 500 characters at most
  (Research's own limit); anything else is not a link for this purpose and stays plain. One link per message (decision 8).
- Only an **ordinary message** can carry one: not a command echo (the command's module decides what a link in it
  means), not an AI answer (its objects already have Keep), not a picture, and not in an aside (nothing is stored).

### What is stored on the message

One new optional field on an ordinary message, `preview`:

```json
{
  "id": "a1b2c3d4e5f6", "at": 1790000000000, "by": "<user key>", "who": "Thomas",
  "text": "This one? https://example.com/hotel",
  "preview": {
    "url": "https://example.com/hotel",
    "module": "research",
    "title": "Hotel Example, Lisbon",
    "description": "A quiet hotel by the river ...",
    "image": "https://example.com/og.jpg",
    "at": 1790000002000
  },
  "kept": { "by": "<user key>", "who": "Mia", "at": 1790000050000 }
}
```

- `preview.url` is set by the server when the message is posted and has a link, whether or not anything is fetched.
  It is the address Keep saves.
- `preview.module` is the keeper whose setting allowed the fetch; the page looks its colour up from it when drawing,
  as the chat model does for `module`, so nothing colour-related is stored.
- `title` (up to 120 characters), `description` (cut to 500 characters, with an ellipsis), `image` (an address of up
  to 2000 characters, never fetched by a browser) and `at` (when it was read) are present only after a successful
  fetch. A failed fetch adds nothing and is not retried.
- `kept` is set by the first Keep (decision 11): who kept it and when.
- An earlier release ignores both fields; a message without them reads as today. `preview` and `kept` are never
  trimmed by flipping visibility, and go with the message when it is deleted or the chat is cleared.

### When the preview is fetched (decisions 7, 9 and 13)

- `POST /api/spaces/:id/chat` (unchanged path and body) finds the link and stores `preview: { url }`. It never waits
  for another site, so posting is as quick as today. The message it returns carries `preview`.
- The author's page then asks for the preview with a new route, and sends the result to the call itself as well as
  the server doing so (decision 7). The author sees nothing while it is read; the preview appears under the text when it
  arrives, for them and for everyone else.
- The fetch happens only when all of these hold; otherwise the route returns the message unchanged and nothing leaves
  the server:
  - the message is public, ordinary, has `preview.url` and no `preview.at`, and was posted in the last 5 minutes;
  - the caller is its author and signed in (a guest's shared sender cannot be told apart);
  - a keeper is on in the space (decision 9), declares a `linkPreviews` setting, and it resolves true for the environment;
  - the author may write to the keeper here (decision 13), the same rule as Research's own `POST .../link-preview`.
- A message flipped private before the fetch is not fetched. One made private afterwards keeps its preview, and only
  its author sees it, as with everything else on a private message.
- No backfill: messages posted before this is built have no `preview`.

### Server routes

All in `server/index.js`, under "Chat routes" in [api-modules](../api/api-modules.md). Existing routes keep their
paths, fields and status codes.

- `POST /api/spaces/:id/chat`: as today, plus `preview: { url }` on the stored and returned message when it has a
  link.
- `POST /api/spaces/:id/chat/:messageId/preview` (new, needs `chat`). No body.
  - Does the fetch under the rules above, with `fetchPreview` from `server/link-preview.js` (no second fetcher), and
    `overLimit(<keeper id>, <person>, "search")`, so it shares Research's limit.
  - 200 `{ message }`, the message as stored, with or without the read fields. A message already read, or one the
    rules do not allow, is a 200 that changes nothing (the page treats both alike).
  - 403 "only the person who posted it can ask for its preview"; 404 "no such message" (also for someone else's
    private message); 429 over the limit, with the module's limit message.
  - A page that could not be read is a 200 with nothing added; the reason goes to the activity log, never to the
    call.
  - When fields were added, tells the call with `tellChat`: `{ type: "chat-preview", id, preview }`.
- `GET /api/spaces/:id/chat/:messageId/image` (new, needs `chatRead`). The picture of a message's preview, so no
  browser asks another site, as Research's `link-image` does.
  - The message must be one the caller can read and have `preview.image`; the keeper must still be on in the space
    with its setting on. Otherwise 404, with no body.
  - `cachedImage`, else `fetchImage`, from `server/link-preview.js`; `overLimit(<keeper id>, <reader>, "search")` on
    a fetch, not on a cached answer; `Cache-Control: private, max-age=600`.
  - Turning **Fetch link previews** off later leaves stored titles and descriptions showing, but the picture stops,
    as in Research.
- `POST /api/spaces/:id/chat/:messageId/keep` (new, needs `chat`). No body. The server builds the input from the
  stored message, so a page cannot keep something the message does not say.
  - Finds the keeper and checks the caller may write to it here (as `POST .../action` does for a non-local action).
  - Requests `saveLink` on the bus as the caller with `{ url: preview.url, title: preview.title, excerpt:
    preview.description }` (the last two only when read). The picture is not sent: Research reads it again on its
    own when it shows the link with previews on (`warmLink`).
  - Sets `kept: { by, who, at }` on the message (decision 11) and tells the call `{ type: "chat-kept", id, kept }` for a public
    message.
  - 200 `{ status, message }`, `status` being the bus request's (`queued` until the keeper is next open). A message
    already kept is a 200 with `status: "kept"` and no new request.
  - 404 "no such message" (also someone else's private message, and a message with no `preview`); 404 "nothing here
    can keep links" when no keeper is on; 403 "you cannot add to <keeper's display name> here"; 429 over the chat
    post limit.
- `GET /api/spaces/:id/actions`: each action gains `may` (true when the caller can carry it out here: read access for
  a local action, write access for any other), so Chat can hide Keep before the click (decision 10). Nothing else changes.

### Research's part

- `saveLink` and `saveNote` record the person who asked (`ctx.by`) when the request came from someone else, and `me`
  only for the page's own requests. Decision 4 needs it; it also fixes the AI answer's Keep.
- `saveLink`'s `url` input becomes `"text"` so the bus no longer cuts it at 200 characters; Research's `cleanUrl`
  still refuses more than 500 (decision 12).
- One version bump, recorded in `tools/module-versions.json`.

### What a person sees

- **Posting.** Unchanged: the message appears at once with its text; the link is a link.
- **The preview** (setting on, page read): under the text, inside the message, a box with the picture on the left (if
  any), the title as the link, the site's name, and the description in up to three lines. It wears the keeper's tint:
  `data-tint` from `preview.module`, the tint on the box's left edge and its icon (`book-open`, the keeper's own icon),
  never on its text or background (chat model, decision 18). The message itself stays an ordinary message from its
  author, with no tint. A picture that does not load is left out, not shown broken.
- **Setting off, or the page could not be read:** the text and its link as today, and under it one line with the
  keeper's icon, the site's name and **Keep**. Nothing is fetched.
- **Keep** is a `msg-btn` like the AI answer's. Shown to anyone who can see the message and whose `/actions` lists
  the keeper's `saveLink` with `may: true`; hidden for everyone else, guests included by default (decision 10). Pressed, it
  calls the keep route; on success it becomes "Kept" (or "Waiting: it is kept when <keeper> is next open").
- **Already kept** (decision 11): the box shows "Kept by <name>" in place of **Keep**, for everyone who sees the message,
  arriving live with `chat-kept`. A link already in Research from somewhere else is not detected.
- **Others in the call** draw the preview from `chat-preview`, from the server or the author's page, whichever comes
  first; a second copy is ignored. The picture always comes from the image route by message id, so an address sent
  in a notice is never loaded. Text from a notice is drawn as text.
- **Private messages.** A message its author made private shows its preview and Keep only to its author.
- **The filter** (All, Private, Public) treats a message with a preview like any other.

### Limits

- One link, one fetch per message, only by its author, only in its first 5 minutes.
- The fetcher's own limits: 8 seconds, 3 redirects, 256 KB of a page, 1 MB of a picture.
- `overLimit(<keeper>, <person>, "search")` for both routes, shared with Research's searches and previews;
  `chatPostLimited` for keep.
- Stored: title 120, description 500, picture address 2000, link 500 characters. These count toward no message
  limit; the text limit (1000) is unchanged.

## Left to build, in order

1. **server-development:** finding the link (a small function in `server/chat-history.js` or a new
   `server/chat-links.js`, one rule shared by both routes); `preview.url` on `POST .../chat`; `preview` and `kept`
   kept by `chatHistory` (stored, returned, moved with visibility); the preview route; the image route; `may` on
   `GET .../actions`. `tools/check-chat-links.mjs` (new, in `npm run check`).
2. **experience-design:** Research's part: `ctx.by`, the `url` input as `"text"`, the version bump.
3. **server-development:** the keep route, with `kept` and `chat-kept`, added to `tools/check-chat-links.mjs`.
4. **experience-design:** Chat. `storedEntry` keeps `preview` and `kept`; `sendChatText` publishes `preview`, asks
   for the preview and publishes `chat-preview`; `chat-preview` and `chat-kept` handled beside `chat-visibility`;
   the preview box, the plain line and Keep in `public/space.js`, `public/chat-input.js` and `public/style.css`,
   using theme tokens and the tint tokens only.
5. **content-manager:** [api-modules](../api/api-modules.md) (the three routes, `may`, the two fields in Storage),
   [userguide-chat](../userguides/userguide-chat.md) (links in Chat, Keep), the Research user guide (links kept from
   Chat), the CHANGELOG, and this plan's status.

## Verify

- **Checked by a tool** (`npm run check`):
  - step 1: which text counts as a link (bare, `[text](https://...)`, the first of several, not in code or a quote, too long,
    with a password, `ftp:`); `preview.url` stored and returned; the preview route fetches only for the author, only
    while the setting is on, only with a keeper on that the author may write to, only once, only in the first 5
    minutes, never for a private message, a command or an AI answer; it calls `fetchPreview` (a local stub server, as
    `tools/check-link-preview.mjs` does; a private address refused before any request); the image route's 404s; `may`
    for a guest, a member and a reader without write; `chat.json` still readable without the new fields; a
    single-environment install behaves as before;
  - step 2: `tools/check-modules.mjs` and the version check pass; `saveLink` keeps an address of 300 characters
    whole;
  - step 3: keep requests `saveLink` with the stored fields as the caller, sets `kept`, a second keep makes no request,
    403 without write access, 404 with no keeper;
  - `tools/check-link-preview.mjs` unchanged and passing.
- **Verified live in a browser, no LiveKit needed:** posting a link shows the preview after a moment and after a
  refresh; with the setting off, the plain line and Keep, and no request to the site; Keep saves into the space's
  Research under the keeper's name and shows "Kept by"; a guest sees no Keep; the tint on a light and a dark theme;
  a private address in a message never fetched (watch the server's activity log).
- **Needs a real LiveKit call:** a second person seeing the preview appear, keeping it, and both seeing "Kept by";
  a notice with a forged picture address loading nothing.

