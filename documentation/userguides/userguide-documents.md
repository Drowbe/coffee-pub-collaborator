# Documents

**Audience:** members, moderators and owners who write shared notes in a space (session notes, handouts, lesson plans), and anyone who only reads them.

Documents holds written notes for a space. Each space has its own list. One person writes a document at a time, and everyone else reads it as it changes (an owner can turn on writing together; see "Writing together"). It works only in a space. This guide was written from the code and the plans, not by using the module; the Documents module's versions 0.1.0 to 0.11.31 are covered.

**Who can:** set on the **Roles** tab under Documents ([Accounts, roles and permissions](userguide-accounts.md)):

- **See the documents** lists and reads them. It starts on for members, moderators and guests.
- **Write and change documents** makes, edits, renames and deletes them. It starts on for members and moderators and off for guests.

An owner always can do both. Tags follow the same rights: reading them needs the first, making one needs the second. Renaming, recolouring and deleting a tag is a separate right ([Spaces](userguide-spaces.md), "Set up").

## The list

Open Documents from the **Layout** menu, under **Show**. The list shows each document's title, a few words of its start, who last changed it and when.

- **View** switches between **List** and **Thumbnails** (a small picture of the page). A Paper document's tile shows a page of its size, with the text up to its first page break. Your choice is kept in your browser.
- **Search documents** in the toolbar narrows the list as you type. It does not match tag names yet ([known-issues](../known-issues.md)).
- **Tags** in the toolbar filters by tag; with several chosen, a document must have all of them.
- **New document** (the **+**) makes one. Titles are up to 120 characters.
- **Open Markdown file** (also in the **+**) makes a new document from a Markdown or text file on your computer (`.md`, `.markdown` or `.txt`, as UTF-8 text). You can also drop one file on the list. The file's name, without its ending, becomes the title. A file that is too big says "That file is too big for a document." and one that is not text says "That does not look like a text file." The file is read in your browser and goes nowhere else. Only people who can write documents are offered it.

## Read a document

Open a document from the list. It shows as a page, in the page colour chosen for it. **Back to the documents** (the arrow, first in the toolbar) returns to the list.

The title bar shows the open document's title as a dropdown. Its menu lists the space's documents, the most recently changed first, and choosing one opens it. It lists at most 40; past that a grey line says how many more exist, and you find them in the list. People who can write documents also find **New document**, **Rename** and **Delete** there.

- **Save as Markdown file** and **Print** are in the title bar's **...** menu while a document is open, not on the list. **Save as Markdown file** downloads the text as a `.md` file named after the title, with unsaved typing included while you edit. **Print** is the usual Print action: a Paper document prints on its own page size with its margin and page numbers; a Fluid one prints as a plain white page with dark ink and no controls. Neither was tried in a real print dialog or in Safari or Firefox; both were read from the code.
- **Zoom** in the title bar: **Zoom in**, **Zoom out** (the magnifier icons) and the **Zoom** menu with **Fit width**, **Actual size** and the levels 50, 75, 100, 125, 150 and 200 percent. **Fit width** is the usual. The same icons are in the title bar while you edit. On a Paper document, **Fit width** scales the page to the window, up to 200 percent.
- If someone else is editing, you see **<name> is editing** and the page changes as they save. You do not need to refresh.
- A document can hold headings, bold and italic, lists, checklists, quotes, code, links, tables and formulas. Links use only web addresses, email addresses and links to other objects. Nothing is loaded from outside the server.

## Write a document

1. Open the document and choose **Edit**. If someone else is already editing, **Edit** is off and the page says who. Try again when they are done.
2. Type. The formatting bar has **Bold**, **Italic**, **Code**, **Heading**, **Bulleted list**, **Numbered list**, **Checklist**, **Quote**, **Link** and **Insert**. **Insert** (the plus) holds **Grid**, **Formula** and **Page break**. **Link** asks for the address in a small box, and an existing link can be edited or removed.
3. It saves itself about three seconds after you stop typing. Choose **Done** to finish and let the next person edit.

The edit bar has more at its right end: **Editor**, **Layout** and **Page**, described next.

### Markdown or Rich text

**Editor** switches between **Markdown** (the text with its marks, the usual) and **Rich text** (you see headings, bold and lists as you type, with the usual shortcuts such as Ctrl or Cmd with B and I). The text goes from one to the other as Markdown; what is not saved yet stays unsaved. The choice is yours, kept in your browser. A block that Markdown cannot keep exactly is saved as typed, and the editor says so: "This block has formatting Markdown cannot keep exactly; switch to Markdown to check."

**Pasting in Rich text.** The editor reads only the plain text of what you paste, as Markdown: a line starting with `#` becomes a heading, `- ` a list row, and so on. The formatting of what you copied (its fonts, colours, tables and pictures) is never read, so pasting from a web page or a word processor brings the words and not the look. If the clipboard holds only formatted content with no plain text, its words alone are taken. Lines indented by four spaces or a tab become one code block, as in any Markdown. Dropping text onto the editor works the same way; dropped files are ignored.

