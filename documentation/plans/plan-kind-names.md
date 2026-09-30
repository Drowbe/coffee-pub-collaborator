# Kind Names Plan: file formats and identifiers named by kind, not by the product

**Audience:** Thomas, who decided the names and approves this plan; server-development and experience-design, who build it; quality-assurance, who checks it; content-manager, who brings the documents in line.

**Status:** Approved by Thomas, 2026-09-30, with the choices listed under "Choices made in writing this". The follow-up to GitHub #110 (the old product name taken out of everything a person reads). #110 renamed the file formats from the old product name to the current one; Thomas, on reading it: "my initial direction was to not tie these things to a product name as that serves no purpose other than to make product naming harder in the future. We went as far as to make the product name a variable. Instead i suggested that we come up with an agnostic name based on kind." His decisions below are from 2026-09-30. Amended 2026-09-30 after QA (F4), approved by Thomas: old-named fences are recognised in more places (with more words after the label, inside a list or a quote), and an old marker is recognised by its exact past name rather than by shape. **Built 2026-09-30, steps 1 to 4, and through QA in two rounds** (step 5); the documents are brought in line (step 6), apart from the other plans that still name the old formats, which are product-planner's. Verified: checked by tools (every check named in steps 1, 2 and 4, then `npm run check`, apart from the two `--migration` cases of `check-names` that fail only as root in a cloud container); verified live on a local server with curl and in headless Chromium. Not checked: the chat's **Bring in** button in a browser (it needs a call; the route behind it was checked), `APP_REVISION` in a built image (no Docker here; read as code), and a real `/ai` reply (no AI key here). The section "What it is today" below describes the code before this change.

## What it is today

After #110, three file formats, one fenced block and a handful of leftovers still carry a product name.

