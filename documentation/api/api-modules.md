# Modules API

**Audience:** someone scripting the installation and management of Collaborator modules, or
building a tool that talks to a running module.

The install and management routes below are owner-only: a request without an owner session gets 401 or 403. The runtime routes at the end are for a running module. For how modules
work and what an owner sees, read [userguide-modules](../userguides/userguide-modules.md). Errors come
back as `{ "error": "message" }` with a 4xx status.

## Module manifest

A module zip holds a `module.json` at its root (or inside one wrapping folder). Writing one is covered in [api-module-sdk](api-module-sdk.md).

```json
{
  "id": "calendar",
  "name": "Calendar",
  "version": "1.0.0",
  "description": "Optional, up to 200 characters.",
  "author": "Optional, up to 60 characters.",
  "icon": "calendar-days",
  "scope": ["environment", "space"],
  "surfaces": {
    "page": { "entry": "page.html" },
    "canvas": { "entry": "canvas.html", "width": 420, "height": 520 },
    "widget": { "entry": "widget.html", "title": "Coming up", "size": "medium", "order": 10 }
  },
  "permissions": [
    { "key": "view", "label": "See the calendar", "default": { "member": true, "guest": true, "moderator": true } }
  ],
  "hooks": { "schedule": true, "notify": true },
  "refs": {
    "produces": [{ "kind": "event", "key": "event:{id}", "summary": { "title": "title", "when": "start" } }],
    "consumes": ["polls:poll"]
  }
}
```

- `id` is 2 to 32 lowercase letters, digits or dashes, starting with a letter. `name` is required, up
  to 40 characters. `version` is `x.y.z`.
- `scope` includes `environment`, `space`, `person` or several. `person` is the signed-in person's own private data, kept for them alone and reachable from any page of theirs (`?scope=person` on the data routes); not even an owner can read it, because the place it is kept is named by who is asking, and a guest has none. It needs no surface of its own. An `environment` module needs `surfaces.page`, and a `space`
  module needs `surfaces.canvas` (`{ entry, width, height, mode }`; it was `surfaces.panel`). Each `entry` must be an `.html` file that exists in the zip. `surfaces.page.nav` is no longer read; the top bar has no entry for module pages. A manifest that sets it still loads; the field is ignored.
- `permissions` holds up to 20 entries with unique keys matching `^[a-z][a-z0-9_]{0,23}$`; any other key
  refuses the install ("permission key ... must be lowercase letters, digits or underscores"). `default` says
  which of `member`, `moderator` and `guest` have the permission before an owner changes it (the old key `user` is refused). A
  permission may carry `replaces`, the key it had in an earlier version: each role's choice for that key is
  carried over once, at start and after any install; it is refused if it names a key the module still uses, or
  one another permission already replaces (`module.json: permission "<second>" replaces "<old>", which
  permission "<first>" already replaces`). Owners always have every permission. `tools/check-modules.mjs` checks the bundled
  modules' manifests against this.