In **Rich text**, grids are tables you edit in place. Press **Tab** in the last cell to add a row, up to 200 rows; a grid has at most 200 rows and 20 columns. While the cursor is in a grid, **Insert** shows the **Grid** group (rows, columns and alignment) first.

### Paper and Fluid

**Layout** is the document's own, for everyone: **Fluid** (the usual: one page the width of the window) or **Paper** (separate pages of a real size). With **Paper**, the **Page** button's menu has **Page colour...**, a **Page size** (**Letter** or **A4**, with a 1 inch margin) and **Page numbers**. Pages show the same in reading and in the Rich text editor, which adds space where a page ends. **Page break** starts a new page at that line. A page break at the very start of the text makes no blank first page: the text begins on page one. In Rich text, Backspace at the start of the block after a page break, or Delete at the end of the block before it, removes the break.

- The Markdown box is one sheet: it is not split into pages while you type.
- In a window narrower than 60 percent of the page's width, a Paper document is drawn as Fluid until the window is wide again.
- A Paper document of more than 6000 blocks is drawn as one sheet, not paged.
- The page count in the editor and in reading can differ for very large grids: the editor does not split a grid between pages.

Good to know:

- **One editor at a time.** Editing holds a lock that your page renews every 10 seconds. If your page goes quiet for about 35 seconds, others can take over.
- **If someone else saved first,** you see "You stopped editing because someone else saved first. Your changes are kept here." and your text stays on the screen so you can copy it. **Close without saving?** asks before it is thrown away. If a save did not go, it says "Not saved. Try Done again."
- **Page colour.** **Page colour** (the palette) sets the document's paper for everyone: **Pure White** (the usual), **Creme**, **Light Grey**, **Light Blue**, **Slate**, **Dark Blue** or **Black**. These are fixed colours, the same in light and dark mode.
- **Rename** and **Delete** are in the title-bar dropdown of an open document. Rename asks for the title in a small box.
- A document is at most about 150,000 characters.

## Tags

Choose **Tags** (the tag icon) on an open document to tick the tags it has, or type to find one or to create it with **Create "x"**. A document holds at most 8 tags. A tag name is up to 24 characters, lower case, with letters, digits and dashes. The tags are the space's shared list; the same ones are offered to every module that has tags. Tagging does not need the edit lock. Rename, recolour and delete tags in Set up ([Spaces](userguide-spaces.md)).

## Trash

**Delete** puts a document in the trash, after asking. Choose **Trash** in the toolbar (with a count) to see them. **Restore** brings one back; **Delete for good** removes it and its text. Anything that has been in the trash for a week is deleted for good the next time an editor opens the list. Only people who can write see the trash.

## If your connection drops

When the connection to the server drops and comes back, Documents reads the list again and catches up on what it missed. Read from code; not tried with a real dropped connection.

## Writing together (off by default)

An owner can turn on **Let several people type in a document at once**: choose **Module Configuration** on Documents' card on the **Modules** tab. It is off until then, and everything above describes the module with it off. This is an early version, built in slices (Documents 0.11.21 to 0.11.27): it was read from the code and has its own module tests, but it was not tried by two people at once, on Safari, an iPad or a phone ([plan-documents-coediting](../plans/plan-documents-coediting.md), [known-issues](../known-issues.md)). A document already open keeps the mode it was opened in.

With it on, a document has no **Edit** and no **Done**: it is simply editable by everyone who may write documents, in the rich editor, up to eight people at once.

- **Joining.** The status line says **Joining…** first. After that it shows **Shared** while others are in, and **Saving**, **Saved** or **Not saved yet** while you are alone. **Offline. Your changes are kept here.** shows while the connection is down, and your text stays in the page until it returns.
- **The ninth person** reads along: "Eight people are editing. You can read along." There are no editing controls.
- **Who is here.** Other people's cursors and selections are not drawn. When two or more people edit, a row of round badges with their initials shows above the page. The badge of the person who locked the document carries a lock.
- **Saving.** One of the editing pages saves the text a few seconds after the last change, and a page that leaves saves too. If a save does not go, the status line says why ("Could not save.", "Saving is slow right now.", or that the module's storage is full) and your text stays in the page.
- **The Markdown box is off** while others are editing: "Others are editing. The Markdown box is off. Your text is in the document." It comes back when you are alone.
- **Lock.** In the **Page** button's menu, under **Document**, **Lock** stops everyone typing ("Nobody can type until it is unlocked."). The page says "Locked by <name>." with **Unlock**. The person who locked it, an owner and the admin can unlock it; for anyone else **Unlock** is off and says "Only <name> or an owner can unlock." Nobody else can rename or delete a locked document either. The lock is kept by the editing pages, not enforced by the server.
- **Title, page colour and layout** are shared: when one person changes the title or the Page settings, everyone sees it. When a document is deleted, the others are told "This document was deleted." and their text stays on the screen.
- **One window each.** A second window of the same person opens the document to read only: "You are editing this document in another window."
- **A block that cannot be saved** (a rare mix of formatting that a Markdown text cannot hold) is removed, and the page says "A block that could not be saved was removed."
- **A document started again elsewhere** says "This document was updated. Reopening…" and opens again.

## What it does not do yet

Pictures in a document and links to other documents are planned.