- **Theme files** (`server/theme-file.js`): `<name>.collaborator-theme.json`, holding `{ collaboratorTheme: 1, name, author?, light, dark }`. `readThemeFile` refuses a file with no whole-number `collaboratorTheme` as `NOT_A_THEME_FILE` and a higher one as `NEWER`. The marker exists only in the file: a stored theme has none.
- **Template files** (`server/template-file.js`): `<name>.collaborator-template.json`, holding `{ collaboratorTemplate: 1, ...the template's fields }`, the embedded theme without its own marker (`templateToFile` strips it; `readEmbeddedTheme` in `server/templates.js` adds it back to reuse the theme reader).
- **Objects files and blocks** (`server/object-format.js`): `<something>.collaborator-objects.json` holding `{ collaboratorObjects: 1, objects: [...] }`, or an AI answer with ```` ```collaborator ```` blocks. `readObjects` also treats ```` ```card ```` as its own, and falls back to any loose JSON object with a `title` in the text. The published schema has `$id: 'urn:coffee-pub-collaborator:objects:1'`. `GET /api/objects/format` (`server/index.js`) answers `fence: 'collaborator'` and `fileSuffix: '.collaborator-objects.json'`.
- **The `/ai` rule** (`server/ai.js`, `SUMMARY_RULE`): the model is told to write ```` ```card ```` blocks, calling each one a "card". `parseSummaries` takes blocks labelled `card`, `summary`, `json`, `collaborator` or nothing.
- **The chat's paste detection** (`public/chat-input.js`, `offerImport`) already asks the server (`postCheck`) and reads no fence itself. Nothing to change there.
- **The second reader** (`public/host-templates.js`, the template editor's theme picker, around line 398) checks `parsed.collaboratorTheme` on the page and strips it, repeating half the server's rule.
- **Leftovers:** the Dockerfile sets `TAVERN_REVISION`, read by `server/index.js` for the version string. The outgoing user-agents are hard-coded: `'Collaborator'` in `server/link-preview.js`, `'CoffeePubApp'` in `server/geocode.js`. The default product name is written in four places: `server/product-name.js`, `server/index.js` (`PRODUCT_NAME = 'Collaborator'`), `public/brand.js` and `public/host-templates.js` (`let product = 'Collaborator'`), `public/host.js` (`settings.productName || 'Collaborator'`) and `public/host.html` (`<span id="template-shipped-by">Collaborator</span>`).
- **The guard** (`oldProductNameCheck` in `tools/check-names.mjs`) fails on one past name only, in any line under `server/`, `public/`, `modules/`, `tools/` and `templates/`. It knows nothing of the current default or of `tavern`.
- **Fixtures** in `tools/fixtures/object-format/` carry the product name in their names and contents (`collaborator-array.txt`, `three-collaborator.txt`, `one-card.txt`, `file-ok.json`, `rendered-view.txt`).

## Decisions

1. **Names by kind** (Thomas, 2026-09-30). Files are `<name>.theme.json`, `<name>.template.json` and `<name>.objects.json`. Inside each, `"format": "theme" | "template" | "objects"` and `"formatVersion": 1`. The AI block is fenced ```` ```objects ````. A key named after the kind alone (`theme`, `template`, `objects`) would collide with fields the files already have (a template's `theme`, an objects file's `objects`), so the marker is the pair `format` and `formatVersion`. The schema's `$id` goes kind-based too (see The contract for which).
2. **Old forms are not accepted** (Thomas, 2026-09-30). Neither the old-product markers nor the current-product markers, nor either product-named fence. Only Thomas pulled `:latest` while they existed. An old file is refused with a plain sentence saying why and what to do.
3. **The repository, image and compose names stay** (Thomas, 2026-09-30): `ghcr.io/drowbe/coffee-pub-collaborator`, the package name, the compose service, containers and data path. Out of scope.
4. **"Coffee Pub" is the brand and may stay** in identifiers (Thomas, 2026-09-30). The guard does not ban it.
5. **One block name** (Thomas, 2026-09-30). The `/ai` rule's own ```` ```card ```` fence moves to ```` ```objects ```` too, and the reader stops treating ```` ```card ```` as special.
6. **The leftovers are in this plan** (Thomas, 2026-09-30): `TAVERN_REVISION` becomes `APP_REVISION`; the outgoing user-agents take `PRODUCT_NAME` and the version, and the geocoder's still identifies the app, as the OpenStreetMap services' usage policy asks; the default product name is defined once, in `server/product-name.js`, and the pages start empty and fill from branding.
7. **The guard** (Thomas, 2026-09-30). `oldProductNameCheck` is replaced by a check that no product name (the default `PRODUCT_NAME` from its one definition, plus the past names magpie and tavern) is written into an identifier or hard-coded text under `server/`, `public/`, `modules/`, `tools/`, `templates/` or the Dockerfile. Exemptions only by allow-list entries with a reason, such as the read-once Tavern migration code already there.
8. **The second reader follows the server** (Thomas, 2026-09-30), preferably by asking the server rather than repeating its rule. The fixtures in `tools/fixtures/` are renamed.
9. **The #110 CHANGELOG entry is corrected** when this lands, and the documents that name the formats are brought in line, as content-manager's step (Thomas, 2026-09-30).
10. **Identifiers are named by kind, in CLAUDE.md** (Thomas, 2026-09-30). The project manager added the line to CLAUDE.md's Names section as proposed: "Identifiers (file formats and their markers, fenced blocks, stored keys, cookies, environment variables) are named by kind, never by the product. The product's name comes only from `PRODUCT_NAME`; the brand, Coffee Pub, may appear." Done.
11. **Old-named blocks are refused** (Thomas, 2026-09-30, choosing "Refuse old-named blocks"). A pasted answer with a block fenced with a past product name is refused with the "copy the instructions again" sentence, even when what is inside is valid, and the loose fallback does not rescue objects from inside such a block. The loose fallback still reads a paste that lost its fences entirely.
12. **The product page's placeholder starts empty** (Thomas, 2026-09-30). The `data-product` span in `public/landing.html` starts empty and fills from branding, like the other pages.

