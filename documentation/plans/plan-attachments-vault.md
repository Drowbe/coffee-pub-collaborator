# Attachments and Vault Plan

**Audience:** Thomas decides what objects take files, who may see them, and what the Vault is. server-development builds
the store, the routes, the permission rules and the checks; experience-design builds the design-system pieces, the SDK,
each module's use of them and the Vault; quality-assurance reviews the permission step as a security change;
content-manager documents.

**Status:** draft for Thomas, 2026-10-15; nothing decided, nothing built. From three GitHub issues:

- #252, Thomas, 2026-10-13: "We need to support attachments for our research, planner, notes, etc."
- #253, Thomas, 2026-10-13, from user feedback: "'research' implies 'planning' and the user struggles to see its value
  once things are booked. They suggest a wallet (for tickets, passports, etc.) (or a rename)."
- #232, the Chrome extension that sends a page, a selection or a ticket into a trip. It may later feed attachments;
  this plan names only the hooks it would need.

Related: #64 (integration tokens, which the extension needs), #211 (a published view of a trip, which must never show
an attachment), #221 (Chat's name, the same naming pass as Research's), #132 (the document editor; no overlap: files
are not prose), [plan-object-handoff](plan-object-handoff.md) (the objects format, Send to..., the upload sweep),
[plan-object-status](plan-object-status.md) (a status of `confirmed`, approved, not built) and
[plan-design-system](plan-design-system.md) (every piece of UI comes from the system).

## What it is today

All of this is read as code only.

### Module uploads (`server/module-uploads.js`, `server/index.js` "files a module's people upload")

- A module opts in with `uploads` in `module.json` (`types`, `maxBytes`, `maxFiles`). Only Research does:
  JPEG, PNG and WebP, 10 MB a file, 500 files a place (`modules/research/module.json`).
