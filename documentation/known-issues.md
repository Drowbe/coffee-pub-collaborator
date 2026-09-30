# Known Issues

**Audience:** anyone running Collaborator who wants to know what is broken before reporting it
as new.

A defect is recorded here once it has been observed, with a workaround if one exists, and moves to
the CHANGELOG once fixed.

## A call page left open across an update must be reloaded

After the server is updated to the version that renamed "the table" (step 3 of the Names plan), a call page
that was already open still listens for the old messages and asks the old addresses. Until it is reloaded, it
does not follow a pull aside, a recall or a return, and does not show who is online.

Workaround: reload the page once after the update.

## Opening a dashboard object a second time doesn't open the object

On the spaces page, clicking an object on the dashboard (a task, an event, a poll) opens its module and the object
the first time. Clicking it a second time opens the module but not the object.
GitHub #20.

Workaround: find the object in the module itself.

## Some data files are still readable by other users on the server

Since the security fix, `app.json`, `host.json`, `ai.json` and `secrets.key` are readable only by the server's own
user. The chat history and the modules' data files are not yet restricted the same way, and the checks do not yet
cover every case. GitHub #69.

Workaround: keep the data folder itself readable only by the user the server runs as.

## The console's Maps tab is too wide on a phone

On the host console at phone width, the Maps tab runs past the right edge of the screen.

Workaround: use a wider window or turn the phone sideways.

## Saving a bundled template reorders its module list

On the host console, saving an edit to a bundled template, such as Travel, rewrites the order of its module list,
even when only the description changed. **Review** then lists **Modules** as changed. Seen on 2026-09-30.

Workaround: none is needed for owners, since no offer is made to them. Ignore the **Modules** line in **Review**.

## The logo still reads the old name

The logo on the landing page and on the host console's bar reads "COFFEE PUB MAGPIE", the product's old name.
The words on those pages say Collaborator. GitHub #110.

Workaround: none.

## Opens with can show an older list after a failed save

In a space's settings, **Opens with** saves each tick as you click. If one save fails while later clicks are still
waiting to be saved, the ticks can show an older list than the one the server kept. Seen on 2026-09-30.

Workaround: reload the page to see what is saved.

## Opens with notes a module with no canvas as off in this space

A module that has no canvas at all, such as Stream, can be on a space's saved **Opens with** list when it was
put there through the API. The list keeps it ticked with the note "(off in this space)", where "(can't open on the
canvas)" is meant. Seen on 2026-09-30.

Workaround: none is needed; untick it.

## Opens with shows an uninstalled module by its id

A module on a space's saved **Opens with** list that has since been uninstalled is listed with the note "(not
installed)", under its id rather than its name. Seen on 2026-09-30.

Workaround: none; untick it to take it off the list.
