# Vault Plan

**Audience:** Thomas decides what the Vault holds, who may see and share it, and what is still open below.
server-development builds the file store, the routes, the quotas, the share links and the checks; experience-design
builds the Vault module, its viewers, the share page, the SDK calls and the first module that links to a file;
quality-assurance reviews the store and the share links as security changes; content-manager documents.

**Status:** approved 2026-10-30 (decisions 1 to 7 of 2026-10-29, GitHub #380, and decisions 8 to 15 of 2026-10-30);
nothing built. Thomas calls it critical for post-trip sharing. One question is still his, the default for metadata
removal, and it blocks only that part of step 1. This plan replaces the attachments plan of
2026-10-15, which proposed a host attachments service with no module of its own; what stays of its four decisions is
under Decisions.

Where it came from, in Thomas's words where they exist:

- #380, Thomas, 2026-10-29: the Vault "needs to be its own module", for files in general, not only a traveller's
  documents: a linking system other modules use, sharing outside the app, a cloud service as a later option, many file
  types, "a server setting for where files are stored, since it will not be the application folder", and in-app
  viewers and players.
- #252, Thomas, 2026-10-13: "We need to support attachments for our research, planner, notes, etc."
- #253, Thomas, 2026-10-13, from user feedback: "'research' implies 'planning' and the user struggles to see its value
  once things are booked. They suggest a wallet (for tickets, passports, etc.)."
- #40, the Journal module: what happened on a trip, with images, read afterwards. Post-trip sharing is where the Vault
  matters most.

Related: #337 (deleting a space must delete its files), #211 (a published view of a trip, which must never show a file),
#64 (integration tokens), #232 (the Chrome extension), [plan-object-handoff](plan-object-handoff.md) (pointers, Send
to..., the upload sweep), [plan-realtime-optional-livekit](plan-realtime-optional-livekit.md) (chat pictures held in
memory; its step 8, stored chat pictures, is unbuilt), [plan-object-status](plan-object-status.md) and
[plan-design-system](plan-design-system.md).

## What it is today

Read as code only, 2026-10-29.

### Module uploads (`server/module-uploads.js`, `server/index.js` "files a module's people upload")

- A module opts in with `uploads` in `module.json` (`types`, `maxBytes`, `maxFiles`). Only Research does: JPEG, PNG and
  WebP, 10 MB a file, 500 files a place.
- Files live per module and scope under `DATA_DIR`: `modules/<id>/uploads/<environment | space-<id> | person-<key>>/`,
  as `<fid>.bin`, an optional `<fid>.thumb` made by the page, and `<fid>.json` (name, type, size, `by`, `at`, a photo's
  taken time, camera and position). The id is 24 random hex characters.
- **The whole file is held in memory.** `POST /api/modules/:id/uploads` uses `express.raw` with a 10 MB limit, then
  `cleanImage` (`server/image-clean.js`) decides the type from the bytes and strips what rides along (position unless
  asked to keep it). Serving reads the whole file and sends it (`sendUpload`): no range requests.
- **Reading follows the module's `read` permission**, and Research's `view` is on for guests by default, so a guest in a
  space can open Research's photos today.
- Headers on a served upload: the stored type, `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy: sandbox; default-src 'none'`, `Cache-Control: private, max-age=3600`.
- Removing: the uploader or someone with owner rights. The `upload` rate limit is 30 a minute per module and person
  (`server/module-limits.js`). On a hosted install the plan's storage cap applies (`checkStorageCap`).

### Chat pictures (`server/index.js`, "chat pictures")

