# Modules

**Audience:** an owner adding, approving and removing add-on modules on a Collaborator server, and the people who use them.

A module is a zip file that adds a feature to Collaborator, such as the [Calendar](userguide-calendar.md). The **Modules** tab on the Manage page installs them. Modules that come with Collaborator run in the page. A module you upload runs in a sandbox, so it can only reach Collaborator through what it asks for; it never runs code on your server. Each card says "In the page" or "Sandboxed". You can switch an uploaded module to run in the page, which lets it work with drag and drop between modules, but such a module can read and change everything on the page and act as you, so do it only for a module you trust. The tab also lists recent activity, which is kept when the server restarts, and shows when a module was slowed for doing something too often (the limits are generous; only a module that loops or floods reaches them). If you are writing one, read [api-module-sdk](../api/api-module-sdk.md).

Chat and Conference are listed first on the Modules tab as built-in modules; they cannot be removed, and their permissions are the ones already on the Roles tab. Chat is always on. Conference has a switch: **Disable** stops video and audio for everyone in every space (chat, presence and modules keep working), and **Approve and enable** turns it back on. It needs a LiveKit server while it is on. Turned off, nobody has the "See and join the conference" permission, whatever the Roles tab says, owners and the admin included: the conference is not offered in a space, and entering a space does not open it. The Roles tab keeps their ticks for when it is turned on again.

## Modules that come with Collaborator

A module can need another: Maps needs Places. Its card says what it needs and its Enable button waits until that is installed and on; turning off a module others need asks first and turns them off too, and uninstalling one turns them off as well.

The Calendar, To-do, Polls, Planner, Places, Maps, Research, Assistant and Stream modules ship with the server, so there is no zip to upload. The Assistant has no window and a new install leaves it out; install it only to limit `/ai` by role (see [Assistant](userguide-assistant.md)). Stream (the browser sources for a streaming program, see [Collaborator in OBS](userguide-obs.md)) is installed and turned on by itself the first time a server starts with it, so no stream goes dark on an update; the others wait for you. The Modules tab lists the ones you have not installed under **Available with this server**, each with an **Install** button. When you update the server and a module it carries has a newer version than the one you have installed, the module's card shows **Update available** with an **Update to** button, the Modules tab itself shows the count in a small bubble, and the bell in the top bar counts them on every page (owners and the admin only), with a line in its list, "2 module updates available", that opens this tab. The count goes away once the updates are applied. The update keeps the module's data, keeps the old version so you can switch back, and, if it asks for anything new (a permission, a hook, a link to another module), stays off until you approve it. A module you upload yourself is updated by uploading a newer zip.

## A module that needs an update

Collaborator renamed rooms to spaces and the server to the environment, and a module written for the old names can't run on this version. On the Modules tab its card says **Needs an update**, with the reason ("This module was built for an older version of Collaborator and needs an update from its author." and the old name its `module.json` uses), and it offers no **Enable**. In its version list, any version in the old names is marked "(needs an update)" and can't be rolled back to. A module that needs one of these can't run either, and its card says which. Neither kind shows a **Module Configuration** link or counts under **Configurable**. In general a module runs only while everything it needs is running; it stays on in your choice, and comes back by itself when what it needs does. Nothing is deleted: when the author sends a version in the new names, install it as usual and the module comes back as it was, on or off, with its spaces and data.

The modules that ship with Collaborator update themselves on the first start after the upgrade, the ones others need first, keeping their on or off, their spaces and their data. If one can't be turned back on, the server's log says "It is off for now" and why. If an update asks for something new beyond a permission that is off for every role, it waits for your approval, as any update does.

## Install a module

1. On the Modules tab, choose the zip file and click **Install**.
2. Read the card that appears. It lists what the module asks for: permissions that will appear on the Roles tab, and whether it wants to run things on a schedule or send notifications.
3. Click **Enable** (or **Approve and enable**), which records that you approved exactly what is listed. A new module always starts disabled.

The zip can be up to 10 MB. Collaborator refuses a zip that holds files it does not allow, links, unsafe paths, too many or too large files, or a missing or invalid `module.json`, and says which. (The modules that ship with Collaborator can also be built into a zip with `node tools/build-module.mjs modules/<name>`, which writes it to `modules/dist/`.) The Calendar zip, if you build it, is at `modules/dist/calendar-1.5.0.zip`.

