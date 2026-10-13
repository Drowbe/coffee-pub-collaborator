// A module's tint (GitHub #229): the colour its titlebar, its icon in the Layout menu and a command's messages carry.
// The manifest's `color` when it names one of the eight tints (design-theme.md, "Tints"), else a stable pick from the
// module's id, so every module is told apart at a glance and always gets the same one. Gold is never picked for it:
// gold marks the AI. Pure: no document; tools/check-canvas.mjs runs it in node.

export const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
const PICKS = TINTS.filter((t) => t !== 'gold');

export function moduleTint(id, color = null) {
  if (TINTS.includes(color)) return color;
  const s = String(id || '');
  if (!s) return null;
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) % 1000003;
  return PICKS[h % PICKS.length];
}