- Never stored. `POST /api/spaces/:id/chat/pictures` takes PNG, JPEG, GIF or WebP up to `CHAT_PICTURE_MAX_MB` (3), sniffed
  from the first bytes (`chatPictureType`), held in memory for `CHAT_PICTURE_KEEP_MINUTES` (15), bounded per space,
  environment and server (30, 100, 200 MB) and by `CHAT_PICTURE_MB_PER_MINUTE` (20) per person. Each reader fetches the
  bytes with their own access. These bounds came from QA bringing a server to 2.6 GB with a handful of 3 MB pictures
  (#380, the lessons).

### What already streams

- `PUT /api/modules/:id/files/:folder` (a picture map, owner only) streams the body to a part file with a running count,
  refuses on `Content-Length` before reading, checks the file from its header, then renames it into place. It is the
  pattern the Vault's upload should follow.
- `GET /api/modules/:id/files/:name` serves a module's file with `res.sendFile` and `acceptRanges`, answering 416 for a
  range it cannot meet. It is the pattern the Vault's serving should follow.

### Deleting a space (#337)

`server/space-erase.js` now erases each module's data and uploads for a space (`moduleUploads.forgetSpace`), with
`tools/check-space-erase.mjs` failing on a per-space file it does not know. Read as code only; #337 is still open on
GitHub. The Vault adds its own step to that list.

### Backups

The host console's backup and an owner's export (`GET /api/environment/export`, hosted only) zip the environment's
folder in memory, and a restore is read into memory with a 500 MB limit (`rawHostZip`). Anything large kept under
`DATA_DIR` makes both fail.

### The module frame and its sandbox

A module runs in an iframe with `sandbox="allow-scripts allow-forms"`, an opaque origin and no `allow` attribute
(`public/module-host.js`). Two things follow for viewers: an element inside the frame cannot go full screen, and
browsers refuse their built-in PDF viewer inside a sandboxed frame. The SDK already has a safe Markdown renderer,
`host.util.markdown` (`public/sdk/host.js`): everything is escaped first, links are `http` and `https` only, no
pictures, no HTML.

### Templates

A template names modules with `moduleNames` (`templates/travel.json` shows the Planner as Itinerary;
`templates/games.json` shows Research as Lore). The travel template already has a `post-trip` phase.

## Decisions

Thomas decided these on 2026-10-29 (#380, the decisions comment).

1. **Scope: per space first.** Each space has its own Vault. An environment-wide shared library can come later.
2. **Links survive a delete.** A link to a deleted file stays on the object and reads "File removed". Deleting a file
   first shows where it is used. A permission check runs every time a link is opened.
3. **External sharing.** An expiring link with an optional password, made by an owner or a moderator, for one file or
   a chosen set. View-only by default, download optional, switchable off at any time, no account needed, and nothing
   else in the space reachable from it.
4. **Storage.** Environment settings `VAULT_DIR` (the folder) and `VAULT_MAX_GB`, plus per-person and per-space quotas.
   A cloud service (Google Drive) can plug in later behind the same setting.
5. **Viewers.** The browser's own players for images, audio and video, the browser's built-in PDF viewer, and a small
   sanitised Markdown renderer, all in the shared module frame. Thomas's condition: every player has real controls
   (play, pause, seek, volume, full screen).
6. **Existing pictures.** Research's uploads and Chat's pictures move into the Vault later, as their own decision.
7. **Name: Vault.** Templates can show their own word (Documents for trips, Handouts for game groups).

From the 2026-10-15 attachments plan:

- Its decision 1 (one shared attachments service for every object) is **replaced** by decisions 1 and 2 above: files
  live in one place, the Vault, and other modules link to them rather than holding their own.
- Its decision 2 (the Planner and Research notes take files first, then To-do, Calendar and Budget) is kept as the
  order in which modules learn to link.
- Its decisions 3 and 4 (a file can be "Only me", and an owner may not open someone's "Only me" file) were made for
  attachments on objects. Whether a space's Vault keeps "Only me" files is decision 13.

## The target

A Vault module on a space's canvas, like any other: a list or grid of the space's files, search and filters, a viewer
for each type inside the module's window, and Share. Any module can link one of its objects to a Vault file (a Planner
stay to its booking PDF, a Research note to a map scan), show the link, and open it in the Vault's viewer. An owner or
moderator can send a link to people outside the environment that opens only the files chosen, for as long as chosen.
The bytes live in `VAULT_DIR`, stream in and out, and never sit whole in the server's memory.

## The contract

Written to the decisions below. The one open question (metadata, decision 10) is marked where it applies.

### 1. Types and limits

The type is decided from the bytes, never from the name or the header. The extension shown is set from that type
("ticket.exe" that is a PDF is kept as "ticket.pdf"). The limits are decision 9.

| Group | Type | Extensions | Sniffed by | Per file |
|---|---|---|---|---|
| Images | `image/jpeg` | jpg, jpeg | `FF D8 FF` | 25 MB |
| | `image/png` | png | `89 50 4E 47 0D 0A 1A 0A` | 25 MB |
| | `image/webp` | webp | `RIFF` then `WEBP` at 8 | 25 MB |
| | `image/gif` | gif | `GIF87a` or `GIF89a` | 25 MB |
| Audio | `audio/mpeg` | mp3 | `ID3`, or an MPEG frame sync (`FF Ex`/`FF Fx`) | 200 MB |
| | `audio/ogg` | ogg, oga | `OggS` | 200 MB |
| | `audio/wav` | wav | `RIFF` then `WAVE` at 8 | 200 MB |
| | `audio/mp4` | m4a | `ftyp` at 4 with brand `M4A ` or `M4B ` | 200 MB |
| Video | `video/mp4` | mp4 | `ftyp` at 4 with an ISO brand (`isom`, `iso2`, `mp41`, `mp42`, `avc1`, `dash`) | 2 GB |
| | `video/webm` | webm | EBML `1A 45 DF A3` with DocType `webm` in the first 4 KB | 2 GB |
| | `video/quicktime` | mov | `ftyp` at 4 with brand `qt  ` | 2 GB |
| Documents | `application/pdf` | pdf | `%PDF-` at the start | 100 MB |
| | `text/markdown` | md | valid UTF-8 with no NUL byte, and a `.md` name | 1 MB |

- **Refused, always:** SVG, HTML, XML, scripts, executables, archives of any kind (zip, so no zip bombs), Office files,
  `.mkv` and HEIC. HEIC is refused with "Save it as a JPEG." Any other refusal names what is taken: "That kind of file can't go in the Vault. It takes pictures (JPEG,
  PNG, WebP, GIF), audio (MP3, OGG, WAV, M4A), video (MP4, WebM, MOV), PDF and Markdown."
- **Pictures too large to draw:** a picture whose header says more than 100 million pixels is refused ("That picture is
  too large to show."), so a viewer is never handed a decompression bomb. The server reads the header only.
- **PDF active content (decision 9):** refuse a PDF whose bytes hold `/JavaScript`, `/JS`, `/Launch`,
  `/EmbeddedFile`, `/RichMedia` or `/XFA`, read as a stream in 1 MB windows with an overlap. A name hidden in a
  compressed object stream passes, so this is a filter; the headers below are the guard.
- **Names:** kept in the record, one line, at most 120 characters, path separators and control characters removed. On
  disk a file is only its random id.

### 2. Storage and quotas

| Variable | Meaning | When unset or not a number above 0 |
|---|---|---|
| `VAULT_DIR` | the folder that holds the Vault's bytes, for every environment on the host | `DATA_DIR/vault`, outside the in-app backup zips (decision 14) |
| `VAULT_MAX_GB` | the most the whole folder may hold | 20 |
| `VAULT_SPACE_MAX_GB` | the most one space's Vault may hold | 5 |
| `VAULT_PERSON_MAX_GB` | the most one person may have added, across the environment's spaces | 2 |
| `VAULT_MB_PER_MINUTE` | how much one person may send in a minute | 500 |

- **Layout:** `VAULT_DIR/<environment slug>/space-<id>/<fid>.bin` and `<fid>.thumb`. On a single-environment install
  the slug is the environment's own. The **records** (name, type, size, `sha256`, `by`, `at`, taken time, thumbnail
  flag) live in `DATA_DIR`, in the Vault module's space data, so a backup carries them.
- **An owner may set lower quotas** for the environment on the Vault's settings (two `number` settings in GB, a space and
  a person), never higher than the variables. A hosted plan's storage cap counts the Vault's bytes too.