## Where a module shows up

- **On the dashboard.** A module with a widget adds a card to the dashboard on the spaces page, and its heading opens the module's own page. Opened while you are in a space, the page appears over the space, so the call keeps running. The top bar has no list of module pages, except two an owner can add: **Calendar** (the Calendar and the To-do) and **Maps** (Maps and Places), on Manage's **Environment** tab under **Top bar** (see [Manage](userguide-environment-settings.md)). While one is shown, its modules' pages and card headings lead to it.
- **In a space.** A module that opens on a space's canvas gets a switch under **Show** in the **Layout** panel (the button in the space bar under the header), beside the Conference and the Chat. That is the one place to show or hide them; each switch shows an unread count for the chat and for module notifications, and the **Layout** button shows the total. The panel's **Arrange** section docks every floating module, tidies them (**Clean up**) and puts them on a grid, and **Layouts** saves and loads named layouts (see "The space bar" and "Saved layouts" in [The call](userguide-call.md)). Switch one on and it opens as a column beside the video and the chat when the module supports that (video, chat, then the module), or floating over the call. Drag a docked column's left edge to change its width. A window holds only so many columns; a module that has none floats until the window is wide enough (see "When the window is too narrow for another column" in [The call](userguide-call.md)). The buttons in a module's header switch it between docked and floating, open it in a window of its own, or close it; a floating module's **Snap to a grid** button makes it tile into a grid over the call instead of floating freely (see [The call](userguide-call.md)). Several can be open at once, and each remembers how you had it. On a narrow window, such as a phone, one module fills the canvas at a time, and the module switches become a row of tabs at the bottom. A module's own tools in the space bar fold into its **…** button when the bar is too narrow for them (see "The space bar" in [The call](userguide-call.md)). If you pop the whole call out into its own window, the modules come with it.
- **Notifications.** A module can notify you, for example a reminder. It appears as a toast, on the bell in the top bar (open the bell to read it; see "The bell" in [Spaces](userguide-spaces.md)), and as a number on its dashboard card heading and its switch in the space bar's **Modules** list until you open the module or the bell.

### Switches

A module's view or filter switch, such as the Calendar's **Month | Week | Day | Agenda** or the To-do's **Open | Done | All**, shows an icon beside each word. When the module is too narrow for the words, it shows the icons only: hover over one to see its word, and a screen reader reads it.

## Add and edit forms

In To-do, Calendar, Polls, Research, Places and the Planner, the form for adding or changing something opens in a window over the whole page, not inside the module, so it is the same size wherever the module is: docked, floating or on its own page. On a phone it fills the screen. A module someone uploaded, which runs in a frame of its own, gets the same window when it uses it: the whole frame is lifted over the page for as long as the form is open, the same size and over the same tinted page, and goes back when the form closes. In a module popped out into its own window, the form fills that window.

- **Save** and **Cancel** stay at the bottom while the form scrolls, and a **Close** button sits in the form's top right corner.
- **Cancel**, **Close** or Escape closes the form at once when you have changed nothing. When you have, it asks "Discard your changes?": **Keep editing** (or Escape again) goes back to the form, **Discard** closes it and loses what you typed. **Save** and **Delete** never ask.
- A click outside the form does nothing, and the page behind it waits until the form closes. In a call, the keyboard shortcuts still work: M to mute, your mute and camera keys, push to talk.
- A date picker or a menu opened from the form opens inside it; Escape closes only that.
- When the form closes you are back where you were: on the thing you saved, or on the button that opened the form.
- Something you may only read opens with no **Save** or **Cancel** and takes no typing: its fields are greyed, and the corner **Close** or Escape just closes it.

## Turn a module on in spaces

A module that opens on a space's canvas is off in every space until you turn it on. Either tick **Available in every space** on its card here, or open a space's own page from the Spaces tab, go to its **Modules** tab (it appears when there are modules to set) and switch the module on. The Modules section of a space only lists modules that are enabled.

The Lobby is for being together: it has the chat, the call, and only the modules made for it (the Calendar is one). Other modules are never on there. **Available in every space** leaves the Lobby out for them, and says so beside the tick: "(not in <Lobby>)", with the Lobby's own name. The Lobby's own settings page lists only the modules made for it, and turning another on there is refused with a sentence naming the module and the Lobby. When a server is updated, a module that was on in the Lobby and isn't made for it is taken out of the Lobby only: it stays on in its other spaces, and its data is kept.

