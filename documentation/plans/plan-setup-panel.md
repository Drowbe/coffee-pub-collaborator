# Set up Panel Plan: all of a space's settings in one panel, with tabs and a locked Save bar

**Audience:** Thomas, who decides; experience-design, which builds the panel, its tabs and the links; server-development, which builds the redirects and changes the checks.

**Status:** built, steps 1 to 8, 2026-10-14 (the tabs and one Save; the Trip, Members, Phases, First visit and Modules tabs; opening by address; the redirects of the old settings pages; the old pages removed). Changed since drafting: the Space tab is called Trip and **Opens with** and the default layout became one **First visit** choice (layout-views step 5). Left: the live checks in the plan's Verify with a real phone and a screen reader. Changed 2026-10-15: the Phases tab lets each start be set freely and phases may have gaps; the Buffer phase is gone (plan-itinerary-phases-markers, step 1b; not built).

**Status when drafted:** drafted 2026-10-13 by product-planner with Thomas away; nothing here is approved or built. Each step is a try build (one builder, one pass, its own checks, a patch version bump for any module it changes, the app working after it). Thomas's words, looking at the Set up panel with "Full settings" circled and at the full settings page: "I can see no reason to not just have all of the settings in this flyout panel with tabs and the fixed save bar at the bottom. This simplifies the entire system since settings will all be within the context of the thing the settings are for." Earlier the same day, as a rule for every settings and edit surface: "all settings experiences need actual save buttons. Clicking outside must not close an edit window. Always have a save button in an 'action' bar locked to the bottom." Builds on [plan-one-bar](plan-one-bar.md) (decision 5, step 4) and on the shared action bar, which a separate try build is making now.

## What it is today

A space's settings live in three places.

- **The Set up panel** (`public/space-setup.js`, opened by the `setup` tool in `public/space.js`): Name, Picture, Faces in the call, a link to the people ("Planner, invites and the guest link", to `/spaces/<id>#members`), Phases (a button that opens the phase sheet, whose dates save as they are set), Opens with, Layout, and a "Full settings" link to `/spaces/<id>`. **Done** and **Cancel** sit in the top bar (`setup-done`, `setup-cancel`) and again at the panel's foot (`setup-row-done`, `setup-row-cancel`). An owner and the admin see every section (`OWNER_SECTIONS`); a moderator sees Phases, Opens with and Layout (`MODERATOR_SECTIONS`), and the server lets a moderator `PATCH /api/spaces/:id` only `phases`, `opensWith` and `defaultLayout` (`MODERATOR_SPACE_FIELDS`). On a phone it is already a full-screen sheet.
- **The full settings page**, `/spaces/<id>` (`public/space-settings.html`, `space-settings.js`), owners only (403 otherwise). Three tabs remembered in the address (`#space`, `#members`, `#modules`), labelled with the environment's words (in the screenshot: Trip, Planner, Modules). The space tab: picture, name, description, conference pictures, launch link, link icon, a Save, Delete; then Opens with (with "Stop using it" for a default layout) and the published calendar switch. The members tab: members (saves as you click), Generate invite link, Allow guests and the guest link. The modules tab: the modules switched on here, Turn AI off, and each module's settings for this space. Everything except the first card saves as it is clicked.
- **A moderator's module settings page**, `/module-settings?space=<id>` (`module-settings.html`, `module-settings-page.js`), reached from the Home card's sliders link. It draws `renderModuleSettings` (`public/module-settings.js`) with one Save per module card.

Links into them: the Home card's `[data-edit]` ("Full settings", `space.js`), its `[data-module-settings]` for moderators, the panel's two links, and Manage's spaces list (`admin.js`: the Edit link, and the jump after creating a space). `server/old-links.js` sends `/rooms/<id>`, `/module-settings?room=` and `/roomconfig.html` to them. Invite and guest links do not touch these pages: `/invite/<token>` and `/guest/<token>` stand on their own.

## Decisions

1. **Every setting of a space lives in the Set up panel, with tabs.** Reason: settings belong in the context of the thing they are for, and one place is simpler than three.
2. **A Save button in an action bar locked to the bottom; clicking outside does not close it.** Reason: Thomas's rule for every settings and edit surface.
3. **Done and Cancel become Save and Cancel, in that locked bar, and leave the top bar.**

## The contract

