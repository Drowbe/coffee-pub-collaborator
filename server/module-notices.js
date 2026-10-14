'use strict';
// Tells the people who can turn modules on (the host admin and the environment's owners) about the bundled modules:
// one notice for a module that ships with this server and is not installed, one for a module that has a newer bundled
// version waiting. The notice is the host's own (source HOST_SOURCE), not a module's, and opens Manage > Modules.
//
// The rule, kept per environment in DATA_DIR/modules/announced.json as { announced: { <id>: <version> }, at }:
//   - Once per module per version. A module never seen before is announced as new once, however many versions follow
//     while it stays uninstalled; an installed module is announced when a bundled version newer than the last one
//     announced for it is waiting (a module that updates itself at start, because it asks nothing new, is up to date and
//     says nothing).
//   - The record is written before the notices are made, so a crash loses a notice rather than repeating one.
//   - The first run in a brand new environment records every bundled module and announces nothing: its owner is
//     looking at the whole list already. The first run in an environment that existed before this shipped announces the
//     bundled modules it has not installed and the updates waiting, since it has no record of what it was told.
// This file is the rule only; server/index.js reads the registry and sends the notices.

// What to announce and what to record. `bundled`: the manifests that ship here ({ id, name, version, description }).
// `installed`: { [id]: version running } for the installed ones. `record`: the stored record or null (first run).
// `fresh`: the environment was made just now. `waiting(id)`: a newer bundled version is waiting to be installed.
// `allowed(id)`: the environment's plan includes the module. `compare(a, b)`: version order.
function plan({ bundled, installed, record, fresh, waiting, allowed, compare }) {
  const announced = { ...(record?.announced || {}) };
  const notices = [];
  const first = !record;
  for (const m of bundled) {
    if (first && fresh) {
      announced[m.id] = m.version;
      continue;
    }
    if (!allowed(m.id)) continue;
    const have = installed[m.id] || null;
    const last = announced[m.id];
    if (!have) {
      if (last !== undefined) continue; // already announced as available, whatever its version since
      notices.push({ kind: 'new', id: m.id, name: m.name, version: m.version, description: m.description });
      announced[m.id] = m.version;
    } else if (waiting(m.id) && (last === undefined || compare(m.version, last) > 0)) {
      notices.push({ kind: 'update', id: m.id, name: m.name, version: m.version, from: have });
      announced[m.id] = m.version;
    }
  }
  return { notices, record: { announced, at: record?.at || Date.now() } };
}

// The words of one notice. `name` is the module as this environment shows it.
function noticeText(n, name) {
  if (n.kind === 'update') return { title: `${name} has an update (${n.version})`, body: `From ${n.from} to ${n.version}` };
  return { title: `${name} is available`, body: n.description || '' };
}

module.exports = { plan, noticeText };