- **Counting:** bytes on disk, thumbnails included, per space and per person (the person who added the file). Each upload
  reserves its `Content-Length` against all four totals before a byte is read, so two uploads at once cannot both pass.
- **A file that does not fit** is refused with its own sentence and 413: "That file is over the 2 GB limit for video.",
  "This trip's Vault is full (5 GB). Remove some files to add more.", "You have used your 2 GB in the Vault. Remove some
  of your files to add more.", "The server's file storage is full. Ask the admin." The space and limit words come from
  the environment's words.
- **Status line** in the Vault: "42 files · 1.2 GB of 5 GB".
- **Google Drive later:** the store is one small interface (`put` from a stream, `get` a range, `remove`, `size`), so a
  Drive store can replace the folder behind the same setting. Its own plan.

### 3. Server routes

The Vault declares `library` in its manifest (contract section 6); the routes belong to that module, so the core names
no module. `:id` is the module's id. Every route checks, **before the body is read**: the session or pass, the
environment, membership of the space (or owner rights), that the module is on there, and the permission named.

| Route | Does | Permission | Answers |
|---|---|---|---|
| `GET /api/modules/:id/library?space=` | the space's files | `view` | `{ files: [view] }` |
| `POST /api/modules/:id/library?space=&name=` | add one file, the raw body | `add` | 201 `{ file: view }`; 400 a type it can't take; 411 no `Content-Length`; 413 a limit; 429 rate |
| `GET /api/modules/:id/library/:fid/content?space=` | the bytes, inline, with ranges | `view` | 200 or 206; 404 when not allowed or gone; 416 a bad range |
| `GET /api/modules/:id/library/:fid/content?space=&download=1` | the bytes as a download | `download` | as above, `attachment` |
| `GET /api/modules/:id/library/:fid/thumb?space=` | the small picture | `view` | image bytes or 404 |
| `PUT /api/modules/:id/library/:fid/thumb?space=` | the page's small picture, up to 300 KB | the adder | as Research's |
| `PATCH /api/modules/:id/library/:fid?space=` | `{ name }` | the adder, or `remove_any` | `{ file: view }` |
| `GET /api/modules/:id/library/:fid/uses?space=` | where it is linked, as summaries the person may see, and a count of the rest | `view` | `{ uses: [summary], hidden: n }` |
| `DELETE /api/modules/:id/library/:fid?space=` | remove it | the adder, or `remove_any` | `{ ok: true }` |

