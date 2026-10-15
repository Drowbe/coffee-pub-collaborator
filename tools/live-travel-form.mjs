// Live geometry check for the Planner's add form (not part of npm run check: it needs a running server and Playwright).
// Opens the form for each kind and measures every row of fields: each control must be the form's field height (38 px, 44 on a
// phone), each label box the same height, and the controls of one line must share a top. Usage:
//   node tools/live-travel-form.mjs <dir holding a file `space` with the space id> [widths, default 1280,880,700,390]
// Env: ROUNDTRIP=1 turns the round trip on first, SHOTS=<dir> saves screenshots, BASE (default http://localhost:3000), LOGIN/PASSWORD (default admin/testpass1234), W560=1 narrows the editor to 560 px, ONLY="Travel/Flight".
// The space needs the travel template, the Planner installed and enabled (see CLAUDE.md for the dev server).
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }
import fs from 'fs';
const S = process.argv[2]; const space = fs.readFileSync(S + '/space', 'utf8').trim();
const B = process.env.BASE || 'http://localhost:3000';
const browser = await chromium.launch();
const widths = (process.argv[3] || '1280,880,700,390').split(',').map(Number);
const kinds = (process.env.ONLY ? [[process.env.ONLY.split('/')[0], process.env.ONLY.split('/')[1]]] : [['Travel', 'Flight'], ['Travel', 'Train'], ['Add a stay'], ['Eat and drink', 'Restaurant'], ['See and do', 'Sight'], ['Add a note'], ['Travel', 'Taxi'], ['Travel', 'Rental car']]);
let bad = 0;
const measure = (t) => {
  const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const rows = [];
  const dlg = t.closest('dialog');
  for (const row of dlg.querySelectorAll('.timing, .lookup-row, .gettingthere, .pairing')) {
    if (!vis(row)) continue;
    const cells = [];
    for (const c of [...row.children].flatMap((x) => (x.classList.contains('times') ? [...x.children] : [x]))) {
      if (!vis(c)) continue;
      const lab = c.matches('.fl') ? c : c.querySelector(':scope > .fl, :scope > span:first-child');
      const sel = 'input:not([type=hidden]):not([type=checkbox]), select:not([hidden]), button.btn, button.mode';
      const ctrls = [...(c.matches(sel) ? [c] : []), ...c.querySelectorAll(sel)].filter(vis);
      cells.push({ id: c.id || c.className || c.tagName, w: Math.round(c.getBoundingClientRect().width), labelTop: lab && lab.matches('.fl') ? Math.round(lab.getBoundingClientRect().top * 10) / 10 : null, labelH: lab && lab.matches('.fl') ? lab.getBoundingClientRect().height : null, ctrls: ctrls.map((e) => ({ id: e.id || e.className, top: Math.round(e.getBoundingClientRect().top * 10) / 10, h: Math.round(e.getBoundingClientRect().height * 10) / 10, clipped: e.scrollWidth > e.clientWidth + 1 && e.tagName === 'SELECT' })) });
    }
    rows.push({ row: row.className + (row.id ? '#' + row.id : ''), cells, clientW: row.clientWidth, scrollW: row.scrollWidth, top: Math.round(row.getBoundingClientRect().top) });
  }
  return rows;
};
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
  await ctx.request.post(B + '/api/login', { data: { login: process.env.LOGIN || 'admin', password: process.env.PASSWORD || 'testpass1234' } });
  const page = await ctx.newPage(); page.setDefaultTimeout(6000);
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await page.goto(`${B}/modules/travel?space=${space}&popout=1`);
  await page.waitForTimeout(2500);
  for (const k of kinds) {
    await page.locator('[data-action=day-menu]').first().click();
    for (const label of k) await page.getByRole('menuitem', { name: label, exact: true }).first().click().catch(async () => { await page.getByText(label, { exact: true }).first().click(); });
    await page.waitForSelector('#f-title');
    if (process.env.W560) await (await page.locator('#f-title').elementHandle()).evaluate((t) => t.closest('dialog').classList.remove('sdk-editor-large'));
    await page.waitForTimeout(300);
    if (process.env.ROUNDTRIP) await page.locator('#f-roundtrip').check();
    const th = await page.locator('#f-title').elementHandle();
    const dlgW = await th.evaluate((t) => t.closest('dialog').getBoundingClientRect().width);
    const rows = await th.evaluate(measure);
    const name = k[k.length - 1];
    const problems = [];
    for (const r of rows) {
      // one line = same top; group cells by their row's top (wrapped lines are separate lines)
      const lines = new Map();
      for (const c of r.cells) for (const ct of c.ctrls) { const key = Math.round(ct.top / 4); }
      const byLine = new Map();
      for (const c of r.cells) {
        const firstTop = c.ctrls.length ? c.ctrls[0].top : null;
        const lt = c.labelTop;
        const key = lt !== null ? Math.round(lt) : null;
        const kk = key === null ? 'nolabel' : String(Math.round((lt) / 1));
        (byLine.get(c.labelTop === null ? 'x' + c.id : 'L') || byLine.set(c.labelTop === null ? 'x' + c.id : 'L', []).get(c.labelTop === null ? 'x' + c.id : 'L')).push(c);
      }
      // heights of every control in the row
      const hs = r.cells.flatMap((c) => c.ctrls.map((x) => x.h));
      const rowType = r.row.split(' ')[0];
      const heights = [...new Set(hs)];
      const expected = width <= 640 ? 44 : 38;
      for (const c of r.cells) for (const x of c.ctrls) { if (Math.abs(x.h - expected) > 1) problems.push(`${r.row}: ${x.id} h=${x.h} (want ${expected})`); if (x.clipped) problems.push(`${x.id} clipped`); }
      // label tops per wrapped line: cells whose labelTop is within the same line must be equal; lines differ by >= field height
      const tops = r.cells.filter((c) => c.labelTop !== null).map((c) => c.labelTop).sort((a, b) => a - b);
      const lineTops = []; for (const t of tops) if (!lineTops.some((l) => Math.abs(l - t) <= 1)) lineTops.push(t);
      for (const t of tops) { const near = lineTops.filter((l) => Math.abs(l - t) <= 12 && Math.abs(l - t) > 1); if (near.length) problems.push(`${r.row}: label tops drift ${t} vs ${near}`); }
      for (const lh of new Set(r.cells.map((c) => c.labelH).filter((v) => v !== null))) { if (Math.abs(lh - (26)) > 1) problems.push(`${r.row}: label box ${lh}`); }
      // controls in the same line (same label top): control tops equal
      for (const lt of lineTops) { const ct = r.cells.filter((c) => c.labelTop !== null && Math.abs(c.labelTop - lt) <= 1).flatMap((c) => c.ctrls.slice(0, 1).map((x) => x.top)); if (ct.length && Math.max(...ct) - Math.min(...ct) > 1.01 && r.row.startsWith('editor-row timing')) problems.push(`${r.row}: control tops differ ${[...new Set(ct)]}`); }
      if (r.scrollW > r.clientW + 1) problems.push(`${r.row}: overflows ${r.scrollW}>${r.clientW}`);
    }
    console.log(`${width}px dlg ${Math.round(dlgW)} ${name}: ${rows.length} rows, ${problems.length ? 'PROBLEMS ' + JSON.stringify(problems) : 'ok'}`);
    if (problems.length) bad++;
    if (name === 'Flight' || name === 'Sight' || name === 'Taxi') { if (process.env.DUMP) console.log(JSON.stringify(rows)); }
    if (process.env.SHOTS && (name === 'Flight' || (width === 1280 && ['Add a stay', 'Restaurant', 'Sight'].includes(name)))) await page.screenshot({ path: `${process.env.SHOTS}/${name}-${width}${process.env.W560 ? '-560' : ''}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  await ctx.close();
}
console.log(bad ? `${bad} kinds with problems` : 'all rows line up');
await browser.close();
process.exit(bad ? 1 : 0);
