# Accounts, Roles and Permissions

**Audience:** a game master or owner adding players to a Collaborator environment and deciding what
each of them can do.

## Add people

On the Manage page, **Users** lists everyone. Choose **Add user**, give them a login, display name
and password (or turn on a personal link), and open their profile to set up their pictures. Only an
owner adds people. **Role** is **Member** or **Owner**.

Each account can sign in either way, or both:

- **Login and password.** The owner picks both and tells the player.
- **Personal link.** Turn it on for a player and copy the link, something like
  `https://host.<domain>/j/2f3kd...`. Opening it signs them in and lands them on the list of spaces, ready to join.
  Regenerate it to make the old one stop working; turn it off to require a password.

Nobody changes their own password; an owner sets it. Sessions last 30 days. Changing someone's
password or regenerating their link signs them out everywhere.

Owners are made here, in Manage: give someone the **Owner** role. An environment can have any number of owners,
or none. An owner cannot change their own role or delete themselves; another owner (or the admin) has to. Owners
are called **Owner** on every install, single or hosted (see [Your environment](userguide-environments.md)).

Every server also has an **admin**, who has every right and is not an owner:

- **On a single server**, the admin is the account in the server's compose file (`ADMIN_LOGIN` and
  `ADMIN_PASSWORD`; see the getting-started guide). Its profile shows "Admin: runs this server", and its
  password "Set in the server's configuration." Its role, login, password, personal link and two-step sign-in can't be
  changed or reset from Manage, and it can't be deleted ("The server's admin. It signs in with the settings in
  the server's configuration, so its role and sign-in can't be changed here."). Its password is changed in the
  compose file.
- **On a hosted server**, the host admin can sign in to any environment. Their account there shows as **Host
  admin**, has every right, and its role and sign-in can't be changed there ("The host admin's own account. It
  signs in through the host console, so its role and sign-in can't be changed here.").

Every account has a **key**, eight letters and digits made when the account is created. It never
changes. Images, OBS view links and OBS source names use the key, so an owner can rename a login or
a display name without touching anything in OBS.

A player with no camera and no microphone still joins: they sit in the call with their picture, use
chat and reactions, and can be published to OBS like anyone else.

## Let people sign themselves up

Off by default. On the **Environment** tab, under **Sign-up**, turn on **Let anyone at /register sign themselves up** and anyone
who finds that link can make their own account, as a member in the Lobby.

Without opening it up, an owner can still **invite** someone straight into specific spaces: pick the
spaces and choose **Generate invite link**, then send the link. It works whether or not general
sign-up is on, expires after 7 days, and works once.

## Guests

A guest has no account, for someone dropping in once. While in a call, open the settings popover
(the gear next to chat and reactions) and, under **Guests**, turn on that space's link. Anyone with it
lands on a page headed "Enter <space>" that asks only for a name; **Enter** (a door) takes them into that space.
Where the template or the owner has changed the word for entering a space, the heading and the button use that
word instead (see "The words on two buttons" in [Manage](userguide-environment-settings.md)). A guest's first visit opens the conference and
the chat, unless the space's **Opens with** (or the environment's list for a new space) says otherwise. Entering does
not put a guest in the call: the conference shows **Not in a call**, and the guest joins with **Join the call** or the
green phone, when the browser asks for the microphone (see [The call](userguide-call.md)).

Anyone in the call with the right permission can turn the link on, copy it, or turn it off. It is a
standing door rather than single-use: it works for as many guests as show up until someone turns it
off or generates a new one. Nothing about a guest is kept once they leave. A guest with their camera
off shows the shared **Guest images** picture set (see
[Manage](userguide-environment-settings.md)). A space can turn guests off entirely with **Allow
Guests** on its own settings page, which also turns off any link already in use there.

Guests can't install Collaborator as an app. On a guest link there is no install hint, and the browser does not
offer to install; see "Install it as an app, and pop it out" in
[The call](userguide-call.md).

## Roles and what they can do

