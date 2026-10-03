# Chat

**Audience:** anyone in a space on a Collaborator server who types in Chat: to talk, to ask the AI, to add something to a module, or to bring in research from another AI.

Chat has one box, **Chat or type / for commands...** ("Chat, or / for commands", or just "Chat", when the chat is narrow). Plain text is a message to the space. Text that starts with a command does something else: `/ai` asks the AI privately, and a module's command opens that module's add form. Every command you type shows in Chat as your own **private** message, with the module's icon and colour. Opening Chat, formatting, pictures and history are covered in [The call](userguide-call.md), "Chat".

Who can use it: anyone allowed to send messages in the space (set per role on the Roles tab). Commands work only in a space, not in an aside.

## Commands

| Command | What it does | Needs |
| --- | --- | --- |
| `/ai` | Asks the AI, privately | See "Ask the AI" below |
| `/t` | Opens To-do's new task form | [To-do](userguide-todo.md) open |
| `/c` | Opens the Calendar's new event form | [Calendar](userguide-calendar.md) open |
| `/r` | Opens a new Research note, or a link when you type a web address | [Research](userguide-research.md) open |
| `/p` | Opens the Planner's form for the day you name, or the day in view | [Planner](userguide-planner.md) open |
| `/v` | Opens a new poll with your question | [Polls](userguide-polls.md) open |

A module's command opens the same form as its own add button, filled in from what you typed, and saves nothing until you choose **Save**. A date and a time in the text are picked out: `/t book flights by sep 25` makes the task "book flights", due Sep 25. The list comes from the modules on in the space, so a module installed later can add its own.

1. Type `/` on its own, or open the formatting menu (the icons button left of the box) and choose **Commands**.
2. Choose a command. It goes into the box, and the box shows a hint for what to type.
3. Type the rest and press Enter.

What to know:

- **The module must be open.** If it isn't, the text stays in the box and a line under it says so, for example "To-do isn't open". Open it from **Layout** in the space bar and press Enter again.
- **An unknown command** stays in the box with "No command /x". Nothing is sent to the space. Text that starts with `/` is never sent as a message.
- **Two modules with the same command** are both listed, each with its module's name. If both are open, the line under the box asks you to choose from the list.

## Ask the AI

Type `/ai` and your question, then press Enter. Your question and the answer appear in Chat marked **private**: nobody else in the space sees them. The answer is from **AI**, in gold. Both are kept for you in this space, after a refresh or on another device, with your other private messages.

To show an answer to everyone, make it public (see "Private and public" below). Others then see it from **AI, for <your name>**, with your question above it.

Each answer has:

- **Copy**, which copies its text.
- **Keep**, on each object the answer holds (a hotel, a sight, a note). An object that is plainly a flight, a hotel, a sight and so on is kept in the Planner as that kind; anything else goes to Research as a note. If that module isn't open, the button shows it is waiting and the object arrives when someone next opens it.

To ask about something you already have, drag it onto Chat while `/ai` is in the box; the line under the box says how many objects the question will use. Research's **Research this** and a drop menu's **Ask the assistant** do the same for one object.

Who can: anyone signed in, except guests, in a space where **Turn AI off in this space** is not ticked. The owner must have set up an AI service first; see [Assistant](userguide-assistant.md).

## Private and public

Every message has a **private** or **public** badge in its header. A message is public when you type it plainly, and private when it is a command or an AI answer. Only you see your private messages; not even an owner or the admin sees them.

1. To change who sees one of your messages, click its badge.
2. Choose **Make public** or **Make private**. The message itself moves: nobody gets a copy.

Made public, it appears for everyone in the space where its time places it. Made private, it disappears from their chat. Only the person who wrote a message can change it, and guests can't. Pictures are always public and not kept.

**The filter.** Above the messages, **All**, **Private** and **Public** choose what you see. It only hides messages on your screen, and it is remembered for this space until you close the tab. With nothing to show it says "No private messages here yet." or "No public messages here yet."

## Clear messages

Chat's menu (the **⋮** in its header) reads **Save the chat**, **Clear…** and, for moderators, owners and the admin,
**Delete the chat**.

1. Choose **Clear…**. It lists what you can clear, each with how many: **Chat messages**, **AI**, one line for each
   module's command messages (with its name, icon and colour, or its command, such as "/t", if the module is gone),
   and **All of them**. The counts ignore the **All**, **Private** and **Public** filter.
2. Choose one.
   - A member clears only their own: for example "Clear your 12 AI messages?". Confirm it.
   - A moderator, an owner or the admin chooses **Clear yours (n)** or **Clear everyone's (n)**. Everyone's says
     "Private messages of others stay.": it takes every public message of that type, and your own private ones,
     never anyone else's private messages.
3. Clearing **Chat messages** or **All of them** also takes the pictures on your screen.

When someone clears everyone's messages, the others in the space see one line saying so, for example "Mo cleared the
AI messages.". It isn't kept.

**Clear…** shows in a space, not an aside, to signed-in people, when there is something to clear. Guests never see
it. **Delete the chat** removes every message, for everyone, private ones too.

Chat keeps the space's last 500 public messages and each person's last 200 private ones, none older than 30 days.

## Colours

Each module has a colour, and it shows in three places: on the messages its command made, on the module's icon in its titlebar, and on its line in **Layout ▾**. The AI is gold, Research blue, the To-do green, the Calendar red, the Planner teal, Polls purple, Places orange and Maps pink. Plain messages have none.

## Bring in research from another AI

You can research in another AI and bring what it finds into Collaborator as objects. This uses none of the environment's AI.

1. Open the formatting menu and choose **Bring in research**. It shows only to people who may use `/ai` here (the same rule as "Ask the AI", with or without an AI service set up), and only where something can keep it (the Planner, or a module that keeps notes such as Research).
2. Choose **Copy instructions for another AI**, paste them into the other AI, then ask your question.
3. Paste its whole answer into **Paste the whole answer here** and choose **Preview**, or choose **Choose a file** and pick its `.objects.json` file.
4. A preview marked **Brought in** lists each object with a tick. Untick any you don't want.
5. Choose **Keep ticked** and confirm.

Pasting an answer straight into the Chat box works too: when it holds objects, **Bring in N objects** appears beside Send and opens the same preview.

An answer or file written from instructions copied before 2026-09-30 is in an older format and is refused, with nothing brought in: "that answer is in an older format: copy the instructions again and ask the AI for a new answer" (or "... for a new file"). Copy the instructions again, give them to the AI and ask it for a new answer. Pasted into the Chat box, such an answer offers no **Bring in** button. The limits (50 objects at a time, 256 KB, the "External source" line) are in [Assistant](userguide-assistant.md), "Bring in research from another AI".
