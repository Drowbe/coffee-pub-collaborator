  // How a place is drawn as a pin, and which places the trip's map shows (plan-places-library.md, step 4). No page in it, so the
  // checks can run it.

  // The eight theme tints (--tint-<name>), in the order Places gives them to a category with the automatic colour.
  const TINTS = ['blue', 'green', 'teal', 'purple', 'orange', 'pink', 'gold', 'red'];
  // Places' eleven default categories in their order, and the ids older places and the Planner use for them.
  const CATEGORY_ORDER = ['food', 'stay', 'sights', 'nature', 'activities', 'nightlife', 'shopping', 'transport', 'services', 'health', 'other'];
  const OLD_CATEGORIES = { eat: 'food', do: 'activities', travel: 'transport' };
  // The visit status of a place: the words and icons Places' list rows use.
  const VISITS = {
    want: { label: 'Want to go', icon: 'bookmark' },
    booked: { label: 'Booked', icon: 'calendar-check' },
    visited: { label: 'Visited', icon: 'circle-check' },
    favorite: { label: 'Favorite', icon: 'star' },
  };

  // Category colours as Places tells them ({ <category id>: '#rrggbb' or a tint name }): ids up to 30 characters, as the summary's.
  const cleanColors = (v) => Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {}).filter(([k, c]) => /^[a-z0-9-]{1,30}$/.test(k) && (/^#[0-9a-f]{6}$/.test(String(c)) || TINTS.includes(c))).slice(0, 40));

  // The colour of a pin: { tint } or { hex }, or null for a summary with no category and no colour of its own (it keeps the
  // stylesheet's). The place's own colour first, then the category's as the owner set it, then the category's automatic tint.
  function pinColor(summary, catColors) {
    if (summary && TINTS.includes(summary.color)) return { tint: summary.color };
    const raw = summary && summary.category ? String(summary.category).toLowerCase() : '';
    if (!raw) return null;
    const id = OLD_CATEGORIES[raw] || raw;
    const chosen = (catColors || {})[raw] || (catColors || {})[id];
    if (TINTS.includes(chosen)) return { tint: chosen };
    if (/^#[0-9a-f]{6}$/.test(String(chosen))) return { hex: chosen };
    const at = CATEGORY_ORDER.indexOf(id);
    if (at >= 0) return { tint: TINTS[at % TINTS.length] };
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % TINTS.length;
    return { tint: TINTS[h] };
  }
  const cssColor = (c) => (c.tint ? `var(--tint-${c.tint})` : c.hex);

  // What a pin is made of: the place's own icon (else its module's), its colour, its visit badge.
  function pinLook(summary, catColors) {
    const visit = VISITS[summary && summary.visit] ? summary.visit : '';
    return {
      icon: (summary && summary.icon) || (summary && summary.module && summary.module.icon) || 'location-dot',
      color: pinColor(summary, catColors),
      visit,
      visitLabel: visit ? VISITS[visit].label : '',
      visitIcon: visit ? VISITS[visit].icon : '',
    };
  }

  // Whether a summary is marked for a space (the Everyone place the trip's map and list include).
  const markedFor = (summary, spaceId) => Boolean(spaceId) && Array.isArray(summary && summary.spaces) && summary.spaces.map(String).includes(String(spaceId));

  // Which places a map shows, and how. `filter` is the page's { mine, environment, spaces: Set | null } or null (everything).
  // Returns 'full', 'soft' (the rest of the environment's places, drawn softer so they can be found and added) or '' (not shown).
  // In a space (`spaceId`): the space's own places and the environment's places marked for it are "this space"; the rest of the
  // environment's are soft, and only while the filter's "All of Everyone's places" is on (no filter shows them).
  function showHow(summary, filter, spaceId) {
    const scope = summary.ref.scope;
    if (scope === 'person') return !filter || filter.mine ? 'full' : '';
    if (scope === 'environment') {
      if (spaceId) {
        if (markedFor(summary, spaceId)) return !filter || !filter.spaces || filter.spaces.has(String(spaceId)) ? 'full' : '';
        return !filter || filter.environment ? 'soft' : '';
      }
      return !filter || filter.environment ? 'full' : '';
    }
    return !filter || !filter.spaces || filter.spaces.has(String(summary.ref.space)) ? 'full' : '';
  }