## The contract

### One marker reader

A new `server/file-format.js` holds the one rule for the three files, so the theme, template and objects readers stop each having their own:

- `stamp(kind)` answers `{ format: kind, formatVersion: 1 }` (the newest version of each kind the server reads; each kind keeps its own number, all 1 today).
- `readMarker(file, kind)` answers one of `ok`, `newer`, `old` or `not`:
  - `ok`: `format === kind` and `formatVersion` is the whole number 1.
  - `newer`: `format === kind` and `formatVersion` is a whole number above what the server reads.
  - `old`: there is no `format`, and a top-level key named exactly a past label followed by the kind with a capital holds a whole number. The names are built from `PAST_BLOCK_LABELS` (below) and the kind (`Theme`, `Template`, `Objects`), so the old markers are never written out as names in the code, and they need no guard exemption beyond the one `PAST_BLOCK_LABELS` already has. The comment on this branch says what it recognises and why, and points here. (Amended after QA, F4: the first version took any `/^[a-z]+Kind$/` key as an old marker, which refused real objects such as `{"title":"A","relatedObjects":3}`.)
  - Any other key ending in the kind (an unknown `xxxTheme`) is not an old marker. Such a file reads `not` and gets the "not a … file" sentence.
  - `not`: anything else (another kind's `format`, a missing or non-whole `formatVersion`, no marker).

### Theme files

- `themeToFile` writes `{ format: "theme", formatVersion: 1, name, author?, light, dark }`, keys in that order. `themeFileName` ends in `.theme.json` (`strong-coffee.theme.json`; `theme.theme.json` for an empty name).
- `readThemeFile` keeps its refusal order (size, JSON, object, then the marker, then a complete set). The marker step: `not` is `NOT_A_THEME_FILE` ("That isn't a <product> theme file."), `newer` is `NEWER`, and `old` is a new `OLD_THEME_FILE`: "That theme file is in an older format. Export the theme again and import the new file." `format` and `formatVersion` are not theme fields and are never stored.
- `GET /api/themes/:id/export` sends `attachment; filename="<name>.theme.json"`. `POST /api/themes/import` answers 400 with the sentence for each refusal, as today.

### Template files

- `templateToFile` writes `{ format: "template", formatVersion: 1, ...fields }`; the embedded theme is the theme file without `format` and `formatVersion`. `templateFileName` ends in `.template.json`, derived from the name directly (not by replacing the theme suffix).
- `readTemplateFile`: `not` is `NOT_A_TEMPLATE_FILE`, `newer` is `NEWER`, `old` is a new `OLD_TEMPLATE_FILE`: "That template file is in an older format. Export the template again and import the new file." `format`, `formatVersion` and `edited` are skipped as fields.
- `readEmbeddedTheme` (`server/templates.js`) drops `format` and `formatVersion` if present and reads the rest as a theme, as it does the old key today.
- Both export routes (`/api/templates/:id/export`, `/api/host/templates/:id/export`) send `<name>.template.json`; both import routes refuse as above.

### Checking a theme file for the template editor

- **New:** `POST /api/host/themes/check`, host admin, same origin, the theme file's text as the body (the same body reader and 16 KB limit as `POST /api/themes/import`). It runs `readThemeFile` and stores nothing. 200 `{ theme: { name, author?, light, dark }, dropped }`; 400 `{ error }` with the theme file's sentence.
- The template editor's theme picker (`public/host-templates.js`) keeps its own 1 MB size limit, sends the file's text to this route and keeps the answer's `theme` as it keeps the parsed file today. On a 400 it shows `theme: <error>` through `showProblems`. It no longer reads any marker itself. Save still checks the embedded theme on the server, as now.

### Objects files and blocks

- The file is `{ "format": "objects", "formatVersion": 1, "objects": [...] }`, named `<something>.objects.json`.
- `readObjects`, for text that parses as a JSON object: it is taken as a file when it has `format === "objects"` or a `formatVersion` (a single object with some other `format` field, which an AI may write, is still read as an object). For a file: `newer` is "that file is format N; this server reads format 1", `not` is "that is not a .objects.json file", `old` is "that file is in an older format: copy the instructions again and ask the AI for a new file", and an `ok` file with no `objects` array is refused as today. A top-level JSON object that is not a file but reads `old` (no `format`, a key named exactly as an old marker) is refused with the same `old` sentence rather than read as one object.
- Fenced blocks: only ```` ```objects ```` is read as the format's block. ```` ```card ```` is not special any more: its contents are reached only by the loose fallback, like any other unlabelled JSON.
- **Old-named blocks are refused** (decision 11). Before anything else is read from pasted text, `readObjects` looks for an opening fence line whose first word is a past block label. A fence line counts as old-named when:
  - after any indent, it may start with list or quote markers before the fence: `-`, `*` or `+` and a space, a number followed by `.` or `)` and a space, and `>` (repeated for nested quotes, with or without spaces between), in any combination;
  - then comes ```` ``` ````, optional spaces or tabs, and a past label as a whole word in any letter case (`collaborator` and `Collaborator` count, `collaborators` and `collaborator-notes` do not);
  - and anything may follow the label on the same line (```` ```collaborator json ````);
  - lines may end in LF or CRLF.

  The block need not be closed. If there is one, the whole paste is refused with 400 and the `old` sentence ("that answer is in an older format: copy the instructions again and ask the AI for a new answer"). Nothing in the paste is read, so the loose fallback never runs over it.