**The panel.** The `#space-setup` panel keeps its place and its `body.setting-up` mode. Its head holds the title and a row of tabs (`role="tablist"`); its body scrolls; its foot is the shared action bar with **Cancel** and **Save** (Save primary, far right), always visible. The top bar's `setup-done` and `setup-cancel` tools go; the `setup` tool shows as pressed while the panel is open. The name input in the bar stays, tied to the Name field.

**The tabs**, each with a code id that is also its address fragment, so old `#space`, `#members` and `#modules` links land on the same tab:

| Tab (id) | Label | Holds | Owner, admin | Moderator |
| --- | --- | --- | --- | --- |
| `space` | the space word (Trip) | picture, name, description, faces in the call, launch link, link icon, the published calendar switch; a danger section with Delete | yes | no |
| `members` | the member word, plural | members, Allow guests, Generate invite link, the guest link | yes | no |
| `phases` | Phases | each phase's dates, inline | yes | yes |
| `opens-with` | Opens with | Opens with and the default layout | yes | yes |
| `modules` | the module word, plural | modules on here, Turn AI off, then a section per module with its settings for this space | all of it | the module settings only |

A member sees no Set up. The Lobby shows no Delete and no member switches, as the page does today. A tab with nothing to show (no phases in the template, no module settings for a moderator) is left out.