`view` is `{ id, name, type, group, size, by, at, taken?, hasThumb, uses }`; `group` is `image`, `audio`, `video` or
`document`; `uses` is how many objects link to it.

- **Upload streams.** No `express.raw`. The body goes to a part file in the space's folder with a running count, as the
  picture map's upload does: refused on `Content-Length` before reading, cut off when the count passes it, sniffed from
  the part file's first 4 KB, checked, then renamed into place. A part left by a restart goes after an hour. At most two
  uploads at once per person and eight per environment; a third waits with 429 "Another upload is still running."
- **Pictures are cleaned without holding them twice:** `cleanImage` runs on the part file (at most 25 MB, one at a time
  per environment). Audio, video, PDF and Markdown are kept as sent. Pictures lose where they were taken only when the person chose that
  (decision 10).
- **Serving streams.** `res.sendFile` with `acceptRanges`, never a read into memory, so a player can seek. A range it
  cannot meet answers 416 with the size, as the module files route does.
- **Headers on every file sent:** the stored type only (Markdown as `text/plain; charset=utf-8`, never HTML),
  `X-Content-Type-Options: nosniff`, `Content-Disposition: inline` (or `attachment` with a cleaned ASCII `filename` and
  `filename*=UTF-8''`), `Cache-Control: private, no-store`, `Cross-Origin-Resource-Policy: same-origin`,
  `Referrer-Policy: no-referrer`, and `Content-Security-Policy: sandbox; default-src 'none'` on everything except a PDF,
  which gets `default-src 'none'; frame-ancestors 'self'` because browsers will not show a PDF in a sandboxed document.
  That one exception is checked in a real browser (Verify).
- **A refused read is 404**, never 403, so a file's existence is not given away.
- **Activity lines**, without the file's name: "added 3 files to the Vault", "removed a file from the Vault", "made a
  share link", "turned off a share link".

### 4. Links: how a module points at a file

Files are the Vault's objects (decision 8):

- **A file is an object** of the Vault, kind `file`, declared in `refs.produces` with `open: true` and `backlinks: true`.
  Its summary is `title` (the name) and `category` (the group). So a link is an ordinary pointer
  `{ module, kind: 'file', id, scope: 'space', space }`, kept by the linking module with its own data, never a copy of
  the file.
- **Resolving** goes through `host.objects.resolve`, which checks on every call that the person can read the Vault in
  that space. A file that is gone resolves with `state: 'gone'`; the SDK's file chip reads it as **"File removed"**, muted,
  with **Remove link** for someone who may edit the object (decision 2). A file the person may not see reads "Not
  available to you" and nothing else.
- **Where it is used** is the existing backlinks (`host.objects.linksTo`), which is what `GET .../uses` answers. The
  linking module tells the server its links with `host.objects.setLinks`, as links work today.
- **Opening** a link (`host.objects.open`) brings the Vault forward on that file's viewer, after the same check.
- **Guests and keyed pages** resolve a file pointer as hidden, always.

### 5. The SDK

For any module (its manifest consumes `"<vault id>:file"` or `"*"`, approved by an owner as today):

```js
const files = await host.files.pick({ multiple: true, groups: ['document', 'image'] });
// opens the space's Vault as a chooser in a host sheet, with "Add a file" in it; resolves pointers, or [] when closed
await host.files.link(host.objects.make('plan', stayId), files);   // adds to the object's links (setLinks underneath)
const chips = await host.files.resolve(pointers);                 // [{ ref, name, group, size, state? }]
host.ui.fileChips(el, { object, canEdit });                       // draws an object's files: chip, Open, Remove link
await host.files.open(pointer);                                   // the Vault's viewer, after the check
```

`host.files` names no module: it reaches whichever enabled module in the space declares `library`, and answers "There
is no Vault in this {space}." with the module's shown word when none is on. The task that asked for this plan called it
`host.vault`; the rule that the core names no module is why it is `host.files` here.

For the Vault module itself: `host.library.list()`, `.add(file, { onProgress })`, `.rename(id, name)`, `.remove(id)`,
`.uses(id)`, `.url(id, { download, thumb })` and `.thumb(id, blob)`, through the bridge like `host.uploads`. The address
`url` gives works as a `src` in the frame (experience-design confirms that a media element's range requests carry the
same access from the sandboxed frame, as `host.uploads.url` does for pictures).

