// Links people saved before plan-names step 5a, answered with a permanent redirect to the same place under its new
// name (documentation/plans/plan-names.md, "The server": decision 17, the redirects stay for good). Nothing else in
// the server reads these old names; the routes below are registered before the real ones, so an old link never
// reaches them, and a request that carries no old name falls through untouched.
//
//   /rooms/<id>                            -> /?setup=<id>            a space's settings, now the Set up panel (302)
//   /img/room/<id>                         -> /img/space/<id>         a space's picture (Coffee Pub Studio asks this)
//   /img/<key>/<slot>?room=<id>&roomOnly=1 -> ?space=<id>&spaceOnly=1 a person's picture in a space (OBS sources)
//   /modules/<id>?moduleRoom=<id>          -> ?space=<id>             a module popped out of a space
//   /room.html                             -> /space.html             the page's old file name (step 5b)
//
// The pages the Set up panel replaced (plan-setup-panel, step 7) answer 302, not 301, and the browser keeps the
// original fragment (#members, #modules...), which names the panel's tab:
//
//   /spaces/<id>, /rooms/<id>              -> /?setup=<id>
//   /module-settings?space=<id> (or ?room=) -> /?setup=<id>#modules
//   /space-settings.html, /roomconfig.html, /module-settings.html, /module-settings with no id -> /
//
// Every other part of the query is kept, in its order.
'use strict';

// The request's query with the old keys renamed (an old key whose new one is already there is dropped), as
// "?..." or "".
function renamedQuery(req, renames) {
  const at = req.originalUrl.indexOf('?');
  const given = new URLSearchParams(at === -1 ? '' : req.originalUrl.slice(at + 1));
  const out = new URLSearchParams();
  for (const [key, value] of given) {
    const to = renames[key];
    if (to && given.has(to)) continue;
    out.append(to || key, value);
  }
  const text = out.toString();
  return text ? `?${text}` : '';
}

const OLD_SPACE_KEY = 'room'; // ?room=<id>, the old name of ?space=<id>
const hasAny = (req, keys) => keys.some((k) => Object.prototype.hasOwnProperty.call(req.query, k));

function mountOldLinks(app) {
  const setupAddress = (id) => `/?setup=${encodeURIComponent(id)}`;
  app.get('/rooms/:id', (req, res) => res.redirect(302, setupAddress(req.params.id)));
  app.get('/spaces/:id', (req, res) => res.redirect(302, setupAddress(req.params.id)));
  app.get('/img/room/:id', (req, res) => {
    res.redirect(301, `/img/space/${encodeURIComponent(req.params.id)}${renamedQuery(req, {})}`);
  });
  const IMAGE_QUERY = { room: 'space', roomOnly: 'spaceOnly' };
  app.get('/img/:key/:slot', (req, res, next) => {
    if (!hasAny(req, Object.keys(IMAGE_QUERY))) return next();
    res.redirect(301, `/img/${encodeURIComponent(req.params.key)}/${encodeURIComponent(req.params.slot)}${renamedQuery(req, IMAGE_QUERY)}`);
  });
  app.get('/module-settings', (req, res) => {
    const id = [req.query.space, req.query[OLD_SPACE_KEY]].find((v) => typeof v === 'string' && v);
    res.redirect(302, id ? `${setupAddress(id)}#modules` : '/');
  });
  for (const from of ['/space-settings.html', '/roomconfig.html', '/module-settings.html']) app.get(from, (_req, res) => res.redirect(302, '/'));
  app.get('/room.html', (req, res) => res.redirect(301, `/space.html${renamedQuery(req, {})}`));
  const POPOUT_QUERY = { moduleRoom: 'space' };
  app.get('/modules/:id', (req, res, next) => {
    if (!hasAny(req, Object.keys(POPOUT_QUERY))) return next();
    res.redirect(301, `/modules/${encodeURIComponent(req.params.id)}${renamedQuery(req, POPOUT_QUERY)}`);
  });
}

module.exports = { mountOldLinks, renamedQuery };