- Files live per module and per scope: `DATA_DIR/modules/<id>/uploads/<environment | space-<id> | person-<key>>/`,
  each as `<fid>.bin`, an optional `<fid>.thumb` made by the page, and `<fid>.json` (name, type, size, `by`, `at`, a
  photo's taken time, camera and position). The file id is 24 random hex characters.
- Only pictures can be kept. `express.raw` accepts only the three image types up to 10 MB, and `cleanImage`
  (`server/image-clean.js`) decides the type from the bytes, never from the name or header, and strips what rides along
  (position unless asked to keep it).
- **Reading follows the module's own `read` permission.** `uploadAccess` is `moduleAccess` plus "this module keeps
  uploads". Research's `view` is on for guests by default (`"guest": true`), so a guest in a space can list and open
  Research's photos today. The Planner's `view` is on for guests too.
- Serving: `GET /api/modules/:id/uploads/:fid` sends the bytes inline with `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy: sandbox; default-src 'none'` and `Cache-Control: private, max-age=3600`. The module page
  gets a same-origin, session-checked address (`host.uploads.url` in `public/module-host.js`), used as an `img` source.
- Removing: the uploader or someone with owner rights. A module removes the file when it removes its object; nothing
  sweeps an upload whose object is gone, except Send to...'s seven-day sweep of pictures that never arrived
  (`server/environment.js`). That sweep's activity line names the file ("removed a picture sent to it that was never
  added (<name>)").
- **Deleting a space does not delete its module uploads or module data.** `DELETE /api/spaces/:id` forgets settings,
  chat, attention and facts, but `space-<id>` folders under each module stay on disk. For photos that is untidy; for
  passports it would be a privacy defect. This is a defect today, separate from this plan, for bug-fixes.
- Limits: the `upload` rate limit per module and person (`overLimit`), and on a hosted install the plan's storage cap
  (`checkStorageCap`, `planCap('storageBytes')`). There is no per-space quota.

### Other large files

- `MAP_IMAGE_MAX_MB` (default 100) bounds a picture map an owner uploads. Its comment gives the reason this plan
  shares: a backup and a restore carry the environment's whole folder, and the restore is read into memory with a
  500 MB limit (`rawHostZip`), so files kept in `DATA_DIR` must stay well under it.
- Backups: the host console's backup and an owner's export (`GET /api/environment/export`) zip the environment's data
  folder in memory. Anything stored under it is backed up, unencrypted.

### Objects that would take files

- **Planner** (`modules/travel`, space scope): journeys, stays and stops, each with notes and a booking reference
  (`confirm`). Its **Bookings** view already lists "the stays and journeys with their reference codes, in date order"
  (`renderBookings` in `travel.js`). There is no status yet: [plan-object-status](plan-object-status.md) is approved and
  unbuilt.
- **Research** (space and person scope): notes, links, photos. "Notes" in Thomas's words are Research notes and the
  Planner's notes; there is no separate notes module.
- **To-do**, **Calendar**, **Budget** (an expense's receipt is the obvious case), **Places**.

### Where an object's words travel

An object's summary (`objectSummary` in `server/index.js`) feeds `objects.resolve`, `objects.search`, the links, a
dragged object, the AI's context, the published calendar and each person's calendar feed (ICS), the facts on the
status strip, attention, notifications and the objects format's export. Anything put into a summary reaches all of
these. Guests read summaries where the module's `view` lets them; the OBS access key reads only a module with a keyed
page (Stream).

### The design system

[plan-design-system](plan-design-system.md) is decided: pages and modules use only components in the system, and a
missing one is added to the system first, after Thomas agrees it is needed. None of the pieces this plan needs exists
yet as a component: a file chip, an attachment list, an upload drop zone, a preview.

## Decisions

None yet. This section will hold Thomas's decisions, in his words, as he makes them.

## Proposal

What follows is the draft contract, built on the lean in each open question below. Where a choice is still open, the
text says "if decided as recommended".

### 1. One mechanism for every object (open question 1)

Attachments are a host service, like summaries and links, not a wider kind of module upload. A module opts in per kind
of object; the server stores, checks and guards the files; one SDK component draws them. Reasons: one permission rule
for every module (the module-uploads rule lets guests read), one place for the Vault to read, one place to audit.

- **Manifest:** `attachments` in `module.json`, listing the object kinds that take files:
  `"attachments": { "kinds": ["plan"] }`. Each kind must be one of the module's `refs.produces` kinds, so the server can
  resolve the object from the module's data (as `objectSummary` does). Install refuses an unknown kind.
- **The object's own data holds nothing.** The attachment record names its object (`module`, `kind`, `id`); the module
  stores no file ids. So no module data migration, and an attachment cannot be orphaned by a module forgetting to clean
  up: the server sweeps (section 5).
- **Research photos stay as they are.** They are Research's own uploads, shown as photos; they are not attachments.

### 2. Files: types, sizes, checks

**Types**, decided from the bytes, never the name or the header:

| Type | Sniffed by | Kept as | Preview |
|---|---|---|---|
| PDF | `%PDF-` at the start, `%%EOF` near the end | the bytes as sent | none in the first build (open question 6) |
| JPEG, PNG, WebP | `cleanImage`, as today | cleaned: metadata and position removed, always | the image, made smaller by the page |

- Nothing else in the first build: no SVG, HTML, XML, Office files (macros), archives, executables, scripts. HEIC and
  Apple Wallet passes (`.pkpass`, a signed zip) are open question 5.
- **Active content in a PDF.** The server refuses a PDF whose bytes hold `/JavaScript`, `/JS`, `/Launch`,
  `/EmbeddedFile`, `/RichMedia`, `/XFA` or `/AcroForm` with an action, with the words "That PDF has scripts or embedded
  files in it, so it can't be kept here. Print it to a new PDF and add that." This is a byte scan: a name hidden inside a
  compressed object stream passes it, so it is a filter, not a guarantee. The download headers (section 4) are the
  real guard.
- **The allowed list is in code; the sizes are in the environment.** An environment variable may narrow the types, never
  add one the server cannot sniff:

| Variable | Meaning | Default when unset or not a number above 0 |
|---|---|---|
| `ATTACHMENT_MAX_MB` | the most one file may weigh | 20 |
| `ATTACHMENT_SPACE_MAX_MB` | the most all attachments in one space may weigh | 200 |
| `ATTACHMENT_ENVIRONMENT_MAX_MB` | the most all attachments in one environment may weigh | 400, under the restore's 500 MB |
| `ATTACHMENT_TYPES` | a comma list narrowing `pdf,jpeg,png,webp` | all four |

  A hosted plan's storage cap still applies on top. Each limit refuses with its own sentence and status (section 4).
  A single-environment install with none of them set behaves as before for everything that exists today.
- **Names.** The name a person sees is kept in the record, cleaned to one line of at most 100 characters with path
  separators and control characters removed; the extension is set from the sniffed type ("ticket.exe" sent as a PDF is
  kept as "ticket.pdf"). On disk a file is only its random id.
- **Replace** keeps the attachment's id, its object and its visibility, overwrites the bytes, and keeps no old version.
  Reason: an old passport scan is a liability, not a history. The record gains `replacedAt`.
- **Virus and abuse.** The server never opens, renders or runs a file, so the risk is to the person who downloads it.
  No scanner is bundled. A later variable, `ATTACHMENT_SCAN_SOCKET` (a ClamAV daemon), is noted, not planned. The
  existing `upload` rate limit applies per person.

### 3. Who may see an attachment

**The rule:** an attachment is shown, listed or counted only to a signed-in person who can read its object, and only
within its visibility. Everyone else gets nothing, not a count, not a name.

- **Never:** a guest (in any role set, whatever the module's `view` says); the OBS access key or any keyed page; the
  published calendar, the calendar feeds, the published view of #211 when it exists; the AI; the objects format's
  export; Send to... and Chat. A guest asking gets 404, as if there were no such file.
- **Visibility**, per attachment (open question 3), set by the person who adds it and changed only by them:

| Stored value | Words | Who sees it |
|---|---|---|
| `space` | Everyone on this trip (the space's word) | members of the space (and owners) who can read the object |
| `me` | Only me | the person who added it; not an owner, not an admin (open question 4) |

  A third value, `people` (chosen members of the space), is left for later; the stored field takes new values without
  a migration.
- **Default:** `space` on a Planner, Research, To-do or Calendar object; `me` for a personal document in the Vault.
- **Reading the object** means: a member of the space or someone with owner rights, the module on in that space and
  available to the person (`moduleSpaceAccess`), the module's `read` permission, and the object still resolving.
- **No listing leaks.** An attachment's name, type, size and count never go into a summary (`objectSummary`), search,
  links, facts, attention, notifications, the activity list, the AI's context, chat, or any export of objects. A module
  page asks for the attachments of an object it is drawing, and the answer holds only what that person may see.
- **Routes, not signed addresses.** Every read is a session-checked route on the same origin, as module uploads are.
  No signed, short-lived address is made: such an address works for whoever holds it, and ends up in history, logs and
  shared screenshots. A future integration token (#64) or offline copy would be its own decision.
- **The activity list** gets a line without the file's name or the object's title: "added an attachment to a Planner
  object", "removed an attachment". Changing visibility is noted the same way.
- **Encryption at rest** is open question 7. Without it, a file is plain on the server's disk and in every backup, and
  anyone with the server or a backup can read it. The Vault's personal documents should not ship until it is decided.

### 4. The contract: routes

All under the space, so the space and membership are checked first. `<object>` is `<module>:<kind>:<id>`.

| Route | Does | Answers |
|---|---|---|
| `POST /api/spaces/:id/attachments?object=<object>&name=<name>&visibility=space\|me` | the file as the raw body | 201 `{ attachment }`; 400 a type it can't take or an active PDF; 403 not allowed or not on this object's kind; 404 no such object (to a guest, always); 413 over `ATTACHMENT_MAX_MB`; 409 over a space or environment total; 429 the rate limit |
| `GET /api/spaces/:id/attachments?object=<object>` | the attachments of one object the person may see | `{ attachments: [view] }` |
| `GET /api/spaces/:id/attachments` | every attachment in the space the person may see (the Vault) | `{ attachments: [view] }`, each with its object's summary as the person may see it |
| `GET /api/spaces/:id/attachments/:aid` | the file, as a download | the bytes, headers below; 404 when not allowed |
| `GET /api/spaces/:id/attachments/:aid/preview` | an image's smaller copy, inline | image bytes; 404 for a PDF or not allowed |
| `PUT /api/spaces/:id/attachments/:aid/preview` | the page's smaller copy of an image it added | as Research's thumbnail today |
| `PATCH /api/spaces/:id/attachments/:aid` | `name`, `visibility` | the person who added it; 403 otherwise |
| `PUT /api/spaces/:id/attachments/:aid` | replace the bytes | the person who added it; the same checks as adding |
| `DELETE /api/spaces/:id/attachments/:aid` | remove | the person who added it, or owner rights (for a `me` file: remove without seeing its name) |

`view` is `{ id, object, name, type, size, pages?, by, at, replacedAt?, visibility, hasPreview }`, `by` as the
person's display name. `pages` is a PDF's page count when it can be read cheaply, else absent.

**Download headers**, on every file sent:
`Content-Type` (the sniffed type), `Content-Disposition: attachment; filename="<ascii name>"; filename*=UTF-8''<name>`,
`X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`,
`Cache-Control: private, no-store`, `Cross-Origin-Resource-Policy: same-origin`, `Referrer-Policy: no-referrer`.
A preview is the same with `inline` and `private, max-age=300`.

**Storage:** `<environment's data folder>/attachments/space-<id>/<aid>.bin`, `<aid>.preview`, `<aid>.json`
(`{ id, module, kind, objectId, name, type, size, sha256, pages, by, at, replacedAt, visibility }`). Inside the
environment's folder, so backups and exports carry it, and the environment total keeps them restorable.

### 5. Deletion, orphans, retention

- **With the object.** A daily sweep removes attachments whose object no longer resolves from the module's data, and
  those whose module is removed from the environment. A module turned off in a space keeps them (turned back on, they
  return).
- **Added but never attached:** none; the route needs a resolving object.
- **With the space.** `DELETE /api/spaces/:id` removes `attachments/space-<id>/` at once. (The same gap for module
  uploads and data is the separate defect above.)
- **With a person.** Removing a person from the environment removes their `me` files everywhere; their `space` files
  stay with the trip, shown as added by "someone who left".
- **No retention period** beyond these: a file stays until removed. Owners see the totals per space on Manage, never
  names.

### 6. The SDK and the design system

- `host.attachments.list(object)`, `.add(object, file, { visibility })`, `.replace(id, file)`, `.set(id, { name,
  visibility })`, `.remove(id)`, `.open(id)` (the download), `.preview(id)` (an address for an image's preview),
  `.all()` (the Vault). Each goes through the bridge, as `host.uploads` does.
- `host.ui.attachments(el, { object, canAdd })`: the whole attachment list for one object, drawn from the system, so a
  module adds one line to show and add files.

The design system needs these, each added to the registry, after Thomas agrees, before a module uses it:

| Component or pattern | What it is | Built from |
|---|---|---|
| File chip | a type icon (PDF, image), the name, the size, a visibility marker (`lock` for Only me), a more button with Open, Rename, Who can see it, Replace, Remove | chip, more button, menu |
| Attachment list | an object's file chips in a row that wraps, with **Attach** (`paperclip`) and an empty state | file chip, button, empty state |
| Upload drop zone | a drop target and a **Choose a file** button, the allowed types and size in words, progress, and the refusal in an error line | button, error line, a progress state |
| Preview | an image's preview in a file chip, and a sheet that shows it larger with Download | sheet, button |
| Visibility choice | Everyone on this trip, or Only me | choice (form standard) |

New icons for the icon list: `paperclip` (Attach), `file-pdf`, `file-image`, `file`, `lock` (Only me), `download`,
`passport`, `shield` (insurance). Colours from the theme tokens; state and kind as fills, never a coloured edge.

### 7. The Vault (open questions 8 to 10)

**What it is:** one place for what a traveller needs once things are booked: tickets, confirmations, passports,
insurance. It is a view, not a second store:

- **Booked:** each Planner journey, stay and stop that is booked, in date order, with its reference, its times and its
  attachments. "Booked" is a status of `confirmed` once [plan-object-status](plan-object-status.md) is built; until
  then, an object with a booking reference (open question 10).
- **Documents for this trip:** every attachment in the space the person may see, on any object, grouped by module.
- **Mine** (later step, after encryption is decided): the person's own documents (passport, insurance, a driving
  licence), kept in person scope, across all their trips, `me` only, with a way to show one on this trip's Vault.

It reads only through existing paths: `GET /api/spaces/:id/attachments` for files, `objects.search` with summaries for
booked objects (the same summaries that carry `confirmed`), and a booked object's **Open** uses the object handoff's
open, which brings the Planner forward on that object. It writes nothing of its own except personal documents.

**A module or a view?** If decided as recommended, a small new module, `vault` (space and person scope), with its
shown name from the template. The alternative, a view in the Planner (its **Bookings** view already has most of the
booked part), cannot hold personal documents (the Planner has no person scope), and puts files from Research and
To-do into the Planner.

**Phones and no signal.** The Vault is built for a phone first: one column, large file chips, **Download** on each.
Working offline (a cached copy for an airport with no signal) is out of scope: caching passports on a device is its own
privacy decision and its own plan. Until then the words say "Download the files you need before you travel."

**Research's name.** If decided as recommended, Research keeps its id and is not renamed to Vault: they hold different
things (what a group finds while it plans, and what a traveller carries). A shown-name change for Research belongs with
#221's naming pass and the templates' themed names, which change no code.

### 8. The Chrome extension (#232), hooks only

Not planned here. It would need: an integration token (#64) with a scope that allows adding attachments to spaces its
person may write to; the same `POST .../attachments` route accepting the token; and a target, either an object or a
Vault "to sort" list of unattached files (which this plan does not have, so it would be a decision then). Nothing in
this plan stands in its way.

## Left to build, in order

Each step is a try build unless marked, checked on its own. Every bundled module whose files change gets a patch bump in
`module.json` and `tools/module-versions.json`, higher than the version installed in Thomas's environment, or Manage will
not install the new files.

| # | Step | Agent | Kind |
|---|---|---|---|
| 1 | `server/attachments.js`: the store, the type sniffing and PDF scan, the name cleaning, the limits from the environment, the totals; no routes. `tools/check-attachments.mjs` in `npm run check` | server-development | try build |
| 2 | The routes, the permission rule, the headers, the manifest's `attachments`, delete with the space and the person, the daily sweep, the activity lines; the check extended with the permission matrix | server-development | **feedback build with a QA security review** |
| 3 | The design-system pieces (file chip, attachment list, upload drop zone, preview, visibility choice) and icons on the design system page, after Thomas agrees to each; needs that plan's page (its steps 3 to 6) | experience-design | try build |
| 4 | `host.attachments` and `host.ui.attachments` in the SDK, through the bridge | experience-design | try build |
| 5 | Planner: `attachments` on its plan kind, the list in the editor and on each object, on the **Bookings** view; version bump | experience-design | try build |
| 6 | Research notes; then To-do tasks, Calendar events and Budget expenses as Thomas chooses; one bump each | experience-design | try build each |
| 7 | The Vault module, Booked and Documents for this trip; new module at 0.1.0 | experience-design | try build |
| 8 | Encryption at rest, if Thomas chooses it | server-development | feedback build with QA |
| 9 | The Vault's Mine (personal documents in person scope); Vault bump | server-development, experience-design | feedback build with QA |
| 10 | Documentation: api-modules (`attachments`, the routes), api-module-sdk, architecture-modules (storage), the Planner, Research and new Vault user guides, the environment variables, the CHANGELOG | content-manager | after each step |

## Verify

- **Checked by a tool** (`tools/check-attachments.mjs`, a throwaway server with stand-in modules):
  - step 1: each type kept from its bytes and refused under a false name; a PDF with each active-content name refused;
    an SVG, HTML and a zip refused; a renamed `.exe` kept with the sniffed extension; each limit from its variable and
    its default when unset or not a number; totals per space and environment;
  - step 2: the permission matrix, every cell: a guest, the access key, a signed-in non-member, a member without the
    module's `read`, a member with it, the adder, an owner, for `space` and `me`, on list, download, preview, rename,
    replace and remove; a refused read is 404 and lists nothing; every download header present; summaries, search, the
    published calendar, a calendar feed, facts and the activity list hold no file name after an add (a planted name is
    searched for in every answer); delete with the space and the person; the sweep after the object is removed;
  - steps 5 to 7: the modules' checks (`check-travel`, `check-research`, `check-modules`, `check-module-versions`).
- **Verified live in a browser on a local server, no LiveKit needed:** adding, opening, renaming, replacing and removing
  a PDF and a photo on a Planner object in its own page; Only me hidden from a second member in another browser; a
  guest link seeing no attachments; the Vault at 390 pixels. A module inside a space's canvas needs the call service
  and is read as code only.
- **Only Thomas can verify:** the bumped modules installing in his environment; a real ticket PDF and a passport photo
  from his phone, downloaded on iOS and Android (what the phone does with `attachment` downloads); backup and restore
  of an environment holding real files on his host; the hosted storage cap.
- **QA's security review of step 2** reads the routes against the matrix, tries path and id tricks, a wrong content
  type, a huge body, and the headers in a real browser (a PDF and an image never run or render as a page).

## Risks

- **Permission drift.** A later summary field, export or AI feature that walks objects could pick up attachments. The
  step 2 check plants a name and searches every answer; new features keep it passing.
- **Backups grow.** Files go into the in-memory backup and the 500 MB restore. The environment total keeps it under;
  a streamed backup is its own work if Thomas wants larger totals.
- **PDF active content.** The byte scan misses hidden names; the headers stop the browser running anything, but a
  person's own PDF reader opens the download. The proposal adds no warning on the drop zone; the refusal sentence is
  the only word about it.
- **Owners cannot open Only me files.** Good for privacy, and it means an owner cannot see what is in a file that may
  be abusive; they can remove it.
- **Unencrypted until step 8**, including in backups. Personal documents wait for that decision.
- **Space deletion today leaves module uploads and data behind** (above): fixing it is a separate defect for bug-fixes,
  and it matters more once people trust the product with documents.

## Assumed

- The server can resolve an object from its module's data for any `refs.produces` kind, as `objectSummary` does;
  server-development confirms in step 2.
- A moderator is treated as a member for attachments.
- Phones' photo pickers send JPEG for a HEIC photo in most cases (iOS Safari converts on upload); to be seen on Thomas's
  phone.

## What is not decided

The questions, in the order they need answering. Questions 1 to 4 block step 2; 5 to 7 block their own steps; 8 to 10
block step 7.

1. **One mechanism for every object, or each module's own uploads widened?** Lean: one host service (section 1).
   Widening module uploads is cheaper but keeps its rule that guests read what the module's `view` allows, and gives the
   Vault nowhere to read.
2. **Which objects take files first?** Lean: Planner objects and Research notes, then To-do, Calendar and Budget
   (receipts) one at a time.
3. **Visibility: Everyone on this trip and Only me, or also chosen people?** Lean: the two first, default Everyone on a
   trip's objects and Only me for personal documents; chosen people later.
4. **May an owner or admin open someone's Only me file?** Lean: no; they may remove it and see totals, never the name
   or the bytes.
5. **File types beyond PDF, JPEG, PNG and WebP:** HEIC, Apple Wallet passes? Lean: not in the first build; a refusal
   that says "Save it as a JPEG or PDF".
6. **PDF preview:** a file chip with an icon and page count, or a first-page picture drawn by a PDF library kept under
   `public/sdk/` (as #132 would keep ProseMirror)? Lean: the icon first; the library later if people ask.
7. **Encryption at rest:** none, an optional server key in an environment variable (protects disks and backups, not a
   person with the server), or per-person keys (lost password, lost files)? Lean: the optional server key, built before
   personal documents (step 8).
8. **The Vault: its own module, or a view in the Planner's Bookings?** Lean: its own module (section 7).
9. **Its shown name, and Research's:** Vault or Wallet for the new module (the issue says VAULT, the user said wallet),
   and does Research keep its name? Lean: id `vault`, shown name chosen per template (Wallet for travel reads as what a
   traveller carries); Research keeps its name and is reviewed with #221.
10. **What counts as booked before object status is built:** a booking reference, or wait for status? Lean: a status of
    `confirmed`, or a booking reference while there is no status.