**Saving.** Every field is a draft until **Save**. Members and Allow guests stop saving on click. Save sends, in order, and stops at the first refusal: `PATCH /api/spaces/:id` with the changed space fields (one body; a moderator's holds only their three fields), the picture (`PUT` or `DELETE /api/spaces/:id/image`), each changed module switch (`PATCH /api/modules/:id` `{ spaces }`), each changed module's settings (`PUT /api/modules/:id/settings/space`). A refusal keeps the panel open on that tab with the server's sentence and the cursor on the field, and says what did save (as `setupSaidWords` does). After a full save the panel closes and the line under the bar says what was saved. A tab with unsaved changes shows a dot (with "unsaved changes" for a screen reader). **Cancel** drops every draft. **Escape** cancels at once when nothing changed, and asks "Discard your changes?" (Keep editing, Discard) when something did, the same question `host.ui.editor` asks. Clicking outside does nothing.

**Actions that are not settings** still happen at once, each said so in its hint: Generate invite link, the guest link's Turn on, New link, Turn off and Copy, and deleting a file in a module's file list. They make or remove a link or a file; they are not part of the draft.

**Delete.** At the foot of the `space` tab, a danger section: "Delete trip" opens a confirmation inside the panel naming the space and saying its members stay in the Lobby, with Delete and Keep. It does not wait for Save. After `DELETE /api/spaces/:id` the person is on Home.

**Module settings in the panel.** `renderModuleSettings` gains a mode without the per-card Save that reports its values and whether they changed, so the panel's Save sends them. No new module contract: the panel draws what each module already declares in `module.json` `settings` for the `space` scope, read from `GET /api/module-settings/space?space=<id>`. The Manage page (`module-config.html`, environment scope) and Profile (person scope) keep the per-card Save until they adopt the same pattern.

**Opening the panel by address.** `/?setup=<id>` enters the space (not the call) and opens Set up; the fragment picks the tab (`#members`), else the first tab the person may see. A person who may not set up gets the space without the panel. Every old address redirects (302) there, and the browser keeps the original fragment:

- `/spaces/<id>` (and `#space`, `#members`, `#modules`) to `/?setup=<id>`; `/rooms/<id>` goes straight there too.
- `/module-settings?space=<id>` to `/?setup=<id>#modules`; `?room=` the same.
- `/space-settings.html`, `/roomconfig.html` and `/module-settings.html` with no id to `/`.

The Home card's two links become one **Set up** link to `/?setup=<id>` for whoever may set up; the panel's people and Full settings links go (their content is in the tabs); Manage's Edit link and its jump after creating a space go to `/?setup=<id>`.

**Phone.** The panel is a full-screen sheet, as today. The tabs are one row that scrolls sideways, the current tab kept in view; the Save bar is locked to the bottom above the safe area (`env(safe-area-inset-bottom)`), and stays above the on-screen keyboard.

**How it scales.** Another template (campaign, project) gets the same tabs with its own words. A module joins the `modules` tab by declaring space-scoped settings, nothing more. Environment settings stay in Manage, out of scope here, but the shape (settings in the context of the thing, tabs, a locked Save bar) is the future shape for a module's own settings from its window's "..." menu and for Profile.

## Left to build, in order

1. **First: the tabs and the locked Save bar** (experience-design). In `space-setup.js` and `space.js`: the tab row, today's sections sorted into `space` (name, picture, faces), `members` (today's link, for now), `phases` (today's button), `opens-with` (Opens with and Layout); the shared action bar with Cancel and Save; `setup-done` and `setup-cancel` out of the top bar and `setup-row-*` replaced; dirty dots; Escape's question; no outside close. Styles in `style.css` between `space-setup:start` and `space-setup:end`. Update `tools/check-nav.mjs` where it pins the old tools. If the shared action bar has not landed, this step waits for it.
2. **The `space` tab complete** (experience-design): description, launch link, link icon, the published calendar switch, the danger section with Delete. The page stays as it is.
3. **The `members` tab** (experience-design): members and Allow guests as drafts, the invite link and the guest link as actions; the link to `/spaces/<id>#members` goes.
4. **Phases inline and Opens with complete** (experience-design): the phase dates drawn in the tab and saved with Save (the chip's sheet is unchanged); Opens with's kept-id notes and "Stop using it" as the page has them.
5. **The `modules` tab** (experience-design): the no-save mode of `renderModuleSettings`, the module switches and Turn AI off for owners, the module settings for owners and moderators.
6. **Opening by address and the links** (experience-design): `/?setup=<id>#<tab>` in `space.js`; the Home card's Set up link; the panel's Full settings link removed; Manage's links in `admin.js`.
7. **The redirects** (server-development): `/spaces/:id` and `/module-settings` in `server/index.js`, the old names in `server/old-links.js`; a check that each old address answers 302 with the right `Location`.
8. **Remove the old pages** (server-development): `space-settings.html`, `space-settings.js`, `module-settings.html`, `module-settings-page.js`; keep `module-settings.js`. Move or drop what pins them: `tools/check-canvas.mjs` (Opens with sentence), `tools/check-feed.mjs` (the published calendar switch), `tools/check-nav.mjs` (the page bar, `#subtabs`, the card's Full settings link), and add the same assertions against the panel.

## Verify

- **A try builder can check:** `npm run check`; on a local server signed in as `admin`, each tab's fields, a save across two tabs, a refusal mid-save, Cancel and Escape with and without changes, outside clicks, Delete; a moderator account seeing only its tabs and its `PATCH` refused for any other field; each old address with `curl -I` (step 7); a narrow window for the phone sheet.
- **Only Thomas on a real server:** a real phone (safe area, keyboard over the Save bar), bookmarks and e-mailed links he has, entering a space from a redirect with a call live (needs LiveKit), and the travel template's words in every tab.

## Risks

- **Deep links:** a fragment the panel does not know must fall back to the first tab, never an error. E-mailed invite links do not use these pages, but a person's saved `/spaces/<id>` will.
- **Permissions drift:** the panel shows what the server allows; the server stays the judge. `/spaces/<id>` was owner-only; after the redirect a moderator lands in the space with their own tabs, which is new.
- **The guest link** is managed in two places: the panel's `members` tab and the in-space guest link controls in `space.js` (for anyone with Can Invite). They must read the same state.
- **Module settings that were full pages:** a module with a long list (Planner's marker types, a map's file list) must fit a narrow panel.
- **One Save over several requests** is not atomic: a refusal after the first request leaves part saved, which the panel must say plainly.

## Assumed, for Thomas to confirm

1. **One Save for the whole panel**, not one per tab. Why: it is one surface with one bar, the dot shows what is unsaved, and per-tab Saves would put several Save buttons where the rule asks for one bar.
2. **The module switches move into the `modules` tab.** This changes [plan-one-bar](plan-one-bar.md) decision 4 ("Set up does not repeat the module switches"), but with the page gone they would have nowhere else.
3. **One `modules` tab with a section per module**, not a tab per module, so the tab row does not grow with every module.
4. **A moderator** gets `phases`, `opens-with` and the module settings, not `members` (the guest link stays where Can Invite gives it today).
5. **Phase dates become a draft** saved with Save, inside the panel; the chip's sheet still saves as set.
6. **Invite, guest link and file deletion stay instant actions**, outside the draft.
7. **Delete does not wait for Save**, with its own confirmation in the panel.
8. **Tab labels use the environment's words**, as the page does. In the screenshot the member word reads "Planner", the same as the Planner module's name.
9. **Redirects are 302**, so the target can still change; `/?setup=<id>` is the new address shape.

## What is not decided

- Whether an owner or the admin who is not a member of a space can enter it from Manage to set it up (today they open the page without entering).
- The shared action bar's name and markup, which come from the build making it now.
