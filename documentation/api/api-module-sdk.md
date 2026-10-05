# Module SDK

**Audience:** someone writing a Collaborator module: what a module is made of, what it can ask Collaborator to do, and what it is not allowed to.

To install and manage modules as an owner, read [userguide-modules](../userguides/userguide-modules.md). The server routes behind all of this are in [api-modules](api-modules.md), and how it is built is in [architecture-modules](../architecture/architecture-modules.md).

## What a module is

A module is a zip of static files that runs in the browser, inside a sandboxed frame. It never runs code on the server. It reaches Collaborator only through the calls in this document, and the server checks every one.

A module has one or two **surfaces**:

- **page**: a full-width page of its own (environment scope), at `/modules/<id>`; a widget card's heading on home opens it. The top bar has no entry for module pages.
- **canvas**: a module a space can open on its canvas from the space's module selector (space scope). On the canvas it can be **docked** as a column beside the video and the chat, **floating** over the call, or **popped out** into a window of its own; the manifest says which of docked and floating it supports, and every module on the canvas can be popped out.

The same HTML file can serve all of them. The SDK tells the module which scope it is in, and the page should adapt to its width: a docked module is narrow.

## The zip

A zip holds a `module.json` and the HTML pages it names. Everything a page needs should be inline: a module page is best written as one HTML file with its CSS and JavaScript inside it. Allowed file types are html, js, css, json, txt, md, images, svg and fonts; the limits are in [api-modules](api-modules.md).

`tools/build-module.mjs` builds a zip from a source folder: `node tools/build-module.mjs modules/calendar` inlines `src/<id>.css` and `src/<id>.js` into `src/<id>.html`, writes the result as every entry the manifest names, and writes `modules/dist/<id>-<version>.zip`. The Calendar in `modules/calendar/` is the reference module.

## module.json

```json
{
  "id": "calendar",
  "name": "Calendar",
  "version": "1.2.0",
  "icon": "calendar-days",
  "description": "Sessions and events, with reminders.",
  "scope": ["environment", "space"],
  "surfaces": {
    "page": { "entry": "page.html" },
    "canvas": { "entry": "canvas.html", "width": 400, "height": 580, "mode": ["dock", "float"] }
  },
  "permissions": [
    { "key": "view", "label": "See the calendar", "default": { "member": true, "guest": true, "moderator": true } },
    { "key": "edit", "label": "Add and change events", "default": { "member": true, "guest": false, "moderator": true } }
  ],
  "access": { "read": "view", "write": "edit" },
  "hooks": { "schedule": true, "notify": true }
}
```

