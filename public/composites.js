// Composites on the Workspace (plan-calendar-todo.md step 3; plan-map-places.md step 3 reuses it): one module on the
// canvas that holds a destination's page at space scope (`/calendar?space=<id>` in a frame), in place of the modules
// whose parts the page draws. The person sees one Calendar; the modules behind it keep their ids, their data and
// everything stored under them.
//
// Pure: no document, no storage, no imports, so tools/check-canvas.mjs runs it in node. canvas.js reads the table;
// opens-with.js and layouts.js take the `aliases` map this file builds and read a stored list through it, so a
// remembered list, an Opens with or a saved layout naming `calendar` or `todo` opens the composite, and nothing stored
// is rewritten.
//
// A composite: { id, dest, path, main, parts, width, height }. `main` is the module whose name, icon and tint the
// composite shows and whose being on in a space turns the composite on; `parts` are the module ids it stands in for
// there (the main included). While the main is off in a space the other parts keep their own canvas surfaces.
export const COMPOSITES = Object.freeze([
  Object.freeze({ id: 'dest:calendar', dest: 'calendar', path: '/calendar', main: 'calendar', parts: Object.freeze(['calendar', 'todo']), width: 760, height: 600 }),
]);

export const isCompositeId = (id) => typeof id === 'string' && id.startsWith('dest:');
export const compositeById = (id) => COMPOSITES.find((c) => c.id === id) || null;

// The composites on, given the ids of the modules on in a space for this person: each whose main is among them.
export function compositesOn(ids) {
  const on = new Set(Array.isArray(ids) ? ids : []);
  return COMPOSITES.filter((c) => on.has(c.main));
}

// The aliases a stored list is read through, given the ids on in a space: each part of a composite that is on reads
// as the composite; a composite that is off reads as whichever of its parts are on (so a remembered `dest:calendar`
// still opens the To-do's own list where the Calendar went off). { <stored id>: <id> | [<ids>] }.
export function aliasesFor(ids) {
  const on = new Set(Array.isArray(ids) ? ids : []);
  const aliases = {};
  for (const c of COMPOSITES) {
    if (on.has(c.main)) for (const part of c.parts) aliases[part] = c.id;
    else aliases[c.id] = c.parts.filter((part) => on.has(part));
  }
  return aliases;
}

// A list of ids read through the aliases: each id as itself or what it reads as, in order, each once (the first place
// a composite is named is where it goes). Never changes the list it is given.
export function readAs(list, aliases = {}) {
  const out = [];
  for (const id of Array.isArray(list) ? list : []) {
    const to = aliases && Object.prototype.hasOwnProperty.call(aliases, id) ? aliases[id] : id;
    for (const one of Array.isArray(to) ? to : [to]) if (typeof one === 'string' && one && !out.includes(one)) out.push(one);
  }
  return out;
}

// The Show list's modules: the server's list with each composite that is on in the main's place and its other parts
// left out. A composite's entry reads like a module's for the canvas ({ id, name, icon, color, canvas, composite }),
// its name, icon and colour the main's as this environment shows it.
export function composeList(modules) {
  const list = Array.isArray(modules) ? modules.filter((m) => m && typeof m.id === 'string') : [];
  const on = compositesOn(list.map((m) => m.id));
  const hidden = new Set(on.flatMap((c) => c.parts));
  const out = [];
  for (const m of list) {
    const c = on.find((x) => x.main === m.id);
    if (c) {
      out.push({
        id: c.id, name: m.name, displayName: m.displayName, icon: m.icon, color: m.color || null, version: m.version, scope: m.scope,
        runMode: 'frame', composite: c, commands: [], permissions: [],
        canvas: { entry: null, width: c.width, height: c.height, mode: ['dock', 'float'] },
      });
    } else if (!hidden.has(m.id)) out.push(m);
  }
  return out;
}