- **A paste that mixes** an ```` ```objects ```` block with an old-named block is refused as a whole, with the same sentence. Nothing from its ```` ```objects ```` block is imported. Reading half an answer without saying so would lose objects quietly. The sentence tells the person what to do, and a fresh answer gives them all of it.
- **Where the past labels live.** `server/file-format.js` exports `PAST_BLOCK_LABELS`, a frozen list of the two labels ever published: the old product name and the current default. It is the only place in the code where they are written, and it has one allow-list entry for the guard (below). The comment above it says what the list is for, that it must never grow (no block label is named by product again, per decision 10), and points here. Of the ways to know the old labels, this is the only one that holds. Shape cannot tell them apart, because a fence label is a bare word (and after QA's F4, the markers are recognised from this same list, not by shape). They cannot be derived from `DEFAULT_PRODUCT_NAME` either. The current-product label would stop being recognised the day the default changes, the older one was never the default in this code, and deriving from a configured name would make one install refuse a word that another install reads.
- The loose fallback (any JSON object with a `title` anywhere in the text) is unchanged. It runs when there is no ```` ```objects ```` block and no old-named block, so it still reads a paste that lost its fences.
- The nothing-found sentence ends "paste the whole answer, with its objects blocks".
- `instructions(noun)` tells the AI to use ```` ```objects ```` and, for a file, `<something>.objects.json` holding `{"format":"objects","formatVersion":1,"objects":[...]}`. It still names the product (`productName()`), which is a sentence a person's AI reads, not an identifier.
- `schema()`: the file definition requires `format` (`const: "objects"`), `formatVersion` (`const: 1`) and `objects`. The description says `.objects.json`. **`$id` is left out** (see Choices made in writing this, 1).
- `GET /api/objects/format` keeps its field names and answers `fence: "objects"`, `fileSuffix: ".objects.json"`.

### The /ai rule

- `SUMMARY_RULE` (`server/ai.js`) asks for ```` ```objects ```` blocks through the same `objectRule`, and calls each one an "object" instead of a "card", matching the Names (never "card").
- `parseSummaries` takes blocks labelled `objects`, `summary`, `json` or nothing; `card` and the product-named label go. `summary`, `json` and the bare fence stay as tolerances for a model that labels its block loosely; none is a product name.
- The comment above `SUMMARY_RULE` is rewritten to match.

### The leftovers

- **`APP_REVISION`.** The Dockerfile sets `ENV APP_REVISION=$GIT_SHA`; `server/index.js` reads `APP_REVISION` (default `dev`) for `VERSION`. `TAVERN_REVISION` is not read: only the Dockerfile ever set it, so there is nobody's configuration to keep.
- **User-agents.** `server/link-preview.js` sends `user-agent: <product>/<version>` (for example `Collaborator/0.4.0`), from `productName()` and `package.json`'s version. `server/geocode.js` sends the same, followed by the repository address in brackets so the service can identify and reach the app: `<product>/<version> (+https://github.com/Drowbe/coffee-pub-collaborator)`. The repository name is out of scope (decision 3) and is allow-listed as such. One small function (in `server/product-name.js`, next to the name) builds the string, so the two cannot drift.
- **The default name, once.** `server/product-name.js` exports `DEFAULT_PRODUCT_NAME = 'Collaborator'` beside `productName()`; `server/index.js` defaults `PRODUCT_NAME` from it. That line is the only place the default is written, and its comment says so. `branding()` and the host console's settings already carry `productName`.
- **The pages start empty.** `public/brand.js` and `public/host-templates.js` start `product` as `''` and fill it from branding (the host console's settings for the latter); `public/host.js` uses `settings.productName` with no fallback; `public/host.html`'s `template-shipped-by` span starts empty and `host.js` fills it; `public/landing.html`'s `data-product` span starts empty and fills from branding (decision 12). A sentence built before branding answers is not shown; each page's first render already waits for branding or settings, which experience-design confirms per page.

### The guard

`oldProductNameCheck` in `tools/check-names.mjs` becomes `productNameCheck`:

- **Names:** the default product name, read from `server/product-name.js` (`DEFAULT_PRODUCT_NAME`, never repeated in the check), plus `magpie` and `tavern`, matched case-insensitively anywhere in a line and in file and folder names. "Coffee Pub" alone is not a product name and is not matched (decision 4).
- **Where:** every file under `server/`, `public/`, `modules/`, `tools/` and `templates/` with the extensions the current check reads, plus `Dockerfile`. Comments included, as now: a comment can say "the product".
- **Exemptions:** entries in `tools/check-names-allow.json` with `"level": "product-name"`, a `file` glob, a `pattern` for the line and a `reason`, the same shape as the other entries. An entry that matches nothing is reported, as the other levels' are. The entries expected, each to be confirmed by running the check:
  - `server/migrate-names.js`, `tools/check-names.mjs`, `tools/fixtures/names-v1/**`: already exempt for the Names migration and the check itself.
  - `server/auth.js` `tavern_session`, `server/store.js` and `server/index.js` `tavern.json` and the `'Coffee Pub Tavern'` sentinel, `public/brand.js`'s `tavern.*` key move, `server/index.js`'s `TAVERN_AI_KEY` and `REMOVED_CONFIG_NAMES`: read-once migration of what installs stored or were configured with.
  - The checks that prove those migrations (`tools/check-ai.mjs`, `tools/check-host-registry.mjs`).
  - `server/product-name.js`'s `DEFAULT_PRODUCT_NAME` line: the one definition.
  - `server/file-format.js`'s `PAST_BLOCK_LABELS` line: the labels an old answer was fenced with, known only so it can be refused (decision 11). One entry for that line, nothing wider.
  - The repository address (`coffee-pub-collaborator` in a `github.com/Drowbe/` or `ghcr.io/drowbe/` address), anywhere: decision 3.
  - `tools/fixtures/format-old/**`: the files as they were before this change, kept old on purpose so the checks can prove they are refused. This and `PAST_BLOCK_LABELS` are the only places the old names are written down: the fixtures for the checks, the list for the code.
- **A made-up product name.** The checks whose assertions contain a sentence with the product in it (`check-themes`, `check-templates`, `check-template-switch`, `check-object-format`, `check-link-preview`, `check-geocode` and any other the guard turns up) set `PRODUCT_NAME=Testname` for the code they load or the server they start, and build the expected sentence from the same value. A sentence that hard-codes the default then fails its check, which the text guard alone cannot see, because a hard-coded default and the configured default read the same.

### Fixtures

In `tools/fixtures/object-format/`: `collaborator-array.txt` becomes `objects-array.txt`, `three-collaborator.txt` becomes `three-objects.txt`, `one-card.txt` becomes `one-object.txt`, each fenced ```` ```objects ````; `file-ok.json` and `rendered-view.txt` take the new marker and fence. New in `tools/fixtures/format-old/`: an old theme file, an old template file and an old objects file for each past label, and old answers: one fenced with each past block label, one with a past label in capitals and left unclosed, one with more words after the label (```` ```collaborator json ````), one inside each of a `-` list, a `*` list, a numbered list, a quote and a nested quote, one indented with CRLF line ends, and one mixing an ```` ```objects ```` block with an old-named block. Beside them in `tools/fixtures/object-format/`: `no-fences.txt`, an answer whose fences were lost, which the loose fallback still reads; `related-key.json`, an object with a key such as `relatedObjects` holding a number, which is read as an object; and a label that only starts with a past label (```` ```collaborators ````), which is not refused as old-named.

### Modules

No bundled module reads a fence or a marker. The Assistant's `design/assistant.css` names the old product in its opening comment; the comment is reworded and the Assistant's version goes up by a patch (`modules/assistant/module.json` and `tools/module-versions.json`). Any other module the guard catches gets the same.

## Left to build, in order

1. **The formats (server-development).** `server/file-format.js`; the theme, template and objects readers and writers; the file names; `POST /api/host/themes/check`; `GET /api/objects/format`'s values; the schema; `PAST_BLOCK_LABELS` and the old-named block refusal in `readObjects`; the `/ai` rule and `parseSummaries`; the fixtures, renamed and added; `check-themes`, `check-templates`, `check-template-switch`, `check-object-format`, `check-ai` and `check-origin` updated. Done when those checks pass with the new names and `check-object-format` proves these cases: each old file is refused with its `old` sentence; a theme or template file with an unknown `xxxTheme` or `xxxTemplate` key gets the "not a … file" sentence; an unknown `xxxObjects` key gets it only when the text also has `format` or `formatVersion` (otherwise the text is not taken for a file and is read as an object, as `related-key.json` is); each old-named answer is refused with 400 and the "copy the instructions again" sentence, contents valid or not, closed or not, in any letter case, with words after the label, inside a list or a quote (nested too), indented, with CRLF, and no object from it is returned; a label that only starts with a past label is not refused as old-named; the mixed answer is refused as a whole; an ```` ```objects ```` answer and `no-fences.txt` are read; a ```` ```card ```` answer is read only through the loose fallback. Also that `POST /api/spaces/:id/objects/check`, the route the chat's paste detection calls, answers the same refusal for an old-named answer, so the chat shows no "Bring in" button for it.
2. **The leftovers, server side (server-development).** `APP_REVISION`; the user-agent function and its two callers; `DEFAULT_PRODUCT_NAME` and `server/index.js` reading it; `check-link-preview` and `check-geocode` asserting the header. Done when those checks pass and `docker build` sets `APP_REVISION` (checked by reading the built image's environment, if Docker is available; otherwise read as code).
3. **The pages (experience-design).** The template editor's theme picker asking `POST /api/host/themes/check`; `product` starting empty in `public/brand.js` and `public/host-templates.js`; `public/host.js` and `public/host.html` without the default; `public/landing.html`'s `data-product` span starting empty; the Assistant's comment and version. Done when no page file writes the default name or a placeholder for it and `check-module-versions` passes.
4. **The guard (server-development).** `productNameCheck`, its allow-list entries, and `PRODUCT_NAME=Testname` in the checks named above. Built last so it passes on arrival. Done when `npm run check` passes (apart from the two root-only `--migration` cases in a cloud container, see CLAUDE.md) and each allow-list entry has a reason and a hit.
5. **Quality-assurance.** Runs every check; plants the default name in a sentence, an identifier and a file name, and `magpie` and `tavern` once each, and confirms the guard fails each; exports a theme and a template and imports them back; imports each old fixture through the routes, and a theme file with an unknown `xxxTheme` key; pastes an answer with an `objects` block, one with a `card` block, one with each old-named block, a mixed one and a fence-less one into the chat's import, and confirms only the first, the second and the last are offered; picks a good and an old theme file in the template editor.
6. **The documents (content-manager).** Corrects the #110 entry in `CHANGELOG.md` and adds this change's entry; brings in line the documents that name the formats (at the time of writing: `api/api-module-sdk.md`, `api/api-modules.md`, `architecture/architecture-environments.md`, `architecture/architecture-overview.md`, `designsystem/design-theme.md`, `userguides/userguide-assistant.md`, `userguides/userguide-chat.md`, `userguides/userguide-templates.md`, `userguides/userguide-themes.md`, and the plans `plan-environment-templates.md`, `plan-research-import.md` and `plan-themes.md`, the plans' parts by product-planner; search again when the step starts). `plan-modules.md`'s "The host is not the brand" is still right about the host but says nothing of formats: product-planner adds one sentence extending it to identifiers named by kind, pointing here.

## Verify

- Steps 1, 2 and 4 are checked by tool: the checks named in each step, then `npm run check`.
- Step 3 is checked by tool (`check-names`, `check-module-versions`) and, for the theme picker, in a browser on the local server if quality-assurance has one; otherwise it is read as code, and the report says which.
- The `APP_REVISION` value in a published image can only be seen once the image is built by the release workflow.
- Nothing here touches a call, so no step needs LiveKit.

## Choices made in writing this

Thomas did not decide these; each is open to change.

1. **The schema has no `$id`.** Nothing refers to the schema by its `$id`; it is served at `GET /api/objects/format/schema` and inlined in `GET /api/objects/format`. An invented URN (`urn:objects-format:1`) would be one more name to keep for no reader.
2. **Old markers are recognised by exact past name, built from `PAST_BLOCK_LABELS`** (amended 2026-09-30 after QA, F4, approved by Thomas). As first written, this choice recognised them by shape, any `/^[a-z]+Kind$/` key, so that no old product name would be in the code at all. QA found that refused real objects such as `{"title":"A","relatedObjects":3}`. The markers are still never written out as names: each is built from the one list and the kind.
3. **A new host route checks a theme file** for the template editor. The alternative is for the page to keep the file as it is and let Save refuse it, which needs no route but tells the admin later.
4. **The `/ai` rule calls a block an "object"**, not a "card", following the Names; `summary`, `json` and the bare fence stay accepted.
5. **The geocoder's user-agent carries the repository address** so the service can reach whoever runs it.
6. **The guard reads comments too**, as the current one does.
7. **A JSON object counts as an objects file only when it says so** (`format === "objects"` or a `formatVersion`), so a single object with a `format` field of its own is still read as an object.

Made after Thomas's answers, carrying out decision 11:

8. **The past block labels are listed, once.** They sit in `PAST_BLOCK_LABELS` in `server/file-format.js`, with one allow-list entry, rather than being derived from `DEFAULT_PRODUCT_NAME` (the reasons are in the contract, under Objects files and blocks).
9. **A mixed paste is refused as a whole**, rather than its `objects` block read and the old block dropped.
10. **An old-named block counts from its opening fence**, closed or not and in any letter case, so a cut-off old answer is refused too. Widened 2026-09-30 after QA (F4), approved by Thomas: more words after the label, and a fence inside a list or a quote, count as well.

## What is not decided

Nothing that blocks the build. Thomas settled the three open questions on 2026-09-30 (decisions 10 to 12).
