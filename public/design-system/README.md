# The design system pages

Two pages live here.

- `index.html` is Today: what the product looks like now. It loads nothing that starts with `proposed`.
- `proposed.html` is Proposed: only what Thomas has decided, one family at a time. A family is one part of the
  system, such as Buttons, Fields and forms, Typography, Tabs and view switches, or Colour.

## How the Proposed page is put together

Each family has its own files, so two people can work on two families without touching the same file.

| File | What it holds |
| --- | --- |
| `proposed.html` | The page. It names no family. |
| `proposed.js` | The page engine: the menu, the example frames, the Dark/Light, fonts (Today's or Proposed) and width switches, the forced hover, focus and pressed states, and the list of families still to decide. |
| `proposed.css` | Only the rules more than one family uses (the button height tokens). |
| `proposed-families.json` | The list of families, in the order they are drawn. |
| `proposed-<id>.js` | One family: it draws its examples and registers itself. |
| `proposed-<id>.css` | One family: its rules, all under `.ds-proposed`. |

Each family is checked by `tools/check-design-system-<id>.mjs`, listed in `tools/check-design-system-families.json`.
`tools/check-design-system.mjs` is the shared runner.

## Add a family

1. Write `proposed-<id>.js`. Copy the top of `proposed-tabs.js`: it registers with
   `window.DS_PROPOSED.families.push({ id, covers, group, name, status, words, render })`. `render(api)` returns the
   family's block. Draw examples with `api.makeFrame('app', html, { proposed: true, title, css: PM_CSS + YOUR_CSS })`.
2. Write `proposed-<id>.css`. Every rule starts with `.ds-proposed`. Colours are theme tokens; radii are `--radius-*` tokens.
3. Add one line to `proposed-families.json`: `{ "id": "<id>", "js": "proposed-<id>.js", "css": "proposed-<id>.css" }`.
   Add `"frames": false` only if the rules are for the page itself and must not go into the example frames (Colour does this).
4. Write `tools/check-design-system-<id>.mjs` and add `"<id>"` to `tools/check-design-system-families.json`. It exports `id`,
   and may export `todayOnly` (classes of today's markup the family draws as they are), `staticChecks(ctx)` (the files)
   and `browserChecks(b)` (measurements in the page). Copy `check-design-system-tabs.mjs`.
5. If the family was listed under "Still to decide" in `proposed.js`, take its name out of that list.

You edit no shared file except those two lists and, if needed, the list of undecided names. The snapshot tool and the page both
read `proposed-families.json`, so the hosted copy gets the new files without another edit.

## Check it

- `node tools/check-design-system.mjs` runs every check (about five minutes; it opens a real browser).
- `node tools/check-names.mjs` checks the words. A new `proposed-<id>.js` that names modules needs an entry in
  `tools/check-names-allow.json`, as the other family files have.

## The hosted copy

`TODAY_URL=https://... PAGE=proposed OUT=/tmp/dsP node tools/design-system-snapshot.mjs` builds a folder with the page, the fonts and every
file the manifest names. It also writes the list into `index.html`, so the folder works when opened from a disk.