## Show a module under another name

Every module, the built-in Conference and Chat included, has **Shown as**: an icon and a name this environment
shows the module as, everywhere: the top bar, the dashboard (beside a widget's own title), the
Roles grid ("Tool: Itinerary"), a space's module menu and each module's header, **Open with** and **Opens with**, pop-out windows,
Module Configuration, notifications and messages. Only an owner can change it.

1. On Manage > **Template**, under **Module names and icons**, find the module's row. (On the Modules tab, each
   card's **Shown as** line has a **Change** link to it.)
2. Choose an icon: **Its own icon** first, then the environment's icons and every module's own icon.
3. Type a name, up to 40 characters, or leave it blank for the module's own name.
4. Click **Save**. The line says "Saved. Shown as <name>", and the card's title changes, with the module's own
   name, version and author beside it ("Chat, built in" for a built-in module).

**Reset** puts back its own name and icon. A refused name or icon is explained and nothing is saved.
Uninstalling a module and deleting its data clears its display name and icon; uninstalling and keeping the data
keeps them.

## Settings

A module can offer settings. There are three kinds. **Environment** settings, for everyone, are chosen by an owner on the module's own page: choose **Module Configuration** on its card on the Modules tab. The same page also holds switches Collaborator draws for some modules, above the module's own settings: **Calendar sharing** for a module that offers its events to calendar apps or shows people's other calendars (the Calendar; see "Calendar sharing (owner)" in [Calendar](userguide-calendar.md)), and **Top bar**, with **Show in the top bar**, for a module that is a page of its own in the top bar (the Calendar and Maps; see "Top bar" in [Manage](userguide-environment-settings.md)). A module with none of these shows the button greyed out, with "No settings." beside it. **Space** settings, for one space, are chosen by an owner (on the **Modules** tab of the space's own page, under the module list) or by a member ticked as a moderator in that space (from the sliders-with-gears button on the space's card on the spaces page). **Your own** settings, how a module behaves for you, are on your profile page under Module settings. Every setting has a default, so nothing needs setting. A change to the environment's or a space's settings shows in the Modules tab's recent activity.

## Who can use it

An enabled module adds its permissions to the **Roles** tab, in a group named for the module. Untick one to take that ability from a role. Owners can always do everything, and a member marked Moderator in a space gets the Moderator role's permissions for a space module there. A module's data is stored per environment or per space, and a person only sees a space's module data if they are in that space.

## Upgrade and roll back

Upload a newer version of the same module and it replaces the active one. Collaborator keeps the newest three versions. The card has a version picker with the running one selected; choose another and **Switch to this version** goes back, or forward again. The module's saved data stays as it is either way. An upgrade or switch that asks for something you have not yet approved comes back disabled, and shows **Approve and enable**.

## Disable and uninstall

**Disable** hides a module without losing anything, and takes its permissions off the Roles tab. **Uninstall** removes it and asks whether to keep its saved data, so a later reinstall picks up where it left off. Choosing to delete the data also removes its schedules and notifications.

## Filters

At the top of the Modules tab, **All**, **Updates available** and **Configurable** choose which modules are listed. Updates available shows only the modules with a newer version waiting; Configurable shows only the modules with an enabled **Module Configuration** button: settings you can choose for the environment, Calendar sharing, or Show in the top bar. Each chip shows how many modules it holds.

## Recent activity

Under the filters, **Recent activity** lists what modules have done lately, newest first, in a box that scrolls: the time, the module, what it did and who for. A line about something Collaborator refused or slowed is tinted and has a warning mark.

## The AI service

Some modules can ask an AI to summarise, answer a question, or write a card from what a person selects. The **AI service** card on the Modules tab shows whether it is on, which service and model, and this month's use. Its **AI Configuration** button opens the page where you set it up, once for the whole environment. Nothing works until you do, and Collaborator ships no model and no key.

- **Source:** one **Managed** entry per company the host offers (its own key, a model chosen for it), or **Custom**, a service and key of this environment's own with the fields below. The host offers a company when its key is there: on the host console's Managed AI panel, or from the server's `AI_OPENAI_KEY` and `AI_ANTHROPIC_KEY` environment variables (the only way on a single server, where the operator is the owner); nothing else needs setting, and the model can be changed on the console. Changing the source or the company switches AI off until you enable it again, since a different company would receive what people select. The monthly allowance and this month's use are this environment's own either way.
- **Service** (custom): None (the default), **OpenAI**, **Anthropic**, or **Other (OpenAI-compatible)**. For OpenAI and Anthropic you only choose the company: Collaborator knows where to send the request. Other is for a model you run yourself (Ollama, LM Studio, llama.cpp, vLLM) or another company's service that speaks the OpenAI interface, and asks for its address. Each choice says under it what is sent and to whom: with a hosted service, the objects a person selects and their question go to that company under its terms; with your own model, nothing leaves your network. Only what a person selects is sent, never another space.
- **Workspace id** (Anthropic only): needed for a key made at the organisation level in the Anthropic console, which Anthropic then asks to name a workspace; a key made inside a workspace needs nothing here. The host sets the same for its managed Anthropic service (`AI_ANTHROPIC_WORKSPACE`, or the console's AI tab).
- **Model:** chosen from a list, not typed. Once the key is set (or the address, for Other), the panel asks the company which models it offers and lists them; **Refresh** asks again. If the list can't be loaded, the panel says why and offers **Type a model name instead**.
- **Enable:** setting a service up does not turn the AI on. On the **AI service** card of the Modules tab (as on any module), **Approve and enable** turns it on for every module that uses it, after saying what will be sent and to whom; **Disable** turns it off again and keeps your setup. The card on the Modules tab says On, Not enabled or Off.
- **Key** (custom): kept on the server, encrypted, and never shown again. If the environment's data was restored onto another server, the saved key can't be read there: the panel says "the saved AI key can't be read on this server; enter the key again", and everything else still saves. The panel says only whether one is set. **Set a key** or **Replace the key** takes a new one; **Remove the key** deletes it. The host's own keys, for the managed services, are on the host console, where a row says so if its key comes from the server's environment (`AI_OPENAI_KEY`, `AI_ANTHROPIC_KEY`).
- **Monthly allowance:** a number of tokens for the month, or 0 for no limit. The panel shows how many were used this month, in how many calls and for which tasks.
- **Who may use it:** the Roles tab has **Use AI in modules** under AI. It is off for every role until you tick it, owners always may, and guests never can (the tick is greyed out for them).
- **Per space:** on a space's settings, in its **Modules** tab under **AI**, **Turn AI off in this space** stops it there whatever the roles say.

## The flight schedule

The Planner's **Look up a flight** fills a flight from the same flight number saved before on this server (see "Look up a flight" in [Planner](userguide-planner.md)). The server learns those flights from the trips people save. It keeps the airline, the airports, the times and the terminal, never who flew. The **Flight schedule** section shows how much it has learned and lets you forget a flight or clear it all.

Where it is:

- **On a single server,** on the Manage page's **Modules** tab, for owners and the admin.
- **On a server with environments,** the schedule is shared by every environment, so it is on the host console's **Host** tab, for host admins only. An environment's owner has no section and can't clear it. To keep one environment's flights out, its owner turns off the Planner's **Suggest flights from earlier trips**.

The section says "This server has learned N flights from saved trips."

To forget one flight:

1. Under **Flight number**, enter it, such as WN 2483.
2. Choose **Forget a flight**. It says "Forgot WN 2483." If the server has no such flight it says "No flight WN 2483 is saved on this server.", and a number that can't be one gets "That is not a flight number; enter the airline code and number, like WN 2483."

To forget them all:

1. Choose **Clear all**. It is greyed out while nothing has been learned.
2. Confirm "Clear all learned flights? Lookups will find nothing until people save flights again." It says how many it cleared, such as "Cleared 12 flights."

Lookups then find nothing until people save those flights again. An environment's backup or copy never includes the schedule.

If the schedule's file on the server was damaged, the server moves it aside at its next start and starts with an empty schedule. If the file is far larger than it should be (over 40 MB), the server leaves it as it is and keeps nothing new until you choose **Clear all**, which replaces it; if that fails, the section says "The flight schedule could not be cleared; the server log says why."