- `scope` says where the module can run: `environment`, `space`, `person`, or several. An `environment` module needs a `page` surface and a `space` module needs a `canvas` surface. The old names (`server`, `room`) are refused at install with one sentence naming the new word, for example `module.json uses the old scope "room"; use "space" (<product> renamed rooms to spaces).`, where <product> is the configured product name (`PRODUCT_NAME`)
- `icon` is the name of a Font Awesome icon, used in the space bar's Layout panel and beside the module's name elsewhere.
- `canvas` is the module's place on a space's canvas: `{ entry, width, height, mode, menu? }` (it was `surfaces.panel`, with `panel.html`; a manifest still using `panel` is refused, see [api-modules](api-modules.md)). `canvas.mode` lists how it may be shown: `dock` (a column of the space's canvas beside the video and chat), `float` (floating over the call), or both. Leave it out and both are allowed. A space opens a module docked when it can, and people can switch between them. A docked module keeps the width you drag it to. `width` and `height` are the starting size. `menu: false` keeps the module out of the space bar and the canvas never opens it, for a module that is on in a space only for its permissions or hooks (the Assistant); absent or `true`, it is listed.
- `permissions` are the module's own permissions. Each appears on the Roles tab as `Module: <name>`, with the `default` you give per role: `member`, `moderator` and `guest` (a missing `moderator` takes `member`'s value; the old key `user` is refused). A permission can say `"replaces": "<old key>"` when it was renamed: each role's choice for the old key is carried over once, when the server starts and after any install. It is refused if it names a key the module still uses, or an old key another permission already replaces. A key matches `^[a-z][a-z0-9_]{0,23}$`: a lower-case letter, then up to 23 lower-case letters, digits or underscores. Owners, and the host admin on a hosted server, always have every permission, so a module never needs a role check of its own: ask `host.can()`.
- `access` names which of those permissions guards reading and writing the module's data. Leave it out and any signed-in person who can see the module can read and write.
- `hooks` names what the module may ask Collaborator to do: `schedule` and `notify`. An owner approves them when enabling the module.
- `refs` lets modules point at each other's objects without reaching into each other's data; see [Objects](#objects-pointing-at-another-modules-objects). `refs.produces` lists the kinds of object this module lets others point at, and `refs.consumes` the other modules' kinds it wants to point at, which the owner approves when enabling the module.

## Pages and the SDK

Since step 5c of the [Names plan](../plans/plan-names.md) the SDK and the manifest use only the new names: `environment` (was `server`), `space` (was `room`), `spaceId` (was `roomId`). An old name is refused, not translated: the SDK throws with a sentence naming the new word, for example `host.objects.make: "server" is an old name; use scope "environment"`. Since step 7, pointers are `host.objects` and what one resolves to is its **summary** (they were `host.refs` and a "card").

Collaborator adds the SDK and a base stylesheet to each of your HTML pages when it serves them, so a page needs no `<script>` or `<link>` for them. To keep the base styles out, add `<meta name="sdk-base" content="none">`. The SDK defines `window.host`.

```js
const t = await host.ready();
// t.module    { id, name, icon }   name and icon as this environment shows the module: an owner may rename it (print your own name from here, never a string of your own)
// t.user      { key, name, role }   role: 'owner', 'member', 'guest', or 'admin' for the host admin's own account
// t.context   { scope: 'environment' | 'space' | 'keyed', spaceId, environment: { name }, destination? }   a keyed page has path, subject and query instead
//             environment.name: the environment's name as its header shows it ('' when unknown), to name the environment's own list by
//             destination: { id, part } on a destination's part only (see "A destination's part")
// t.permissions  { view: true, edit: false }   the module's own permissions, by short key
// t.theme     the current theme tokens; host.on('theme', (theme) => { ... }) fires whenever the theme or the light or dark mode changes
host.can('edit');   // true or false, from the permissions above; always true for an owner
host.space();       // { id, name, createdAt } for the space this page is open in; null on an environment page or a keyed page
host.phases();      // the environment's template's phases, [{ id, label, main? }] in order; [] when it has none
```

`host.space()` and `host.phases()` answer from what `ready()` loaded, so they need no await. Any module may read them. The phases are the template's live list: a host's edit of the template shows on the next load (the next `ready()`), not in a page already open. At most one phase has `main: true`; its dates are the ones a module should treat as the plan's own. The Planner uses both for its name and its phase line.

Every call returns a promise. Do not call anything before `ready()` resolves.

### Storage

A small key-value store per module, with a scope: the whole **environment**, one **space**, or one **person**. The person scope (declare `"person"` in the manifest's `scope`; a page asks with `{ scope: 'person' }`) is the signed-in person's own data, kept for them alone whichever space or page they are in: nobody else can read it, not even an owner, and a guest has none. Its changes are pushed only to that person's own pages, with `scope: 'person'` on the `change` event (check `e.scope` if your page also shows a space's data). Pointers to a personal object have `scope: 'person'` (`host.objects.make(kind, id, { scope: 'person' })`) and find nothing for anyone but the owner; personal objects are not linked (`setLinks` refuses them). `host.objects.search(text, { scope: 'person' })` lists the viewer's own. A page uses its own scope (`'context'`, the default). A space's module may also ask for `{ scope: 'environment' }` to read the environment's data. A module with both an environment page and a canvas surface may, on its environment page, read `{ scope: 'spaces' }`: read-only, across every space the viewer is a member of that has the module on and lets their role read it. Each entry comes back with its `spaceId`, and `host.spaces()` returns those spaces as `[{ id, name, icon, svg }]`, where `svg` is the space's icon as inline SVG (a module cannot load the icon font). Live `change` events carry `scope` and `spaceId`; from those spaces, `scope: 'spaces'`.

On its environment page a module may also read and write one of those spaces with `{ space: <id> }`: `host.storage.get`, `set`, `delete` and `list` take it (`host.storage.set(key, value, { space })`), as do `host.schedule`, `host.cancelSchedule` and `host.notify` (see below) and `host.objects.setLinks`. The server decides, by the same rule as a page in that space: the module on there, the viewer a member, and the module's permission there. `host.spaces()` says where the viewer may write: each space carries `write: true | false`, the module's `write` permission there, so offer adding only where it is true. A page in a space reaches only its own space; naming another refuses ("this module is in another space"), and `{ space }` with a scope other than `space` refuses ("a space goes with scope \"space\", not ...").

```js
await host.storage.set('event:123', { title: 'Session' });        // returns { key, value, version, updatedAt, by }
const item = await host.storage.get('event:123');                 // an item, or null
const items = await host.storage.list('event:');                  // items whose key starts with the prefix
await host.storage.delete('event:123');
```

- Keys are 1 to 128 of letters, digits and `. _ : / -`. A value can be any JSON up to about 60 KB. A module may store 5 MB in all.
- Every write bumps the key's `version`. Pass the version you read to detect a change made since: `set(key, value, { version })` rejects with `error.status === 409` and `error.current` (what is stored now) if someone wrote first. Without a version, the last write wins.
- Store each thing under its own key, not everything as one blob, so two people editing different things never collide.
- `set` and `delete` also send the browser's time zone, which the server uses only to turn an instant into a day and a time for [held pointers and twins](#keeping-links-true). You pass nothing; a zone the server does not accept falls back to its `TZ`, then UTC, and the write still succeeds.
- Renaming your own keys: list the change in `module.json` as `"storage": { "renamed": [{ "from": "item:", "to": "plan:" }] }` (up to 10 key prefixes) and the server moves every stored key starting with `from` to `to`, in every scope. A rename is in effect for every version from the one that introduced it onward, even if later versions stop listing it. While it is in effect, keys still under the old prefix are moved on every start, install, update and rollback; switching to a version older than the one that introduced it moves the keys back (the newest rename first) and drops the record. The registry records each as `renamed: [{ from, to, version, at, kept }]`. A key whose new name is already taken is never overwritten: both are kept (`kept`). The log and the activity list note only keys actually moved and new conflicts. A list that would move keys in a circle is refused. Your code then reads only the new keys.

### Live changes

```js
host.on('change', (e) => {
  // e = { key, value, version, deleted, by, scope }
});
```

Any change to stored data in the scopes the frame can see is pushed to it, including changes the frame made itself. Read the current state with `list` once at start, then apply `change` events.

### Reminders and notifications (hooks)

These need the `schedule` and `notify` hooks in the manifest.

```js
await host.schedule({
  key: 'remind:123',                 // names it; scheduling the same key again replaces it
  at: Date.parse('2026-09-20T19:00:00-07:00'),   // milliseconds or an ISO date
  payload: { id: '123' },            // handed back when it fires (up to 4 KB)
  notify: { title: 'Session tonight', body: 'Starts in an hour' },   // optional
  repeat: { every: 'week', until: Date.parse('2026-12-31'), tz: 'America/Los_Angeles' }, // optional
});
await host.cancelSchedule('remind:123');
await host.notify({ to: 'space', title: 'Hello', body: 'Sent now' });  // 'space', 'environment', or a person's key
host.on('schedule', ({ key, payload }) => {});   // when one fires, if the module is open
```

- A schedule can be at most a year away, and a time already more than five minutes past is refused. If the server is off when a schedule is due, it fires on the next start unless it is more than six hours late.
- A notification reaches the people it is addressed to who could see the module in that place (the module's `read` permission). It shows as a toast, and as an unread count on the module's dashboard card or header item and the space bar's Layout button, until they open the module. Notifications are kept for people who are away, up to 50 each.
- `repeat` makes Collaborator schedule the next one itself when each fires, so it keeps going while the module is closed. `every` is `day`, `week`, `2weeks`, `month` or `year`; `until` (optional) ends it; `tz` is an IANA time zone name, and the wall-clock time is kept in it across daylight saving changes. A monthly repeat on the 31st goes back to the 31st after a shorter month. Cancelling the key cancels the whole series.
- `notify` in `schedule` defaults to the module's own scope: the space, or the whole environment. Its `to`, like `host.notify`'s, is `'space'`, `'environment'` or a person's key.
- On a module's environment page, `space: <id>` in `host.schedule`'s, `host.notify`'s or `host.cancelSchedule`'s argument makes it that space's: it runs and notifies there, and `to: 'space'` is that space's people. The Calendar and To-do set a space event's or task's reminder this way.

### A person's other calendars (`external`)

With the `external` hook in the manifest, approved by an owner, a module may show the signed-in person their own other calendars (the ones they added on their profile), and nobody else:

```js
const { calendars, events } = await host.external.events({ from: '2026-10-01', to: '2026-11-01' });
// calendars [{ id, name }]; events [{ calendar, uid, title, start, end, allDay }], all-day dates as YYYY-MM-DD, timed as ISO instants
host.on('external', () => { /* a calendar was read again: ask again */ });
```

They are read only, and only for the person looking: never store them, show them in a space, or send them anywhere. A guest, a keyed page, or an environment with other calendars off (`settings.otherCalendars`, which follows `calendarFeeds` until set; see [api-modules](api-modules.md), "Calendar feeds") gets none. The Calendar draws them muted, with a tag naming the calendar. On the Calendar destination the page's state also carries `externalOff`, the ids of the other calendars the filter has off.

### Objects: pointing at another module's objects

Modules cannot read each other's storage, and that does not change. Pointers are the one narrow door between them: a module stores a **pointer** to another module's object, never a copy, and asks Collaborator for its small **summary** whenever it draws it. The SDK's part is `host.objects` (it was `host.refs`; the old name, and `host.util.refKey`, now throw naming the new ones).

Collaborator names no module in any of this. A module says what it can do in `module.json`, and Collaborator is only the conduit; a module written tomorrow takes part by declaring, with no change to Collaborator or to the modules around it.

A module that lets others point at its objects lists them in `module.json`. Each entry names a `kind`, its `name` (what a person sees it called; `{name}` in it stands for the module's shown name, so the Planner's ferry reads "Itinerary · Ferry" where an owner or a template shows the Planner as Itinerary, and "Planner · Ferry" otherwise), the stored key its objects live under (a fixed prefix then `{id}`) and which of its stored fields fill the summary. Only the fields named here ever leave the module, so a record's other fields stay private. The field was `card` before step 7; a manifest still using it is refused (`module.json: refs kind "<kind>" uses the old card; use summary (<product> renamed an object's card to its summary).`). Two optional flags say what else the module can do with its objects: `"open": true` (it can show one when asked, see `onOpen`) and `"backlinks": true` (it shows what links to its objects, see `linksTo`).

```json
"refs": {
  "produces": [
    { "kind": "event", "key": "event:{id}", "summary": { "title": "title", "subtitle": "desc", "when": "start", "end": "end", "allDay": "allDay" } }
  ],
  "consumes": ["*"]
}
```

`consumes` lists the kinds this module wants to point at: named, as `"module:kind"`, or `"*"` for whatever other modules share. `"*"` is what lets a module link to objects of modules that did not exist when it was written. An owner approves the list when enabling.

The summary fields are `title` (required), `subtitle`, `when`, `end`, `allDay`, `done`, `category` (a short label) and `place` (`{ lat, lng, name? }`, a spot on a map). An upgrade that adds to `consumes` waits for the owner's approval, like a new permission or hook.

A pointer is `{ module, kind, id, scope: 'environment' | 'space' | 'person', space? }` (`space` only for a space's object).

```js
// Make a pointer to one of your own objects, and keep it (with the rest of your data):
const ref = host.objects.make('event', 'e1');           // { module: 'calendar', kind: 'event', id: 'e1', scope: 'space', space: '...' }
//   host.objects.make('event', 'e1', { scope: 'environment' })   an object in the environment's scope, from a space
//   host.objects.make('event', 'e1', { space: spaceId })    another space's object, from a module's environment page

// Later, ask Collaborator what to show. One pointer gives a summary, a list gives summaries in the same order:
const summary = await host.objects.resolve(ref);
// { ref, kind, kindName, open, module: { id, name, icon }, title, subtitle?, when?, end?, allDay?, done?, place? }
// or { ref, error, status, state } when the object is gone or the viewer may not see it (404, 403): `state` is 'gone' or 'hidden'.
// Draw what it says now, never a title you stored: a gone object is a muted "No longer available" with a way to remove your link,
// a hidden one "Not available to you" (show nothing else about it), and neither opens an editor. Ask again now and then, since an
// object can change or go where it lives without telling you.
const summaries = await host.objects.resolve([refA, refB]);

// Find objects to link to, in this place (or from a space, { scope: 'environment' }): every kind this module consumes.
const found = await host.objects.search('retreat');     // summaries, each with its pointer in summary.ref
// On an environment page, { scope: 'spaces' } asks every space the viewer is a member of at once (each pointer carries its space);
// { has: 'place' } keeps only summaries with a place, up to 1,000 rather than 50 (a map's pins). A page in a space cannot ask 'spaces'.
const pins = await host.objects.search('', { scope: 'spaces', has: 'place' });

// What can I link to? Whatever other modules share and Collaborator says this module may, so never name modules in your code.
const kinds = await host.objects.kinds();               // [{ module, moduleName, icon, kind, name, open }]

// Show an object in the module that owns it. The module opens on the canvas (or its page) and it is handed the pointer.
await host.objects.open(summary.ref);                   // only useful when summary.open is true
host.objects.onOpen((ref) => { /* you own ref: show it (select it, scroll to it, open it) */ });

// Tell Collaborator what one of your objects points at (the whole list, replacing the last), so what is pointed at can ask.
await host.objects.setLinks(host.objects.make('task', id), [refA, refB]);
// From an environment page, for one of a space's objects: the pointer already carries the space; { space } is only a check.
await host.objects.setLinks(host.objects.make('task', id, { scope: 'space', space }), [refA], { space });
// What points at one of your objects (kind has "backlinks": true), and what one points at: summaries.
const from = await host.objects.linksTo(ref);
const to = await host.objects.linksFrom(ref);
host.on('links', (e) => { /* e.ref: one of your objects whose links changed: ask again */ });

// Other modules' objects that show on a calendar as markers (a kind with "marker": true): a task's due day, a poll's closing time.
const markers = await host.objects.markers({ from: '2026-10-01', to: '2026-10-31' });
// [{ ref, kind, title, start, allDay, due, past, module: { id, name, icon, color, svg } }]: start is 'YYYY-MM-DD' when allDay,
// else milliseconds; due: dated by a due day (a task) rather than a moment (a poll); color: the module's tint or null; svg: its icon as inline SVG or null.
host.on('markers', () => { /* an object of a marker kind changed where you read: ask again */ });
```

**Markers.** A kind marked `"marker": true` beside `"dated"` (and never with `"mirror"` or `"feed"`) shows on a calendar as a marker that links back to its object ([plan-calendar-markers](../plans/plan-calendar-markers.md)). `host.objects.markers({ from, to })` reads them through the kinds this module was approved to consume, in its own place: in a space, that space's; on an environment page, the environment's own and each space the viewer is a member of. `from` and `to` are `YYYY-MM-DD` or ISO times; a date-only `to` takes in its whole day, and the 92-day limit counts to its end. Draw a marker with `module.svg` and `module.color` rather than asking for the icon, which a guest cannot. Done objects (`summary.done` true) and objects with no date are left out; at most 500, earliest first. A keyed page gets `[]`. Never store a marker, copy it or offer to edit it: draw it as it is and open its object with `open(ref)`. The `markers` event names no object; it says only that something changed, so ask again for what you show. The route, the refusals and the stream event are in [api-modules](api-modules.md), "Calendar markers".

Collaborator answers only what the viewer could already see in the producing module: it must be enabled, the viewer must hold its `read` permission in that scope and be in the space, and the asking module must have been approved for that kind. A pointer is therefore only as revealing as the viewer's own access, and a summary is read again each time, so it is always current. Show `Not available` for an error.

**Dragging.** A module can offer its objects to be dragged onto another module. The browser's own drag and drop is unreliable between sandboxed frames, so this is driven by the pointer and brokered by Collaborator: press an object, move a few pixels, and Collaborator shows the object's label at the pointer and tells the module frame under it where the pointer is and, on release, what was dropped. A module offers objects with `host.objects.draggable(root, resolve)`, where `resolve(target)` says what the pressed element is (`{ kind, id, label, ...options for make() }`, or `null`):

```js
host.objects.draggable(document.body, (target) => {
  const row = target.closest('[data-id]');
  return row ? { kind: 'event', id: row.dataset.id, label: row.textContent.trim() } : null;
});
```

The press is followed even when the pointer leaves your frame at once, and the click that would follow the release is swallowed. To see where a drag stops, open Collaborator once with `?debug=1` (`?debug=0` turns it off): every step, in the module that starts the drag, in the page and in the module under it, adds a line to a box at the bottom left. `host.objects.trace(text)` adds your own. It works with a mouse or pen; on a touch screen, search is the way to link.

A module with nothing stored (the assistant's answers) drags the summary itself instead of a pointer: `resolve` returns `{ summary: { title, kind?, content?, place?, date? }, label? }`. A drag carries `{ ref, summary }`, with the data type `application/x-host-object`. The module it lands on can make of it whatever takes a title, a date, a place or text; it cannot be linked to, since there is nothing to point at.

**What a drop does.** A module that accepts drops calls `host.objects.dropTarget` to know what is under the pointer, and hands the decision -- what can be done with it -- to `host.objects.dropMenu`, which is the same for every module. You say what is under the pointer (the drop context) and what you would offer of your own; the SDK adds what the dropped object's own module can do with it *here* (set this task's due date to this day, link this task to this event, put this place at this spot), shows one menu, and runs the choice -- one offer runs at once, with nothing asked. A drop is about the object and what is here: a third module making something new of the object is not offered, however well its inputs would fill; that belongs where the object lives. Nothing names a module: a module installed later takes part with no change to you. Your own objects reach the same `dropTarget` when they are dropped on you: a drag that starts in your module (`host.objects.draggable`) is delivered to your own `over`, `leave` and `drop` while it is over your frame, with your own pointer as `ref`, so moving an object within a module (a plan's object from one day to another) is the same code path as taking one from outside; the host hands it to the other modules the rest of the time. Note that `leave` is sent just before `drop`: anything you undo on `leave` that moves your layout (a drop zone that opens while a drag is over you) should wait a tick, or the drop is hit-tested against the wrong layout.

```js
host.objects.dropTarget({
  over: (point, ref, dragged) => { /* highlight what is at point; ref is the pointer being dragged (null for a carried summary) */ },
  leave: () => { /* clear the highlight */ },
  drop: async (ref, point, dragged) => {
    const spot = dayAt(point);                       // your own: what is under the pointer
    if (!spot) return;
    try {
      const chosen = await host.objects.dropMenu(dragged, point, {
        context: { date: spot.day, target: spot.event ? host.objects.make('event', spot.event.id) : undefined },
        own: [{ id: 'create', label: 'Add to the calendar as an event', hint: 'Tue 3 Oct', run: (ctx) => createEventOn(ctx.summary.title, spot.day, ref) }],
        remember: 'day',                             // the last choice is offered first next time, per dropped kind
      });
      if (chosen) note(`${chosen.label}: done`);      // null: dismissed
    } catch (err) { note(err.message); }             // "Nothing can be done with that here.", or what failed
  },
});
// point is { x, y } in your own page: host.objects.elementAt(point)
```

The **drop context** is `{ summary, target?, date?, time?, place? }`: `summary` is the dropped object's summary (resolved for you, or the one the drag carried), `target` a pointer to your own object under the pointer, `date`/`time` the day and time there, `place` the `{ lat, lng }` there (a map). An action is offered when every required input can be filled from it: a `ref:module:kind` input takes the dropped pointer when it is that kind; a plain `ref` takes the dropped pointer (a second one, or one named `target`, takes `target`); `date`/`datetime` the day (else the summary's own date); `string` named `title` the summary's title, `kind` its kind; `text` named `notes`, `body`, `content` or `text` the summary's text (only when the drag carried it); `number` named `lat`/`lng` the place. Of the actions that fill, a drop offers only the dropped object's own module's, taking the object by its exact kind (`ref:todo:task`, never plain `ref` alone) and using something from under the pointer (the target object, the day, the spot); and not one whose declared `needs` (a place, a date, text) the object's summary lacks. `offersFor` is what applies that; the fill rules themselves also serve the finished-poll buttons and "Send all to plan", where a plain `ref` input taking the object is right. An own offer is `{ id, label, hint?, icon?, run(ctx), when?(ctx) }`; `when` leaves it out for a summary it does not suit (a place needs a position); it wears your module's own icon unless `icon` names another, and each action offered wears its module's, in the same look as `host.menu.show`. `host.objects.offersFor(dragged, context)` is the same list without the menu. `tools/check-drop.mjs` runs the fill rules.

Treat `ref` as untrusted: `dropMenu` resolves it, which is where Collaborator checks what the viewer may see, and shows its error if not. Collaborator brokers a drag between module frames in the same window (the page, or the popped-out app). `host.objects.drag(event, ...)`, called from a native `dragstart`, and `host.objects.accepts` / `host.objects.parse` for a native drop remain for a drag that does not come from a module, but a module offering objects should use `draggable`. Search is the way to link without dragging at all.

### Keeping links true

The server keeps a pointer true after the object it points at changes, with no page open. Four declarations on a `refs.produces[]` entry, and one event, do it. None of them names another module. A manifest with a bad one is refused (400, a sentence naming the field). The rules and the reasons are in [plan-linked-objects](../plans/plan-linked-objects.md) and [plan-plan-calendar-sync](../plans/plan-plan-calendar-sync.md).

**Change events.** When an object that something points at is written or deleted, the modules that hold a link to it hear about it, where the viewer may see them. A write that leaves the object's summary the same sends nothing.

```js
const off = host.objects.onChange(({ ref, change }) => { /* change is 'updated' or 'deleted': resolve ref again */ });
```

**Held pointers (`holds`).** A kind whose objects store a pointer says which field holds it, so the server can act for the holder.

```json
"holds": { "field": "ref", "onDelete": "remove", "follow": { "title": "title", "day": "date", "pin": "pinned" } }
```

- `field`: the stored field that is the pointer. Field names here and below are 1 to 32 letters, digits or `_`, starting with a letter. One `holds` per kind.
- `onDelete`: `remove` deletes the holding object and its links when the object is deleted; `mark` keeps it and sets `markField` (required with `mark`, refused otherwise) to `true`.
- `follow` (optional, needs `title` or `day`): `title` is the field that takes the object's summary title. `day` is the field that moves to the object's new day, only when the holder was on the object's old day and its `pin` field is not `true`; a holder with no day, or on another day, stays put. The day of a timed object is the day in the writer's time zone.
- The holder is written only when a followed value differs, and its version goes up as usual, so an editor open on it gets the normal 409.

**Dated twins (`dated`, `mirror`, `create`).** A kind that sends twins and a kind that receives them are paired by the server in the same space, and kept in step both ways.

```json
{ "kind": "plan", "dated": { "title": "title", "day": "date", "time": "time", "endDay": "checkOut" }, "mirror": "out" }
{ "kind": "event", "dated": { "title": "title", "start": "start", "end": "end", "allDay": "allDay" }, "mirror": "in",
  "create": { "id": "{id}", "desc": "", "remind": null, "repeat": null, "by": "{by}" } }
```

- `dated` is either a wall clock (`title` and `day` required, `time` and `endDay` optional) or an instant (`title` and `start` required, `end` and `allDay` optional), each naming a stored field. An instant's stored value may be a date or date-time string, or a number of milliseconds. Mixing the two is refused. Either shape may name a `repeat` field (stored as `{ every, until }`, the Calendar's shape).
- `feed: true` (needs `dated`) offers the kind to people's calendar feeds ([api-modules](api-modules.md), "Calendar feeds"): each object is read with the person's own permissions whenever their calendar app asks.
- `marker: true` (needs `dated`; not with `mirror` or `feed`) shows the kind on a calendar as a marker that links back to the object, never as a twin; see "Markers" under "Objects" above.
- `mirror` is `out` (sends twins) or `in` (receives them), and needs `dated`. The server sends from a wall-clock kind to an instant kind.
- `create`, required with `mirror: "in"` and refused otherwise, is the stored value a new twin starts from: text (up to 200 characters), a number, a boolean or `null` per field. `{id}` becomes the new id and `{by}` the writer's name.
- A space object of a sending kind that has a day, and holds no pointer, gets one twin in each receiving kind that is on in that space and that the sender was approved to link to. A personal object never gets one.
- A wall-clock day with no time becomes an all-day twin starting on that day, with `endDay` as its end; with a time it becomes the instant of that day and time in the writer's time zone, and the end is left alone. The way back reads the day and time of `start` in the writer's time zone.
- Title, day and time write both ways. Clearing the sender's day, or deleting the sender, deletes the twin. Deleting the twin leaves the sender as it is until its day changes, which makes a new twin. A receiver's own objects never make a sender object.
- The pair is the server's: it shows in `linksTo` and `linksFrom`, and `setLinks` never removes it. Twin writes are the server's, do not count toward the write limit, and are skipped when the receiving module's store is full (tried again on the sender's next change).
- Objects that already had a day when their kind first declared `mirror: "out"` get their twin on the next server start, once; see [Modules API](api-modules.md).

### Bringing objects in

Collaborator publishes one format for objects written by an AI, so a person can research in any AI and bring the results in. The format, where objects are found in what is given, the caps and every refusal are in [api-modules](api-modules.md), "The objects format". The SDK's part is three calls on `host.objects`; nothing in them knows which module asks, and they store nothing.

```js
// The published format: instructions to give another AI (in this environment's word for object) and the JSON schema.
const fmt = await host.objects.format();     // { version: 1, fence: 'objects', fileSuffix: '.objects.json', instructions, schema }

// Whether this person may bring objects into this place with your module: show or hide your controls by it.
const { available, why } = await host.objects.checkAvailable();   // why: '' or the sentence a refusal would give

// Read objects out of a pasted answer (a string, sent as text/plain) or a file (a Blob or File, sent as its bytes).
try {
  const { objects, found, dropped, over } = await host.objects.check(textOrFile);
  // objects: each in the format, with basis: 'imported' and no sources; dropped: [{ at, why }]; over: valid ones past 50
} catch (err) {
  note(err.message);                          // the server's sentence; err.status is its status
}
```

`checkAvailable` needs your module's `write` permission here and is refused to a guest and in a space with AI turned off; no AI service or **Use AI in modules** is needed, since reading costs no AI. `check` counts against a limit of 20 a minute per module and person. Anything other than a string or a `Blob` is refused at once with "paste an answer or choose a file first". What to do with the objects is your module's: the Assistant keeps them through other modules' actions, the same way it keeps its own answers (see [Assistant](../userguides/userguide-assistant.md)). If you put an object's text into a `text` action input, that input is kept up to 8000 characters.

### Settings

A module declares settings in `module.json` (`settings`, see [api-modules](api-modules.md)) and reads what people chose:

```js
const prefs = await host.settings.get();          // { defaultView: 'week', ... }: the environment's, the space's and the person's values together
host.settings.onChange((prefs) => { ... });       // called when any of them changes
```

A `file` setting (with `"folder": "map-tiles"`, lowercase letters, digits and dashes) names a file the operator copied into that folder inside the module's own folder in the data folder (`modules/<module id>/<folder>/`; uninstalling and updating never delete it) (too large to upload through a page, such as a map archive); the owner picks it in the form, and a module running in the page reads it, range requests included, from `await host.files.url(name)`. A `url` setting holds an http or https address the owner chose.

Every setting has a default, so `get()` always answers with all of them. A module cannot change settings; the forms are Collaborator's, so a module never needs a settings screen of its own. Keep them to plain choices (a view, a number, a yes/no); nothing secret belongs in one.

### Place search

A module whose manifest declares `geocoder` (see [api-modules](api-modules.md)) asks the server to search for places by name, so the page never contacts an outside service:

```js
const { results, configured, credit } = await host.geocode.search('colosseo', { lat: 41.9, lon: 12.5 }); // near is optional
// results: [{ key, title, sub, lat, lng, from }]  `from` says where it came from (saved on the server, or the service)
await host.geocode.used(results[0].key);     // the person picked it: the server keeps it when it is cleaned out
```

The server looks in the places it has saved first, and asks the service the owner chose only when fewer than five match; the answers are saved if the owner allows it. Searches count against the module's rate limit.

### Flight lookup

A module whose manifest declares `"lookups": ["flight"]` (see [api-modules](api-modules.md), "Flight lookup") may ask the server for flights it has learned from flights saved before on this server, and for an airport by its code. Nothing outside the server is asked. The Planner uses it for **Look up a flight**.

```js
const on = await host.lookup.available('flight');               // true or false
const { flights } = await host.lookup.flight('WN 2483', '2026-11-14');
// flights: [{ object, line, sameWeekday, lastSeen }], best first; [] when nothing is known
const airport = await host.lookup.airport('MDW');               // { code, name, city, tz } or null
host.lookup.remember('flight', savedFlight);                    // a saved flight, in the objects format
```

- `available('flight')` answers `false` when the environment turned the module's suggestions off (the Planner's **Suggest flights from earlier trips**), for any other kind, and on any failure. It never throws.
- `flight(number, date)` answers `{ flights }`. Each `object` is a flight in the objects format, ready for the module's own form; `line` reads like "MDW 12:50 to SJC 15:25"; `sameWeekday` is true when it was seen flying on that day of the week; `lastSeen` is a month, `YYYY-MM`. It throws with the server's error: `bad number`, `bad date` (an empty number or date throws these without asking), or the rate limit's sentence (`status` 429). With the suggestions off it answers `{ flights: [] }`.
- `airport(code)` answers `null` for an empty code or one the airport list doesn't have. It works with the suggestions off. Other failures, such as the rate limit, throw.
- `remember('flight', object)` teaches the server's schedule a flight the person saved. Send only the schedule part (the server drops anything else). It never throws and answers nothing; whether anything was kept is not said.

### Asking in Chat

`host.chat.ask({ question, refs })` puts a private `/ai` question in the space's Chat, as the person using your module, with up to 12 pointers as context (`refs`, the same pointers `host.ai.ask` takes as `objects`). The question and the answer show in Chat, only to that person; your module gets nothing back but whether it was asked. It needs no hook: Chat applies its own rule for who may use `/ai` ([userguide-chat](../userguides/userguide-chat.md)). It works only on a space's canvas; elsewhere it rejects with "Ask this from Chat in a space.", and an empty question with "Type a question.". Research's **Research this** uses it.

### Commands in Chat

A module can take typed text from Chat. List it in `module.json` as a top-level `commands` array, each naming a `local` action of yours whose `input` has `text` (`string` or `text`):

```json
"actions": { "provides": [{ "name": "addTask", "label": "Add a task", "local": true, "input": { "text": "string" } }] },
"commands": [{ "name": "t", "label": "Add a task", "action": "addTask", "hint": "the task" }]
```

`/t book flights by sep 25` in Chat then requests `addTask` with `{ text: "book flights by sep 25" }` in the person's own open copy of your module. Parse it (`host.util.parseWhen`) and open your add form filled in; never save without the person confirming. The rules, and what the server refuses, are in [api-modules](api-modules.md) ("Module manifest" and "Chat routes").

### AI

A module that declares the `ai` hook can ask the AI the owner set up:

```js
const { available, why } = await host.ai.available();
const r = await host.ai.ask({ task: 'ask', question: 'Where is the hotel?', objects: [note.ref, place.ref] });
// r.text: the words, with a line {{summary:0}} where the first summary goes; r.summaries: [{ icon, kind?, title, content, tags?, place?, date?, links?, sources? }]
```

Tasks are `summarise`, `ask` and `tags` (`ask` needs no objects (the old `items` is refused): with none it answers from the model's own knowledge, and with some it uses them as context and says which parts came from them; `summarise` and `tags` need objects and use only them; each summary carries `basis`: `general`, `items` or `both`) (`tags` returns `r.tags`, up to 6 words). The server reads the objects as the person asking (only what they may see; up to 12, each up to 8 KB of `text`), sends them inside a fixed frame that tells the model they are data and never instructions, gives the model no tools, and returns its text. Asked for several distinct things, the model is told to write one summary per thing (up to 20 in one answer) rather than fold them into prose. Where the model writes a summary in a fenced block (```` objects ````, which the model is asked for, or, for a model that labels its block loosely, ```` summary ````, ```` json ```` or no language), the server checks each field (an icon from a fixed list, a title of 80 characters, content of 6000 characters — plain prose or simple Markdown, rendered with `host.util.markdown` — up to 5 one-word tags, an optional `kind` naming an everyday sort of thing the summary plainly is — `flight`, `train`, `bus`, `ferry`, `car`, `hotel`, `restaurant`, `cafe`, `bar`, `sight`, `museum`, `tour`, `show`, or left out for a plain one — a place with an in-range position, a real date, up to 5 `http` or `https` links, sources only among the objects given) and returns it as a summary; a block that is not a valid summary stays as ordinary text. The checker is the same one that reads objects brought in from another AI (see "Bringing objects in"). `kind` is ordinary domain language, not a module's own names: a module that recognises one (Planner's `acceptSuggestion`, for one) may act on it, and one that does not simply ignores it. Draw a marker `{{summary:N}}` only where N is a real index into `summaries`. Nothing is stored by the server: not the question, not the answer. It logs who, which module and task, and the token count, never the text. Errors are plain messages: not set up, your role may not use AI, AI is off in this space, the monthly allowance is used, the service did not answer. A person is limited to a few requests a minute.

### Uploaded pictures

A module whose manifest declares `uploads` (see [api-modules](api-modules.md)) keeps the pictures its people add:

```js
const f = await host.uploads.put(blob, { name: 'harbour.jpg', keepPosition: false, scope: 'space' });
// f: { id, name, type, size, by, at, taken, camera, hasPosition, position, hasThumb }
await host.uploads.thumb(f.id, thumbBlob, { scope: 'space' });
img.src = await host.uploads.url(f.id, { thumb: true, scope: 'space' });
await host.uploads.remove(f.id, { scope: 'space' }); // when the object that shows it is removed
```

Make the picture the size you want (about 2000 px on the long edge) and a thumbnail (about 400 px) in the page before sending: the server does not decode pictures, it checks and cleans them. A resize in the page loses the picture's own facts, so read them first with `await host.uploads.inspect(file.slice(0, 256 * 1024, file.type))`, which answers `{ type, taken, camera, hasPosition, position }` from the start of the file; the position goes only to the person who sent it, and keeping it is then the page's decision (store it with the object). A photo's position is dropped unless `keepPosition` is true; `hasPosition` says it had one, so the page can offer to keep it (put the file again with `keepPosition`, then remove the first copy). Only the person who added a file, or an owner, can remove it. Uploads count against a per-person rate limit.

### Shared tools

Anything more than one module needs belongs in the SDK, not copied into each module. Use these rather than writing your own; they follow the theme and work the same in a frame and in the page.

- `host.ui.datePicker(input, { range, clearable })` adds a calendar button to a date field (`<input type="date">` or `type="datetime-local"`). It opens a small month with the weekdays across the top, shows the weekday of what the field holds under it, closes on Escape or a click elsewhere, and leaves typing working. `range` is a function returning `[from, to]` to shade a span of days, and `clearable` adds a **Clear** button. A `datetime-local` field keeps its time (12:00 if it had none). It returns `{ close, refresh, destroy }`: call `refresh()` after you set the field's value from code, so the weekday shown is current. The picker follows a disabled field (a read-only form): its button is disabled with the field and it won't open; call `refresh()` after toggling `disabled`, as after setting the value.
- `host.locale()` is `{ language, clock, currency, currencies, words }`: how the server shows these, and `currencies`, the sorted codes the server accepts for a currency (the same list as `GET /api/currencies`) (Manage > Settings > Language, time and money; the defaults `en`, `12`, `USD` until the handshake answers). Apply them with `host.util.time("22:30")` ("10:30 PM" on the 12-hour clock, "22:30" on the 24-hour one; a stored time is always HH:MM), `host.util.hour12()` (for `toLocaleString`'s `hour12` where you show a Date) and `host.util.money(amount, currency?)` (the server's currency unless one is given). Never format a time or an amount your own way: the person chose these once, for everything.
- **Words.** An environment's owner can rename its levels and roles (Manage > Environment > Words), so never type "space", "member" or the like into text people read. `host.locale().words` holds all thirteen, keyed `host`, `environment`, `space`, `home`, `aside`, `canvas`, `module`, `object`, `admin`, `owner`, `moderator`, `member` and `guest`, each `{ one, many, a }` (`a`: the singular with its article). `home` is what the home page, the list of spaces, is called; unless the owner or the template set it, both its forms are the space word's plural with a capital ("Spaces", "Trips"), and the SDK's own defaults, before the handshake answers, give "Spaces". `host.util.word(key, { many, cap, a })` answers one ("trip", `many` "trips", `a` "a trip", `cap` with a capital) and throws for an unknown key. For markup, write `<span data-word="owner" data-word-form="a cap"></span>` (forms: `many`, `cap`, `a`) in a template and call `host.util.fillWords(root)` after putting it on the page. In `module.json`, the text people read (the description, the widget's title, permission labels, setting labels, help and options, event and action labels, and kind names) takes the same placeholders the pages use: `{space}`, `{spaces}`, `{Space}`, `{a space}` and so on for each key except `home`, which has none (its default is the space word's, so `{Spaces}` already reads it).
- `host.ui.currencySelect(select, { value, empty, onChange })` fills a `<select>` you already have with the currencies the server accepts: a **Common** group, then **All currencies**, each by its name in the viewer's language (the bare code where there is no name). `value` is matched in capitals; a value not on the list (an old or odd code) gets its own selected option, so nothing stored disappears. `empty: true` adds a first choice, "Default (<the environment's currency>)", whose value is `""`; give a string instead to label it yourself. `onChange(code)` runs on each change (`""` for the default). It returns `{ set(value), value, destroy() }`. Call it after `host.ready()`, since the list comes with the handshake; with no list there it falls back to the browser's own list, then to the common codes.
- `host.ui.viewSwitch({ id, options, value, onChange })` draws a labelled view or filter switch in the toolbar (see "The toolbar" below) and owns the boilerplate every module drawing one otherwise repeats: it only calls `host.toolbar.set` when the value or an option's label actually changed, and wires the `toolbar` event for you. Call `.set(value, options?)` on every render (it no-ops when nothing changed) rather than diffing and calling `toolbar.set` yourself. A module may make more than one (Research: whose items, then Cards/List): every live switch shares the toolbar row, drawn in the order they were made with a separator between, and any one changing redraws the row; `destroy()` takes one out again. Do not call `toolbar.set` yourself while a switch is live, since the next switch change would draw over it. Each option is `{ id, label, icon?, regular? }`: give every option an `icon` (a Font Awesome name; `regular` for the outlined set) and the switch shows the icon beside the word, and only the icon when the row is too narrow for the words, the word staying as the tooltip and what a screen reader reads; an option without an icon always shows its word. With `element` (an element of your own page), the switch is drawn there instead of in the toolbar, in the same look and fitted to that element's parent, for a page with no toolbar row (a destination's panel). The look is the base stylesheet's (`.tb-tabs`, `.tb-tab`, `.tb-tab-glyph`, `.tb-tab-word`, `.tb-tabs-compact` in `/sdk/host.css`); a module must not size them (`tools/check-switches.mjs` fails a bundled module that does).
- `host.ui.toolbarButton({ id, label, icon, iconOnly, on, onClick })` puts one button in the same toolbar row as the view switches (after the switches made before it), for a chooser that opens a menu, such as Research's Tags: `onClick` runs on a click and receives the `toolbar` event (`{ id, x? }`), and the returned `{ set({ label, icon, on }), destroy() }` changes what it shows (`set` redraws only when something changed). Open the menu it belongs to under the button with `host.menu.show({ at: { x: e.x, y: 4 }, ... })`; where the host gives no `x`, `{ x: 100000, y: 4 }` lands at the top right of the module, under the toolbar.
- `host.people()` returns the people of the space the module is open in, `[{ key, name }]` (empty outside a space), for choosing a person ("whose is it"): store their `key`, not the name.
- `host.ui.moreButton(el?, { label })` makes the shared "..." button (`ellipsis-vertical`, centered, class `sdk-more`) for a card's, a row's or a day's menu. Pass a `<button>` you already have (its `data-action` and listeners stay) or nothing to get a new one; `label` is the accessible name (default: the button's `aria-label`, else "More"). It sets `aria-haspopup="menu"` and returns the button; open your menu from it with `host.menu.show`. A `<button>` in your markup that shows `ellipsis-vertical` must carry `sdk-more` (`tools/check-module-window.mjs`).
- `host.ui.icon(name, style)` returns a Font Awesome icon ("circle-right", style "solid", "regular" or "brands") as inline SVG text, coloured by the text colour, for a module that cannot load the icon font (a sandboxed frame). It rejects if there is no such icon.
- `host.actions.pick(items, point)` is the small menu described under Actions.
- `host.ui.editor(dialog, { size, isDirty, onClose })` opens your Add or Edit form as a window over the whole page, a sheet on a phone, with a close button, the focus trap and the "Discard your changes?" question. See "An editor window" below.
- `host.ui.kindPicker(el, { label, groups, value, start, recent, onChange })` draws a one-row field for choosing the kind of a thing from named, iconed, coloured options in groups, with typing to filter and the recent choices first. See "Choosing a kind" below.
- `host.util` holds `esc` (text made safe for HTML), `id()` (a new id for something you store), `objectKey(ref)` (a pointer as one string, for comparing; `refKey` throws naming it), and `ymd(date)` / `parseYmd(text)` (a local day as `"2026-09-24"`, and back).

When you find yourself writing something a second module might also need, ask for it here instead. The Calendar, To-do, Polls, Research, Places and the Planner use these.

### The titlebar

A module on the canvas (docked or floating), or in a window of its own, has a titlebar the host draws with the module's name and the host's own buttons. `host.header.set([...])` adds icon buttons of the module's own to it, ahead of the host's buttons and set off by a pipe: for a window-level action (pin the module open, say), not a filter or a view switch -- those belong in the toolbar (below), as `tabs`, not more icons here.

```js
const drawn = await host.header.set([
  { id: 'pin', icon: 'thumbtack', title: 'Keep this open', on: pinned },
]);
host.on('header', (e) => { /* e.id is the button clicked */ });
```

`icon` is a Font Awesome name, `on` marks the current choice, `title` is the tooltip. It resolves `true` when the host drew them and `false` when there is no titlebar (a module's environment page), so keep your own controls in the page in that case, and hide them when it is true. More than five collapse into a host-drawn "..." at the end (see Overflow, below); mark one `overflow: true` to always keep it there (a destructive one, say) regardless of how many you set.

### The toolbar

An optional row the host draws under the titlebar, above the content: a small kit of reusable tools about the module's current state -- not window-level actions (the titlebar) and not the module's primary inputs (the action bar), and not a second row of titlebar icons. For the common case, a view or filter switch, reach for `host.ui.viewSwitch` (see "Shared tools") rather than building the `tabs` item yourself. `host.toolbar.set([...])` takes a list of items, each one of:

```js
host.toolbar.set([
  { type: 'text', text: '12 of 40' },
  { separator: true },
  { type: 'tabs', id: 'view', value: 'mine', options: [{ id: 'mine', label: 'Mine' }, { id: 'all', label: 'All' }] },
  { type: 'progress', value: 62, label: 'Importing' },
  { type: 'slider', id: 'zoom', value: 5, min: 1, max: 10, label: 'Zoom' },
  { id: 'sync', type: 'button', label: 'Sync now', icon: 'rotate' },
]);
host.on('toolbar', ({ id, value, x }) => { /* a tabs or slider item's click/move also carries `value`; a button's click carries `x`, its left edge across the module, for a menu under it */ });
```

- `{ type: 'text', text }` -- a plain, dim label.
- `{ type: 'tabs', id, value, options: [{ id, label?, icon?, regular?, iconOnly? }] }` -- a segmented switch; each option needs a `label`, an `icon`, or both -- `iconOnly` keeps the icon and drops the visible label (kept as the tooltip and `aria-label`), for a tight space where the icon alone already reads clearly (Places' Mine/This space/Everyone, an icon and a label together, is the more common shape). A click sends `{ id, value: optionId }`.
- `{ type: 'progress', value, label? }` -- a read-only bar, `value` 0-100.
- `{ type: 'slider', id, value, min?, max?, step?, label?, disabled? }` -- a range input (min 0, max 100, step 1 unless given); moving it sends `{ id, value }`.
- `{ type: 'button', id, label?, icon?, on?, primary?, disabled?, overflow? }` (the default type when `type` is left out) -- a click sends `{ id }`. Use this sparingly, for the one action that goes with the toolbar's own state (a Sync button beside an import's progress) -- not a place to relocate the titlebar's row of icons. Unlike a `tabs` option, a lone `button` item repeating the titlebar's icon style is exactly the thing to avoid.
- `{ separator: true }` -- a vertical divider, ignoring every other field.

Only `button` items count toward the five-item cap and collapse into the "..." (text, tabs, progress and slider items always show, since they say something, or are themselves the control, rather than being one more action). Resolves `true`/`false` the same way `header.set` does.

### Registering into the nav bars

The header is two bars of two zones each, a left and a right (see the navigation architecture): the primary nav is about the system and the secondary, in a space, about the space. Both are drawn from one registry, and a module registers tools into the secondary bar, the space bar, the same way the host's own controls are registered: one registration, not markup, and the host draws the tool in its own look. This is for a space action the module adds while it is open on the canvas (a quick "add" for the space, a switch for the space's view of the module), not for the module's own state, which is the toolbar's, and not for its primary inputs, which are the action bar's.

```js
await host.nav.set([
  { id: 'add', icon: 'plus', label: 'Add a task', order: 101 },
  { id: 'mine', icon: 'user', label: 'Only mine', toggleable: true, active: onlyMine, group: 'views' },
  { id: 'plan', icon: 'map', label: 'Open the plan', href: '/modules/planner' },
]);
host.on('nav', ({ id }) => { /* 'add', 'mine' or 'plan': the module's own id */ });
host.nav.setActive('mine', true); // a toggle's state, in place
host.nav.setBadge('add', 3); // a count on a tool; 0 takes it off
```

A tool is `{ id, zone?, icon, label, title?, order?, group?, groupOrder?, href?, visible?, toggleable?, active?, badge? }`:

- `id` is letters, digits and hyphens, the module's own; the host puts it under the module's namespace, so a module can neither touch another's tools nor the system's, and the `nav` event carries the module's own id back.
- `zone` is ignored: every module tool goes in the space bar's right zone, where it can fold into the **…** when the bar is narrow (a tool that names `left` or `middle` is placed there too, not refused); `icon` a Font Awesome name; `label` what a screen reader and the tooltip say (`title` a longer tooltip).
- `order` and `groupOrder` sort tools in a group and groups in a zone. The bands are 1-10 for the system's core tools, 11-50 secondary, 51-100 utility, 101-998 a module's own, 999 last: a module's numbers are clamped into 101-998, so the system's tools stay ahead of every module's with nobody coordinating numbers. A module's tools form their own group (or groups, with `group`), with a divider from the system's.
- `href` makes the tool a real link (a path on this server, or an https address); otherwise a click arrives as the `nav` event.
- `visible` is a boolean (the default is shown); `toggleable` tools carry `active`, which `setActive` changes in place, and `badge` is a count, which `setBadge` changes in place. Never call `set` again for either.

The set replaces the last one; it is drawn while the module is open on that space's canvas and taken out when it closes or the module is unmounted. It resolves `true` when the host drew the tools and `false` when there is no space bar here (the module's own page, its own window), so keep such a control in the page in that case. On a phone (a space bar 640 pixels wide or narrower) your tools are always entries in the space bar's **…**, never buttons in the bar.

**The top bar.** A module's tools always go in the space bar; the host decides where they go, and a module never places one in the top bar. `bar` and `system` on a tool are ignored: a tool that still says `bar: 'primary'` or `system: true`, written for an earlier contract, is placed in the space bar like any other and is not refused. Nothing a module does puts it in the top bar.

### An action menu

A menu of things to do — a row's "..." button, a right-click, the + on a joint between two days — is `host.menu.show({ id, items, at, anchor })`. This is different from `host.actions.pick` (below): `pick` asks one question and resolves once ("what should this dropped item become?"); `menu.show` draws a reusable menu of independent actions, each with its own handler, that stays around across many opens.

```js
host.menu.show({
  id: `row-${item.id}`, // showing the same id again while it is open closes it instead of reopening it
  anchor: button, // or `at: { x, y }` for a point instead (a drop's own coordinates)
  items: [
    { id: 'edit', label: 'Edit', icon: 'pen', onClick: () => openEditor(item.id) },
    { separator: true },
    { id: 'delete', label: 'Delete', icon: 'trash', danger: true, onClick: (_, b) => {
      if (!armed) { armed = true; b.querySelector('.sdk-menu-label').textContent = 'Really delete?'; return false; } // false: stays open
      remove(item.id); // anything else closes the menu
    } },
  ],
});
```

Each item is `{ id?, label, icon?, iconColor?, regular?, hint?, disabled?, danger?, separator?, href?, target?, onClick? }`; `separator: true` draws a divider and ignores every other field. `iconColor` sets that one icon's color (a CSS color), for a menu whose items are a fixed set of kinds people already tell apart by color elsewhere in the module (Planner's marker types, say) — most menus don't need it; `danger` already covers the one-off "this is destructive" case. An item that just opens somewhere else gives `href` instead of `onClick` — a real `<a>` (`target` "_blank" unless given), so hovering, copying the link and opening it in a new tab all still work, rather than a click handler faking navigation with `window.open`. Position with `at` (a point) or `anchor` (an element to open under, flipped above it when there is no room below) — give one, not both. `onClick(item, button)` runs on a click and the menu closes afterward, unless it returns exactly `false` (or a promise that resolves to `false`), which leaves it open for an item that needs to arm itself first, as `delete` does above — mutate the clicked button's own `.sdk-menu-label` to change what it says. Only one of these is ever open at once per module; showing a new one closes whatever was open, and showing the same `id` again toggles it closed rather than reopening it, so a "..." button behaves the way it looks like it should.

### An editor window

A module's Add or Edit form opens in an **editor window**: a `<dialog>` in your root, shown modal through `host.ui.editor`. A modal dialog is drawn in the browser's top layer, above every module and the header, so the form is sized to itself rather than to the module and is never clipped by the module's box, docked at 240 px or floating at its smallest. On a phone (640 px wide or less) it is a full-screen sheet. The dialog stays in your root, so your own styles, the base stylesheet and the theme tokens still apply inside it. The six bundled modules with a form use it; a module that does not call it keeps working as before, its form inside its own window.

```html
<dialog id="editor" class="sdk-editor">
  <form id="form">
    <h3>New task</h3>
    ...
    <div class="row sdk-editor-actions">
      <button class="btn btn-primary" type="button" id="f-save">Save</button>
      <button class="btn" type="button" id="f-cancel">Cancel</button>
    </div>
  </form>
</dialog>
```

```js
const editor = host.ui.editor(host.root.getElementById('editor'), {
  size: 'medium',             // 'medium' (560 px, the default) or 'large' (880 px; the Planner's object form)
  isDirty: () => changed(),   // optional: true when closing would lose something the person typed
  onClose: (reason) => {},    // after it closed: 'cancel' (Escape, Close, Cancel or Discard) or 'done' (you called close())
});
editor.open({ focus, returnTo }); // shows it; `focus` an element inside (else the first field); `returnTo` an element, or a function giving one, focused on close
editor.close();                   // closes at once, nothing asked: after Save or Delete
editor.cancel();                  // what your own Cancel button calls: asks "Discard your changes?" first when isDirty() says true
editor.isOpen;                    // true while it is open
editor.element;                   // the <dialog>
```

- **The element** must be a `<dialog>`; anything else throws `host.ui.editor needs a <dialog> element`. The SDK adds the classes `sdk-editor` and `sdk-editor-medium` or `sdk-editor-large`, `tabindex="-1"` when the dialog has no `tabindex`, and `aria-labelledby` pointing at the first heading inside when it has neither `aria-label` nor `aria-labelledby`. The size is set once; a module with two forms of different sizes swaps the size class itself before opening (the Planner: `large` for an object, `medium` for the plan).
- **Opening** calls `showModal()`. A second `open()` while open only moves focus. Focus goes to `focus` when it is inside the dialog and visible, else to the first field or button of your own (not the close button), else to the dialog. You may replace the dialog's content on each open (the Planner clones a template into it): the close button and the label are made again.
- **The close button** is `button.sdk-editor-close`, the `xmark` icon labelled "Close", in a sticky strip (`.sdk-editor-corner`) that keeps it in the top right corner while the form scrolls. It closes as Escape does. Give your heading right padding (about 36 px) so its text clears the button.
- **Escape** is handled on the key inside the dialog and stopped there, so neither your listeners nor the page's see it; the dialog's own `cancel` event is prevented, so the browser never closes it by itself. Remove your own Escape-closes-the-form listener. Escape in a menu, a date picker or a drop menu open inside the dialog closes only that.
- **The question.** When `isDirty()` says true, Escape, the close button and `cancel()` do not close. A row, `.sdk-editor-discard` with `role="alertdialog"`, appears at the bottom of the dialog reading "Discard your changes?" with **Keep editing** (focused) and **Discard**. Keep editing, or Escape again, takes the row away and puts focus back where it was; Discard closes with `onClose('cancel')`. Without `isDirty`, or when it says false, they close at once; an `isDirty` that throws counts as false. Write `isDirty` as a comparison of the form with a snapshot taken when it opened, so words your own code filled in (a link preview's title, a quick add from Chat) are not counted; the bundled modules keep the snapshot as a JSON string.
- **Your own Cancel button** calls `editor.cancel()`, never `close()` (which would skip the question) and never a click on the SDK's button. `tools/check-module-window.mjs` holds the bundled modules to this.
- **A click on the backdrop** does nothing.
- **Focus on close** goes to `returnTo` when it is given, still in the page and outside the dialog; else to what had focus before `open()`; else to your root element, given `tabindex="-1"`. It is resolved **a microtask after `onClose`**, so a list you redraw after a save (queued as a microtask too) is the one searched: give a function that finds the saved row by its id, falling back to the button that opened the form, and set what it looks for when the save knows the new id.
- `onClose(reason)` runs on every close, including one the browser made; use it to clear the form's state and close your date pickers.
- **Layout.** Centered, `width: min(560px, 100vw - 32px)` (`large`: 880 px), `max-height: calc(100dvh - 48px)`, scrolling inside; your button row marked `sdk-editor-actions` sticks to the dialog's bottom, so Save is always in view. Two custom properties are set on the dialog for a sticky piece of your own: `--sdk-editor-top`, the height of the corner strip (40 px; on a phone 48 px plus the safe-area inset), and `--sdk-editor-pad`, the side padding (16 px; 12 px on a phone). Colours from the tokens (`--bg-section`, `--text`, `--border`); the backdrop is `color-mix(in srgb, var(--bg) 70%, transparent)`, the tint the modules' own overlays used. Your form needs no box of its own: no width, padding, background or border, only the layout of its fields.
- **Phones.** At 640 px and below the dialog is a full-screen sheet (`top: 0` with `height: 100dvh`, padded by the safe-area insets, no backdrop showing) and the close button and the buttons in `sdk-editor-actions` are 44 px tall. Key your form's own phone rules on `@media (max-width: 640px)`, not on your module's narrow class: the window is the page's width, not the module's. Fields at 16 px stop iOS zooming in.
- **Reduced motion:** a short fade on open unless `prefers-reduced-motion` is set.
- **Popovers inside.** `host.menu.show`, `host.ui.datePicker` and `host.ui.kindPicker`'s list opened from a control inside an open editor go into that dialog (in the top layer with it, not inert under it) and are kept inside the window with 4 px to spare, the picker flipping above its field when there is no room below; `host.actions.pick` goes into your module's open editor whenever it has one, and puts focus back in the dialog when dismissed. Everywhere else they behave as before, inside the module's box.
- **While it is open** the rest of the page is inert: the call's buttons cannot be clicked, and nothing can be dropped on your module (To-do's drop onto the open form's link field went; its link search stays). The page's keys still reach the page (M to mute, the mute and camera hotkeys, push to talk), because only Escape is stopped.
- **Moving.** When the host moves your module between docked and floating, the dialog falls out of the top layer. The host then sends the event `moved` (`{ mode: 'dock' | 'float' }`) and the SDK shows the dialog modal again with the same focus; you need do nothing. Popping the module or the call out reopens the module, so an open form is lost, as before.
- **A read-only form** (something the person may only look at) hides its button row and takes no input: disable every field and button in it (a date picker follows its field; `refresh()` it), make `isDirty` answer false for it, and open with `focus: editor.element` so focus starts on the window itself; the corner Close and Escape then just close. To-do, Calendar and Research do this.
- **In a sandboxed frame** (an uploaded module) the same call shows the dialog modal inside the frame: clipped to the module's window as before, but with the focus trap, Escape, the close button and the question. Lifting the frame over the canvas is a later step of [plan-editor-window](../plans/plan-editor-window.md) (step 11).
- **The styles** are in `/sdk/host.css`, between `editor:start` and `editor:end`, so they reach a module in the page, in a frame and on its own page alike. `tools/check-module-window.mjs` holds a bundled module to the contract (its `#editor` a `<dialog class="sdk-editor">`, no `.editor { position: absolute; inset: 0 }` overlay left, Cancel through `editor.cancel()`, nothing reading `$('editor').hidden`), and runs the SDK's sizes, its handle and its thrown sentence.

### Choosing a kind

When a form asks what kind of thing is being added, from a list of named options that each have an icon and a colour (the Planner's flight, train, stay, restaurant, sight, marker and so on), draw the choice with `host.ui.kindPicker` rather than a grid of buttons or a plain `<select>`. It is one row, `--bar-control-h` (38 px) tall: the chosen kind's icon on a tinted chip in its colour, its name in a field you can type in, and a chevron. Opened, it lists the kinds in their groups, each with its icon in its colour, the recent choices first; typing filters the list. The ARIA combobox pattern, so a screen reader hears the field, the active option and its group. The Planner uses it for **What is it** ([plan-editor-window](../plans/plan-editor-window.md), Part 2); Research's note type and Places' category could use it later.

```js
const kind = host.ui.kindPicker(host.root.getElementById('f-types'), {
  label: 'What is it',             // the field's accessible name (default "Kind")
  groups: [
    { label: 'Getting there', options: [{ id: 'flight', label: 'Flight', icon: 'plane', color: 'oklch(from var(--accent) l c calc(h + 195))', words: ['plane', 'air'] }] },
    { label: 'Markers', options: [{ id: 'marker:rest', label: 'Rest', icon: 'bed', color: '#14b8a6', words: ['marker', 'time'] }] },
  ],
  value: 'sight',                  // the kind chosen to start with (else the first option)
  start: 'recent',                 // optional: start on the kind chosen last in this browser when there is one, else on `value`
  recent: { key: 'add', max: 4 },  // optional: recent choices first, kept in this browser for your module; `max` shown (default 4; below 1 means 4)
  onChange: (id) => {},            // a person chose a different kind
});
kind.value;             // the chosen id
kind.set(id);           // choose without onChange; an id not in the groups is kept and shown as "Unknown kind"
kind.setGroups(groups); // a new list (the Planner's marker types change in its settings); a chosen kind no longer listed stays the value, shows "Unknown kind" and is reported as onChange(value)
kind.remember(id);      // put a kind at the front of the recent list without choosing it (the kind an object was saved with when the form opened on it already chosen); an id not in the groups is ignored
kind.disabled = true;   // greys the field and closes the list; false again to take input
kind.focus();           // focus the field (its name is selected, so typing starts the search)
kind.open();            // open or close the list from code
kind.close();
kind.element;           // the element you gave, now `.sdk-kind`
kind.input;             // the field itself (`input[role=combobox]`), for `editor.open({ focus: kind.input })`
kind.destroy();         // closes the list, empties the element and takes the classes off
```

- **The element** can be any element in your root; it is emptied and given the class `sdk-kind`. Anything but an element throws `host.ui.kindPicker needs an element`. Draw the picker each time the form opens if you clone the form from a template, and `close()` it in the editor's `onClose`.
- **Options** are `{ id, label, icon, color, words }`: `id` a string you store or map from; `label` what is shown; `icon` a Font Awesome name (drawn with `host.ui.icon`); `color` any CSS colour, set as the custom property `--kind-color` on the chip and on the option's row, which tints the chip's background and colours the icon (the accent until a kind has one; the chosen option's icon is `--on-accent` on a chip filled with the colour); `words` other words the kind is found by. Within a group `options` may be empty; a group with no options is not shown.
- **An unknown kind.** A `value` or `set()` id that is not in the groups is kept as the value and shown as an empty field with the placeholder "Unknown kind" and no chip, never as another kind (the Planner: a marker type an owner removed). The module decides what saving does; the Planner keeps the stored type unless another kind is chosen.
- **Closed:** `input.sdk-kind-input` with `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls` the list's id and `aria-label` the label; the chosen kind's name is its value, its icon on `span.sdk-kind-chip` (hidden when the kind has no icon), the chevron `span.sdk-kind-chevron`. Focus arriving selects the name, so typing replaces it.
- **Open** (a click on the row, typing, Down, Up or Alt+Down, or `open()`): `ul.sdk-kind-list` with `role="listbox"`, each group an `li.sdk-kind-group` with `role="group"` labelled by its `div.sdk-kind-group-title`, each option a `div.sdk-kind-option` with `role="option"`, its id in `data-id`, `aria-selected` on the chosen kind and `.active` on the one the keys are on (`aria-activedescendant` on the field). The list is at most 360 px tall and scrolls; it is placed under the field, or above it when there is no room below, with 4 px kept to the window's edges, and follows the page's scrolling and resizing (the document's scroll and the module's root's, so a scroll inside an editor dialog or a shadow root moves it too). The class `open` is on your element while the list shows; the chevron turns.
- **Recent.** With `recent: { key }`, every choice a person makes (not `set()`) goes to the front of a list in `localStorage` under `app:kind:<moduleId>:<key>` (`key` cut to 120 characters; up to 12 ids kept). When the list opens with nothing typed, a **Recent** group comes first with up to `max` of those ids that are still in the groups, and those kinds are left out of their own groups below. While something is typed, Recent is not shown. Without `recent`, nothing is kept and `start: 'recent'` does nothing.
- **Typing filters.** Every word typed must start some word of the option's label or its `words`, without case or accents ("cafe" finds Café, "tra" leaves Train and Travel day, "light" does not find Flight). The better matches come first: a name equal to what was typed, then a name that starts with it, then a name whose words match, then a kind found only by its `words`; within a rank the groups' own order holds, and the groups themselves are ordered by their best match. A group with nothing left goes; with nothing left at all the list holds one disabled row reading "Nothing matches". The active option is the chosen kind when it is in the list and nothing is typed, else the first match.
- **Keys** on the field: Down and Up open the list, then move the active option (wrapping); Home and End jump to the first and last; Enter chooses the active option and never submits your form; Tab chooses it and moves on; Escape closes only the list, puts the chosen name back and keeps focus on the field. Inside an editor window the Escape is stopped, so the window stays open. A click on an option chooses it; the list never takes focus from the field, and focus leaving the field closes the list.
- **Choosing** sets `value`, writes the recent list, closes the list, and calls `onChange(id)` only when the kind changed. `set(id)` changes the value and the row shown without `onChange` and without touching the recent list; `remember(id)` touches only the recent list. The Planner calls `remember()` with the kind an object is saved with, so a kind the action bar, a day's "..." or a joint's + chose counts as recent too. A kind chosen in the list is recent at once, even if the form is then cancelled.
- **Inside an open editor window** the list is appended to that dialog, as the other popovers are ("Popovers inside" above); elsewhere to your root.
- **On a phone** (640 px wide or less) the open picker is a sheet: `.sdk-kind-sheet`, holding the field and the list, is fixed to the bottom of the screen at half its height (at least 440 px when the screen allows), over a tint of the page, with the field at its top at 44 px and each option at least 44 px tall; the list is inside the sheet, not placed by the script. Opening on a phone focuses the field.
- **The styles** are in `/sdk/host.css` between `kind:start` and `kind:end`, in the theme's tokens with no colour of their own ([design-theme](../designsystem/design-theme.md), "The kind picker"). `tools/check-module-window.mjs` runs the filtering, the recent list and the markup from a slice of `host.js`, and holds the stylesheet's block to the tokens, the control height, `--kind-color`, the phone rule and the 360 px list.

### Events and actions: reacting to and asking things of other modules

The other two conduits between modules, and like refs they name no module. Declare them in `module.json` and an owner approves what your module hears and asks for.

```json
"events":  { "publishes": [{ "name": "closed", "kind": "poll", "label": "A poll closed" }], "subscribes": ["*"] },
"actions": { "provides": [{ "name": "createTask", "label": "Add a task", "input": { "title": "string", "notes": "text?", "ref": "ref?" } }],
             "uses": ["*"] }
```

**Events.** `host.events.publish(name, { ref, data })` says something happened (`ref` an optional pointer to one of your own objects, `data` a small plain object under 2 KB). `host.events.subscribe(handler)` hears the events your module was approved for (`"*"`, or `"module:name"`), about modules the person can see here, in order, including those that happened while your module was not open (from where it last got to; a module hears nothing from before its first subscribe). An event has `{ id, at, module, name, ref, data }`. By convention an event named `closed`, `done`, `completed` or `finished` means the object it points at is finished. More than one person may have your module open, so make handling an event safe to do twice.

**Actions.** `input` maps each field to a type: `string`, `text`, `date`, `datetime`, `boolean`, `number`, `ref` or `object`, with a trailing `?` for optional. `host.actions.list()` returns the actions your module may ask for here (`{ action, module, moduleName, icon, name, label, input }`, plus `takes` when the action declares it), only those you could do yourself: offer whichever you can fill from what you have, and label the button with the action's own `label`, so you never name another module. `host.actions.request(action, input, { wait })` asks for one; Collaborator checks the input against the declared types (only those fields go through; a `string` is cut at 200 characters and a `text` at 8000) and queues it for the module that owns it. The owner carries out requests with `host.actions.provide({ createTask: async (input, { from, by }) => ({ ref }) })` (a handler may also return `data`, up to about 8 KB of plain data, which the requester reads from `out.result.data` when it waits; that is how a view asks a question): its page takes a request (only one page does, however many people have it open), does it under the rules of whoever has the module open, and reports how it went. A request waits for a person to open the module if nobody has it open; in a space, Collaborator opens the module that carries the action on the canvas when it is not open, so the request is carried out at once.

**Taking whole objects.** An action can accept a whole object in the objects format, details and all, rather than a few flat fields: give it one input of type `object` and say which kinds it takes with `takes` on the entry in `actions.provides`. Each entry is `{ kinds, except?, as, permission? }`: catalogue kinds, `"*"` for any object (never a picture) or `"text"` for a message's words; `except` beside `"*"` to leave kinds out; `as`, the words after "Add to <module> as"; and optionally one of your own permissions the person must hold. Collaborator cleans the object with the format's own checker before your handler sees it, and refuses a kind you don't take. The kinds your enabled actions take are the kinds the copied instructions and `/ai` ask an AI for. The fields, the install refusals and the request refusals are in [api-modules](api-modules.md): the manifest's `takes`, and "Handing an object to a module". Map the object into your own fields with `host.util.plain` and `host.util.localWhen` (see "Plain text from Markdown and HTML" below), and put the details fields you have no place for into your notes as "Label: value" lines with `host.util.detailLines`, so nothing is lost. The bundled modules are worked examples ([api-modules](api-modules.md), "What the bundled modules take").

**What the object must have.** An action that takes a pointer may say what the object behind it needs to have on its summary for the action to make sense of it: `"needs": ["place"]` (or `date`, `text`, `subtitle`) on the entry in `actions.provides`. A drop menu then leaves the action out for an object without it ("Show on the map" for a task with no position), rather than offering it and failing. It is advice for the menu, not a check the server makes on the request. `needs` on any action also says what the request itself must carry, so a module offers the action only when it can fill that in: the Calendar's `createEvent` has an optional `date` and `needs: ["date"]`. See [api-modules](api-modules.md), the manifest's `actions.provides`.

**Typed pointers.** A `ref` field may name the kind of object it takes: `"task": "ref:todo:task"` takes only a pointer to a To-do task, plain `"ref"` takes any. Collaborator refuses a pointer of another kind. `host.actions.list({ accepts: "module:kind", self: true })` narrows the list to the actions that take a pointer to that kind (an action with plain `ref` counts), and `self` adds this module's own, marked `own: true`. `ref` (a pointer, such as the object just dropped) keeps, on an environment page, only the actions the viewer could carry out where that object is: an action that takes one of its provider's own objects is checked in that object's space, by the viewer's permissions there. `host.objects.dropMenu` passes the dropped pointer itself. A request about an object in a space is checked the same way, and only someone who may change the provider in that space can take it.

**What a drop can do.** When another module's object is dropped on yours, never decide on your own what can be done with it: hand it to `host.objects.dropMenu` (see "Dragging" under Objects), which builds your own choices plus every action the modules around you can fill from where it landed, and lets the person choose. Under it, `host.actions.pick(items, point)` is the menu: `items` are `[{ id, label, hint? }]`, it resolves to the chosen item or `null` if dismissed (Escape, or a click elsewhere), one item resolves at once with nothing asked, and `{ remember: "key" }` keeps the choice (in that browser, for your module) and lists it first, marked "last used", the next time the same key is asked. `pick` is also there for a choice that is not a drop. The person always confirms; nothing runs on its own, and two choices that do different things (add it as an event, or set its date) are two items.

**Outcomes.** An event may carry `data` (at most 2 KB). By convention `data.summary` is one line, at most 200 characters, saying how it turned out ("Where to stay: Hotel Nova"). A module that follows an object can keep it: the To-do adds it to a linked task's notes when the task asks for that, and ticks the task when it is set to follow what it links to. Nothing in Collaborator knows what a summary means.

**Rules on links.** An event declares the data it carries (`events.publishes[].data`, for example `{ "summary": "string", "pick": "ref?" }`), and `host.objects.kinds()` returns, for each kind, the events it can report with their data. A module that links to objects can then let the person choose, per link, what to do when the object reports something, offering only what the event's data supports. The To-do does this: for a linked poll's close it offers to tick the task, add the `summary` to its notes, use it as the title, or link the object in `pick`. By convention `summary` is one line about the outcome and `pick` is a pointer to the object the outcome chose; neither means anything to Collaborator. Treat `pick` as untrusted: check the kind is one you may link to.

**An action from Chat.** Chat's **Keep** on a link asks whichever module provides `saveLink` with a `url` input (Research does: `url` is a `text` field, so a link up to 500 characters goes through whole, with optional `title` and `excerpt`), built by the server from the stored message, as the person who pressed it ([api-modules](api-modules.md), "Chat routes").

**Rules that ask other modules.** A rule can also ask another module to do something with what an object reports. The To-do offers, for each action another module provides (from `host.actions.list()`), "Module: what it does" whenever every required field can be filled from the event: a `date` field from the event's `date`, a `string` or `text` field from its `summary`, a plain `ref` field from the object that reported. So a poll that declares a `date` (its winning option's date) and a Calendar that provides `createEvent` are enough for a closed poll to put the winning date on the calendar, with neither module naming the other. The module that follows asks under the person's own rights. The first page to save the rule as fired asks, so however many people have the To-do open the request is made once; that needs `actions.uses` approved by an owner.

**Links on parts of an object.** An object can hold links of its own for its parts. A poll option takes a link (drop an object on it) and the poll passes the winning option's link out as `pick` when it closes. Tell Collaborator what the whole object points at with `host.objects.setLinks`, so those objects list it under what links to them.

### A dashboard widget

A module with the `environment` scope can offer a widget for the dashboard on the spaces page: a small card, across all of the viewer's spaces. Declare `"widget": { "entry": "widget.html", "title": "Coming up", "size": "medium", "order": 10 }` under `surfaces`. The widget is its own single HTML file (in this repository, `src/<id>-widget.html`, `.css` and `.js`, built like the module page), and runs like an environment page: `info.context.scope` is `"environment"`, `host.storage.list(prefix)` reads the environment's data, `host.storage.list(prefix, { scope: 'spaces' })` the module's data in each of the viewer's spaces (each entry with its `spaceId`), and `host.spaces()` names those spaces and their icons. The widget shows; it does not edit. `host.page.open(hash)` (letters, digits and `= & _ . : , -` only, at most 80 characters) opens the module's own page at a place in it, for a click that means "show me this in full"; the page passes the hash to your module, which reads it with `host.page.onHash(fn)` (the Calendar's month opens a day with `day=2026-09-24`). Clicking an object should call `host.objects.open(ref)`, which takes the person to that object: while the module is part of a destination that is shown (Calendar), to the destination, opened on it (`#ref=`, handed to your part as `host.objects.onOpen`); otherwise into its space. `host.page.open(hash)` goes where the card's heading goes, the destination while shown, else the module's full page. Pass `{ newTab: true }` to either for a click that asked for a new tab (Ctrl, Cmd or Shift, the middle button, Ctrl or Cmd with Enter): home opens the same address in a new tab and leaves the page and the call alone; any other page ignores it. A widget in a frame tells the dashboard how tall it is with `host.resize({ height })` (measure your own content, not the frame). Keep it small and quick: it loads with the spaces page. Code the page and the widget share can go in `src/<id>-lib.js`, which the build puts where a script has `/*__LIB__*/`.

### A destination's part

A destination is a page of its own in the top bar, such as Calendar or Map, made of parts that modules offer ([api-modules](api-modules.md), "Destinations"). Offer one with `surfaces.destination` in `module.json`: `[{ "id": "calendar", "part": "main", "entry": "page.html" }, { "id": "calendar", "part": "panel", "entry": "page.html", "label": "Agenda", "order": 10 }]`. The module needs the `environment` scope; the entry may be the module's own page. A destination has one `main` (the large area) and any number of panels (beside it, one shown at a time, switched by their `label`; on a phone each is a tab). The host draws the page's header, its bar and its filter; a part draws only itself.

A part runs as the module's environment page does (`info.context.scope` is `"environment"`, with the same storage, `{ scope: 'spaces' }` and `{ space }`), and knows it is a part from `info.context.destination`, `{ id, part }`. Leave out your own header, view switch, filter row and action bar there. `host.destination` is the page's shared state, and is `null` anywhere else:

```js
const t = await host.ready();
if (t.context.destination) {
  const off = host.destination.onState((state) => { /* draw what the state says */ });   // now, and on each change
  await host.destination.set({ day: '2026-10-05' });   // only what your part may change; every part hears it, yours too
}
```

Each destination's state is its own shape, and the host owns all of it except what a part may `set`:

| Destination | State | Who may `set` what |
|---|---|---|
| `calendar` | `{ view: 'month' \| 'week' \| 'day', spaces: [<id>...], environment: true \| false, externalOff?: [<id>...], markersOff?: [<module>:<kind>...], markerKinds?: [{ id, label, icon, tint }...], day, from, to }`: the view switch, the filter (the spaces on, whether the environment's own list is, and the kinds of markers it has off), the kinds of markers the calendar has shown (for the filter's switches), the selected day and the period shown (`YYYY-MM-DD`, `to` the day after it) | the `main` part only: `{ day, from, to, markerKinds }`. `markerKinds` is up to 20 entries: `id` is `<module>:<kind>`, `label` 1 to 40 characters ("Tasks due"), `icon` a Font Awesome name (else `calendar-check`), `tint` one of the eight tints or `null` |
| `map` | `{ mine: true \| false, environment: true \| false, spaces: [<id>...], q: '<search text>', find: <number>, selected: <pointer or null>, phone: true \| false, reveal: 'main' \| 'panel' \| null }`: the filter (Mine, the environment's own, the spaces on), the search field as typed, a number raised on each Enter (the person asked the place search), the selected object, whether the parts are a phone's tabs, and a request to bring a part into view (the page shows that tab and clears it) | either part: `{ selected, reveal }`; `phone` is the page's |

`set` refuses a field the part may not change (403 "the panel part cannot set day"), a part of a destination that lets it change nothing (403), and a value of the wrong shape (400 "day is not valid"); a set that changes nothing tells nobody. The filter's choice, the view and the panel's tab are remembered per browser by the page, not by you. When the page is opened at a place (`/calendar#day=2026-10-05`) the main part hears it as `host.page.onHash`, as a module's own page does, and an object (`#ref=`) as `host.objects.onOpen`.

### The action bar

A module's buttons go in its action bar, which the host draws. Docked, the bar is a cell in the canvas's shared bottom row, so it lines up with the video toolbar and the chat box; floating, popped out and on a module's own page it is a strip along the bottom.

```js
host.bar.set([{ id: 'add', label: 'Add event', icon: 'plus', primary: true }]);
host.on('bar', ({ id }) => { if (id === 'add') openEditor(); });
```

Each item has an `id`, a `label` (up to 30 characters), an optional Font Awesome `icon` name, and `primary`, `disabled` and `iconOnly` flags (`iconOnly` with an `icon` draws a square icon button whose `label` is its tooltip). An item with an icon is drawn as the action button (below), docked, floating, popped out and on the module's own page alike; one without an icon is a worded button.

**The action button.** The square icon button of the bottom row is one shared piece, `.action-btn` (add `.primary` for the accent look), in the base stylesheet Collaborator adds to every module page (`/sdk/host.css`): the call's controls, the chat's Send and the action bar all use it, its icon 20px in a 38px button. Use it for a button of your own in the bottom row, such as an add button, rather than sizing one yourself. Its size comes from `--action-btn-h` and its icon's share from `--action-icon-ratio`; those are the host's, and a module must not set them or restyle the button's size (`tools/check-buttons.mjs` fails a bundled module that does). Up to 10 items are taken. Setting an empty list hides the bar, and a docked module then fills the whole column. Set the bar again whenever what the buttons can do changes.

The primary item sits on the far right and the others to its left, in the order you give them. The bar is fitted to its width: as the module narrows, the leftmost buttons move into a host-drawn "..." at the left end, one at a time, and come back as it widens. The primary never moves. Mark an item `overflow: true` to always keep it in the "...". Put the button people use most first after the primary, since it is the last to fold.

**Overflow.** `header.set` and `toolbar.set` each show at most five items before folding the rest into a "..." the host draws on the left and opens (an item marked `overflow: true` goes there regardless of how many you set, for something you always want tucked away, like Delete); the action bar folds by width, as above. It is drawn by the host, not `host.menu.show` -- that one draws inside your own module, and a titlebar or bar button is the host's own chrome. You never build it yourself; it is just what setting more items than fit does. See [architecture-module-window](../architecture/architecture-module-window.md) for the shape all four zones follow.

**Text nobody here wrote.** `host.util.esc(text)` makes text safe to put in HTML. `host.util.markdown(text)` turns a small, safe subset of Markdown into HTML: `#`/`##`/`###` headings, `**bold**`, `*italic*`/`_italic_`, `` `code` ``, fenced ` ``` ` code blocks, `-`/`*` and `1.` lists, `> ` quotes, `[text](https://...)` and bare `https://` links (nothing else is ever a link), paragraphs on a blank line. Everything is escaped first, so raw HTML in the text can never reach the page. It is the one place a module may set `innerHTML` from text a person or an AI wrote, because the safety already happened inside it; everywhere else, text still goes in with `textContent`. Use it for an AI's replies, and anywhere else people's own words might use it. The space page uses the very same function for chat (`window.hostText.markdown`, exposed once for the host page itself, since Chat is not a module).

**Plain text from Markdown and HTML.** `host.util.plain(text, { line })` returns the words of Markdown or HTML without their marks, for a field you show as plain text: a title, a form field, a description, every field of an object's `details`. A field you draw with `host.util.markdown` keeps its Markdown instead. `plain('**Southwest** [details](https://x.example)')` is `"Southwest details (https://x.example)"`. What it does:

- **Markdown.** `**bold**`, `__bold__`, `*italic*`, `_italic_`, `~~struck~~` and `` `code` `` lose their marks; a `_` or `*` inside a word stays (`snake_case_word`, `2*3*4`). `[text](https://...)` becomes "text (https://...)", or the address alone when the text is the address; a picture, `![words](https://...)`, becomes its words. Heading marks (a closing `##` too) and quote marks (`>`, nested too) go. A list line starting `-`, `*` or `+` starts "- "; a numbered list keeps its numbers. A fenced block's fence lines go and its lines are kept exactly, marks and all. A rule (`---`, `***`, `___`) and the ruled line under a table's header row (`|---|:-:|`) are dropped, and a table row loses its outer pipes (`|1|2|` is `1|2`). A backslash keeps a mark as written (`\*` stays `*`).
- **HTML.** Tags are removed. `<br>` breaks the line; a paragraph, a heading, a list, a table row, a quote and the other block tags start a new line; a list item starts a line with "- "; a table cell adds a space. `<script>` and `<style>` go with what they hold, up to their closing tag; one with no closing tag after it loses only the tag itself, and the words after it stay. `<https://...>` (or `<mailto:...>`) is the address. A `<` not followed by a letter, `/` or `!` is text (`a < b`). Numeric entities (`&#8594;`, `&#x41;`) and the common named ones (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&nbsp;`, dashes, quotes, `&hellip;`, `&euro;`, `&pound;` and a few more) are read; any other is left as written.
- **Lines.** Control characters become spaces. By default lines are kept, each without trailing spaces, more than one blank line becomes one, and the ends are trimmed. With `{ line: true }` every run of white space, line breaks included, becomes one space, for a one-line field.
- `null` or `undefined` gives `""`, and a number its digits. Every pattern is bounded, so a long or crafted text takes linear time.

**Local times from an object.** `host.util.localWhen(when, day)` reads a `when` from the objects format (see [api-modules](api-modules.md), "The objects format") as `{ date, time }`: `date` is `YYYY-MM-DD` and `time` is `HH:MM` on the 24-hour clock, each `null` when not given. It returns `null` when it can read neither.

- It reads `YYYY-MM-DD`, `YYYY-MM-DDTHH:MM` (a space may stand for the `T`) and `HH:MM` alone. A one-digit hour is read, and a time may be on the 12-hour clock with `am` or `pm` (`3:25 PM`, `12:05 a.m.`).
- Seconds, fractions of a second and a trailing `Z` or offset are dropped, and the clock time is kept as written, never turned into another zone: `localWhen('2026-11-14T12:50:30-05:00')` is `{ date: '2026-11-14', time: '12:50' }`. A flight's 12:50 departure is 12:50 wherever the reader is.
- `day` (`YYYY-MM-DD`, usually the object's own `date`) is the day for a time alone: `localWhen('15:25', '2026-11-14')` is `{ date: '2026-11-14', time: '15:25' }`. A `when` with its own day keeps it. With no `when` at all (empty, or not a string), the result is `{ date: day, time: null }`.
- An impossible day or time (`2026-02-30`, `25:00`, `13:00 PM`) or anything else (`tomorrow`) gives `null`, even with a `day`; a day with an impossible time gives `null` too, not the day alone. Only the first 40 characters are read.

**Details as lines.** `host.util.detailLines(details, { kind, skip })` returns an object's `details` as an array of "Label: value" strings, for the fields your module has no place of its own for, so nothing is lost: `detailLines({ cabin: '4B', minutes: 150 })` is `['Cabin: 4B', 'Length: 2 h 30 min']`. Put them in your notes or description after the content.

- The labels are the Planner's words, the same in every module: `airline` is "Airline", `carriage` "Coach", `checkIn` "Check in", `roomType` "Room", `guests` "People", `name` "Booking name", `minutes` "Length", `multiple` "More than one answer", and so on. With `{ kind: 'car' }`, `from` reads "Pick up", `to` "Drop off", `departs` "Pick-up time" and `arrives` "Drop-off time". A field it doesn't know is labelled from its name (`boardingGroup` is "Boarding group").
- The values: a date and time reads `2026-11-14 12:50`, a length `2 h 30 min`, a place `Chicago Midway (MDW)`, a flag `yes` or `no`, a list its items joined with commas. Each is made plain and one line, at most 300 characters; an empty one gives no line.
- `skip` lists the fields you used (`{ skip: ['due'] }`). `upload` (a picture's file id) is never shown, nor a field whose name isn't 1 to 24 letters; at most 40 fields are read.

`host.util.markdown` now draws a line that comes just before a list above the list ("Links:" then its items), where it used to come after it.

`plain`, `localWhen` and `detailLines` are also on `window.hostText` (`{ esc, markdown, plain, localWhen, detailLines }`) for the host's own pages.

**Places on the earth.** `host.util.geo` holds what a module with places needs, so none carries its own copy: `inRange(lat, lng)`, `round6(n)`, `oneLine(text, max)` (one line, no control characters), `coord(text, 90 | 180)` (a latitude or longitude typed in a field, or null), `parsePoint(text)` (`{ lat, lng }` from a pair of coordinates or a map link, or null), `coordsText(lat, lng)`, `mapsLink(lat, lng, name, apple)` and `mapsSearch(text, apple)` (for a place with only a name or address), the links that open the spot in the person's own maps app: the platform's own link on Apple devices, a `geo:` link on Android, and an ordinary web link (OpenStreetMap) everywhere else, because a desktop browser has nothing registered for `geo:` and would open a blank page.

**Quick add.** Prefer a command in Chat (see "Commands in Chat"); no bundled module uses a quick-add field since #58. An item `{ id: 'add', type: 'quickadd', label: 'Add event', placeholder: 'Add an event: lunch fri at noon' }` is drawn as a text field with a small + button (`icon: 'magnifying-glass'` names another icon for that button), bottom-aligned so it lines up with the chat box. Other items in the same `bar.set` are drawn beside it, and one with `iconOnly: true` and an `icon` is a square icon button whose `label` is its tooltip (for a second action such as adding). Submitting (Enter, or the button, even with nothing typed) sends the `bar` event with `{ id, value }`, the text typed. Open your add form with it filled in, so the person confirms rather than starts over. `host.util.parseWhen(text)` helps: it pulls a date and a time out of what was typed and leaves the rest as the title, so `"meet with bob sep 29 at 7pm"` gives `{ title: "meet with bob", date: "2026-09-29", time: "19:00" }`. It understands today, tomorrow, weekdays ("fri", "next fri"), "sep 29" and "29 sep", "9/29" and "2026-09-29", and times as "7pm", "7:30 pm", "19:00", "at 7", "noon" or "midnight"; a day already passed this year means next year, and anything it does not recognise stays in the title. Use only what your form has a place for.

### Layout

```js
host.setTitle('Calendar');              // the title above the module
host.resize({ width: 500, height: 600 }); // ask for a size while floating (page content height, in pixels)
```

### Keyed pages: a page about one person, with no sign-in

A module may claim a path for a **keyed page** (`surfaces.keyed: { path, entry }` in module.json, see [api-modules](api-modules.md)): `/<path>/<key>?s=<access key>&...` shows the module's page about the person with that key, opened with the server's access key in place of a sign-in. It is for something unattended that a person never sits at: the Stream module's `/view/<key>` is a browser source in a streaming program. The page runs in the page (never a frame), on a transparent background with no header, and everything it asks of the host carries the key.

```js
const t = await host.ready();
// t.context  { scope: 'keyed', path: 'view', subject: '<the person's key>', query: { kind: 'player', plate: '1' } }
// t.user     { key: 'viewer', name: 'Viewer', role: 'viewer' }   nobody: every permission is false
```

A keyed page can read its settings and what the SDK offers a page that follows people, nothing else: no storage, no refs, no uploads. `host.settings.onChange` still fires (the host asks after the settings every 10 seconds there, having no session for the event stream).

**Presence.** Who is online and in which call right now, from any page (a keyed page, a dashboard). It is `GET /api/presence` as the viewer may read it ([architecture-overview](../architecture/architecture-overview.md), "Spaces and calls"): a signed-in person sees where people are only in the spaces and asides they belong to (owners and the admin belong to all of them), a guest only their own space, and a keyed page, carrying the access key, everyone.

```js
const p = await host.presence.get();
// p.people       [{ key, name, online, space, aside, asidePrivate, elsewhere, inCall, isOwner }]   isOwner: an owner or the admin
//                  space: the space or aside they are in, if you belong to it; the space they stepped out of, with
//                    aside: true and inCall: false, if they are in an aside of one of your spaces that you are not in;
//                    null otherwise
//                  asidePrivate: with aside, whether that aside is a private conversation (never with whom)
//                  elsewhere: online somewhere you don't belong (space is then null and inCall false)
// p.spaces       [{ id, name }]
// p.asides       [{ id, origin, private }]   only the asides you belong to; origin: the space it was pulled from; private: a private conversation
// p.activeSpace  the space the stream follows (an owner's or the admin's), or null when it is somewhere you can't see; p.ownerOnline whether one is online
// p.reactions    [{ id, glyph }]
// p.pictureScale the conference's portrait size, a percentage of the tile height; the participant box uses it
const stop = host.presence.onChange((p) => { ... }, { every: 5000 }); // polls; called once at the start and whenever anything differs
```

**Pictures.** One person's picture in a slot, as a blob URL to show, or null when they have none there; release it when you replace it. `{ space }` asks for that space's own picture set first, the way the call page does.

```js
const url = await host.images.get(key, 'player', { space });   // profile, background, player, playerOffline, playerTalking, playerMuted,
host.images.release(url);                                     // playerAside, playerPrivate, character, characterOffline, talking, muted, characterAside, characterPrivate
```

**Media.** Watch one person's camera and microphone, read-only, following them from space to space (a module that runs in the page only, since the elements are handed to you):

```js
const w = await host.media.watch(key, { video: true, audio: false, space: 'lobby' }, {
  state: ({ online, cameraOn, micOn, speaking, name }) => { ... },
  video: (el) => { /* a <video> to place, or null when it went away */ },
  audio: (el) => { /* an <audio> to place, or null */ },
  reaction: (id) => { ... },            // as they react in the call
  connection: ({ connected, space }) => { ... },
});
w.follow(spaceId);   // the roster says they moved: leave this space for that one
w.stop();
```

With `video: false` and `audio: false` only the state is followed (the host subscribes to the microphone alone, so it still knows who is talking, and plays nothing). The host reconnects by itself when the connection drops.

**The access key.** On the module's own page (an owner's or the host admin's), `await host.access.key()` is the key a keyed page's link carries (null for anyone else) and `await host.access.regenerate()` makes a new one, after which every link made with the old one stops working.

## Theme

The eight tint tokens (`--tint-gold`, `--tint-blue`, `--tint-green`, `--tint-teal`, `--tint-purple`, `--tint-red`, `--tint-orange`, `--tint-pink`) reach your page too: `/sdk/host.css` defines them, and the host sends them with the theme in the mode showing, so you can mark something with your module's colour (`color` in `module.json`). They are fixed, not a theme's; see [design-theme](../designsystem/design-theme.md), "Tints".

The SDK applies the theme to your page as CSS custom properties on `:root`, so plain CSS follows the theme. **Never hard-code colors, and never assume a dark background.** The tokens and the rules are in [design-theme](../designsystem/design-theme.md). The base stylesheet gives you `.btn`, `.btn-primary`, `.btn-danger`, `.card`, `.section` and styled inputs.

## Running in the page

A module runs in one of two ways. Modules that ship with Collaborator run **in the page**: in a container of their own with a shadow root, so their styles and elements stay apart from the page's but they share its window, and can take part in drag and drop between modules. A module an owner uploads runs **sandboxed** (below) unless the owner switches it to run in the page, after a warning that a module in the page is not walled off: it can read and change everything on the page, act as the signed-in person, and is no longer held to its approved permissions, because it can bypass the SDK. Only allow that for a module you trust.

To work either way:

- Look elements up on `host.root` (`host.root.getElementById`, `host.root.querySelector`), never `document`. Use `host.rootElement` where you would use `document.documentElement`, and `host.objects.elementAt(x, y)` where you would use `document.elementFromPoint`.
- Read the API from `document.currentScript.host` when it is set, else from `window.host`.
- A module that runs in the page is built from one HTML file: its `<style>`, its inline `<script>` and its body. Keep the module to a single file with style and script inline.
- Selectors written for `html`, `body` and `:root` are applied to the container.

## The sandbox

A module frame has an opaque origin. From inside it you cannot read Collaborator's page, its cookies or storage, call `fetch` or open sockets (`connect-src 'none'`), open windows or the browser's own `alert`-style dialogs, or send a form anywhere (a `<dialog>` element of your own works, and `host.ui.editor` uses one). A `<form>` and its `submit` event work (so `preventDefault()` and handle it yourself), but the form goes nowhere. So use in-page UI, not `alert`, `confirm` or `prompt`. You can use inline scripts and styles, and load your own images and fonts as data URLs or from your own files. Module files are public to anyone who can reach the server, so put nothing secret in them.