- `color` (optional) is the module's colour, one of `gold`, `blue`, `green`, `teal`, `purple`, `red`, `orange` or `pink` (the theme's tints, see [design-theme](../designsystem/design-theme.md)): it marks the module's icon in its titlebar and its line in the Layout menu, and its messages in Chat. Any other value refuses the install (`module.json: "color" must be one of gold, blue, green, teal, purple, red, orange, pink`). Gold is also the AI's. Without it the module is neutral.
- `hooks` names what the module may ask Collaborator to do for it: `schedule` and `notify`, and `external` (see each person's own other calendars, only to them; see "Other calendars" below). Each needs an owner's approval; Manage's approval list reads "See each person's own other calendars — only to them" for `external`.
- `refs.produces` lists up to 10 kinds of object other modules may point at: a `kind` (lowercase letters, digits, dashes), an optional display `name` (`{name}` in it is the module's shown name), optional `open` and `backlinks` flags (the module can show one of its objects when asked, and shows what links to them), a `key` that is a fixed prefix then `{id}` (`"event:{id}"`), and a `summary` mapping the summary fields `title` (required), `subtitle`, `when`, `end`, `allDay`, `done`, `category` and `place` to top-level stored field names. `place` is an object `{ lat, lng, name? }` (latitude -90 to 90, longitude -180 to 180, a name up to 120 characters); a summary whose stored value is anything else has no place. `category` is a short label (letters, digits and dashes, up to 20) a module may give its objects so others can group or colour them; it is lower-cased, and anything else is left out. `refs.consumes` lists up to 20 kinds of other modules' objects as `"module:kind"`, or `"*"` for whatever other modules share; an owner approves them, and a module cannot consume its own kinds.
  A kind may also declare `holds` (a stored pointer the server keeps true), `dated` (which may name a `repeat` field, `{ every, until }` in the Calendar's shape), `feed: true` (offered to people's calendar feeds; needs `dated`; refused otherwise with `module.json: refs "<kind>" feed needs "dated"`, and anything but a boolean with `... feed must be true or false`), `marker: true` (shown on a calendar as a marker that links back to the object; see "Calendar markers" below), `mirror` (`out` or `in`) and `create` (a dated twin the server keeps in step); the fields, their limits and what the server does are in [api-module-sdk](api-module-sdk.md), "Keeping links true". A bad one refuses the install (400) with a sentence naming it, such as `module.json: refs "<kind>" holds.onDelete must be "remove" or "mark"` or `module.json: refs "<kind>" mirror "in" needs create`.
- `events.publishes` lists up to 10 events the module says (`name`, an optional `kind` of its refs the event concerns, a `label`, and an optional `data` mapping up to six fields the event carries to types, as an action's input does); `events.subscribes` lists up to 20 events it wants to hear, as `"*"` or `"module:name"`, approved by an owner.
- `actions.provides` lists up to 10 actions the module carries out: a `name`, a `label`, an optional `local: true` (a view, such as showing something on a map: only the requesting person's own open page of the module carries it out, and it needs only read access, not the right to change things) and an `input` mapping up to 10 fields to `string`, `text`, `date`, `datetime`, `boolean`, `number`, `ref` or `object` (a trailing `?` for optional); a field's type may also be `ref:module:kind`, a pointer to one kind of object, which Collaborator enforces. An `object` field is a whole object in the objects format, and goes with `takes` (below); an event's `data` may not use it. `actions.uses` lists up to 20 it wants to ask for, as `"*"` or `"module:name"`, approved by an owner.
  - The bus checks each input against its type. A `date` must be `YYYY-MM-DD` and a `datetime` a date and time, and either must name a day that exists: `2026-02-31` is refused with 400 `<field> must be a date` (or `<field> must be a date and time`), the same sentence as any other bad value.
  - `needs` (optional, on an entry in `actions.provides`) lists any of `place`, `date`, `text` and `subtitle`. It has two meanings, both read by the asking side and never enforced by the bus. On an action with a `ref` input, it is what the object pointed at must have on its summary, so a drop menu leaves the action out for an object without it ("Show on the map" for a task with no position). On any action, it is what the request itself must carry, so a module offers the action only when it can fill that in: the Calendar's `createEvent` has an optional `date` and `needs: ["date"]`, and To-do's rules and Polls offer it only when they have a day to give. It is kept as declared on any action; a request that leaves out an optional field it names is not refused.
- `takes` (optional, on an entry in `actions.provides`) says which objects the action accepts ([plan-object-handoff](../plans/plan-object-handoff.md)). It is a list of 1 to 10 entries, each `{ kinds, except?, as, permission? }`:
  - `kinds`: kinds from the objects format's catalogue (see [The objects format](#the-objects-format), `image` included), `"*"` for any object, or `"text"` for an ordinary message's words, which travel as an object with no kind. `"*"` covers every catalogue kind and an object with no kind, but never `image`, which an entry takes only by naming it. `"text"` covers only an object with no kind. Duplicates are dropped.
  - `except` (only beside `"*"`): catalogue kinds `"*"` leaves out, such as the 13 travel kinds for a module that should take events and tasks but not flights. `image` can't be listed, since `"*"` never covers it.
  - `as`: the words after "Add to <module> as", 1 to 40 characters, white space collapsed; `{kind}` stands for the object's kind with "a" or "an". It is stored as written.
  - `permission`: a key from the module's own `permissions` that the person must also hold to use this entry.

  An action with `takes` needs exactly one input of type `object`, and an `object` input needs `takes`. A bad one refuses the install (400) with one of these sentences, where `<action>` is the action's name:
  - `module.json: action "<action>" takes must be a list of 1 to 10 entries, such as { "kinds": ["note"], "as": "a note" }`
  - `module.json: action "<action>" takes entries must each be an object with "kinds" and "as"`
  - `module.json: action "<action>" takes needs "kinds": a list of kinds of object, "*" or "text"`
  - `module.json: action "<action>" takes "<kind>", which is not a kind of object, "*" or "text"`
  - `module.json: action "<action>" takes "except" needs "*" in its kinds`
  - `module.json: action "<action>" takes "except" must be a list of kinds of object`
  - `module.json: action "<action>" takes except "<kind>", which is not a kind of object "*" can take`
  - `module.json: action "<action>" takes both lists and leaves out "<kind>"`
  - `module.json: action "<action>" takes needs "as": the words after "Add to <module> as", up to 40 characters`
  - `module.json: action "<action>" takes permission "<key>" must name one of the module's own permissions`
  - `module.json: action "<action>" can have only one input of type "object"`
  - `module.json: action "<action>" takes objects, so it needs an input of type "object"`
  - `module.json: action "<action>" input "<field>" is an object, so the action needs "takes"`

  An installed manifest whose actions no longer pass is read with no events and no actions, as before.
- `commands` (optional) lists up to 20 commands the module takes from Chat, each `{ name, label, action, hint? }`. `name` is 1 to 12 lowercase letters or digits, unique in the module, and never `ai` (the host's). `action` names an entry in this module's `actions.provides` that is `local: true` and whose `input.text` is `string` or `text` (optionally `?`). `label` (up to 60 characters; the name if blank) is what the picker shows, and `hint` (up to 80) the box's placeholder once the command is chosen. Refusals: `module.json: "commands" must be a list`, `... can list at most 20 commands`, `command name "<name>" must be 1 to 12 lowercase letters or digits`, `command name "ai" is reserved`, `command "<name>" is listed twice`, `command "<name>" action "<action>" is not in actions.provides`, `... must be local`, `... must accept { "text": "string" }`. An installed manifest whose commands no longer pass is read with none. Two modules may use the same name; see `POST /api/spaces/:id/command` below.
- `requires` lists up to 5 module ids this module cannot work without: it cannot be turned on until they are installed and on, and turning one of them off asks first and turns this one off with it (`PATCH` with `force: true`). It is the only place a manifest names another module; at run time modules still reach each other only through the generic conduits. The module view carries `missing` (what it needs that is not on) and `dependents` (the enabled modules that need it).
- A module that declares the `ai` hook depends on the AI service the same way: it cannot be turned on while the AI service is off, and the module view's `missing` carries the reserved id `'ai'` for that ("the AI service" in a message) alongside any `requires`. Turning the AI service off (`PUT /api/ai`) while an enabled module depends on it asks first the same way (`force: true` turns those modules off with it), and `GET /api/ai` carries `dependents` (the enabled modules that need it), for the same "X needs this; turn it off too?" confirmation. `ai` cannot be used as a module's own id.
- `geocoder` (optional) has the server answer this module's place searches: `{ provider, address, save?, custom, providers }` where `provider` is the key of a `choice` setting, `address` the key of a `url` setting used when the provider is the `custom` value, `save` the key of a `boolean` setting that says whether results are kept (only an explicit true keeps them; without one nothing is kept), and `providers` maps a provider's value to `{ name, address (https), credit }`. The server searches its saved places first and asks the chosen service only when fewer than five match. Modules never hold the address's credentials; see `host.geocode` in [api-module-sdk](api-module-sdk.md).
- `hooks` may include `ai`: the module may ask the server's AI (see `host.ai` in [api-module-sdk](api-module-sdk.md)). An owner sets up one AI service for the whole server (Modules tab: none, OpenAI, Anthropic, or another OpenAI-compatible service whose address is typed; Collaborator knows the first two's addresses and the model is chosen from the service's own list; a key that is kept on the server and never shown again, an explicit **enable** step (nothing is sent until the owner enables it; choosing another service switches it off again), and an optional monthly token limit; or the `AI_KEY` environment variable for the key), and the Roles tab has **Use AI in modules**, off for every role until turned on (a guest never can; a space can turn AI off for itself). A produced kind's `summary` may map `text` to a stored field: the object's own words (plain, up to 8 KB), which the server reads only for the AI hook, as the person asking.
- `regionSource` (optional) lets the server cut a region out of a larger PMTiles file straight into one of the module's own file folders: `{ folder, address }` where `folder` names a `files`-type setting's own folder and `address` the key of a `url` setting naming the file to cut from. Owners only, over `GET /api/modules/:id/region-cut/find?q=` (a place's name to its rough rectangle, asked of whichever enabled module has a place search configured — see `geocoder` above; not this module itself, so it works without one), `POST /api/modules/:id/region-cut/estimate` (`{ minLon, minLat, maxLon, maxLat, maxZoom, minZoom? }`; a dry run: the tile count and the estimated size, without downloading anything) and `POST /api/modules/:id/region-cut` (the same body plus `name`, starting a background job; `GET .../region-cut/:jobId/stream` follows it as server-sent events, `progress`/`done`/`error`). Only one cut runs at a time per module; a cut estimated over a size ceiling is refused before anything is fetched; a failed cut leaves nothing behind. Maps is the first to offer this, cutting from the Protomaps world build into its `map-tiles` folder; see documentation/plans/plan-map-region-download.md.
- `uploads` (optional) lets the module keep pictures its people add, per scope (environment, space, person) with the same read and write permissions as its data: `{ types, maxBytes, maxFiles }` where `types` is any of `image/jpeg`, `image/png` and `image/webp` (all by default), `maxBytes` at most 10 MB (the default) and `maxFiles` at most 5000 per scope (500 by default). The server checks each file from its own bytes (a file that is not a whole picture of an allowed type is refused, whatever it says it is) and takes out what rides along: text, comments, thumbnails, maker notes, editing history and, unless the person keeps it, the position. Files are served with their picture type only, never as a page. See `host.uploads` in [api-module-sdk](api-module-sdk.md).
- `settings` lists up to 40 settings the module offers people, each `{ key, label, help?, type, scope, default, ... }` (`help`, like a choice option's own below, up to 600 characters with line breaks kept): `type` is `note` (no control and no value: a `label` and a `help`, drawn among the settings for the module to say where something is set up, such as Maps saying its search is the place-search module's; its scope is `environment`, or left out), `boolean`, `choice` (with `options: [{ value, label }]`, two to twelve), `number` (`min`, `max`), `color` (a `#rrggbb` string; the form draws a colour picker) or `text` (`maxLength`, up to 200), `url` (empty, or an http or https address up to 500 characters, never with a user name or password; optional `httpsOnly: true` and `pathEnds: ".pmtiles"` narrow it) or `list` (rows of label, icon and colour that an owner adds, edits, reorders and removes: `default` is the starting rows, `fixed` the ids of rows that cannot be removed, `maxLength` the longest label, at most 30; the value is up to 20 rows `{ id, label, icon, color }` where a new row's empty `id` is made from its label and `color` is `#rrggbb`) or `files` (the same, as a table of every file there with a tick for each: the setting is the list of names ticked, up to 20; with `"shared": "host"` the folder is the host's, one for every environment (`DATA_DIR/shared/<module id>/<folder>/` on a host with environments, the module's own folder otherwise), the environment sees the host's files read-only and the value is every file there, and only a host admin adds, deletes or cuts into it) or `file` (the name of a file an owner placed for the module, see below; environment scope only; `folder`: where the files go inside modules/<id>/, lowercase letters, digits and dashes, default `files`, never `versions`); a setting may carry `showWhen: { key, value }` (the form shows it only while that other setting has that value) or `showWhen: { key, not }` (only while it has any other value); a `choice` option may carry its own `help` (up to 600 characters, line breaks kept) and the choice a `defaultIfSet: { key, value }` (it starts as that option when the other setting already holds a value and it holds none of its own, for a setting that grew into a choice); `scope` says who chooses it: `environment` (an owner, for everyone), `space` (an owner or a space's moderators, for that space) or `person` (each person for themselves). A setting holds plain data, never a secret. Collaborator draws the forms and keeps the values; the module reads them (see [api-module-sdk](api-module-sdk.md)).
- `access` names which of the module's own permissions guards reading and writing its data, for example `{ "read": "view", "write": "edit" }`. `surfaces.canvas.mode` lists `float`, `dock` or both. `surfaces.canvas.menu` (optional, `true` or `false`, default `true`): `false` keeps the module out of the space bar and the canvas never opens or restores it, for a module that is on in a space only for its permissions or hooks (the Assistant, from 0.1.20); anything but a boolean refuses the install ("module.json: surfaces.canvas.menu must be true or false"). `surfaces.canvas.lobby` (optional, `true` or `false`) says the module belongs on the Lobby's canvas; absent or false keeps it out of the Lobby (see "The Lobby" below). It asks for no approval, since it only narrows where a module can be; anything but a boolean refuses the install ("module.json: surfaces.canvas.lobby must be true or false"). `surfaces.widget` (needs the `environment` scope) is a small view for the dashboard on the spaces page: an `entry`, a `title` (up to 40 characters, the module's name if omitted), a `size` of `small`, `medium`, `wide` or `tall` (`tall` for a widget with a grid, such as a month), and an `order` number (lower comes first, default 100).
- `surfaces.keyed` is a **keyed page**: `{ "path": "view", "entry": "view.html" }`, a page of the module about one person, opened at `/<path>/<key>?s=<access key>` with the server's access key in place of a sign-in, for something unattended such as a browser source in a streaming program. `path` is 2 to 20 lowercase letters, digits and dashes and cannot be a path the server serves itself; one enabled module per path (turning on a second that claims the same path fails, naming the first). The entry is built from `src/<id>-keyed.*` (like a widget's from `src/<id>-widget.*`), and it always runs in the page, never in a frame, since the host draws media into it. A keyed page's viewer is nobody: `user.role` is `viewer`, every permission is false, and it can only read (`context`, its settings) plus what the SDK offers a page that follows people (`host.presence`, `host.images`, `host.media`; see [api-module-sdk](api-module-sdk.md)). With the module off, the path answers 404 with a sentence naming the module. `GET /api/status` lists the keyed paths currently served in `pages`.
- `surfaces.destination` (optional) is a list of up to two **parts** the module offers to the host's destinations, the pages of their own in the top bar ([Destinations](#destinations) below): each `{ "id": "calendar" | "map", "part": "main" | "panel", "entry": "<file>.html", "label"?: "<words>", "order"?: <number> }`. `entry` must exist in the zip, like any other surface's, and may be the module's page. `label` (up to 40 characters, manifest words like the others) is what the panel's switch and a phone's tab show; without one, the module's display name. `order` places a panel among the destination's others (lower first, default 100, clamped to -1000 to 1000). A module may declare one `main` and one `panel` per destination. A part mounts at environment scope, so the module needs the `environment` scope. Adding a part asks the admin for nothing new. Refusals (400): `module.json: surfaces.destination must be a list of parts`, `... lists at most two parts`, `module.json: surfaces.destination needs the "environment" scope`, `...: write each part as { "id", "part", "entry" }`, `...: "<field>" is not a part's field; the fields are id, part, entry, label, order`, `...: "<id>" is not a destination; the destinations are calendar and map`, `...: a part must be "main" or "panel"`, `...: only one <part> part for <id>`, `...: a part's label must be words`, `...: a part's order must be a number`, and a missing entry as for any surface.
- `install` (optional, bundled modules only): `{ "auto": true, "settingsFrom": "environment" }`. `auto` has the server install and turn the module on by itself, once per environment, on the first start that carries it and has never done so there (the module registry remembers, so an owner who uninstalls it is respected). `settingsFrom: "environment"` copies, on that one install, each declared environment-scope setting whose key the environment's own settings hold, so a setting that moved out of the core into the module keeps the value the owner chose.
- Anything else in the manifest is ignored.

## Routes

| Call | Purpose |
|---|---|
| `GET /api/modules` | `{ modules, limits }`: installed modules, their state, versions, and what awaits approval |
| `POST /api/modules` | Body is the zip, sent as `application/zip`. Returns 201 and `{ module }`, disabled until approved |
| `PATCH /api/modules/:id` | `{ enabled }`, `{ allSpaces }`, `{ spaces: [space ids] }`, or `{ displayName, displayIcon }` (either may be `null` or `""` to go back to the module's own); returns `{ module }`. A refused change changes nothing |
| `POST /api/modules/:id/rollback` | `{ version }`; returns `{ module }` |
| `DELETE /api/modules/:id?keepData=0` or `=1` | Uninstall; `keepData` defaults to keeping the data |

A module in the list has the manifest fields plus:

| Field | Meaning |
|---|---|
| `enabled` | Whether it is on |
| `name`, `icon` | The module's own, from its manifest |
| `displayName`, `displayIcon` | What this environment shows it as: the owner's choice, else the template's (a later step), else the module's own |
| `ownDisplayName`, `ownDisplayIcon` | The owner's stored choice, even when it can't be drawn now (an icon no longer in the environment's set) |
| `allSpaces`, `spaces` | Where a space module is available. `allSpaces` means every space the module may be in: the Lobby only when `lobby` is true |
| `lobby` | Whether the active version declares `surfaces.canvas.lobby`, so it may be on in the Lobby |
| `outdated`, `outdatedWhy`, `outdatedVersions` | Set when the installed manifest uses an old name, so the module can't run: `outdated` is "This module was built for an older version of <product> and needs an update from its author." (<product> is the configured product name, `PRODUCT_NAME`; "module" is this environment's word), `outdatedWhy` the sentence naming the old name, `outdatedVersions` the installed versions that use one |
| `needsUpdate` | The modules this one requires that are outdated, so this one can't run either. A module runs only while everything it requires is running, at any depth; `enabled` keeps the owner's choice, so it comes back by itself, and `missing` and `needsUpdate` say why it isn't running |
| `versions` | Installed versions, newest first |
| `needsApproval`, `pending` | Whether the active version asks for permissions, hooks, refs to consume, events to hear or actions to ask for that are not yet approved, and which |
| `installedAt`, `updatedAt` | Timestamps |

## Behavior to rely on

- An upload must be newer than every installed version of that `id`; otherwise it is refused with 400.
- Enabling a module records that the owner approved the permissions and hooks it lists. An upgrade or
  rollback that asks for anything not yet approved comes back with `enabled: false`.
- `allSpaces` and `spaces` are refused unless the module has a space scope.
- **The Lobby.** The Lobby (space id `lobby`) holds chat, the conference while the environment has it on, and
  modules whose active version declares `surfaces.canvas.lobby: true`; nothing else is ever on there. `PATCH` with
  `spaces` including `lobby` for any other module answers 400 "`<Module>` can't be turned on in `<Lobby>`, which is
  kept for chat, the call and a few modules made for it.", `<Module>` being the display name and `<Lobby>` the
  Lobby's own name. `GET /api/modules/for-space?space=lobby` never lists such a module, and loading it there
  (`/modules/<id>?space=lobby`, or its settings for the Lobby) answers 404 with the same sentence. Every
  environment build, and a rollback, takes `lobby` out of the `spaces` of any module whose active version doesn't
  declare the field, and logs "`<Module>` is no longer on in `<Lobby>`; it stays on in its other spaces." Its data
  for the Lobby is kept, untouched, and read nowhere.
- **Display names and icons.** An owner may show a module under another name and icon (`PATCH` above; the
  built-in Conference and Chat too). Refusals (400): "A display name is plain text, without < or >.", "A display
  name can be at most 40 characters.", "A display name can't hold control or text-direction characters.", "There
  is no icon called `<id>` in this environment's icons.", "The icon `<id>` is not a solid Font Awesome icon, so it
  can't be a module's icon.", and for a built-in, "`<name>` is built in, so only its display name and icon can be
  changed here." A module's own icon is always allowed. The display name and icon are what every page, sentence
  and notification shows; `GET /api/modules/for-space` gives the built-ins as `builtin: [{ id, name, icon }]`, and
  `GET /api/notifications` items carry `moduleName` and `icon`. Uninstalling with the data deleted clears them; a
  plain uninstall keeps them.
- **Linked objects after a write.** After a successful `PUT` or `DELETE` of a module's data, the server keeps what points at that object true: a held pointer is removed, marked, retitled or moved to the new day, and a dated twin is created, written or deleted (see [api-module-sdk](api-module-sdk.md), "Keeping links true"). These are the server's own writes: they reach pages as ordinary `change` events, do not count toward the write limit, and do not start another round. A dated twin is skipped when the receiving module's store is full (413) and tried again on the sender's next change.
- **Existing dated objects get a twin once.** Each time the server starts (in a hosted install, once per environment when it begins listening), every space object of a kind with `mirror: "out"` that has a day, holds no pointer and has no pair gets its twin. A pair, kept or detached, is the record, so a later start makes nothing new. A timed object's twin uses the server's time zone (`TZ`, then UTC). Personal objects are skipped. The log says `Made <n> dated twin(s).`
- **Objects.** The routes above were `/api/refs/...` and answered cards until step 7 of the Names plan; the old
  paths answer 404. A manifest's `refs.produces[].card` is refused ("module.json: refs kind "<kind>" uses the old
  card; use summary (<product> renamed an object's card to its summary).").
- **`storage.renamed`** (optional): `[{ from, to }]`, up to 10 key prefixes (1 to 64 letters, digits and
  `. _ : / -`). The server moves keys starting with `from` to `to`. A rename is in effect for every version from the one that introduced it onward, even if later versions stop listing it. While it is in effect, keys still under the old prefix are moved on every start, install, update and rollback; switching to a version older than the one that introduced it moves the keys back (the newest rename first) and drops the record. The registry records each as `renamed: [{ from, to, version, at, kept }]`. A key whose new name is already taken is never overwritten: both are kept (`kept`). The log and the activity list note only keys actually moved and new conflicts. Entries that repeat a `from`, overlap, or would move keys back are refused.
- **Words in the manifest.** The text people read (`description`, the widget's `title`, permission labels,
  setting labels, `help` and options, event and action labels, and kind names) may use the environment's word
  placeholders, `{space}`, `{spaces}`, `{Space}`, `{a space}` and the like for each changeable word, and is
  shown in the environment's own words. `tools/check-names.mjs --words` reads bundled manifests.
- **Old names are refused.** A manifest using an old name is refused at upload with 400 and one sentence naming
  the new word: a module `scope` of `server` or `room`, a setting's scope, `install.settingsFrom: "server"`, a
  permission default keyed `user`, or `surfaces.panel`. For example: `module.json uses the old scope "room"; use
  "space" (<product> renamed rooms to spaces).`, or `module.json uses the old surfaces.panel; use surfaces.canvas
  (<product> renamed a module's panel to its place on the canvas).` A module already installed with such a manifest stays installed but can't run:
  turning it on, or rolling back to such a version, answers 409, and a module that requires it doesn't run either
  (409 "`<Name>` needs `<Req>`, which needs an update from its author.").
- The upload limits are 10 MB for the zip, 500 files, 10 MB for any one file and 40 MB unpacked. A zip
  over the limit gets 413.

## Runtime routes

These routes, the SDK and the manifest all use the names of the [Names plan](../plans/plan-names.md): `environment`, `space` and `spaceId` (before steps 5a and 5c, `server`, `room` and `roomId`).

These serve a running module. The page hosting a module's frame calls them for it (see [api-module-sdk](api-module-sdk.md)); they need a signed-in session, or for a space a guest link token in `guest=`. Data routes take `scope=environment` (the default, when no scope is given), `scope=space&space=<id>`, `scope=person`, or, where a route reads across the caller's spaces, `scope=spaces`. The old values `server` and `room` and the `room=` parameter are refused (400 "scope must be environment, space, spaces or person"; a route that takes one place answers "scope must be environment, space or person here", and the bus "scope must be environment or space here"). A module must be enabled, and for a space it must be on for that space and the caller in it. The module's `access` permissions decide who may read and write.

| Call | Purpose |
|---|---|
| `POST /api/modules/:id/ai` | Body `{ task, question?, objects? }` (`task` `summarise`, `ask` or `tags`; `objects` up to 12 pointers; the old `items` is refused). Returns `{ text, summaries, tags, used, tokens }`, with `{{summary:N}}` markers in `text`; see `host.ai` in [api-module-sdk](api-module-sdk.md) |
| `GET /m/:id/:version/*path` | A file of the active version of an enabled module, with a sandbox content security policy. HTML pages get the SDK and base styles injected |
| `GET /api/modules/nav` | Every enabled module with an environment page (`scope` includes `environment` and the manifest has `surfaces.page`) that this person may read at environment level, widget or not: `{ modules: [{ id, name, icon, version, scope, runMode, page, widget, nav }] }`, `name` and `icon` as this environment shows the module, `page` the page's entry file, `nav` always `true` (kept for older pages; `surfaces.page.nav` is not read). A read permission only in some space is not enough, since the page mounts for the environment. A module with only a space's canvas (Maps, Research) is not listed. Signed out, or with only a guest link's token: `{ modules: [] }`. `public/module.js` uses it to find and name a module's own page; the top bar no longer asks it |
| `GET /api/modules/widgets` | Modules with a dashboard widget this person may read, in order: `{ widgets: [{ id, name, icon, version, scope, runMode, title, size, order, entry, href }] }`. `href` is where the tile's heading goes: while the module is a part of a destination shown for this person, the destination's address (`/calendar`, `/map`), with `#panel=<module id>` when the module is one of its panels rather than its main (the To-do's is `/calendar#panel=todo`); else `/modules/<id>`. Guests get none |
| `GET /api/modules/for-space?space=<id>` | `{ modules, builtin, opensWith, spaceDefaultsOpensWith }`. `modules`: the modules with a canvas surface in that space this person can see, each with `color` (null when none), `canvas` (it was `panel`; it carries `menu`) and `commands` (`[]` when none); the page leaves out any with `canvas.menu: false`. `builtin`: the conference and the chat as this environment shows them, `[{ id, name, icon }]`. `opensWith`: the space's own list of what a first visit opens, or `null` when it has none. `spaceDefaultsOpensWith`: the environment's list for a new space (from its template), or `null`. 401 "sign in first"; 404 "no such space" |
| `GET /api/modules/:id/settings/values?scope=&space=` | The settings as they apply to the caller here: `{ values }`, with the module's default for what nobody has chosen (the environment, this space and the person's own together) |
| `GET /api/module-settings/:scope?space=` | The modules that have settings of a scope (`environment`: an owner; `space`: an owner or that space's moderators, with `space=`; `person`: anyone signed in) with each setting and its value, for the forms. Anyone else, reading or changing them, gets 403 "only an owner changes the environment's settings" or "only an owner or the space's moderators change its settings". The old scopes `server` and `room` answer 404 "no such kind of setting" |
| `GET /api/modules/:id/files/:name?scope=&space=` (a `file` setting in the settings routes also carries `available`, the usable names, `folder`, `exists` and `skipped: [{ name, reason }]` for what the folder holds that was ignored; the server logs the same at startup) | A file the operator placed in `DATA_DIR/modules/<module id>/<folder>/` (the `folder` the module's `file` setting names), read by range (`Range` requests answer `206`), for anyone who may read the module's data in that place. Only files in that folder, by a plain name (letters, digits, dot, dash, underscore), are reachable; `Cache-Control: private` |
| `DELETE /api/modules/:id/files/:name` | Owners only. Removes the file for good, and un-ticks it from any `files` setting (or clears a `file` setting) that named it, so nothing keeps pointing at a file that is gone |
| `PUT /api/modules/:id/settings/:scope` | Body `{ values, space? }`; the same people as above. Only settings the module declares for that scope are taken, each checked against its type and limits (400 otherwise). Environment and space changes are noted in the activity list |
| `GET /api/modules/:id/context` | Who is asking and their permissions in the module, with `space`: `{ id, name, createdAt }` when the read is in a space (`?scope=space&space=<id>`), else `null`; and `phases`: the environment's template's phases, `[{ id, label, main? }]`, or `[]` with no template or none listed. `phases` is read live, so a template edit is in the next read. The SDK answers them as `host.space()` and `host.phases()` |
| `GET /api/modules/:id/data?prefix=` | `{ items }`, each `{ key, value, version, updatedAt, by }` |
| `GET /api/modules/:id/data/:key` | `{ item }`, or 404 |
| `PUT /api/modules/:id/data/:key` | Body `{ value, version?, tz? }`; returns `{ item }`, or 409 with `{ error, current }` if `version` is stale. `tz` is the writer's IANA time zone, used only to turn an instant into a day and a time for held pointers and twins; one the server does not accept falls back to `TZ`, then UTC, and never refuses the write |
| `DELETE /api/modules/:id/data/:key?version=&tz=` | Delete a key. `tz` as above |
| `POST /api/objects/resolve` | Body `{ from, refs: [{ module, kind, id, scope, space? }] }` (`scope` is `environment`, `space` or `person`) (`from` is the asking module, up to 50 refs). Returns `{ summaries }` in the same order: a summary, or `{ ref, error, status, state? }` for each that is missing, invalid or not allowed; `state` says what to draw: `gone` (the object no longer exists) or `hidden` (it exists, or may, but this viewer may not see it, which is all the viewer is told) |
| `POST /api/bus/publish` | Body `{ module, name, ref?, data?, scope, space? }`: the module says one of its declared events happened. Needs write access to the module; `ref` must be one of its own objects in the same place; `data` at most 2 KB |
| `GET /api/bus/events?module=&scope=&space=&after=` | The events the module may hear (declared and approved) after event `after`, about modules the person can see here, at most 100; `after=now` returns just where things stand |
| `GET /api/bus/actions?from=&scope=&space=&accepts=&self=1&ref=` | The actions the asking module may request, only those the person could do themselves. `accepts=module:kind` keeps those that take a pointer to that kind of object; `self=1` adds the asking module's own, marked `own`. `ref` (optional, a pointer as JSON, such as the object just dropped; 400 "that is not a valid reference" when it isn't one): asked from an environment page, an action that takes one of its provider's own objects is listed only if the person may change the provider where that object is (in its space, for one in a space). Without `ref`, such an action is listed when the person may change the provider at environment level or in one of their spaces; the request is then checked in its object's place (below). Each entry is `{ action, module, moduleName, icon, name, label, input, needs?, takes?, own? }`; `takes` is the action's declared list, each entry with `may` (whether the person holds that entry's `permission` in the place asked about; true when it names none), and an action whose every entry is refused is left out |
| `POST /api/bus/actions/request` | Body `{ from, action: "module:name", input, scope, space? }`; the input is checked against the action's declared types, an `object` field as under [Handing an object to a module](#handing-an-object-to-a-module). Returns `{ id, status }`. A body over 64 KB on any `/api/bus/` route answers 413 "that request is over 64 KB". Asked from an environment page about one of the provider's own objects in a space (a `ref:<provider>:<kind>` field), it takes the right to change the provider in that space, not at environment level; the request still waits at environment level and records that space (`space`). Pointers to the provider's objects in two places answer 400 "an action can change objects in only one place at a time" (the environment's word for objects) |
| `GET /api/bus/actions/pending`, `POST /api/bus/actions/claim`, `POST /api/bus/actions/complete`, `GET /api/bus/actions/status` | The providing module's page takes a waiting request (one page only), reports the result; the asking module reads the status (`pending`, `claimed`, `done`, or `expired` for a request that passed its time limit unclaimed, see `POST /api/spaces/:id/action`). `complete` answers `{ ok: false }` for an expired request, unless the page claimed it in time and is still within the claim's minute. Need write access to the providing module; for a request that records a space, write access in that space. `pending` lists such a request only to people who may change the provider there |
| `GET /api/objects/kinds?from=` | The kinds of other modules' items the asking module may link to: `{ kinds: [{ module, moduleName, icon, kind, name, open, events: [{ name, label, data }] }] }`, where `events` is what that kind of item can report. A module installed later appears here with no change to anything else |
| `POST /api/objects/links` | Body `{ module, from, to: [refs] }`: the asking module says what one of its own objects points at (the whole list). Targets the viewer cannot see, or the module may not link to, are left out. Needs write access to the module |
| `GET /api/objects/links?from=&ref=&dir=to\|from` | What points at (`to`, only for a kind with `backlinks`) or is pointed at by (`from`) one of the asking module's own objects: `{ summaries }`, each only for what the viewer may see |
| `GET /api/objects/search?from=&scope=&space=&q=&has=` | `{ summaries }` for objects `from` may link to in one scope: every kind it was approved to consume, matching `q`, newest `when` first, up to 50. `scope=spaces` reads every space the viewer is a member of at once, each provider only where it is on and the viewer may read it there, each summary's pointer carrying its `space`; signed-in people only (a guest link: 403 "guests can only search one space", in the environment's words). `has=place` keeps only summaries with a `place` and answers up to 1,000 rather than 50; any other `has` is 400 "has must be place" |
| `GET /api/modules/:id/objects/:kind/:objectId?from=&scope=&space=` | One summary, `{ summary }`, or an error |
| `GET /api/modules/:id/geocode?q=&lat=&lon=&scope=&space=` | A place search for a module that declares `geocoder` (404 "this module has no place search" otherwise; the environment's word). Needs the module's `read` permission. `{ results: [{ key, title, sub, lat, lng, source, from }], configured, credit }`, at most 8: the saved places first (`source: "server"`, "Saved on this server"), then the service's (`"service"`, "From <service>"). Under two characters, `{ results: [], configured: true }`; with no search chosen, `configured: false`. 429 over the search limit; 502 "search is not available right now" when the service fails and nothing saved matched |
| `POST /api/modules/:id/geocode/use` | Body `{ key }`: someone picked or saved that result, so it is kept when unpicked ones are removed. `{ ok }`. Needs the module's `read` permission (it was `write`), so a result saved into a space from a page where the person only reads the module, such as the Map page, is still marked |
| `GET /api/objects/format` | The published objects format: `{ version: 1, fence: "objects", fileSuffix: ".objects.json", instructions, schema }`, `instructions` in this environment's word for object. A signed-in person or a guest with a link; else 401 `sign in first`. See [The objects format](#the-objects-format) |
| `GET /api/objects/format/schema` | The JSON schema alone, `Content-Type: application/schema+json`. The same callers as above |
| `GET /api/modules/:id/objects/check?scope=&space=` | Whether this person may bring objects into this place with this module: `{ available, why }`, `why` being `""` or one of the 403 sentences under [The objects format](#the-objects-format). Needs the module's `write` permission |
| `POST /api/modules/:id/objects/check?scope=&space=` | Reads objects out of a pasted answer (`Content-Type: text/plain`) or a file's bytes (`application/octet-stream`, decoded as UTF-16 by its byte order mark, else UTF-8); stores nothing. Answers `{ version: 1, objects, found, dropped, over }`. Needs the module's `write` permission; the refusals are under [The objects format](#the-objects-format) |
| `POST /api/modules/bundled/:id/install` | Owners only. Builds one of the modules that ship with this Collaborator (a folder under `modules/` next to the server) into a zip and installs it as an upload would be, so it is the same validation, approval and versioning; 404 for anything that is not a bundled module. `GET /api/modules` lists them as `bundled`: `{ id, name, icon, description, version, installed, update }` |
| `GET /api/modules/:id/spaces-data?prefix=` | For a module's environment page: `{ spaces, items }` across the caller's own spaces (a member, module on for the space, role can read it), each entry with its `spaceId`, each space `{ id, name, icon, svg, write }`, `write` being whether the caller holds the module's `write` permission in that space, so an environment page knows where it may add. `?info=1` returns just `{ spaces }`. Guests get 403. (Was `rooms-data`, now 404) |
| `GET /api/modules/stream?space=` | One server-sent stream for all modules on a page: `change` and `schedule` events with `module`, `scope` (`space`, `environment` and `person` with a space; `environment`, `person` and `spaces` without) and `spaceId`, filtered to what the caller may read. Also `refchange` `{ ref, change, modules }` when an object something points at is written (`updated`, only when its summary changed) or deleted (`deleted`); `modules` lists the modules holding a link to it that the caller may see there, and only those frames are told (`host.objects.onChange`). Also `markers` `{ modules }` when an object of a marker kind is written or deleted where the caller reads it (see "Calendar markers") |
| `GET /api/modules/:id/events` | Server-sent events: `change` for data changes and `schedule` when one fires. `?scope=spaces` streams changes from all the caller's spaces, each with a `spaceId` |
| `POST /api/modules/:id/schedule` | `{ key, at, payload?, notify? }`; needs the `schedule` hook |
| `DELETE /api/modules/:id/schedule/:key` | Cancel a schedule |
| `POST /api/modules/:id/notify` | `{ to, title, body }`, `to` being `space`, `environment` or a person's key (otherwise 400 "to must be space, environment or a person's key"); needs the `notify` hook |
| `GET /api/notifications` | The signed-in person's notifications, with unread counts by module |
| `POST /api/notifications/read` | `{ module }` or `{ id }` marks them read |
| `GET /api/notifications/stream` | Server-sent events: `notification` |

A module's environment page may also read and write one of the caller's spaces with `scope=space&space=<id>`, the SDK's `{ space }` (see [api-module-sdk](api-module-sdk.md), "Storage"); the server applies the same rule as for a page in that space: the module on there, the caller in it, and the module's permission there. That holds for the data, schedule, notify and links routes.

Limits: a value is at most about 60 KB, a module's data 5 MB, a schedule payload 4 KB, 500 schedules per module and 50 notifications per person. Rate limits, per module and per person over a minute: 240 saves or deletes, 60 events, 60 asked actions, 60 schedules, 20 notifications and 20 object checks (`POST /api/modules/:id/objects/check`). Over a limit a call gets 429 with a `Retry-After` header and the module is told to slow down; the first time in a while it also puts a line in the owner's activity list (`GET /api/modules/activity`, admin only), which is kept across a restart.

An asked action's input is checked against its declared types: a `string` field is cut at 200 characters and a `text` field at 8000 (it was 1000 before #73).

## Destinations

A destination is a page of its own in the top bar's middle zone, made of the parts modules declare in `surfaces.destination` ([plan-calendar-destination](../plans/plan-calendar-destination.md), [plan-map-destination](../plans/plan-map-destination.md); how it is put together is in [architecture-navigation](../architecture/architecture-navigation.md), "Destinations"). Collaborator knows two, in this order:

| Id | Page | Shown while | Also needs |
|---|---|---|---|
| `calendar` | `/calendar` | `settings.showCalendar` is `true` | |
| `map` | `/map` | `settings.showMap` is `true` | its main module has a file to draw from: an environment `file` or `files` setting naming at least one file that is in its folder (with a folder shared by the host, any file there). A map file at a web address does not count |

A destination is shown to a signed-in person when its option is on and its one `main` part is enabled and readable by them at environment level: the module's `read` permission for the environment, as `GET /api/modules/nav` requires (a read only in some space is not enough, since the parts mount at environment scope). The `main` is the bundled module that declares it, else the first enabled one that does, by id. Panels are every enabled module declaring a `panel` for it that the person may read at environment level, by `order`, then id; a panel alone never shows a destination. Guests, and anyone not signed in, see none.

| Call | Purpose |
|---|---|
| `GET /api/destinations` | `{ destinations: [{ id, name, icon, href }] }`, the destinations shown for the caller, in the bar's order. `name` and `icon` are the main module's display name and icon in this environment, so a template's or an owner's name for the module carries; `href` is the page. `[]` for a guest or nobody signed in |
| `GET /api/destinations/:id` | `{ id, name, icon, main, panels, spaces }`. `main` and each panel: `{ part, module: { id, version, scope, name, icon }, entry, runMode, label }`, `label` the manifest's or else the module's display name. `spaces`: every space any part reads for the caller (the `spaces-data` rule), in the space list's order, each `{ id, name, icon, svg }`. 404 "That page is not in this top bar." when it is not shown for the caller |
| `GET /calendar`, `GET /map` | The destination page (`public/destination.html`). A guest (`?guest=<token>`): a redirect to their space's link, `/guest/<token>`, or to `/` for a link that no longer works. Otherwise not signed in: a redirect to `/login?next=<the address>`. Not shown for the caller: a redirect to `/` |
| `GET /modules/:id` | While a destination the module is a part of (its main or a readable panel) is shown for the caller, a module's environment page (no `space`, `popout` or `guest` in the query) redirects to the destination's address, keeping the query and the hash (`#day=`, `#ref=`), so a page opened over a space keeps its way back. A pop-out (`?space=`) is never redirected, and with the option off nothing changes |

**The options.** `GET /api/settings` (owners and the admin) carries `showCalendar` and `showMap`, `true` or `false`, both `false` unless an owner or a template turned them on, and `topBarReasons: { calendar, map }`: why each cannot show for anyone whatever its switch, one sentence, or `null` when nothing stands in its way. The sentences: "Turn on <module> on the Modules tab first." (its main module is installed but off; the environment's words), "No installed module offers this page yet.", "Ask the host's admin for a file for <module>." (the files are the host's) and "Choose a file for "<setting label>" in <module>'s settings first.". Who may read the module is each person's own question and is not in `topBarReasons`. `PATCH /api/settings` takes `showCalendar` and `showMap` from owners and the admin; anything else is read as a boolean. A template may give both (`settings`, see [architecture-environments](../architecture/architecture-environments.md)); the Travel template, from version 4, turns both on in an environment made from it.

## Chat routes

Chat is part of the space page, not a module (`public/chat-input.js`), but it asks the AI and routes commands for modules ([plan-one-input](../plans/plan-one-input.md)). Every route needs a signed-in session, or a guest link where noted; the space must exist (404 "no such space"; an aside's id answers 404) and the caller must be a member of it, an owner or the admin (403 "you are not in that space").

**Who may use AI here.** Signed in and not a guest (403 "guests cannot use AI"), in a space without **Turn AI off in this space** (403 "AI is turned off in this space"). The Assistant module's **Use** permission no longer counts here, and the Roles tab's **Use AI in modules** is not required.

| Call | Purpose |
|---|---|
| `GET /api/spaces/:id/ai` | `{ available, why }`: whether this person may use `/ai` here, with `why` one of the sentences above, "AI is not set up on this server", or that the key can't be read and an owner must enter it again |
| `POST /api/spaces/:id/ai` | Body `{ question, refs? }` (`refs` up to 12 pointers, read as the asker; `objects` is taken too). Returns `{ text, summaries, used, tokens, id, questionId, at, question, message }`, as `POST /api/modules/:id/ai` with task `ask`: the question and the answer are stored as the asker's private chat messages and returned as stored (`question`, `message`). `share` is accepted and ignored (`shared` is always `false`); nothing is posted to the chat. 403 as above; 503 when AI is not set up or its key can't be read; 429 over the per-person limit (6 a minute) or the environment's monthly calls; the AI service's own errors as for the module route. Counts toward the environment's AI calls |
| `GET /api/spaces/:id/ai/thread` | The asker's own thread, in its old shape, read from the chat: their private `/ai` questions and AI answers as `{ entries: [{ id, at, role: "user"\|"ai", text, summaries? }] }`, oldest first. The page no longer uses it. Nobody can read another person's: any `user=` gives 403 "that thread is not yours". Guests get 403 |
| `DELETE /api/spaces/:id/ai/thread` | Deletes the asker's private `/ai` questions and AI answers in this space. `{ ok: true }` |
| `GET /api/spaces/:id/chat` | Needs `chatRead`. `{ messages }`: the space's public messages and the caller's own private ones, oldest first. A guest gets public messages only |
| `PATCH /api/spaces/:id/chat/:messageId` | Needs `chat`. Body `{ visibility: "public" \| "private" }`; only the author may change it, never a guest. 200 `{ message }` as stored (the same value is a 200 that changes nothing); only `visibility` changes. 400 "visibility is public or private"; 403 "only the person who posted it can change who sees it"; 404 "no such message" (also for someone else's private message); 429 over the chat post limit. Tells the call `{ type: "chat-visibility", id, visibility: "public", message }` when it becomes public, `{ type: "chat-visibility", id, visibility: "private" }` when it becomes private |
| `DELETE /api/spaces/:id/chat/messages?type=&scope=&module=` | Clears the messages of one type (Chat's **Clear…**, [plan-chat-clear](../plans/plan-chat-clear.md)). `type` is `chat` (ordinary messages), `ai` (`/ai` questions and AI answers), `module` (one module's command messages, with `module=<id>`) or `all`; `scope` is `mine` (your own of that type, public and private) or `everyone` (every public message of that type, and your own private ones, never anyone else's). `{ ok: true, deleted }`. In order: 401; 404 for no such space; 403 when not in the space or the role can't read the chat; 400 "type is chat, ai, module or all"; 400 "which module"; 400 "scope is mine or everyone"; 403 "guests can't clear messages"; 403 for `everyone` without moderator rights ("Only an owner or a moderator can clear everyone's messages"). The space's `cleared` time is not changed. The call is told the public ids: `{ type: "chat-clear-some", ids, by, who, scope, clearType, module? }` |
| `POST /api/spaces/:id/chat/:messageId/preview` | Needs `chat`. The author asks the server to read the message's link ([plan-chat-links](../plans/plan-chat-links.md)). Answers `{ message }`; does nothing (and answers the message as it is) for a private message, a command or AI message, one with no link or already read, one older than the preview window, when no module that keeps links is on here, when its **Fetch link previews** setting is off, or when the author may not add to it. 404 "no such message"; 403 "only the person who posted it can ask for its preview" (a guest never can); 429 over the module's search limit. When it reads a page, the call is told `{ type: "chat-preview", id, preview }` (not for a private message). Only this notice, or the history, supplies a preview's title and picture: a live chat message from another page cannot |
| `GET /api/spaces/:id/chat/:messageId/image` | Needs `chatRead`. The preview's picture, fetched by the server so no browser asks the other site; `Cache-Control: private, max-age=600`. 404 with no body unless the caller can read the message, it has a picture and the keeping module is on here with **Fetch link previews** on; 429 over the limit |
| `POST /api/spaces/:id/chat/:messageId/keep` | Needs `chat`. Saves the message's link into the keeping module as the person who pressed it, through its `saveLink` action (the input is built from the stored message, never from the page). `{ id, status: "pending" \| "kept", message }` (`id` the bus request's, for `GET /api/spaces/:id/action/:requestId`): `pending` while the request waits for the module to be open (the plan said `queued`; the bus's word is `pending`), `kept` when the link was already kept, once per message; either way the page shows "Kept by <name>" at once. 404 "no such message" or "nothing here can keep links"; 403 "you cannot add to <module> here"; 429 "too many messages, slow down". The call is told `{ type: "chat-kept", id, kept }` (not for a private message) |
| `DELETE /api/spaces/:id/chat/private` | Needs `chat`, signed in. Deletes every private message of the caller's in the space. `{ ok: true, deleted }`; 403 for a guest |
| `DELETE /api/spaces/:id/chat/:messageId` | The author may delete their own message, private ones included; a moderator may delete public messages, never someone else's private one (404 "no such message") |
| `POST /api/spaces/:id/command` | Body `{ name, text, module? }`. Needs the `chat` permission (a guest of the space may). Finds the command among the modules on in this space that the caller can read, and requests its action on the bus as a `local` request with `{ text }`, carried out in the caller's own open copy. Returns `{ id, status, module, moduleName, message }`: for a signed-in caller the server also stores the command as their private chat message (`kind: "command"`) and returns it; a refused command stores nothing. 400 or 404 `No command /<name>` (a bad name, `ai`, or no match); 409 `{ error: "which module", choices: [{ module, name }] }` when two modules match and `module` doesn't pick one; 404 when the action is gone or not local; a refusal of the input answers its own status and sentence, such as 400 "text is needed" for empty text when the action needs it (it was a 500); 413 "that request is over 64 KB" for a larger body. Whether the module is open is the page's to check: the page says "<module> isn't open" and sends nothing |
| `GET /api/spaces/:id/actions` | Needs `chatRead`. Every action the modules on in this space offer, for Chat's **Keep**: `{ actions: [{ action: "module:name", module, moduleName, name, label, input, local, needs?, takes?, may }] }`. `needs` is the action's declared list, when it has one, as `GET /api/bus/actions` gives it: what a request must carry (the Calendar's `createEvent` has `["date"]`). `takes` is the action's declared list (see the manifest's `takes`), each entry with its own `may`: whether this person holds the entry's `permission` here, true when it names none. The action's `may` is whether this person could ask for it (a `local` one always; otherwise the right to change that module here) and, for an action with `takes`, whether some entry's `may` is true, so the page hides **Keep** from anyone who can't. Unlike `GET /api/bus/actions`, an action nobody here may use is still listed, with `may: false` |
| `POST /api/spaces/:id/action` | Needs `chat`. Body `{ action: "module:name", input }`; requests it on the bus as the caller, as `POST /api/bus/actions/request` does (a non-local action also needs write access to that module). Returns `{ id, status }`; `status` is `pending` until the module is next open. A `local` action (a view or a form on the person's own open page, such as Polls' `draftPoll`) asked this way is handed out for 60 seconds only: if no page of the module claims it in that time it is `expired`, is never carried out, and doesn't wait for the module's next opening. A request through `/command` still waits, on purpose. **Limit:** this route, `POST /api/spaces/:id/command` and `POST /api/spaces/:id/chat/:messageId/keep` together allow 60 requests a minute per person, counted once across every module (a space's guests share one count; a request refused before it is queued doesn't count); over it, 429 "too many requests in a minute, slow down". The keep route also keeps its own 429 "too many messages, slow down". The input is checked as the bus checks it, an `object` field as under [Handing an object to a module](#handing-an-object-to-a-module); a refusal answers its own status and sentence, such as 400 "title is needed" (it was a 500). 413 "that request is over 64 KB", as for `/command` |
| `GET /api/spaces/:id/action/:requestId` | Needs `chatRead`. How a request the caller made in this space went, for Chat's note after **Keep** and **Send to...**: `{ id, status }`, `status` one of `pending`, `claimed`, `done` and `expired`; when `done`, also `ok`, and `error` (the module's refusal, when not `ok`) and `note` (the module's `data.note`) when given, each one line of at most 300 characters. Never the input or the module's other data. A finished request can be read for 10 minutes after it finished. 400 "a request id is a whole number"; 403 "Guests can't see how a request went" (a guest's requests all share one sender); 404 "no such request" for a request someone else made, one from another place, one finished more than 10 minutes ago, or none |
| `GET /api/spaces/:id/objects/check` | `{ available, why }`: whether this person may bring objects in here (signed in, not a guest, AI not turned off in the space). No module permission is involved |
| `POST /api/spaces/:id/objects/check` | As `POST /api/modules/:id/objects/check`, without naming a module: reads objects out of a paste or a file and stores nothing. 403 as the GET's `why`; 413 over 256 KB; 415 for another content type; 429 over the limit |

**Storage** ([plan-chat-model](../plans/plan-chat-model.md)). Every message is one entry, kept by `server/chat-history.js` in one of two files: public messages in `DATA_DIR/chat.json` (`{ spaces, cleared }`, its old shape), private ones in `DATA_DIR/chat-private.json` (`{ spaces: { <spaceId>: [message] }, threadsMoved }`), so an earlier release, which reads only `chat.json`, never shows a private message. Flipping a message moves it between the two, writing the destination first; a message found in both counts as private. Each is `{ id, at, by, who, text }` and, when they apply:

| Field | Meaning |
|---|---|
| `visibility` | `"private"`, seen only by its author (not by an owner, a moderator or the admin); absent means public |
| `kind` | `"command"` for a command the person typed (`/ai` questions too), `"ai"` for an AI answer; absent for an ordinary message. An unknown kind is drawn as an ordinary message |
| `command` | the command's name (`ai` for `/ai`) |
| `module` | the module that took the command (absent for `ai`); its colour and icon are looked up when the message is drawn |
| `summaries` | an AI answer's objects, up to 20 |
| `replyTo` | on an AI answer, the id of the question it answers |
| `question` | read-only, on a public AI answer: `{ who, text }` of the question it answers, so others see what was asked |
| `preview` | on an ordinary message with a link, while a module that keeps links (one providing `saveLink`, Research) is on in the space: `{ url, module, title?, description?, image?, at }`, the first link and, once read, the page's title, description and picture address (`at` when it was read) |
| `kept` | `{ by, who, at }`: who pressed **Keep** on the link, once per message |

An ordinary message is at most 1000 characters, an AI answer 8000. A space keeps its last 500 public messages, and each person their last 200 private ones in it, none older than 30 days. Nothing is stored in an aside, no pictures, and no guest's private messages (a guest's command stays on their page). Deleting the chat (`DELETE /api/spaces/:id/chat`), `DELETE /api/spaces/:id/chat/private` and deleting a space reach both files.

**The move from AI threads.** On the first start after the upgrade, `ai-threads.json` is moved into the chat: each question becomes a private `kind: "command"`, `command: "ai"` message and each answer a private `kind: "ai"` message replying to it (an answer once shared stays private, since its shared copy is already in the chat); a clashing id gets a new one. The moved messages go into `chat-private.json`, which is marked `threadsMoved`, and the old file is renamed `ai-threads.moved.json`, kept. A second start does nothing.

## Calendar feeds

A person's private address that gives their calendar app the events they can read ([plan-google-calendar](../plans/plan-google-calendar.md), Part 1; GitHub #42). Off unless an owner turns on `settings.calendarFeeds` (`PATCH /api/settings`). A kind offers itself with `"feed": true` beside `"dated"`; the Calendar's events do, from 1.20.0.

| Call | Purpose |
|---|---|
| `GET /api/me/feed` | Signed in. `{ allowed, on, made, readAt }`: whether feeds are on and there is an offered kind this person may read at environment level, and their address's state |
| `POST /api/me/feed` | A new address, replacing any old one: 201 `{ url, made }`, `url` being `<server>/feed/<token>.ics`, shown this once. 403 "Calendar feeds are off in this environment." or "There are no events here you can add to a calendar app." |
| `DELETE /api/me/feed` | Turns the person's address off. 204 |
| `DELETE /api/users/:key/feed` | Owners and the admin turn someone's address off. 204; 404 "no such user" |
| `GET /feed/<token>.ics` | No session. The calendar (`text/calendar`), with an `ETag` (`If-None-Match` answers 304), `Cache-Control: private, no-cache` and `X-Robots-Tag: noindex`. 404 `text/plain` "There is no calendar at this address." for an unknown token, with feeds off, or the person gone (never a sign-in page); 429 "This address was read too often; try again in a minute." with `Retry-After`, past 30 reads a minute |

What it holds is read at each request with the person's permissions then: every offered kind in the environment's own data and in each space they are a member of where the module is on and readable, leaving out events that ended more than 90 days ago, at most 2,000 (the latest kept). Repeats are written as repeats; a Planner object appears once, as its Calendar twin; each event's description names its space and links back (to Calendar in the top bar when shown, else the module's page). Times are in the server's `TZ`. Only the address's SHA-256 is stored; a user record carries `calendarFeed { on, made, readAt }` (`readAt` updated at most hourly), never the hash. On a hosted server a token works only in its own environment. No new environment variables.

### Other calendars

A person's own other calendars, read into the Calendar for them alone (Part 2 of the same plan). Allowed while `settings.calendarFeeds` is on and an enabled module has the approved `external` hook. Each person may add up to five private calendar addresses; an address is sealed with the server's secrets key on the user record (`externalCalendars`), never answered again (only its host), and the events read from it are kept in memory only, read again after a restart. An address must be `https://` (`webcal://` is read as `https://`); the server reads it through the same private-address guard as link previews, at most 5 MB in 15 seconds, keeping events from 30 days back to 180 days ahead, at most 2,000 per calendar, repeats as separate occurrences. It reads each calendar again every 30 minutes for someone seen in the last 14 days.

| Call | Purpose |
|---|---|
| `GET /api/me/external-calendars` | Signed in. `{ allowed, why, calendars: [{ id, name, host, readAt, error }] }`, `why` a sentence saying why it can't be used (calendar feeds off, or the Calendar to be approved, turned on, updated or installed; worded for an owner or for anyone else), or `null`; the person's calendars are listed with the switch off too, so they can be removed |
| `POST /api/me/external-calendars` | Body `{ name?, url }` (the name defaults to the host). Reads the address first, and keeps it only if it can be read: 201 `{ calendar }`. 403 "Calendar feeds are off in this environment." or "No module here shows other calendars."; 400 "You can add up to five calendars.", "Paste the calendar's address.", "Paste an address that starts with https:// or webcal://.", "That address is not private. Use the one that starts with https:// or webcal://." (an `http://` address), "That address is too long.", "That address is not allowed." (a private or local address, an IPv6 literal such as `https://[::1]/`, or a name that resolves to a private or special IPv6 range), or why it could not be read ("<host> could not be found.", "<host> took too long to answer.", "<host> could not be reached.", "<host> said the address is wrong.", "<host> sent the calendar elsewhere too many times.", "The calendar is larger than 5 MB.", "The address did not give a calendar.", "The calendar is too complex to read." (a file that would take more than 200,000 repeat periods to expand (or, as a backstop, more than 1,500 ms) is refused whole), "<host> could not send the calendar just now."); the same sentences are a row's `error` after a later read; 409 "That calendar is already added."; 429 "Too many calendars added at once; try again in a few minutes." (20 adds in ten minutes) with `Retry-After` |
| `POST /api/me/external-calendars/:id/refresh` | Reads it again now: `{ calendar }`. 404 "There is no such calendar."; 403 as above; 429 "This calendar was read less than a minute ago; try again in a minute." with `Retry-After` |
| `DELETE /api/me/external-calendars/:id` | Removes it, address and events, also with the switch off. 204; 404 "There is no such calendar." |
| `GET /api/modules/:id/external-events?from=&to=` | For a module with the approved `external` hook (403 otherwise; 404 for no such module; 401 signed out): `{ calendars: [{ id, name }], events: [{ calendar, uid, title, start, end, allDay }] }`, the signed-in person's own only, an all-day event's dates as `YYYY-MM-DD` and a timed one's as ISO instants. `from` and `to` are dates or times, and a day that does not exist (`2026-02-30`) is refused (400 "from and to are dates, such as 2026-10-01." or "to comes after from."). A guest, the access key, or the switch off get `{ calendars: [], events: [] }` |

Other calendars never show inside a space: not on its canvas, in a window popped out of it, on a keyed page, or on any page opened over a call, `/calendar` included (the page passes no events there). When a calendar has been read, the person's module stream gets an `external` event for the modules with the hook, so they ask again. An address that can no longer be opened (sealed with another key) reads "This address can no longer be read here. Remove it and add it again."

## Calendar markers

Other modules' objects shown on a calendar as markers that link back to the object, never as events and never as copies ([plan-calendar-markers](../plans/plan-calendar-markers.md); GitHub #167): a task's due day and a poll's closing time. Nothing is written: the server reads the objects at each request, with the viewer's rights as they are then.

A produced kind offers itself with `"marker": true` beside `"dated"` in `refs.produces[]`. To-do's `task` (`"dated": { "title": "title", "day": "due" }`) and Polls' `poll` (`"dated": { "title": "question", "start": "closesAt" }`) do, from To-do 1.13.0 and Polls 1.13.0. The manifest is refused (400) with:

- `module.json: refs "<kind>" marker must be true or false` for anything but a boolean;
- `module.json: refs "<kind>" marker needs "dated"`;
- `module.json: refs "<kind>" marker can't be used with "mirror"` (a marker is not a twin);
- `module.json: refs "<kind>" marker can't be used with "feed"` (markers never go in a calendar feed).

A `dated` instant's `start` and `end` may be a number of milliseconds as well as a date or date-time string, for every kind, so a poll's `closesAt` is read as stored. An object whose `summary.done` field is `true` has no marker: a task ticked done, a poll closed by hand (Polls 1.13.0 maps `done` to `closed`, so a poll's summary now carries `done`). A poll closed by its time keeps `closed: false` and stays, as a past marker; reopening a poll clears its closing time, and an object with no date has no marker.

| Call | Purpose |
|---|---|
| `GET /api/modules/:id/markers?from=&to=` (and `&scope=space&space=<id>`) | `:id` is the module asking (the Calendar). `{ markers: [{ ref: { module, kind, scope, space?, id }, kind, title, start, allDay, due, past, module: { id, name, icon, color, svg } }] }`. `start` is `YYYY-MM-DD` when `allDay`, otherwise milliseconds; `title` is at most 200 characters ("Untitled" when empty); `due` is true when the kind is dated by a day it is due (a wall-clock `dated`, such as a task) and false when by a moment (an instant, such as a poll's closing), whether or not this object has a time; `module` is the producing module as this environment shows it, `color` its manifest tint (one of the eight, or `null`) and `svg` its icon as inline SVG (or `null`), so a frame or a guest, who cannot load the icon font or ask `/api/icons`, can draw it; `past` is a time before now, or a day before today in the server's `TZ`. Sorted by time then title (an all-day marker counts from the start of its day), earliest first, at most 500 |

`from` and `to` are dates or times (`2026-10-01`, `2026-10-01T18:00:00Z`), and a day that does not exist (`2026-02-30`) is refused. A date-only `to` takes in its whole day, and the 92 days are measured to its end, so a date-only `to` 92 days after `from` (93 days in all) is refused. A timed marker counts when it is at or after `from` and before the end of `to`; a day marker when its day is between `from`'s day and `to`'s. Where it reads: with `scope=space`, that space; otherwise the environment's own data and each space the viewer is a member of. In each place a producing module must be on, the viewer must hold its `read` permission (`refScope`), and the asking module must have been approved to consume that kind (`consumerMayLink`, the same approval as links); a place or kind that fails is left out, not refused. A module's own kinds are never its markers.

Errors:

- 401 "sign in first".
- 403 "Markers are for people signed in or a space's guests, not the access key." (a keyed page; "space" and "guests" in the environment's words).
- 403 for a guest at environment scope ("guests can only use a module in a space") or someone not in the space ("this module is not available in that space for you"), and 403 "your role can't do that in this module" without the asking module's `read`; 404 "no such module" or "no such space".
- 403 "This module has not been approved to link to other modules' objects." when none of the asking module's `consumes` is approved (in the environment's words).
- 400 "from and to are both needed, as dates or times, such as 2026-10-01 or 2026-10-01T18:00:00Z."; 400 "from and to are dates or times, such as 2026-10-01 or 2026-10-01T18:00:00Z."; 400 "to comes after from."; 400 "from and to can be at most 92 days apart."; 400 "scope must be environment or space here" (for `person`).

When an object of a marker kind is written or deleted in the environment's own data or a space, the module stream sends `event: markers` with `{ modules: [<id>...] }`: the other modules that are on there and approved to consume that kind. It carries no object data; those modules ask again (`host.on('markers')`). A page in a space hears only that space's objects; a page with no space hears the environment's own and those of the spaces the viewer is a member of; in each, only where the viewer may read the producing module. Markers are not events: they never appear in a calendar feed (`/feed/<token>.ics`), a reminder, or the Calendar's own store.

## Saved layouts

Named arrangements of a space's canvas ([plan-saved-layouts](../plans/plan-saved-layouts.md)), and a space's default layout. Each person keeps their own; owners, the admin and the space's moderators keep the space's shared ones, and any of them may change or delete any shared layout; a guest (with the space's guest link, `?guest=<token>`) reads the shared ones only. Only a space has layouts: an aside's id answers 404.

A layout is `{ id, name, by, at, modules: [{ id, mode: "dock" | "float", dockW?, box?, snap? }], snap?: { all, pitch } }`. `modules` is in column order, docked first; `dockW` a docked width in pixels; `box` a floating box as fractions of the canvas, `{ x, y, w, h }` from 0 to 1; `snap` on a module whether it snaps, and at the top the canvas switch and the grid's pitch (50 to 320). Limits: 10 personal layouts per person per space, 10 shared per space; a name of 1 to 40 characters, trimmed, unique in its list whatever the case; at most 20 modules, each once. A bad shape is refused whole with 400 and a sentence saying what. Stored in `DATA_DIR/layouts.json` (`server/layouts.js`), dropped with its space or its person.

| Call | Purpose |
|---|---|
| `GET /api/spaces/:id/layouts` | `{ mine, shared, defaultLayout: null, canShare, canSetDefault }`. A guest gets `mine: []`. `canShare`: owner rights, or a moderator of this space. `canSetDefault`: owner rights. `defaultLayout`: the id of the space's default layout, or `null`. 401 "Sign in first."; 404 "There is no such space." (an aside too); 403 "You are not in that space." |
| `POST /api/spaces/:id/layouts` | Body `{ name, shared?, modules, snap? }`; 201 `{ layout }`. 403 for a guest ("Guests can load shared layouts but not save or change them.") or `shared: true` without the right ("Only owners, the admin and this space's moderators can change shared layouts."); 409 `{ error: "There is already a layout called <name>.", id }` when the name is taken in that list, so the page can offer to replace it; 409 when the list is full ("You have 10 saved layouts here. Delete one first.", or "This space has 10 shared layouts. Delete one first.") |
| `PUT /api/spaces/:id/layouts/:layoutId` | Any of `{ name, modules, snap }`: rename, or replace with the current canvas. 200 `{ layout }`. `shared` is refused with 400 ("A saved layout cannot be moved between your own and the shared ones; save it again instead."), as is an empty body. 403 and 409 as above; 404 "There is no such layout here." |
| `DELETE /api/spaces/:id/layouts/:layoutId` | 204. 403 and 404 as above. Deleting the default layout clears the space's `defaultLayout` and leaves `opensWith` as it was |
| `PATCH /api/spaces/:id` `{ defaultLayout: id \| null }` | Owners only (403 otherwise). An id makes that shared layout the space's default and sets the space's `opensWith` to its modules' ids; `null` stops using one and keeps `opensWith`. Sending `opensWith` on its own clears `defaultLayout`. 400 "The default layout must be a shared layout's id, or null to stop using one."; 400 "Send a default layout or Opens with, not both: the default layout sets Opens with."; 404 "This <space> has no shared layout with that id." |

The words in these sentences are the environment's own.

**The default layout.** A space record may carry `defaultLayout`, a shared layout's id. Replacing that layout's modules with `PUT` moves the space's `opensWith` with it. A layout never moves between the shared list and a person's own, so the default can't stop being shared. `GET /api/modules/for-space` answers `defaultLayout`, the whole layout or `null`, beside `opensWith`: a first visit (no remembered layout) opens it, places included, and a guest gets it on every visit.

## The objects format

The format another AI (or the Assistant's own AI) writes objects in, version 1, and how a module reads them. The code is `server/object-format.js`; the reasons are in [Modules architecture](../architecture/architecture-modules.md), "The objects format". Nothing here names a module.

An object is one JSON object. Any other field is ignored; HTML tags and control characters are removed from every text field.

| Field | Required | Kept as |
|---|---|---|
| `title` | yes | plain text, at most 80 characters |
| `content` | yes, unless `details` keeps a field | plain text or simple Markdown, line breaks kept, at most 6000 characters |
| `icon` | no | one of the icon names in `ICONS`; anything else becomes `note` |
| `kind` | no | one of the 18 kinds: the travel kinds `flight`, `train`, `bus`, `ferry`, `car`, `hotel`, `restaurant`, `cafe`, `bar`, `sight`, `museum`, `tour`, `show`, and `event`, `task`, `poll`, `note`, `link`; anything else is left out. `image` is kept only in a handoff between pages, never from an import or an AI's answer |
| `tags` | no | at most 5; each lower-cased, reduced to `a-z`, `0-9` and `-`, at most 24 characters; duplicates and empty ones dropped |
| `place` | no | `{ name }` (at most 120 characters), plus `lat` and `lng` rounded to 6 places when both are numbers in range; left out without a name |
| `date` | no | a real calendar date, `YYYY-MM-DD` |
| `links` | no | at most 5 `{ title, url }`; `url` must be `http:` or `https:`, without a user name or password, at most 500 characters; `title` at most 100 characters, else the address's host name |
| `details` | no | an object whose fields depend on `kind` (below); left out without a kind, or when no field is kept |

**Details.** Each kind may carry `details`, its own structured fields (`DETAILS` in `server/object-format.js`; the decisions are in [plan-object-handoff](../plans/plan-object-handoff.md)). Every field is optional and is read on its own: an unknown field, or a value of the wrong type or out of range, is dropped and the rest are kept. The format is still version 1; an object or file written before details reads exactly as before.

| Type | Written as | Kept as |
|---|---|---|
| `when` | a local date and time with no zone: `YYYY-MM-DDTHH:MM`, `YYYY-MM-DD`, or `HH:MM` when the day is not known; 24-hour | the same string. A space may stand for the `T`, and a one-digit hour is padded. Seconds and a trailing `Z` or offset are dropped, keeping the clock time as written (`2026-10-03T12:50:00-05:00` is kept as `2026-10-03T12:50`). An impossible date or time is dropped |
| `point` | `{ "code": "MDW", "name": "Chicago Midway" }`, or a string | `code`: 2 to 5 letters or digits, upper-cased; `name`: plain text, at most 120 characters. A string of three capital letters is a code, any other string a name |
| `text:N` | a string | plain text on one line, HTML and Markdown removed (a link becomes "text (address)"), at most N characters. A whole number is kept as its digits (`1234` becomes `"1234"`); any other non-string is dropped |
| `count:N` | a whole number | 1 to N |
| `minutes` | a whole number | 1 to 10080 (7 days) |
| `flag` | `true` or `false` | as given |
| `options` | an array of strings | each plain text up to 80 characters, duplicates dropped, at most 10 kept; dropped when fewer than 2 remain |
| `upload` | a module upload's file id (24 hex characters) | as given; set by the sending page, never by an AI |

| Kind | Fields |
|---|---|
| `flight` | `airline` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes` (time in the air), `terminal` text:30, `gate` text:30, `seat` text:30, `class` text:30, `reference` text:60 |
| `train` | `operator` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes`, `platform` text:30, `carriage` text:30, `seat` text:30, `class` text:30, `reference` text:60 |
| `bus` | `operator` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes`, `seat` text:30, `reference` text:60 |
| `ferry` | `operator` text:60, `number` text:20, `from` point, `to` point, `departs` when, `arrives` when, `minutes`, `cabin` text:30, `seat` text:30, `reference` text:60 |
| `car` | `company` text:60, `from` point (pick-up), `to` point (drop-off), `departs` when (pick-up), `arrives` when (drop-off), `class` text:30, `reference` text:60 |
| `hotel` | `address` text:200, `checkIn` when, `checkOut` when, `roomType` text:60, `guests` count:99, `reference` text:60 |
| `restaurant`, `cafe`, `bar` | `starts` when, `ends` when, `minutes`, `address` text:200, `partySize` count:99, `name` text:60 (the booking's name), `reference` text:60 |
| `sight`, `museum`, `tour`, `show` | `starts` when, `ends` when, `minutes`, `address` text:200, `tickets` count:999, `reference` text:60 |
| `event` | `starts` when, `ends` when, `allDay` flag, `address` text:200 |
| `task` | `due` when |
| `poll` | `options` options, `closes` when, `multiple` flag |
| `note`, `link` | none |
| `image` (handoffs only) | `upload` upload, `name` text:120 |

An object with a `title` and kept details needs no `content` (a flight is described by its details); an object with neither `content` nor a kept detail is dropped as `it has no content`.

**Chat's Keep.** Keep, in an AI answer and in the import preview, chooses its place by `takes` (`keepTargets` in `public/chat-input.js`), from `GET /api/spaces/:id/actions`:

- **Who can keep it.** An action with `takes` is a place when its `may` is not false, some entry whose `may` is not false covers the object's kind (the server's rule, `except` included; an object with no kind is covered by `"*"` or `"text"`), it has an `object` input, and Keep can fill every other required input: `title` from the object's title, `url` from its first link, nothing else. An action with `needs: ["date"]` is left out for an object with no day (no `date`, and no date in `details.departs`, `checkIn`, `starts` or `due`).
- **A module without `takes`** keeps the old rule (`keeperFor`): a travel kind to the typed keeper (`acceptSuggestion` taking a `title` and a `kind`), anything else to the note keeper (`saveNote` taking a `title` and a `body`), with the flat fields and the details as "Label: value" lines after the content.
- **The order.** First the person's last choice for that kind (kept in the browser's `localStorage` as `chat-keep-place:<kind>`, `text` for no kind); then actions whose `takes` names the kind, the one naming the fewest kinds first (`namedKindCount`, not counting `"*"` and `"text"`), so a note goes to Research before the Planner, an event with a day to the Calendar and a flight to the Planner, whatever the install order; then the older typed keeper; then actions that take it only through `"*"` or `"text"`, the note keeper first (one whose `takes` names `note`), then the fewest named kinds; then the older note keeper; last, a `local` action that doesn't name the kind (a form on the person's own page, such as Polls' `draftPoll` for words with no kind), which is never the default. Remaining ties follow the order the server lists the actions (`placeRank`, `placeOrder`). So an object with no kind, and a link with no address (which `saveLink` can't fill), go to Research's `saveNote`. The fewest-kinds rule is Thomas's to confirm.
- **Each object keeps its place** (`settlePlace`). The place is fixed when the object is first drawn with somewhere to go (the last choice, else the first in order), and afterwards only the person's pick from the menu changes it; a fresh actions list never moves it unless that place is no longer among the allowed ones, when it falls to the first one left. A single Keep then sends nothing and says "<old module> can't take this now. It goes in <new module>: press Keep again." (or "Nothing here can keep that now."), and Keep ticked's confirm begins "N has a new place: the one before is no longer allowed." (N "have" for more than one).
- **Once kept or waiting**, a row's place is plain text with no menu, its day field is disabled and "Same day for all" skips it, and its Keep can't be pressed again. **Keep ticked (n)** counts only the ticked rows it would send. The preview refreshes the actions list before it is drawn.
- **Keep ticked** (`splitTicked`, `leftOutWords`) sends each ticked object to its row's place, one after another, and leaves out, saying so after the question: a `local` place whose module is closed ("2 polls need Polls open."); a `local` place that is open, since each would replace the form the last one opened ("2 polls open a form each in Polls: use each one's own Keep.", or "1 poll opens a form in Polls: use its own Keep."); and an object with no place ("N can't be kept here."). With nothing left to send it says only those, as a note.
- **The day field** is shown for a kind that has a day (journeys, stays, stops, events, tasks) with none given, only when some place here could keep the object if it had a day; clicking its words focuses the date field. "Same day for all" appears with two or more such objects and fills only empty fields, or ones it filled itself.
- **What it sends.** A place that takes the object gets it in its `object` input, plus `title` when the action asks for it and `url` (the first link) when it has a `url` input. When the place takes it as any object, or the object is a `note` or has no kind, an `/ai` answer's question is added to the end of `content` as "Asked: <question>" (never for an import). An older keeper gets the flat fields as before.
- **A `local` action** (Polls' `draftPoll`) runs only on the person's own open module: with it closed, Keep says "<module> isn't open." and sends nothing, and the menu's hint is "Open <module> first".
- The request is `POST /api/spaces/:id/action`. One Keep runs at a time. The button then reads **Kept**, or **Waiting** when the request is queued, and stays off; for a `local` action it reads "Opened in <module>" and can be pressed again.

The preview's day field sets the object's `date` before it is sent; the server cleans the object as for any `object` input.

An object read by `POST /api/modules/:id/objects/check` always comes back with `basis: "imported"` and never with `sources`, whatever it carried. The Assistant's own answers go through the same checker (`cleanSummary` in `server/ai.js`), keep their `basis` (`general`, `items` or `both`, never `imported`) and `sources`.

**Where objects are found**, in this order:

1. A leading byte order mark is dropped. Text that is only white space is refused.
2. An answer with a block fenced with a label from before the formats were named by kind is refused whole, and nothing in it is read (see below).
3. Trimmed text that starts with `{` or `[` and parses as JSON: an object with `"format": "objects"` or any `formatVersion` key is a file (`{ "format": "objects", "formatVersion": 1, "objects": [...] }`, recognised by its content, not its name); an object with no `format` that carries an old file's marker is refused; any other object is one candidate (a single object with a `format` field of its own is still an object); an array gives one candidate per element.
4. Otherwise, every fenced block labelled `objects` (```` ```objects ```` then a new line, the JSON, a new line and ```` ``` ````). A block holds one object or an array of them. A block that is not valid JSON is one candidate, dropped as `not valid JSON`.
5. If no candidate came from such a block: every balanced top-level `{...}` span that parses as a JSON object with a string `title` (an answer copied from a chat's formatted view, which loses the fences). Other spans are ignored, not reported. A block with any other label, ```` ```card ```` included, is reached only this way.

**Old answers and files.** Before this version the file and the block were named after the product. An old file (a top-level key named after a past product name followed by `Objects`, holding a whole number, and no `format`) is refused. So is a paste with an opening fence line whose first word is a past label: in any letter case, as a whole word (```` ```collaborators ```` is not one), with anything after it on the line, after any indent, list markers (`-`, `*`, `+`, `1.`, `1)`) or quote markers (`>`, nested too), with LF or CRLF line ends, closed or not. Such a paste is refused even beside an ```` ```objects ```` block and even when its contents are valid: nothing from it is imported, so no object is lost without a word. The labels are listed once, in `PAST_BLOCK_LABELS` (`server/file-format.js`). The reasons are in [plan-kind-names](../plans/plan-kind-names.md).

**Caps.** 256 KB of text or file per request; at most 200 candidates read; at most 50 objects kept. Past those, the rest is counted, never kept.

**The answer.** `found` is the number of candidates read. `objects` are the kept ones, in order. `dropped` is `[{ at, why }]` for each candidate not kept, `at` counting candidates from 1 and `why` one of `not valid JSON`, `not an object`, `it has no title`, `it has no content`. `over` is how many valid objects were past 50. Candidates found but none kept is `200` with `objects: []`.

**Who may.** The module's `write` permission in that place (`moduleAccess`), not a guest, and not in a space with AI turned off. No AI service, no **Use AI in modules** and no new module permission are needed.

**Refusals.** Words in `${}` are this environment's words.

| Status | When | `error` |
|---|---|---|
| 401 | not signed in, no guest link | `sign in first` |
| 404, 403, 400 | `moduleAccess`'s own refusals (no such module, not on in that space, the role may not write) | as for any runtime route |
| 403 | a guest | `${guests} cannot bring in ${objects}` |
| 403 | the space has AI turned off | `AI is turned off in this ${space}` |
| 415 | `POST` with neither `text/plain` nor `application/octet-stream` (checked first, before who is asking) | `send the text as plain text, or the file as it is` |
| 413 | over 256 KB | `that is over 256 KB; bring it in in parts` |
| 400 | nothing but white space | `paste an answer or choose a file first` |
| 400 | an answer with an old-named block | `that answer is in an older format: copy the instructions again and ask the AI for a new answer` |
| 400 | an old objects file (an old marker and no `format`) | `that file is in an older format: copy the instructions again and ask the AI for a new file` |
| 400 | a file whose `formatVersion` is a whole number above 1 | `that file is format ${n}; this server reads format 1` |
| 400 | a file whose `format` is not `objects`, or whose `formatVersion` is missing or not a whole number of at least 1 | `that is not a .objects.json file` |
| 400 | a file whose `objects` is not an array | `that file has no list of ${objects}` |
| 400 | no candidate found at all | `nothing in that could be read as ${objects}: paste the whole answer, with its objects blocks` |
| 429 | over 20 checks a minute per module and person | `this ${module} is doing that too often; try again in a moment`, with `Retry-After` |

**The schema.** `GET /api/objects/format/schema` is JSON Schema 2020-12, with no `$id`: one object, an array of at most 50, or a file (`format` const `"objects"`, `formatVersion` const `1` and `objects` at most 50, all three required). It is built from the same constants as the checker and describes what is kept; the checker is more forgiving (it trims and lower-cases rather than refusing). An object requires only `title`, and has either `content` or both `kind` and `details` (`anyOf`). `$defs` holds one `details-<kind>` definition for each of the 18 kinds an AI may write (`image` has none), each an object with that kind's fields and no required ones; for each kind, an `if`/`then` in the object's `allOf` points `details` at its definition. A `when` is described in its written shapes only (`YYYY-MM-DD`, with an optional `THH:MM`, or `HH:MM`), though the checker also reads the looser ones above.

**The instructions.** `instructions` (`GET /api/objects/format`) and the rule for `/ai`'s own answers are built by the same function (`objectRule`), so the two cannot drift: `/ai` asks for `objects` blocks too. They ask the AI to:

- put every thing worth keeping in one `objects` block (at most 50; 20 for `/ai`), one object per thing. When a travel kind is listed, a whole itinerary is one object for each flight, train, stay, meal, visit and event, in the order they happen, and a return flight is its own object;
- set `kind` to one of the kinds listed (below), and leave it out only when none fits;
- copy dates and times from what the person gave, and never guess a date or a year. The copied instructions tell the AI to ask for a missing date before writing the block, and to leave it out if the person doesn't know; `/ai`, which can't stop to ask, leaves it out and says in its answer which dates it still needs;
- write a date as `YYYY-MM-DD`, a date with a time as `YYYY-MM-DDTHH:MM`, or a time alone as `HH:MM`: 24-hour, the local time where it happens, with no time zone, and the day in `date` as well. When no listed kind has details, only `YYYY-MM-DD` is asked for;
- fill `details` with what a booking or plan says, one line per listed kind naming its fields (kinds with the same fields share a line, such as "restaurant, cafe, bar"; `hotel` is described as any stay: hotel, rental, hostel), every field optional, and write nothing in `content` that is already in `details`;
- choose an icon from the list, keep titles under 80 characters and content under 6000, and start links with `http://` or `https://` (the copied instructions; `/ai` explains `basis` and `sources` instead);
- leave out tags, place and links when there is nothing for them, and content when `details` says it all (the second part only when a listed kind has details), and add no other fields.

The copied instructions also offer a `<something>.objects.json` file holding `{"format":"objects","formatVersion":1,"objects":[...]}`. The example object is Thomas's Southwest flight (MDW to SJC, 12:50 to 15:25) when `flight` is listed, else a plain object.

**Which kinds are listed.** Only the kinds the environment's enabled modules name in their actions' `takes`, in the catalogue's order (`kindsTaken` in `server/object-format.js`). `"*"` and `"text"` name no kind, and `image` is never listed. While any enabled module still offers the older typed keeper (an action named `acceptSuggestion` taking a `title` and a `kind`, with no `takes`), the 13 travel kinds are listed too, as before. With no kind listed, the instructions have no kind line and no details lines. With every kind listed the copied instructions are about 3,600 characters. With the bundled modules today every kind is listed (the Planner's travel kinds and `event` and `note`, To-do's `task`, the Calendar's `event`, Polls' `poll`, Research's `note` and `link`), about 3,600 characters; the travel fallback applies only to an older Planner or another module offering `acceptSuggestion` without `takes`. `schema` is always the whole catalogue.

### Handing an object to a module

An action input of type `object` (see the manifest's `takes`) carries one whole object from a page to a module, through `POST /api/bus/actions/request` or `POST /api/spaces/:id/action`. The server cleans it with `cleanHandoff` (`server/object-format.js`): the same checker as an import (`cleanObject`, `cleanDetails` and their caps), except that `image` is kept, `sources` is dropped (an AI's item numbers mean nothing here), and `basis` is kept only when given as `general`, `items`, `both` or `imported`. The module receives exactly what is kept.

The object's kind must be one some entry of the action's `takes` covers, and when every such entry names a `permission`, the person must hold one of them in that place. Refusals, in the order they are checked (`<module>` is the module's shown name, and `<a kind>` the kind with "a" or "an", or "an object with no kind"; "object" and "module" are this environment's words):

| Status | When | `error` |
|---|---|---|
| 400 | the field is required and missing | `object is needed` |
| 400 | not a JSON object (an array, a string) | `object must be an object` |
| 400 | kind `image` without a kept `details.upload` (a module upload's file id) | `object is a picture, so its details.upload must be the id of a file uploaded to the module` |
| 400 | nothing kept: no title, or neither content nor a kept detail | `object needs a title, and content or details` |
| 400 | no entry of the action's `takes` covers its kind | `<module> cannot take <a kind>`, such as `<module> cannot take a flight` |
| 403 | the entries that cover it all name a permission the person lacks here | `you may not add <a kind> to <module> here`, such as `you may not add a poll to <module> here` |

The field name in the first four sentences is the action's own (`object` in the examples). A request body over 64 KB answers 413 `that request is over 64 KB`. A request queued before `takes` existed, with no `object` field, runs as before.

### What the bundled modules take

Five bundled modules declare `takes`, and Chat's **Keep** offers each of them by it (see "Chat's Keep" above); any page or module may also request the action with an `object`.

| Module (version) | Action | `kinds` | `except` | `as` | `permission` | Other |
|---|---|---|---|---|---|---|
| Planner (0.12.0) | `acceptSuggestion` | `flight`, `train`, `bus`, `ferry`, `car` / `hotel` / `restaurant`, `cafe`, `bar`, `sight`, `museum`, `tour`, `show`, `event` / `note` (four entries) | | `{kind}` / `a stay` / `{kind}` / `a note` | | |
| Research (0.3.0) | `saveNote` | `note`, `"*"`, `"text"` | | `a note` | | |
| Research (0.3.0) | `saveLink` | `link` | | `a link` | | `url` still required |
| Research (0.3.0) | `savePhoto` | `image` | | `an image` | | new |
| To-do (1.14.0) | `createTask` | `task`, `"*"`, `"text"` | | `a task` | | |
| Calendar (1.23.0) | `createEvent` | `event`, `"*"`, `"text"` | the 13 travel kinds | `an event` | | `needs: ["date"]` |
| Polls (1.14.0) | `draftPoll` | `poll`, `"text"` | | `a poll` | `create` | new, `local` |

Each module maps an object the same way where it can: the title made plain (`host.util.plain`), each `when` read with `host.util.localWhen`, and every details field it has no place for written as a "Label: value" line (`host.util.detailLines`, the Planner's words), then a `Place: <name>` line when the place has no field of its own, `Links:` with one `- title: address` line each, and `External source` when `basis` is `imported`, cut to the field's limit with that tail kept. For an object with no kind (a message's words), a first line of `content` that repeats the title is dropped.

### The Planner's acceptSuggestion

The Planner (`travel`, from 0.12.0) was the first bundled module to declare `takes`. Its `acceptSuggestion` action takes:

| Input | Type | Notes |
|---|---|---|
| `title` | `string` | required, so send it with `object` too (Chat's Keep sends the object's title); with `object`, the object's own title is the one used |
| `kind` | `string?` | the flat form: one of the everyday words a journey, a stay or a stop knows; anything else is a stop |
| `content` | `text?` | the flat form: the notes |
| `place` | `string?` | the flat form: a place's name |
| `date` | `date?` | the flat form: the day |
| `object` | `object?` | a whole object in the objects format; when given, the flat fields are ignored |

Its `takes`:

| `kinds` | `as` |
|---|---|
| `flight`, `train`, `bus`, `ferry`, `car` | `{kind}` |
| `hotel` | `a stay` |
| `restaurant`, `cafe`, `bar`, `sight`, `museum`, `tour`, `show`, `event` | `{kind}` |
| `note` | `a note` |

No entry names a permission, so anyone who may write to the Planner may use each one. Any other kind is refused by the server as in [Handing an object to a module](#handing-an-object-to-a-module) (`Planner cannot take a task`).

**How an object becomes a plan object** (`objectFields` in `modules/travel/src/travel-lib-object.js`):

| Kind | Becomes | From `details` |
|---|---|---|
| `flight`, `train`, `bus`, `ferry` | a journey, `mode` the kind | `operator` from `airline` (a flight) or `operator`; `number`; a flight's `fromCode`/`from` and `toCode`/`to` from the points' codes and names, another journey's `from` and `to` as "Name (CODE)"; `date` and `time` from `departs`; `arrives` (below); `minutes`; `terminal` and `gate` (a flight); `platform` and `carriage` (a train); `seat`; `travelClass` from `class` (a flight or a train); `confirm` from `reference` |
| `car` | a journey, `mode` car | `operator` from `company`; `pickup` and `dropoff` from `from` and `to`; `date` and `time` from `departs`; `minutes` from `departs` to `arrives` when both have a day and a time and it is 1 minute to 7 days, else `arrives` is a notes line; `confirm` |
| `hotel` | a stay, `type` hotel | `date` and `time` from `checkIn`; `checkOut` and `checkOutTime` from `checkOut` when its day is after check-in (a time alone sets only `checkOutTime`; anything else is a notes line); `roomType`; `guests`; `address`; `confirm` |
| `restaurant`, `cafe`, `bar` | a stop, `type` the kind, category eat | `date` and `time` from `starts`; `minutes`, or from `starts` to `ends` (up to 7 days, else `ends` is a notes line); `address`; `partySize`; `reservationName` from `name`; `confirm` |
| `sight`, `museum`, `tour`, `show` | a stop, `type` the kind, category do | as a meal, with `admissionCount` from `tickets` instead of the party size and name |
| `event` | a stop, `type` other, category do | as a meal, without a booking; `allDay: true` drops the time |
| `note` | a note | none |
| any other kind, or none (only through the Planner's own drop, since the server refuses them on the bus) | a stop | none |

- **Text.** The title (up to 120 characters) and every details field go through `host.util.plain(…, { line: true })`; `content` keeps its Markdown, since the Planner draws Notes as Markdown.
- **Times.** Each `when` is read with `host.util.localWhen`: a time alone takes the object's `date` (`arrives` takes the departure's day). The day and time from the details win over the object's own `date`.
- **`arrives`** (a journey but a car) is kept as on the ticket. While the journey has a day it is stored dated, `YYYY-MM-DDTHH:MM`; a time alone is dated on the departure day. While it has none (under "Not on a day yet" or on the line), it is stored relative to the day it leaves: `HH:MM` with an optional offset of `-1` to `+7` days (`"06:30+1"`, `"13:00-1"`; `+0` is stored as the plain time), so the offset survives. Taking a dated journey off its day turns its arrival into the relative form, and putting it back on a day dates it on that day. Anything else is dropped. An arrival with a day and no time is a notes line. A dated one must be at most 7 days after the departure and at most 1 day before (`arrivalFits` in `travel-lib.js`, to the minute when the departure has a time, by day otherwise); outside that it is a notes line, `Arrives: YYYY-MM-DD HH:MM`, and the plan keeps no `arrives`. The plan shows it in place of the departure plus `minutes`, which stays as given. When the journey later moves to another day (an update that changes `date` without giving `arrives`, or a drop on another day), a dated `arrives` moves by the same number of days.
- **Notes**, in order: the content; one "Label: value" line for each details field with no field of its own (`Cabin: 4B`; a car's `class` is `Class: …`; `upload` is never written); `Links:` with one `- title: address` line each; and `External source` when `basis` is `imported`. At most 8000 characters, cut before the links.
- **Placement.** On its day, which stretches the plan as adding by hand does. A day that would make the plan longer than 60 days puts the object under "Not on a day yet" with `Dated <YYYY-MM-DD>, outside the plan` as the first line of its notes. On a day the plan can show, a `checkOut`, or a dated `arrives`, that would make it longer than 60 days (whether or not the trip has dates) is cleared and kept as a notes line instead, `Check out: YYYY-MM-DD[ HH:MM]` or `Arrives: YYYY-MM-DD HH:MM`, with `checkOutTime` cleared too; the object stays on its day and the plan is not stretched to it. An object dropped on the Planner itself (its drop menu's "Put it on <day>", for a dragged object that carries `details`) goes to the drop's day or joint, whatever its own.
- **The answer.** `{ ref }`, a pointer to the new plan object. When something needs saying, the result also carries `data: { note }`, which the Planner's own page shows too: `<title> is dated <day>, outside the plan's 60 days, so it is under Not on a day yet.`, or `<title>: its check-out, <day>, is outside the plan's 60 days, so it is in its notes.` (`its arrival` for a journey). Several are joined with a space.
- **The flat form** (no `object`) works as before, with the title made plain and the same 60-day rule. Requests queued before 0.12.0 run unchanged.

### Research's saveNote, saveLink and savePhoto

From Research 0.3.0 (`objectNote`, `objectLink` and `savePhoto` in `modules/research/src/research-lib.js`). Each saves into the space's Research, credited to the person who asked.

**`saveNote`**: `title` `string`, `body` `text?`, `tags` `string?`, `icon` `string?`, `kind` `string?`, `ref` `ref?`, `object` `object?`. With `object`, the flat fields but `ref` are ignored and the note is made of the object:

- the title, plain, up to 120 characters; refused with `a note needs a title` when empty;
- the body: the content as written (Research draws a note's body as Markdown), then the details lines, `Place: <name>` when the place has no position, the links and `External source`; at most 8000 characters;
- the icon: the object's `icon` when it is one of Research's note icons, else the travel kind's own icon (a plane for a `flight`, a hotel for a `hotel` and so on), else the sticky note;
- the tags; the day: the date of `details.starts`, `departs`, `checkIn` or `due`, the first that reads, else the object's `date`; and the position, when `place` has `lat` and `lng` in range.

**`saveLink`**: `url` `text`, `title` `string?`, `excerpt` `text?`, `ref` `ref?`, `object` `object?`. `url` stays required (Chat's link keeper finds the action by it). With `object`, the address is `url`, else the object's first link; the title is `title`, else the object's; the excerpt is `excerpt` (plain, up to 2000 characters), else the object's words as for a note, up to 2000, without a links line for the link's own address; the tags, the day and the position as for a note. Refused with `that is not a web address` when there is no `http` or `https` address.

**`savePhoto`** (new): `object` `object`, of kind `image` with `details.upload` naming a file the sending page has already uploaded to Research's own uploads for this space (`POST /api/modules/research/uploads?scope=space&space=<id>`). Research checks the file and saves a photo: the caption is `details.name` without its extension, with `_` and `-` as spaces ("IMG_2041.jpg" is "IMG 2041"), else the object's title, else "Photo"; the tags and the day as for a note. A thumbnail the file already has is reused. Otherwise the page that carries the request out makes a 400-pixel one, but only when that page is the uploader's, an owner's or an admin's, since the server lets only them put one (`PUT /api/modules/:id/uploads/:fid/thumb` answers 403 `only the person who added it can do that`). On anyone else's page it is quietly skipped: the photo is still saved and its card shows the whole picture. Refusals: `that is not a picture` (not an `image`, or no file id), `that picture is not here any more`, `that picture is already a photo here`.

**The upload sweep.** When a request whose `object` input is an `image` is dropped without ever being carried out (seven days unclaimed, pushed out by the bus's cap, or a local request expired), the server removes the picture it named, but only when the file is in the request's own place, was uploaded by the person who asked, and the module's data there does not name it. The removal is listed in the environment's activity ("removed a picture sent to it that was never added (<name>)"). Chat itself removes the upload at once when the request is refused.

All three answer `{ ref }`, a pointer to the new note, link or photo. Without `object`, `saveNote` and `saveLink` work as before.

### To-do's createTask

From To-do 1.14.0 (`taskFromObject` in `modules/todo/src/todo-lib.js`). Input: `title` `string`, `notes` `text?`, `ref` `ref?`, `due` `date?` (new), `object` `object?` (new).

- **The title** is the object's, plain, up to 200 characters, else `title`; refused with `a task needs a title` when both are empty.
- **The due date.** `due`, when given, wins. Else, for a `task`, the date of `details.due` (a time alone takes the object's `date`), or the object's `date` when `details.due` is not given; a time on `due` becomes the notes line `Due at <time>` in the environment's clock, since a task keeps a day only. Any other kind gets no due date.
- **The notes** are plain text: the content, then the details lines (without `due` when it was used), the place, the links and `External source`, at most 1000 characters.
- Without `object`, it works as before, now with `due`. The answer is `{ ref }`, and the task links to `ref` as before.

To-do's rules (what a task does when a linked object reports) honour `needs`: an action that needs a date, such as the Calendar's `createEvent`, is offered only for a result that carries one, and is given it.

### The Calendar's createEvent

From Calendar 1.23.0 (`eventFromObject` in `modules/calendar/src/calendar-lib.js`). Input: `title` `string`, `date` `date?` (was required), `ref` `ref?`, `object` `object?` (new); `needs: ["date"]`, so a drop menu or a rule offers it only for something with a date. Its one `takes` entry leaves out the travel kinds, which reach the Calendar through the Planner.

- **The day** is the object's own: for an `event`, the date of `details.starts`; for a `task`, the date of `details.due`; else the object's `date`; else the request's `date`. With none it is refused: `that needs a day to go on the calendar` (a request with neither `object` nor `date` too).
- **An event with a time** in `details.starts` is a timed event, ending at `details.ends` when that is later, else after `details.minutes` (up to 7 days). An `ends` that is a time with no day of its own and isn't after the start is the next day's, so 22:00 to 01:00 runs past midnight. The local time is read in the time zone of the browser whose Calendar carries the request out, since the Calendar stores an instant. `allDay: true` makes it all day.
- **Anything else is all day** on its day; an `event` whose `ends` is a later day spans to it. A task's time on `due` becomes `Due at <time>` in the description.
- **The title** is the object's, plain, up to 120 characters, else `title`. **The description** is plain: the content, the details lines it has no field for, the place, the links and `External source`, at most 600 characters.
- Refused with `this person cannot add events here` for someone who may not add events. The answer is `{ ref }`.

### Polls' draftPoll

New in Polls 1.14.0 (`pollFromObject` in `modules/polls/src/polls-lib.js`). `local`, input `object` `object`, `takes` `poll` and `"text"` as `a poll` with the `create` permission, so only people who may start polls have it. It opens the New poll form, filled in, on the person's own open Polls, and saves nothing: the poll exists once they choose **Start poll**. Refused with `this person cannot start a poll here`. It answers `{}`.

- **The question** is the title, plain, up to 200 characters.
- **The options** are `details.options` (each up to 100 characters, at most 10, duplicates and the question itself left out). With fewer than two, the content's lines are the options when there are at least two and every one is 100 characters or less, with list marks (`-`, `*`, `+`, `•`, `1.`, `1)`) taken off. A message's words become a poll this way: "Where to eat?" then "- Pizza" and "- Sushi".
- **The closing time** is `details.closes` (a time alone on the object's `date`), else the object's `date`; a day with no time closes at 12:00, as `/v` reads a typed day. A time already past is left empty, and the setting's default applies.
- **More than one answer** when `details.multiple` is `true`. The object's `content` is otherwise not used.

A finished poll offers another module's action only when it can fill it (`pollFills` in `polls-lib.js`): the action must take a `title`, and every required input must be one Polls fills, `title` and `notes` (a `string` or `text`: the question and its winner, and the question), `date` (only when the winning option has a date, which it is given) and `ref` (`ref` or `ref:polls:poll`, the poll). An action with `needs: ["date"]`, such as the Calendar's **Add it to the calendar**, is offered only when the winning option has a date.
