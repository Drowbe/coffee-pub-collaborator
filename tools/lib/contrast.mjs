// Colour maths for the contrast check: hex to RGB, mixing in sRGB the way CSS color-mix(in srgb) does, compositing a
// translucent colour over another, and the WCAG 2 contrast ratio. No theme or stylesheet is read or changed here.

export function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`not a six-digit colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

// color-mix(in srgb, a pct%, b): pct of a, the rest of b. Inputs and output are [r, g, b] (0 to 255).
export const mix = (a, pct, b) => a.map((v, i) => (v * pct + b[i] * (100 - pct)) / 100);

// A colour at `alpha` (0 to 1) laid over an opaque background.
export const over = (fg, alpha, bg) => mix(fg, alpha * 100, bg);

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG 2 contrast ratio, 1 to 21.
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
