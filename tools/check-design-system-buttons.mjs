/*
 * check-design-system-buttons.mjs -- the Buttons family of the proposed design system page (public/design-system/proposed-buttons.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls browserChecks (listed in tools/check-design-system-families.json) at each width and mode.
 *
 * Fails on (in headless Chromium, on the page opened from the app and from its snapshot): a forced hover that does not change the Primary fill, a forced
 * pressed state that does not, a forced focus without a 2px ring, a disabled button not at half strength, more or fewer than one example frame, a frame not
 * in the page's mode, a Dark and Light switch that does not change the examples, a label not level with its buttons, a button not 38px (44px at 390; small
 * 30px; an icon-only button square).
 */
export const id = 'buttons';
// Classes of Today's mapping markup that the proposal draws as it is and does not style (the round buttons keep their own rules).
export const todayOnly = ['fbtn', 'fbtn-wrap', 'fbtn-caret', 'glyph', 'off', 'loading', 'dial', 'danger', 'icon-on', 'icon-off', 'icon-loading'];

export async function browserChecks(b) {
  const { ev, sc, where, problems } = b;
  const probe = JSON.parse(await ev(`(() => { const F = window.__ds.frames; const get = (t) => F.find((f) => f.iframe.title === t); const out = {};
        const m = get('Buttons, all states'); if (m) { const d = m.iframe.contentDocument; for (const t of d.querySelectorAll('.pm-row button')) for (const c of t.childNodes) if (c.nodeType === 3) c.textContent = c.textContent.replace(/g/g, 'o'); const rows = [...d.querySelectorAll('.pm-row')]; const cs = (x) => getComputedStyle(x);
          const b = [...rows[0].querySelectorAll('button')];
          out.rest = cs(b[0]).backgroundColor; out.hover = cs(b[1]).backgroundColor; out.focus = cs(b[2]).outlineWidth + ' ' + cs(b[2]).outlineStyle; out.pressed = cs(b[3]).backgroundColor; out.disabled = cs(b[4]).opacity; out.h = b[0].getBoundingClientRect().height; out.edge = cs(b[0]).borderTopColor;
          out.small = rows[6].querySelector('button').getBoundingClientRect().height;
          const ic = rows[12].querySelector('button').getBoundingClientRect(); out.iconW = ic.width; out.iconH = ic.height;
          const st = rows[0].querySelector('button[aria-busy]'); out.busy = !!st; out.frameMode = d.documentElement.dataset.themeMode; out.frameBg = cs(d.body).backgroundColor; out.pageMode = document.documentElement.dataset.themeMode; out.count = F.filter((f) => /^Buttons, all states/.test(f.iframe.title)).length; const nt = d.createElement('style'); nt.textContent = '*, *::before, *::after { transition: none !important; }'; d.head.appendChild(nt); /* a colour change is read at once: a headless page that draws no frames never finishes a transition */ window.__dsFlip = { d, m, nt, b0: b[0], cs, mode: out.pageMode }; window.__ds.setMode(out.pageMode === 'dark' ? 'light' : 'dark'); }
        out.align = []; out.targets = []; if (m) { const d = m.iframe.contentDocument; for (const row of d.querySelectorAll('.pm-row')) { const role = row.querySelector('.pm-role').getBoundingClientRect(); const bs = [...row.querySelectorAll('button')]; const f = bs[0].getBoundingClientRect(); const nm = row.querySelector('.pm-role').textContent;
            if (role.right <= f.left) { const dl = Math.abs((role.top + role.height / 2) - (f.top + f.height / 2)); if (dl > 1) out.align.push('label ' + nm + ' is ' + dl.toFixed(1) + 'px off its buttons'); }
            for (const b of [bs[0]]) { out.targets.push({ n: nm + ' ' + (b.textContent.trim() || b.getAttribute('aria-label')) + ' ' + Math.round(b.getBoundingClientRect().height) }); } } }
        return JSON.stringify(out); })()`));
  // The Dark and Light switch: the page was flipped in the probe above; wait here (not in the page, where a long wait on a busy page can lose its promise), then read and flip back.
  if (probe.pageMode) {
    await new Promise((r) => setTimeout(r, 500));
    const fl = JSON.parse(await ev(`(() => { const f = window.__dsFlip; const o = { same: f.d === f.m.iframe.contentDocument, connected: f.m.iframe.isConnected, flipBg: f.cs(f.d.body).backgroundColor, flipBtn: f.cs(f.b0).backgroundColor }; window.__ds.setMode(f.mode); f.nt.remove(); return JSON.stringify(o); })()`));
    if (!fl.same || !fl.connected) problems.push(`${where}: the Buttons example frame was reloaded or removed while the check ran (same document ${fl.same}, connected ${fl.connected})`);
    probe.flipBg = fl.flipBg; probe.flipBtn = fl.flipBtn;
  }
  for (const x of probe.align || []) problems.push(`${where}: ${x}`);
  if (!probe.rest || probe.rest === probe.hover) problems.push(`${where}: the forced hover of the proposed Primary does not change its fill (${probe.rest} / ${probe.hover})`);
  if (probe.pressed === probe.rest) problems.push(`${where}: the forced pressed state does not change the fill (${probe.pressed})`);
  if (!/^2px solid/.test(probe.focus || '')) problems.push(`${where}: the forced focus state shows no 2px ring (${probe.focus})`);
  if (probe.disabled !== '0.5') problems.push(`${where}: the proposed disabled state is not half strength (${probe.disabled})`);
  if (probe.count !== 1 || probe.frameMode !== probe.pageMode) problems.push(`${where}: the example frame must be one, in the page's mode (${probe.count} frames, ${probe.frameMode} / ${probe.pageMode})`);
  if (probe.flipBg === probe.frameBg || probe.flipBtn === probe.rest) problems.push(`${where}: the Dark and Light switch does not change the examples (frame ${probe.frameBg} to ${probe.flipBg}, button ${probe.rest} to ${probe.flipBtn})`);
  const want = sc.width < 500 ? 44 : 38;
  if (Math.abs(probe.h - want) > 0.6) problems.push(`${where}: the proposed default button is ${probe.h}px, expected ${want}`);
  if (Math.abs(probe.iconW - want) > 0.6 || Math.abs(probe.iconH - want) > 0.6) problems.push(`${where}: the proposed icon-only button is ${probe.iconW} by ${probe.iconH}px, expected ${want} square`);
  if (Math.abs(probe.small - 30) > 0.6) problems.push(`${where}: the proposed small button is ${probe.small}px, expected 30`);
}