### 6. The Vault module

- **Manifest:** id `vault`, name "Vault", icon `vault`, `scope: ["space"]`, a `canvas` surface (dock and float) and a
  `page`, `library: true`, `refs.produces` the `file` kind, `access: { read: "view", write: "add" }`.
- **Permissions** (owners always have all):

| Key | Label | Member | Moderator | Guest |
|---|---|---|---|---|
| `view` | See the {space}'s files | on | on | off, and cannot be turned on |
| `add` | Add files | on | on | off, and cannot be turned on |
| `download` | Download files | on | on | off, and cannot be turned on |
| `remove_any` | Remove files other people added | off | on | off |
| `share` | Make share links | off | on | off, and cannot be turned on |

  The server refuses every library route to a guest pass, the OBS access key and any keyed page, whatever Roles says.
  The `share` row's member default is off (decision 3); an owner can turn it on for the member role in Roles (decision 12).
- **The frame:** a view switch in the toolbar (`host.ui.viewSwitch`: **List** `list`, **Grid** `grip`); the search on
  the right ("Search files"); **Filters** with a **Type** group (Pictures, Audio, Video, Documents, each with its count),
  an **Added by** group (Everyone, Mine) and a **Linked** group (Linked, Not linked). The **+** is **Add files**. The
  title bar's standard **Share** opens the share sheet for the chosen files, or the list of share links when none is
  chosen. A title bar action **Select** (`square-check`) turns on choosing several, for Share, Download and Remove.
- **The status line:** the count and the space used ("42 files · 1.2 GB of 5 GB"), and the filter in words.
- **Words:** the shown name comes from the template's `moduleNames` (Documents in travel, Handouts in games, decision 7);
  every sentence uses the module's shown name and the environment's words.

### 7. Share links

- **Made by** someone with `share` (owners and moderators by default) from the Vault's Share, for one file or a chosen
  set. The set is fixed when made; its maker or an owner can add or take out files later.
- **Choices on the sheet:** a name ("Rome photos"), an end (1 day, 7 days or 30 days; 7 by default; never without an end, decision 15), an
  optional password, and **Allow download** (off by default, decision 3). **Make link** shows the address once with
  **Copy**.
- **Stored** in the Vault's space data as `{ id, name, files, by, at, ends, download, passwordHash?, tokenHash, opened }`.
  The token is 32 random bytes; only its SHA-256 is kept, so a stolen data file opens no link. The password is hashed with
  scrypt as account passwords are (`server/auth.js`).
- **Turned off** at any time from the list of share links (**Turn off**), and by itself at its end. A space deleted, the
  Vault turned off in the space, or every file in it removed, ends it too.
- **The address:** `/shared/<token>`. Public routes, no session: `GET /api/shared/:token` (the share's name, its files'
  names, types and sizes, whether download is on, when it ends), `POST /api/shared/:token/unlock` `{ password }`, and
  `GET /api/shared/:token/files/:fid/content` (ranges; `?download=1` only when allowed) and `.../thumb`. Each checks the
  token, the end, the password cookie and that the file is in the set, before anything else. A file outside the set,
  another space's file, and every other route answer 404.
- **Password:** a right password sets a signed cookie for that path only (`Path=/shared/<token>`, `HttpOnly`,
  `SameSite=Strict`, one hour). Five wrong tries in fifteen minutes per link and address answer 429 "Too many tries. Wait a
  few minutes."
- **What a person outside sees:** a plain page in the environment's theme with the share's name, "Shared by <first
  name> · Ends 12 November", and its files in a grid with the same viewers as the Vault. No space name, no people, no
  chat, no modules, no sign-in prompt, no other link. **Download** shows only when allowed. A gone or ended link: "This
  link has ended." A wrong token reads the same. A removed file in the set: "File removed".
- **Headers on the page:** `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store`,
  a strict CSP with no outside sources.
- **What view-only means, said plainly on the sheet:** "Without download, people can still save what they see on
  screen." A browser can always keep a picture it shows or a video it plays; view-only only takes the button away.
- **The maker sees** each link's name, files, end, whether it has a password, and how many times it was opened.

### 8. Deleting

