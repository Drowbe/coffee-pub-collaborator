// The journey bar's day grid (plan-design-system.md, step 30; the Journey bar family, public/design-system/proposed-journey.js):
// journeyLayout(phases, today, width, opts) says where everything on the status strip's journey bar goes, in px from the
// bar's left edge. Every day is an equal slice of the bar, so a band is as wide as its phase is long, the days no phase
// covers show as gaps, and today's pin stands at the middle of its slice (or in a zone at the end the trip has not
// reached, or has passed). Label modes by band width, ticks by trip length. Pure: no document, so tools/check-nav.mjs
// runs it in node; space.js draws the strip from it (window.JourneyLayout.journeyLayout).
//   phases: [{ n: name, i: icon or '', t: tint, s: 'YYYY-MM-DD' start, e: 'YYYY-MM-DD' end (inclusive) }], dated phases only
//   today: 'YYYY-MM-DD'; width: the bar's width in px; opts: { zone (28; 14 on a phone), offs (phases with no dates) }.
// The text between the markers is the Proposed page's own, word for word: tools/check-nav.mjs fails when the two differ.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JourneyLayout = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // journey-layout:start (the Proposed page's public/design-system/proposed-journey.js holds the same text)
  const DAY_MS = 86400000;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNo = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS); };
  const dateOf = (n) => new Date(n * DAY_MS);
  const dayText = (n) => `${MONTHS[dateOf(n).getUTCMonth()]} ${dateOf(n).getUTCDate()}`;
  const spanText = (a, b) => (a === b ? dayText(a) : dateOf(a).getUTCMonth() === dateOf(b).getUTCMonth() ? `${dayText(a)} to ${dateOf(b).getUTCDate()}` : `${dayText(a)} to ${dayText(b)}`);
  const textW = (str) => Math.round(str.length * 6.4 + 2); // 11px labels, an estimate; the check measures the real boxes
  function journeyLayout(phases, today, width, opts) {
    const o = Object.assign({ zone: 28, offs: 0, offW: 16 }, opts || {});
    const ps = (phases || []).filter((p) => p.s).map((p) => Object.assign({}, p, { a: dayNo(p.s), b: dayNo(p.e || p.s) })).sort((x, y) => x.a - y.a);
    const t = dayNo(today);
    if (!ps.length) return { total: 0, dayW: 0, zl: 0, zt: 0, bands: [], gaps: [], ticks: [], tickMode: 'day', labels: [], pin: { x: 0, where: 'none' }, offs: [], where: 'none' };
    const first = ps[0].a; const last = Math.max(...ps.map((p) => p.b)); const total = last - first + 1;
    const where = t < first ? 'lead' : t > last ? 'trail' : 'in';
    const zl = where === 'lead' ? o.zone : 0; const zt = where === 'trail' ? o.zone : 0;
    const dayW = Math.max(0, width - zl - zt - o.offs * o.offW) / total;
    const xOf = (n) => zl + (n - first) * dayW;
    const pinX = where === 'lead' ? o.zone / 2 : where === 'trail' ? zl + total * dayW + o.zone / 2 : xOf(t) + dayW / 2;
    const pin = { x: pinX, where, day: dateOf(t).getUTCDate(), offset: where === 'in' ? t - first : null };
    const bands = ps.map((p) => {
      const days = p.b - p.a + 1; const x = xOf(p.a) + 1; const w = Math.max(2, days * dayW - 2);
      const state = t > p.b ? 'past' : t >= p.a ? 'current' : 'ahead';
      const cur = state === 'current';
      const hit = (l, r) => where === 'in' && pinX >= x && pinX <= x + w && r + 2 > pinX - 1 && l - 2 < pinX + 1; // the label would touch the stem
      const nm = p.n || ''; const ic = Boolean(p.i);
      const fullW = (ic ? 17 : 0) + Math.round(nm.length * 6.6); const nowW = 32;
      let mode = 'none'; let align = 'start'; let now = false;
      const pinFirstHalf = where === 'in' && pinX < x + w / 2;
      const tries = [];
      if (w >= 96) for (const wantNow of (cur && w >= 140 ? [true, false] : [false])) if (fullW + (wantNow ? nowW : 0) + 18 <= w) tries.push({ m: 'full', now: wantNow, lw: fullW + (wantNow ? nowW : 0), pad: 9, order: cur && pinFirstHalf ? ['end', 'start'] : ['start', 'end'] });
      if (w >= 28 && ic) tries.push({ m: 'icon', now: false, lw: 11, pad: 6, order: w < 56 ? ['center', 'start', 'end'] : ['start', 'end', 'center'] });
      search: for (const c of tries) for (const al of c.order) {
        const l = al === 'start' ? x + c.pad : al === 'end' ? x + w - c.pad - c.lw : x + w / 2 - c.lw / 2;
        if (!hit(l, l + c.lw)) { mode = c.m; align = al; now = c.now; break search; }
      }
      return { n: nm, i: p.i || '', t: p.t || '', s: p.s, e: p.e || p.s, x, w, days, offset: p.a - first, state, label: { mode, align, now }, progress: cur ? Math.max(0, Math.min(w, pinX - x)) : null, span: spanText(p.a, p.b) };
    });
    const gaps = []; let cursor = first;
    for (const p of ps) { if (p.a > cursor) gaps.push({ x: xOf(cursor) + 1, w: Math.max(0, (p.a - cursor) * dayW - 2), days: p.a - cursor, offset: cursor - first }); cursor = Math.max(cursor, p.b + 1); }
    const tickMode = total <= 31 ? 'day' : total <= 120 ? 'week' : 'month';
    const at = [0]; // day offsets of the ticks
    if (tickMode === 'day') for (let k = 1; k <= total; k += 1) at.push(k);
    else { for (let k = 1; k < total; k += 1) { const d = dateOf(first + k); if (tickMode === 'week' ? d.getUTCDay() === 1 : d.getUTCDate() === 1) at.push(k); } at.push(total); }
    const ticks = at.map((k) => ({ x: zl + k * dayW, k }));
    // labels: the ends first, then every few ticks so none touches another
    const labels = []; const placed = [];
    const put = (x, text, align) => { const lw = textW(text); const l = align === 'c' ? x - lw / 2 : align === 's' ? x : x - lw; if (placed.some((q) => l < q[1] + 8 && l + lw > q[0] - 8)) return false; placed.push([l, l + lw]); labels.push({ x, text, align, w: lw }); return true; };
    if (tickMode === 'day') {
      const dayLab = (i, end) => { const n = first + i; const d = dateOf(n); return dayW >= 90 && end ? `${WEEKDAYS[d.getUTCDay()]} ${dayText(n)}` : dayW >= 44 && !end ? `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}` : end ? dayText(n) : String(d.getUTCDate()); };
      const ends = [[0, 's'], [total - 1, 'e']].map(([i, al]) => { const text = dayLab(i, true); return [i, text, textW(text) <= dayW ? 'c' : al]; });
      if (total === 1) ends.pop();
      for (const [i, text, al] of ends) put(al === 'c' ? zl + (i + 0.5) * dayW : al === 's' ? zl : zl + total * dayW, text, al);
      const k = Math.max(1, Math.ceil((textW(dayW >= 44 ? 'Wed 30' : '30') + 8) / dayW));
      for (let i = 0; i < total; i += 1) if (i % k === 0) put(zl + (i + 0.5) * dayW, dayLab(i, false), 'c');
    } else {
      put(zl, dayText(first), 's'); if (total > 1) put(zl + total * dayW, dayText(last), 'e');
      const inner = at.filter((k) => k > 0 && k < total);
      const m = Math.max(1, Math.ceil((textW('Oct 14') + 8) / Math.max(1, (inner.length > 1 ? (inner[1] - inner[0]) : 7) * dayW)));
      inner.forEach((k, j) => { if (j % m === 0) { const d = dateOf(first + k); put(zl + k * dayW, tickMode === 'week' ? dayText(first + k) : (d.getUTCMonth() === 0 ? `Jan ${d.getUTCFullYear()}` : MONTHS[d.getUTCMonth()]), 'c'); } });
    }
    const offs = []; for (let k = 0; k < o.offs; k += 1) offs.push({ x: width - (o.offs - k) * o.offW + 1, w: o.offW - 2 });
    return { first, last, total, dayW, zl, zt, bands, gaps, ticks, tickMode, labels, pin, offs, where };
  }
  // journey-layout:end
  return { journeyLayout, dayNo, dayText, spanText };
}));
