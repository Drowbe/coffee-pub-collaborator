# Product Pages Plan

**Audience:** Thomas, who decides what the product page says and how it splits; experience-design, who builds the
pages and draws the art; server-development, who serves the new addresses and checks them.

**Status:** draft for Thomas to decide, 2026-10-21. Nothing built. Thomas: the product page is trying to be about
everything; "perhaps we make this product page about travel... another about gaming, etc." It follows on from the
product page redesign (GitHub #212) and waits, for its third use, on the project and mentoring template (GitHub #351).

## What it is today

- **One page.** `public/landing.html` (361 lines), `public/landing.css` and `public/landing.js`. The server sends it
  for `/` at the bare base domain only (`server/index.js`, the door, about line 2676), with a short allowlist of
  other paths (`BARE_BASE_PATHS`, the fonts, `/assets/images/brand/`). Without `BASE_DOMAIN` there is no product
  page: `/` is the one environment. See [architecture-environments](../architecture/architecture-environments.md).
- **What it holds, top down:** the hero ("For trips and game nights", "Plan the trip. Talk it through. Keep it all
  in one place.", the animated travel art: a map, a dotted route, a plane, a call and a day plan), Sign in, a
  four-screen tour of a Lisbon trip, What you get (five features and a list of ten modules), three use cards
  (trips, tabletop groups, and since `2f64c5b` teams and mentors), phones, How it works, Yours and private, Plans,
  Get started (the sign-up form), the footer.
- **Its own look.** A travel palette (`--l-*` on `.landing`, light sand and teal, dark night navy), left out of the
  colour checks by `OWN_PALETTE` in `tools/lib/drift.mjs`. Figtree for the text, Fraunces 600 on the `h1`.
- **What it fills in.** `landing.js` asks `GET /api/product` for the product's name (`PRODUCT_NAME`), the contact,
  the base domain, the plans and the host's **templates**. It fills every `data-product` element and sets
  `document.title` to the name. The sign-up form shows "Template" (None, then each template) and sends `template`
  to `POST /api/product/signup`.
- **Templates that exist.** One bundled template, `templates/travel.json` (version 6). It turns on Planner (`travel`,
  shown as "Itinerary"), Places, Maps, Research, Calendar, the chat and the call; Stream installs itself in every
  environment. It does **not** turn on Budget, Polls, To-do or the Assistant: an owner can, if the plan allows.
  **There is no gaming template**, bundled or otherwise, and no project template (#351).
- **The screenshots** (`public/assets/images/brand/landing/`, webp) were taken by hand from the seeded travel
  environment of `tools/shots-seed.mjs` (`e44b98c`); no script makes them. `tools/landing-preview.mjs` builds a
  folder copy of `landing.html` to look at without a server.

## Decisions

Thomas's, as stated so far:

1. **The chat is the core; voice and video are the optional part.** The pages say it that way round.
2. **The Planner's copy is travel-only.** It belongs on the travel page, not on a general one.
3. **The hero animation stays,** and the plane flies nose first along the route, toward where the route ends.
4. **The page keeps its own palette and fonts:** `landing.css`, `OWN_PALETTE`, Figtree, Fraunces 600 on the `h1`.
5. **The template choice stays on sign-up,** filled from the host's templates.
6. **Not released:** no redirects, aliases or kept old paths. Configuration only in environment variables. A
   single-environment install (no `BASE_DOMAIN`) behaves as before: it has no product pages.

## The choices

Each has my lean, marked as a suggestion.

### 1. Addresses

- **A. One word each: `/travel`, `/games`, `/projects`.** Short, easy to say aloud and to print.
- **B. Under a prefix: `/for/travel`.** Leaves the top level free for later pages; longer.
- **C. The template's id:** ties the address to a file name that may change.

Suggestion: **A**. The bare base domain serves nothing else, so there is nothing to collide with. Old links need
nothing (decision 6).

### 2. How the pages are made

- **A. One shared page, filled from a data file per use** (words, art, shots, modules) by `landing.js`. One copy of
  the layout. But the words arrive after load, so no-script readers, search and link previews see a blank or
  default page, and inline SVG art in JSON is awkward to edit.
- **B. One plain HTML file per use**, all sharing `landing.css` and `landing.js`. No build step, real text in the
  file, a real `<title>` and description per page, art inline as it is now. The cost is repeated header, footer and
  sign-in markup: a check can compare those blocks across the files.
- **C. The server fills one HTML shell from a data file per request.** Real HTML for everyone and one layout, but
  a template engine in the server for three pages.

Suggestion: **B**. The use pages share little beyond the header and footer; nearly every word and picture
differs. `landing.js` already fills the name on any page that has `data-product`; it needs one change, a title
per page (for example "Trips: <name>") instead of the bare name.

### 3. Sign-up lands in what the page showed

- **A. A use page's Get started opens `/?template=travel#start`**: the front page's form with that template
  chosen. One form, one copy of the code.
- **B. Each use page carries the form,** the template chosen. One step shorter, three copies of the form.
- **C. The form on the use page with the template fixed** and no choice. Hides that a template is only a start.

Suggestion: **A**. And a use page is shown only while the host offers its template: if a host hides or removes
it, the address answers 404 and the front page's card does not link to it. So a page never offers a set-up
the host does not have. A host that edits the travel template still gets the travel page's words as written; the
page describes the bundled template.

### 4. Art and screenshots per use

- **Travel** keeps today's hero art and screenshots, all of them made from the travel seed.
- **Games** needs its own hero (for example a battle map with dice, the call's faces and a session night on a
  calendar, drawn in the same flat style and palette) and its own screenshots, which need a gaming seed beside the
  travel one.
- **Who draws:** **A.** experience-design drafts the SVG and Thomas approves it; **B.** an illustrator Thomas
  chooses. Suggestion: **A**, since the travel art was made that way and has to match.
- **The front page:** **A.** no big picture; the three use cards, each with its spot art, are the picture.
  **B.** keep the travel art there too. Suggestion: **A**; the travel art leads `/travel`, where it belongs.

### 5. What the front page keeps, and what moves

Suggestion:

- **Front page keeps:** the header, a general hero (a chat-first headline and lede, Thomas's words), Sign in, the
  three use cards (each linking to its page once it exists), How it works, Yours and private, Plans, Get started,
  the footer.
- **Moves to `/travel`:** today's headline "Plan the trip. Talk it through. Keep it all in one place." (it names the
  trip), the hero art, the tour, What you get, the phones band, the travel modules.
- **Games and projects** get the same sections in their own words, when their templates exist.
- **The module list** on each use page lists only that template's modules, with the others named once as "and more
  you can turn on". The front page drops the list.

Note: the brief kept "the headline" on the front page; today's headline is a travel one, so it moves.

### 6. What each use page claims

- **Travel**, from `templates/travel.json`: the Itinerary (the Planner), Places, Maps, Research, Calendar, chat, the
  call, and Stream. Budget, Polls and To-do are on today's page but not turned on by the template. Either
  **A.** the template adds them (a new template version; server-development; amends
  [plan-environment-templates](plan-environment-templates.md) decision 10), or **B.** the page shows them under
  "turn on when you need them". Suggestion: **A**: the tour already sells Budget, and a trip needs it.
- **Games:** no template exists. **A.** a gaming template first (its own short plan, like #351: the space word,
  probably "Campaign", its modules, its phases), then the page. **B.** a page now that claims only what every
  environment has (chat, the call, asides for whispers, Stream for OBS) and signs up with None. Suggestion:
  **A**, so the page and the sign-up agree.
- **Projects and mentoring:** after #351, the same way.

### 7. The pending fixes

- **Already done:** the chat-first wording of the hero's lede, the description, "A chat, and a call when you want
  one" (it was "Voice and video for the whole group, with a chat beside it", about line 177) and How it works
  (`0f9a79e`). It moves to `/travel` as written.
- **Independent, can ship now (it survives the move):** the plane flying nose first along the route
  (`landing.html` line 82; it sits at a fixed `rotate(-28)` while the route marches).
- **Folded into the restructure:** the eyebrow "For trips and game nights" and the hero's headline and lede (the
  front page gets new ones); labelling the Planner copy as travel-only (it moves to `/travel`, so no label is
  needed); the third use card from `2f64c5b` (kept, linking to `/projects` once that exists); "Voice and video that
  stays open between sessions" on the games card (rewritten chat-first with the games page).

### 8. Titles, search and sharing cards

- **In:** a `<title>` and `<meta name="description">` per page, written in the HTML. No build step needed.
- **Out for now:** sharing cards (Open Graph). They need an absolute image address and the product's name, which
  only the server knows (`BASE_DOMAIN`, `PRODUCT_NAME`); a page cannot write the name (`check-names`). A server
  fill could add them later as a small piece of its own.

### 9. Documentation afterwards (for content-manager)

These lead with voice and video, against decision 1:

- `README.md` line 3 and `documentation/home.md` line 6 ("Voice and video for your tabletop game...").
- `public/admin.html` line 380, the host console's About ("Voice and video for a group..."); its next paragraph also
  says the travel template gives a Budget, which it does not today (choice 6).
- [architecture-environments](../architecture/architecture-environments.md), the bare base domain's paths;
  `userguide-getting-started.md` and `userguide-templates.md`, where they describe the product page; the comment
  in `tools/lib/drift.mjs` if more files join `OWN_PALETTE`.

## The contract

If the suggestions stand.

### Server (server-development)

- At the bare base domain, `GET /travel`, `/games` and `/projects` send `public/landing-travel.html`,
  `landing-games.html` and `landing-projects.html`, each only while its paired template is among the host's
  offered templates (`templateChoices(null)`); otherwise 404, like any unknown path. One small table in
  `server/index.js` pairs each address with its file and template id.
- `GET /api/product` gains `pages: [{ path, template }]`, the use pages live on this host, so the front page links
  only those.
- Nothing changes without `BASE_DOMAIN`.
- `tools/landing-preview.mjs` copies every product page, not only `landing.html`.

### Pages (experience-design)

- `landing.html` becomes the front page (choice 5). Each use card links to its page when `pages` lists it.
- `landing-travel.html`: today's travel content, chat first, the Planner named "Itinerary" as the person will see it,
  the module list from the template. Its Get started links to `/?template=travel#start`.
- `landing.js`: reads `?template=` and preselects that option when the host offers it (None otherwise); sets the
  title per page from an attribute on `<title>`.
- All pages share `landing.css` and the palette. Each has its own title and description.

## Left to build, in order

Sizes: small is a few hours of one builder, medium about a day, large more than a day.

| Step | What | Who | Size | Can run beside |
| --- | --- | --- | --- | --- |
| 1 | The plane's direction | experience-design | small | anything |
| 2 | The addresses, `pages` in `/api/product`, the preview tool | server-development | small | 3, 4 |
| 3 | `/travel`: the travel content moved to its own page | experience-design | medium | 2 |
| 4 | The travel template adds Budget, Polls and To-do (if choice 6A) | server-development | small | 2, 3 |
| 5 | The front page cut down, its cards linking, the template preselected | experience-design | medium | after 2 and 3 (same files as 3) |
| 6 | A gaming template plan, then its file | product-planner, then server-development | small, then small | 3 to 5 |
| 7 | The games hero art, drafted, then approved by Thomas | experience-design, Thomas | medium | 2 to 6 |
| 8 | A gaming seed for screenshots, and the shots | server-development, then experience-design | medium | 7 |
| 9 | `/games` | experience-design | medium | after 6 to 8 |
| 10 | `/projects`, after #351, the same way as 6 to 9 | as above | large in all | later |
| 11 | The documentation (choice 9) | content-manager | small | after 5 and after 9 |

## Verify

- **Steps 1, 3, 5, 9:** in headless Chromium against a local server with `BASE_DOMAIN=localhost`: each page at
  light and dark, 1280 and 390 px; the plane's nose follows the route; the template preselected from the address;
  the cards link only to live pages. The plane and the art are judged by eye, by Thomas.
- **Step 2:** checked by a tool: `tools/check-host-registry.mjs` or `tools/check-origin.mjs` gains cases for each
  address answering 200 with its template offered and 404 with it hidden, `pages` in `/api/product`, and no product
  page without `BASE_DOMAIN`.
- **Step 4:** `tools/check-templates.mjs` and a new environment from sign-up showing Budget, Polls and To-do.
- **Steps 6 and 8:** the template check; the seed run by `npm run shots`.
- Nothing here needs a real LiveKit call. The screenshots of the call column come from the shots tool's stub.

## What I need from you

Each answerable in a line; my suggestion first.

1. **Addresses:** `/travel`, `/games`, `/projects` (or `/for/...`)?
2. **How the pages are made:** one plain HTML file per use, sharing the stylesheet and script (or one page filled
   from data, or filled by the server)?
3. **Sign-up from a use page:** link to the front page's form with the template chosen (or a form on each page)?
4. **A use page only while the host offers its template**, else 404 and no link: yes?
5. **Games hero art:** experience-design drafts, you approve (or an illustrator)?
6. **Front page hero:** no big picture, the three use cards are the picture; the travel art moves to `/travel`?
7. **Today's headline** ("Plan the trip. Talk it through.") moves to `/travel`, and you word a new chat-first one
   for the front page?
8. **Travel claims:** the travel template turns on Budget, Polls and To-do too (or the page lists them as "turn on
   when you need them")?
9. **Games:** a gaming template first, then the page (or a page now, signing up with None)?
10. **Games word and space word:** "Games" for the page and "Campaign" for the space?
11. **The Planner on the travel page** is called "Itinerary", as the template shows it?
12. **Sharing cards** stay out for now; only a title and description per page?
13. **Ship the plane fix now**, before the restructure?
14. **Order:** travel, then games, then projects after #351?

Blocking the first build (steps 2, 3, 5): 1, 2, 3, 4, 6, 7. Blocking games: 5, 9, 10. Step 1 needs only 13.