- **A file:** the Remove confirmation lists where it is used first ("Used in 2: Hotel Roma (Itinerary), Packing note
  (Research). The links will show File removed."), then removes the bytes, the thumbnail and the record. Links stay.
- **With the space:** `server/space-erase.js` gains a step that removes `VAULT_DIR/<slug>/space-<id>/` and the space's
  share links; `tools/check-space-erase.mjs` covers it (#337).
- **The Vault turned off in a space** keeps its files (turned on again, they return); share links stop answering while it
  is off. Uninstalling the module from the environment asks first and removes every space's files.
- **A person who leaves:** their files stay with the space, shown as added by "someone who left", and stop counting
  against a person quota.

### 9. Backups

The in-app backups cannot carry gigabytes: they zip in memory and a restore takes at most 500 MB. So (decision 14):

- The records are in `DATA_DIR` and travel with every backup; the bytes in `VAULT_DIR` do not.
- A backup that carries the bytes is a later piece of work, its own plan.
- The getting-started guide and `docker-compose.yml` give `VAULT_DIR` its own volume, and the admin backs it up with the
  data folder.
- A restore whose bytes are missing shows those files as "File missing" with **Remove**, never an error page.
- On start the server lists bytes with no record (a crash between steps) and removes them after seven days.

### 10. The design

- **List:** one row a file: a type icon or the thumbnail, the name, the group and size in quiet words, who added it and
  when, a link count (`link` icon with the number) and the more button (Open, Download, Rename, Share, Where it is used,
  Remove).
- **Grid:** square thumbnails for pictures and video (a video shows a play mark and its length), a type tile for audio
  and documents, the name under each. Three across on a phone, as many as fit elsewhere.
- **Viewer**, inside the module's content area, one file at a time: a top row with **Back**, the name, previous and
  next, **Download** where allowed, **Share** where allowed, and the more button. Below it:
  - pictures: the `img`, fitted, with **Full screen**; a video or picture thumbnail is made in the page (decision 11), a
    PDF has none, only its type tile;
  - audio: the `audio` element with `controls` (play, pause, seek, volume, speed);
  - video: the `video` element with `controls` and `playsinline` (play, pause, seek, volume, full screen,
    picture-in-picture where the browser has it);
  - PDF: the browser's own viewer;
  - Markdown: the text through `host.util.markdown`, read only, in the reading width.
- **Full screen and PDF need the host** (contract section 5 and "The module frame and its sandbox" above): the module's
  frame gains `allow="fullscreen"` (it adds no reach outside the frame), and the PDF viewer is a host-drawn layer laid
  exactly over the module's content area, the way the editor window is lifted, with a session-checked address. If a
  browser still will not show a PDF there (iOS Safari shows only the first page in a frame), the viewer shows **Open**,
  which opens the PDF in a new tab.
- **Adding:** **Add files** opens the device's chooser (several at once; on a phone, the photo library and camera), and
  dropping files on the module adds them. Each shows a progress row; a refusal shows its sentence on that row. Under
  it, one line: "Everyone in this {space} can see what you add." (decision 13). Beside it, an option for the person
  adding (decision 10): **Remove where it was taken**, for pictures, with its state remembered per person. For video
  there is no option, only a notice: "Videos keep their details, which can include where they were taken." The default
  of the option is the one open question.
- **Empty states:** no files ("No files yet. Add tickets, photos and documents for this {space}." with **Add files**);
  nothing matches ("No files match." with **Clear filters**); no permission ("You can't see the files in this
  {space}."); a link chip whose file is gone ("File removed").
- **Phone (640 pixels or narrower):** one column, the grid three across, the viewer full screen as a sheet, **Download**
  as a large button.
- **New design-system pieces**, each added to the registry after Thomas agrees, before a module uses it: the file chip
  (icon, name, size, state), the file chooser sheet, the upload progress row, the media viewer frame, the share sheet.
  Icons: `vault`, `file-pdf`, `file-image`, `file-audio`, `file-video`, `file-lines`, `link`, `download`,
  `share-nodes`. Colours from the theme tokens.

### 11. Post-trip sharing

How a trip's photos and tickets are shared afterwards, as the plan expects it to go:

1. During and after the trip, members add photos and videos from their phones to the trip's Vault (Add files, several at
   once). Tickets and confirmations are already there, linked from the Planner's stays and journeys.
2. In the `post-trip` phase the Vault is where people look: Filters > Type > Pictures, then Select.
3. A moderator or the owner chooses the photos (and a ticket or two for the story), presses **Share**, names it "Rome,
   October", picks 30 days, leaves download on for family, and copies the link.
4. Family open the link on a phone with no account and see the photos in a grid, with the viewer and Download.
5. **The Journal (#40), later:** a Journal entry links to Vault files with `host.files.link`, never copies them, so
   the Vault stays the one place the bytes live. A Journal's "share the story" would make a Vault share link for the
   files its entries link, through the same share routes and the same `share` permission; the Journal's own words would
   be its own public page, planned with #40 and #211. Nothing in this plan stands in its way.

### 12. Security, in one place

- **Who sees what:** members and moderators of the space with `view`, and owners and the admin. Guests, the OBS access
  key, keyed pages, published views (#211), calendar feeds and the published calendar never see a file, a name or a
  count; the only way in from outside is a share link. A file's name reaches summaries, search, links and the AI only for
  people who can read the Vault (decision 8).
- **Checks before the body:** every write route decides access, quota and rate before reading a byte; a refusal ends the
  request and throws away what is still arriving, as the picture map's upload does.
- **Never in memory whole:** uploads stream to disk; files stream out with ranges; the only whole read is a picture
  of at most 25 MB in `cleanImage`, one at a time per environment.
- **Content safety:** types from bytes; no SVG or HTML; Markdown sent as plain text and drawn escaped; `nosniff` and the
  sandbox CSP everywhere but PDF; no archives, so no zip bombs; pictures over 100 million pixels refused.
- **Malware:** the server never opens, decodes or runs a file. The risk is to a person who downloads one. No scanner is
  bundled; a ClamAV socket variable is a later idea, not planned.
- **Filenames:** never used on disk; cleaned for display; sent in `Content-Disposition` in both ASCII and UTF-8 forms.
- **Metadata:** the person adding files chooses (decision 10, section 10 "Adding"). Taken time and camera are read into
  the record for pictures either way. Audio and video are kept as sent, which can include where a video was taken, and
  the notice under Add files says so.
- **Rate limits:** the module `upload` limit, `VAULT_MB_PER_MINUTE`, two uploads at once per person, five password tries
  per link and address in fifteen minutes, and the existing request limits on share routes.
- **SSRF: none.** The server never fetches an address for the Vault: there is no "add from a link". The Drive store is its
  own plan.
- **Share tokens** hashed at rest, compared in constant time, 32 bytes, never in logs.

## Left to build, in order

Each step can be built and checked on its own. A new or changed module gets a version bump in `module.json` and
`tools/module-versions.json`. Sizes are S, M, L.

| # | Step | Size | Agent | Kind |
|---|---|---|---|---|
| 1 | **Store, routes, quotas.** (Nothing here waits on a question except the metadata default: build the Remove-where-it-was-taken option and the video notice, and set the default once Thomas answers.) `server/library.js`: `VAULT_DIR` and the variables, the type sniffing, the streamed upload, the streamed serving with ranges, the headers, the quotas and reservation, rate limits, the `library` manifest field and its routes, the `file` kind's records, activity lines. `tools/check-library.mjs` in `npm run check` | L | server-development | feedback build with a QA security review |
| 2 | **The Vault module and its list.** `modules/vault` at 0.1.0: manifest and permissions, List and Grid, search, Filters, Add files with progress, Rename, Remove with "where it is used", Select, the status line, empty states, phone | M | experience-design | try build |
| 3 | **Viewers.** Pictures, audio, video with real controls, Markdown; the frame's `allow="fullscreen"`; the host-drawn PDF layer with the Open fallback; previous and next; thumbnails made in the page | M | experience-design (S of it for server-development: the PDF headers) | try build, then a browser pass by Thomas |
| 4 | **Linking SDK and one module.** `host.files.pick`, `.link`, `.resolve`, `.open`, `host.ui.fileChips`; "File removed"; the Planner links its stays and journeys to files (decision 2 of 2026-10-15's order) | M | experience-design | try build |
| 5 | **External sharing.** Share records, the public routes, the password and its cookie, ends and Turn off, the `/shared/<token>` page and its viewers, the share sheet and list in the Vault | L | server-development (routes), experience-design (the page and sheet) | feedback build with a QA security review |
| 6 | **Delete with the space, and backup.** The `space-erase.js` step and its check; uninstall removes files; "File missing"; the orphan sweep; `docker-compose.yml` and the guide's `VAULT_DIR` volume | S | server-development (content-manager for the guide) | try build |
| 7 | **Templates' words.** `moduleNames` Documents (travel) and Handouts (games), and the Vault in both templates' module lists | S | experience-design | try build |
| 8 | **Documentation:** api-modules (`library`, the routes, share routes), api-module-sdk (`host.files`, `host.library`), architecture-modules (storage), a Vault user guide, the environment variables, the CHANGELOG | M | content-manager | after each step |

Then, each its own decision and plan: Research's uploads and Chat's pictures into the Vault (decision 6; chat pictures
would make the realtime plan's step 8 unnecessary), more modules linking (Research notes, then To-do, Calendar, Budget),
the environment-wide library, Google Drive, the Journal (#40).

## Verify

- **Checked by a tool** (`tools/check-library.mjs`, a throwaway server with `DATA_DIR` and `VAULT_DIR` under `/tmp`):
  - step 1: each accepted type kept from its bytes, and refused under a false name or header; SVG, HTML, a zip, a `.mov`
    refused; a huge-pixel PNG header refused; a PDF with each active-content name refused; each limit from its variable
    and its default; a `Content-Length` over a limit refused before any byte is written (the folder holds no part
    file); a body longer than its `Content-Length` cut off; two uploads at once reserving against one quota; the
    server's memory stays flat while a 1 GB body streams in (measured with `process.memoryUsage`); a range request
    answers 206 with the right bytes, a bad one 416; every header present on every type; the permission matrix (guest
    pass, access key, non-member, member without `view`, member, adder, moderator, owner, admin) on every route, a
    refusal always 404 with no name in the answer.
  - step 4: a pointer to a removed file resolves `gone`; a guest's resolve is hidden; `uses` lists the linking object.
  - step 5: a share answers only its own files; an ended, turned-off or wrong token reads "ended"; the password tries
    limit; the cookie works only on its own path; download refused when off; the token is not in the data file.
  - step 6: `check-space-erase` finds no Vault file or share of a deleted space.
  - steps 2, 3, 4 and 7: `check-modules`, `check-module-versions`, `check-module-layout`, `check-switches`,
    `check-templates`.
- **Verified live in a browser on a local server** (no LiveKit needed; the module's own page): adding several files,
  the list and grid, filters, search, each viewer's controls, seeking a video, full screen, the PDF layer, Markdown with
  planted HTML showing as text, removing a linked file and the Planner showing "File removed", a share link opened in a
  private window with and without a password, the phone layout at 390 pixels.
- **Read as code only:** the Vault on a space's canvas, which needs the call page; say so in the reports.
- **Only Thomas can verify:** photos and videos from his phone (iOS and Android), what iOS does with a PDF in the layer,
  playback of each type in Safari, Chrome and Firefox, a share opened on a relative's phone, the backup of `VAULT_DIR` on
  his host, and the bumped modules installing in his environment.

## Risks

- **Phones record what the Vault refuses.** iPhones record `.mov` (HEVC) and take HEIC photos. Safari's chooser often
  converts photos to JPEG, but not always videos. A `.mov` is accepted and may not play outside Safari (decision 9); HEIC is refused with "Save it as a JPEG."
- **Codecs are not types.** An MP4 can hold a codec a browser cannot play (HEVC outside Safari). The viewer says "This
  browser can't play this file." with **Download**; the server does not transcode.
- **PDF in a frame** varies by browser; the Open fallback covers the worst case.
- **View-only is not copy protection**, and the share sheet says so.
- **Backups:** the bytes are outside the in-app backup by design; an admin who does not back up `VAULT_DIR` loses files.
- **Metadata in video** can carry a position the Vault does not strip.
- **Summaries carry names** (decision 8); a passport scan's name is seen by every member who can
  read the Vault.

## Decided

Thomas decided these on 2026-10-30, answering the open questions. Numbers continue the list above.

8. **Files are the Vault's objects.** A `file` kind: links, backlinks, open, search and drag reuse what exists. File
   names reach summaries only for people who can read the Vault. One kind of link everywhere.
9. **Types and limits as in section 1.** 25 MB pictures, 200 MB audio, 2 GB video, 100 MB PDF, 1 MB Markdown. The PDF
   active-content refusal is on. `.mov` is accepted as `video/quicktime`, with a note that some browsers can't play it.
   HEIC is refused with "Save it as a JPEG."
10. **Metadata is the choice of the person adding files**, not a fixed rule. Under Add files, an option **Remove where it
    was taken** for pictures and a plain notice for video (section 10, "Adding").
11. **Thumbnails** for pictures and video, made in the page; none for PDF.
12. **Share links** are made by owners and moderators. An owner can switch `share` on for the member role in Roles; it is
    off by default.
13. **No "Only me" files** in a space's Vault. Everything belongs to the space; the text under Add files reads "Everyone
    in this {space} can see what you add." Personal documents wait for the environment-wide library.
14. **Storage default.** `VAULT_DIR` unset means `DATA_DIR/vault`, outside the in-app backup zips. A backup that carries
    the bytes is a later piece.
15. **Share link ends:** 1, 7 or 30 days, 7 by default, never without an end.

Kept from the earlier decisions: viewers have real controls (play, pause, seek, volume, full screen). The host provides
full screen and the PDF viewer because they don't work in the sandboxed module frame (section 10).

## What is not decided

1. **The default for Remove where it was taken** (decision 10). Thomas said it is the user's choice; the default is
   still open. Suggestion: on for pictures, so a position is dropped unless the person keeps it, as Research does; for
   video, an obvious notice, because the Vault does not strip video. Blocks only the metadata part of step 1.
