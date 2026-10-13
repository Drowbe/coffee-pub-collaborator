// What a space opens with when someone enters it (documentation/plans/plan-entering.md, "What opens on entering").
// canvas.js's restore() asks this, after a fresh request to open one module on one object (which wins, and is handled
// there), and the space list's "Open with" popover asks it for the ticks it starts with. Pure, no document and no
// imports, so tools/check-canvas.mjs runs it in node.
//
// In order:
//   1. the person's remembered layout for this space (`__open`), if they have been in it before; never for a guest;
//   2. the space's own "Opens with", leaving out what this person may not open here;
//   3. the environment's list for a space with none of its own (the template's spaceDefaults.opensWith);
//   4. with nothing set: the chat and every module on in the space, without the conference; for a guest, the
//      conference and the chat.
// A list that is set but holds nothing this person may open gives an empty list (an empty canvas), not the next step.
//
// `canOpen(id)` says whether this person may open a module here (the conference by conferenceAllowed() below, the chat
// by its permission; any other id by being on in the space for them). `modules` is the ids on in the space for
// this person, in the Modules menu's order.
// `column`: the always-on column holds the conference and the chat (plan-one-bar.md, step 6), so wider than a phone
// the canvas asks with it and the two ids are left out of the answer, whichever list names them. The lists still
// hold them (a phone opens them as tabs; nothing a person stored changes).
export const COLUMN_IDS = Object.freeze(['conference', 'chat']);
// `aliases` (composites.js's aliasesFor; plan-calendar-todo.md, step 3): a stored id read as another, or as a list of
// others ({ calendar: 'dest:calendar', todo: 'dest:calendar' } while the Calendar is on in the space), each once, in the
// first place it is named. The lists themselves are never rewritten.
export function readAliased(list, aliases = {}) {
  const out = [];
  for (const id of Array.isArray(list) ? list : []) {
    const to = aliases && Object.prototype.hasOwnProperty.call(aliases, id) ? aliases[id] : id;
    for (const one of Array.isArray(to) ? to : [to]) if (typeof one === 'string' && one && !out.includes(one)) out.push(one);
  }
  return out;
}
export function whatOpens({ remembered = null, own = null, environment = null, modules = [], canOpen = () => true, guest = false, column = false, aliases = {} } = {}) {
  const keep = (list) => (column ? list.filter((id) => !COLUMN_IDS.includes(id)) : list);
  if (!guest && Array.isArray(remembered)) return keep(readAliased(remembered, aliases));
  const openable = (list) => keep(readAliased(list, aliases).filter((id) => canOpen(id)));
  if (Array.isArray(own)) return openable(own);
  if (Array.isArray(environment)) return openable(environment);
  return openable(guest ? ['conference', 'chat'] : ['chat', ...modules]);
}

// Whether the conference may be opened: the environment's switch first, for everyone (an owner and the admin included),
// then this person's own permission ("See and join the conference").
export function conferenceAllowed({ conferenceEnabled = true, permitted = false } = {}) {
  return conferenceEnabled !== false && Boolean(permitted);
}

// Whether entering a space joins the call by itself (GitHub #199, the environment's "join the call on entering"
// switch, branding.autoJoinCall). Only with the switch on; never while already in the call; only for a person the Join
// button would show to (`canJoin`: connected, the conference allowed here for them); never in an aside (an aside is the
// call already, and a pull into one keeps the call on its own); and not for a person who left the call since they
// entered (`left`): they stay out until they enter again. Asked once per entry, so a join never repeats.
export function shouldAutoJoin({ setting = false, inCall = false, canJoin = false, aside = false, left = false } = {}) {
  return setting === true && !inCall && Boolean(canJoin) && !aside && !left;
}

// What space settings says under Opens with about what a first visit opens, worked out from the stored list, never from
// the ticks on screen: with nothing set, what opens instead (the environment's list, else the chat and the modules);
// with a list set that holds nothing that can open now, that nothing opens; otherwise nothing ('').
// `nameOf(id)` is the name a person reads.
export function opensWithSummary({ list = null, environment = null, modules = [], canOpen = () => true, nameOf = (id) => id } = {}) {
  const opens = whatOpens({ own: list, environment, modules, canOpen });
  if (Array.isArray(list)) return opens.length ? '' : 'None of the ones switched on can open now, so nothing opens.';
  const names = opens.map(nameOf);
  if (!names.length) return 'Nothing switched on: nothing opens.';
  const said = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `Nothing switched on: ${said} ${names.length > 1 ? 'open' : 'opens'}.`;
}
