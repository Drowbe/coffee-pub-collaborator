# Budget

**Audience:** a member of a space who adds costs and watches what is left, and an owner or moderator who sets the target.

Budget keeps what a space spends: each cost with the amount you expect, the amount you paid, who paid and what it is
for. It works in any space, not only a trip, so a shared house, a project or a small business can use it. The words here
are the defaults; an environment may show the module under another name (see [Modules](userguide-modules.md)). Once an
owner has installed and turned on Budget in Manage, it is on in every space.

**Who can:** anyone whose role has **See the budget** reads it, and anyone with **Add and change costs** adds and
changes costs. Members and moderators have both by default; guests have neither. Anyone with **Add and change costs**
may change any cost, not only their own. The target is not one of these: see "The target" below.

## Add a cost

1. Open Budget and press **+** in its titlebar, then **Add a cost**.
2. In **What is it for**, say what the cost is (up to 120 characters).
3. Enter **Planned**, the amount you expect, and **Paid**, the amount you actually paid. Either can be left empty
   ("Not yet"). Enter an amount the way you write it: `1,234.50`, `1.234,56` and `12,5` are all read.
4. Choose a **Category** and a **Date** (the day it is paid or due), and, if someone paid, **Paid by**. Under **Shared
   by**, tick the people who share the cost; leave everyone unticked to share it with everyone.
5. Add **Notes** if you like, then choose **Save**.

Amounts are in the space's one currency. A cost paid in another is entered already converted. To change or delete a
cost, open it from **Costs**. If someone else saved it while you had it open, Budget says so and shows their version.

## The views

Choose a view with the switch at the top of the module.

- **Overview.** The target, what you have **Planned**, **Paid** and **Expected** (what is paid, or planned where
  nothing is paid yet), and what is **Left** or **Over by**, with a bar of what is spent against the target. Below it,
  each category with its planned amount behind its paid amount, and the burndown: the target left over time, falling by
  each cost on its date, with the space's phases drawn behind it. A cost with no date comes off before the first day. A
  space with no target shows what is planned and paid and no bar or burndown.
- **Costs.** Every cost, grouped **By day** or **By category**, sorted by date, amount or title. Narrow it with the search
  box, a category, or who paid ("Nobody paid yet" finds the costs still to pay). Open a cost to change it.
- **Settle up.** Each person's share of what was paid, what they paid and the difference, then the fewest payments that
  settle everyone ("Bob pays Ann 175.00"). Odd cents are handed out so nothing is lost. It counts costs that have an
  amount paid and a person who paid, and it appears only when at least one cost has a payer and the space has more than
  one person.

## Categories

Costs are grouped by category: Travel, Lodging, Food, Supplies, Services, Fees and Other. An owner changes the list in
Budget's settings (the list is for the whole environment). **Other** is always there and can be renamed but not removed.
Taking a category off the list changes no cost: those costs show under **Other** until you choose another.

## The target

The target is how much the space means to spend. It belongs to the space, not to Budget, so the status strip and every
module that uses it read the same one.

**Who can:** the space's owners, the admin and the space's moderators set it. Members see it in Budget and cannot change
it. Guests do not see it.

1. In Budget's **Overview**, choose **Set a target** (**Edit target** once one is set). A small editor opens in the
   module.
2. Enter the **Amount** and choose the **Currency**, then **Save**. Or open **Set up** and use the **Budget** field on the
   **Phases** tab (see "Set up" in [Spaces](userguide-spaces.md)).

You can choose a currency and leave the amount empty. The space then has no target but still words its costs in that
currency. Empty both to clear the target.

## On the status strip

While Budget is open, it tells the status strip how much is spent: "Spent $2,340" with no target, and "$2,340 of $4,000"
with one, with "$1,660 left" or "over". Press it to open Budget. The strip keeps what Budget last reported for a week,
so it stays current only while someone opens Budget now and then. In a space with the Planner too, the Planner's own **Spent** chip is hidden while Budget is on (see "Costs from other modules"). See "The status strip" in [Spaces](userguide-spaces.md).

## Costs from other modules

Budget also lists the costs that other modules hold in the same space. Today that is the Planner's bookings that have a
**Cost**: a hotel, a flight, a dinner. They appear in **Costs** among your own, marked **From Planner** (the module's
name as your environment shows it), and you cannot change them here.

- **Open in <module>.** Open the row, or its menu, and choose **Open in <module>** to go to the booking and change it
  there.
- **Counted as paid.** A booking has one figure, so Budget counts it as paid, not as planned. It is in the totals, the
  burndown, **Settle up** and the strip's figure like any other paid cost, with its payer and who shares it when the
  booking names them.
- **Other.** A booking has no Budget category, so it is listed under **Other**.
- **Only what you may read.** You see a booking only if your role may read the module that holds it. When some costs are
  left out for that reason, Budget says "Some costs are from a module you can't see." and the totals leave them out too.
- **Nothing is copied.** Budget reads the bookings each time; it keeps no copy of them. A change in the Planner shows in
  Budget within about 30 seconds, or at once when you come back to the window.

**The Planner gives way.** While Budget is on in a space, the Planner's **Money** view and the **Spent** chip it put on
the status strip are hidden, so the strip shows one figure for money, not two. Turn Budget off and they come back. The
**Cost** and **Paid by** fields on a booking stay as they are, and nothing is deleted either way.

## Not yet

A space's template does not turn Budget on yet: an owner installs and turns it on in Manage.
