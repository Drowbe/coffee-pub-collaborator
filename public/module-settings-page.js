// The page a space's moderators use to change the settings modules declare for that space: /module-settings?space=<id>.
import { loadBranding, api, renderTopbar, renderPageBar, wireOverlayBack, word } from '/brand.js';
import { renderModuleSettings } from '/module-settings.js';

const $ = (id) => document.getElementById(id);
const spaceId = new URLSearchParams(location.search).get('space') || '';

renderTopbar({ location: '' });
await loadBranding();
wireOverlayBack();
try {
  const me = (await api('GET', '/api/me')).user;
  $('whoami').textContent = me.displayName;
  const { spaces } = await api('GET', '/api/presence');
  const r = spaces.find((x) => x.id === spaceId);
  if (r) $('title').textContent = `${r.name}: ${word('module')} settings`;
  renderPageBar({ name: $('title').textContent, icon: 'sliders' }); // its heading, in the page bar (plan-two-zone-nav.md)
} catch {
  location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
}
await renderModuleSettings($('settings'), { scope: 'space', space: spaceId });
$('none').hidden = !$('settings').hidden;