Open **Roles** on the Manage page to see a grid of checkboxes: one row per permission, and the columns
**Owner**, **Moderator**, **Member** and **Guest**. Changes save as you click.

- **Owner** can do everything, and its column is locked ("Owners can always do this"). The admin can too. Owners run the
  environment: they add people, set passwords and change settings. An owner also has every permission a
  module adds.
- **Moderator** is what someone gets in any space where they are marked **Moderator** on their
  profile's **Spaces** tab, on top of their ordinary role there.
- **Member** is an ordinary account.
- **Guest** is everyone who comes in from a space's guest link.

The permissions are grouped:

- **Modules** (the environment's word for it): see and join the conference, open and read the chat. Everyone has both by default. Without
  the first, a person enters a space for its chat and modules only and cannot send or receive audio or video.
- **In the Space**: send chat messages, send pictures in chat, use reactions, share their screen.
- **Asides**: start a private conversation, step aside with someone (recorded).
- **Moderation**: mute other people, kick other people, manage a space's guest link.
- **Images**: change their own profile photo, call background, and each of the Participant and
  Character pictures. By default only owners change the OBS pictures; everyone else can change their
  own profile photo and call background.

A permission that is off for a role hides the control for that person, and the server refuses it even
if someone tries the request by hand.

## Per-space settings for a member

An owner opens someone's profile and chooses the **Spaces** tab to see one section for each space they
belong to. In each, **Moderator** makes them a moderator in that space only, so they get everything
the Moderator role has there and nothing extra elsewhere. **Use Default Profile Images** decides
whether the space's own pictures replace their defaults, and **Remove** takes them out of the space.

## Your profile and signing out

Your picture and name are at the right end of the top bar on every page. Anyone with an account can use them; a
guest has no picture there and no profile menu.

1. Click your picture. A menu opens under it.
2. Choose what you need:
   - **View profile** opens your profile page. In a space it opens over the call, which keeps running.
   - **Dark mode** switches between light and dark (see "Light or dark" below). A tick shows while it is on.
   - **Manage** (owners and the admin) opens the Manage page; in a space it opens over the call. See
     [Manage](userguide-environment-settings.md).
   - **Host console** (a host admin signed in to one of the environments on a hosted server) opens the host
     console. From a space it opens in a new tab, so the call keeps running.
   - **Install as an app** runs Collaborator in its own window, without browser bars. It is there only while your
     browser offers to install (Chrome and Edge, before Collaborator is installed), and never for a guest; see
     "Install it as an app, and pop it out" in [The call](userguide-call.md).
   - **Sign out**, last. It also forgets the light or dark choice made in this browser, so the next person here
     starts from the default.

The menu also works from the keyboard: the arrow keys move, Enter picks, and Escape closes it.

On a phone your picture is not in the top bar. It is in the top bar's menu instead:

1. Tap the menu button (**Menu**, three lines) at the right of the top bar.
2. Near the end of the menu, after a line, are your picture and name. They are only a label; tapping them does
   nothing.
3. Tap an entry under them: the same ones as on a wider screen, with a switch for dark mode.

From the keyboard, opening the menu puts you on its first entry, Tab moves through the entries and back to the menu
button, and Escape closes it.

To change your photo, open your profile and click the photo at the top, or paste a picture you have copied into it
(Tab to it and press Ctrl+V, Cmd+V on a Mac, or choose its **Paste** button). Your other pictures on the profile
work the same way; see "Set a picture" in [Participant and Character Images](userguide-images.md).

## Your calendar in a calendar app

When an owner has turned on **Calendar feeds** (Manage, "Calendar apps"), members and owners can add the events
they can see to Google Calendar, Apple Calendar or Outlook through a private address. It is one way: changes in
the calendar app don't come back.

1. Open your profile. **Calendar feed** is after **Call Settings**. It shows when feeds are on and there are events
   you can see, or while you still have an address.
2. Choose **Make an address**. The address is shown once, with **Copy**. Anyone with the address can see your
   events, so keep it private.
3. Add it to your calendar app:
   - Google Calendar: choose **Other calendars**, then **From URL**, and paste it. Google reads it about once a day.
   - Apple Calendar on a Mac: **File**, then **New Calendar Subscription**. On an iPhone: **Settings**, **Calendar**,
     **Accounts**, **Add Account**, **Other**, **Add Subscribed Calendar**.

Afterwards the section reads "On, made <date>. Last read <time ago>." (the time can lag by up to an hour).
**New address** replaces it, so the old one stops working; **Turn off** stops it. Both ask first.

The feed holds the environment's events and those of the spaces you belong to, as you may see them each time it is
read; events more than 90 days past are left out. Repeating events repeat, a Planner object with a date appears
once (as its Calendar event), and each event links back to the Calendar.

**For owners:** Manage > **Users** marks who has a calendar feed, with **Turn off feed**, and a person's profile
shows "Calendar feed · on/off · last read … · Turn off". You never see anyone's address.

## Your other calendars in Collaborator

The other way round: show events from your own Google, Apple or other calendar in the Calendar, for you alone. It is
in your profile under **Calendar feed**, as **Other calendars**, while the owner has **Calendar feeds** on and the
Calendar can show them. Members and owners have it; guests don't.

1. Find your calendar's private address. In Google Calendar: open **Settings**, pick the calendar, choose
   **Integrate calendar**, and copy the **Secret address in iCal format**. A `webcal://` address works too.
2. Under **Other calendars**, type a **Name** and paste the **Address**.
3. Add it. The address is read first, which can take up to 15 seconds; one that can't be read is refused with the
   reason.

You can add up to five. Each row shows its name, its host and "Read <time ago>" or what went wrong, with
**Refresh** (once a minute; sooner, the row says to try again in a minute) and **Remove** (which asks first). A calendar too complex to read is refused with "The calendar is too complex to read." The address is never shown again. They are read
again every 30 minutes.

If the owner turns **Calendar feeds** off, the section shows only while you still have calendars: "Other calendars
are off in <environment> for now, so their events do not show. You can still remove them.", with **Remove** only.

## Light or dark

**Dark mode** in the menu under your picture (on a phone, the sun and moon switch in the top bar's menu) changes
between light and dark at once, with no refresh. Your choice is kept on your account and follows you to your other
devices. Once you have used it, you keep your choice even when the owner changes the environment's default. A guest
has no switch and always sees the environment's default.

## Two-step sign-in

A second step after the password, if you or your owner want one: a six-digit code from an authenticator app on your phone, the standard kind that any such app makes.

- **Turning it on.** On your profile, under **Two-step sign-in**, choose **Turn on**: scan the square with the app (or type the key under it into the app), then type the six digits the app shows. The page then shows ten **recovery codes**, once: keep them somewhere safe. Each one signs you in a single time if the app is ever gone.
- **Signing in.** After your password, a page asks for the app's code. Tick **Remember this browser for 30 days** and that browser is not asked again for a month. **Use a recovery code instead** takes one of the saved codes, which is then spent.
- **A personal link** still gets the code step once you have one; it is the first step, not a way around the second.
- **Turning it off** asks for a code. If the environment requires it (below), it cannot be turned off.
- **Locked out.** Ask an owner: on your profile they can **Reset your second factor**, which signs you out everywhere and lets you set it up again. An owner locked out of their own account on a hosted server asks the host; on a single server, the operator turns on the lockout bypass (`ADMIN_MFA_LOCKOUT_BYPASS`) in the compose file, signs in on the password, and presses **Reset my second factor** on their profile (see the getting-started guide).
- **The rule for the whole environment** is one switch on Manage > Environment, under the sign-in page: **Require two-step sign-in for everyone**. Off (the default), anyone may set it up and is then asked; on, everyone must, from their next sign-in, which lands on the set-up page first; a session already open keeps working. Whether the server offers two-step sign-in at all is the operator's compose setting; when it does not, none of this appears.
