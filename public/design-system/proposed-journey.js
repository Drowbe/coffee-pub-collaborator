/* The Journey bar family (proposed): the status strip (the phase chip, the journey bar, the countdown, the facts and the attention pill), the Set up phase band and
   the Planner's phase caps and rail. Loaded by proposed.html through proposed-families.json; it registers one family through window.DS_PROPOSED.families.push and
   draws it with the rules in proposed-journey.css. Nothing here is a style of the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const JR_CSS = `
.pm-jr-cap { display: block; margin: 12px 0 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-jr-cap:first-child { margin-top: 0; }
.pm-jr-head { box-sizing: border-box; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--header-bg); color: var(--header-text); }
.pm-jr-row { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.pm-jr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px 16px; align-items: start; }
.pm-jr-panel { box-sizing: border-box; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); }
.pm-jr-note { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-jr-plan { width: 460px; max-width: 100%; }
.pm-jr-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-jr-ct th, .pm-jr-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-jr-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-jr-pass { color: var(--ok); font-weight: 600; }
.pm-jr-fail { color: var(--danger); font-weight: 600; }
.pm-jr-list { display: flex; flex-direction: column; gap: 8px; }
.pm-jr-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s) => `<span class="pm-jr-cap">${s}</span>`;
  const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];

  // ---- the day grid: the one piece of maths (pure; the product build reuses it) ----
  // journeyLayout(phases, today, width, opts) -> where everything goes on the journey bar, in px from the bar's left edge.
  //   phases: [{ n: name, i: icon or '', s: 'YYYY-MM-DD' start, e: 'YYYY-MM-DD' end (inclusive) }] (dated phases only); today: 'YYYY-MM-DD'; width: the bar's width in px.
  //   opts: zone (px of the lead / trail zone, 28; 14 on a phone), offs (phases with no dates, each a 16px stub at the right end).
  // Each DAY is an equal slice (dayW). A band is days x dayW wide minus a 2px gap (1px each side); a gap between phases is an empty slice; today's pin stands at the centre of
  // its slice (or in the lead / trail zone when today is outside the trip). Label modes by band width: >= 96 icon + name (the "Now" word from 140), >= 28 icon only, else the fill alone;
  // a label stays inside its own band and never under the pin's stem. Ticks: every day up to 31 days, every Monday up to 120 days, every month start beyond.
  // journey-layout:start (public/journey-layout.js holds the same text, for the product; tools/check-nav.mjs holds the two equal)
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
  window.DS_PROPOSED.journeyLayout = journeyLayout;

  // The six Travel phases (the template's own order, tints and icons), with dates (2026): today is Oct 14.
  const P = (n, i, t, s, e, main) => { const a = dayNo(s); const b = dayNo(e); const td = dayNo('2026-10-14'); return { n, i, t, s, e, main, d: b - a + 1, st: td > b ? 'past' : td >= a ? 'current' : 'ahead' }; };
  const PHASES = [
    P('Planning', 'clipboard-list', 'blue', '2026-09-01', '2026-09-30'),
    P('Booking', 'ticket', 'purple', '2026-10-01', '2026-10-21'),
    P('Pre-trip', 'suitcase-rolling', 'teal', '2026-10-22', '2026-11-04'),
    P('Trip', 'plane', 'green', '2026-11-05', '2026-11-13', true),
    P('Post-trip', 'images', 'orange', '2026-11-14', '2026-11-20'),
  ];
  const TODAY = '2026-10-14';
  // A journey bar. o: phases, today, offs (phases with no dates), lit (index of a lit band), plain (the bands alone: no pin, no grid), label.
  const journey = (o = {}) => {
    const spec = { phases: o.phases || PHASES, today: o.today || TODAY, offs: o.offs || 0, lit: o.lit == null ? -1 : o.lit, plain: Boolean(o.plain) };
    return `<div class="sdk-journey" role="group" aria-label="${h(o.label || 'Journey: ' + spec.phases.map((p) => p.n).join(', '))}" data-grid="${h(JSON.stringify(spec))}"${spec.plain ? ' data-plain="1"' : ''}></div>`;
  };
  // Mount the journey bars of a page: lay each out at its width, and again whenever the width changes. Hover, focus or a tap on a band shows the Tooltips look with its name and dates.
  const mountJourneys = (doc) => {
    const win = doc.defaultView; let tip = null; let tipFor = null; let tipTimer = 0;
    const hideTip = () => { if (tip) tip.removeAttribute('data-show'); if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null; };
    const showTip = (band) => {
      if (!tip) { tip = doc.createElement('div'); tip.className = 'sdk-tooltip'; tip.id = 'jr-tip'; tip.setAttribute('role', 'tooltip'); tip.setAttribute('data-arrow', ''); (doc.querySelector('.ds-proposed') || doc.body).appendChild(tip); }
      hideTip(); tip.textContent = band.dataset.tip; tipFor = band; band.setAttribute('aria-describedby', 'jr-tip');
      const r = band.getBoundingClientRect(); const tw = tip.offsetWidth; const th = tip.offsetHeight; const cx = r.left + r.width / 2;
      const left = Math.max(4, Math.min(win.innerWidth - tw - 4, cx - tw / 2)); const above = r.top - th - 8 >= 4;
      tip.style.left = `${left}px`; tip.style.top = `${above ? r.top - th - 6 : r.bottom + 6}px`; tip.style.setProperty('--arrow-x', `${Math.max(10, Math.min(tw - 10, cx - left))}px`); tip.setAttribute('data-placement', above ? 'top' : 'bottom'); tip.setAttribute('data-show', '');
      win.clearTimeout(tipTimer); if (band.closest('[data-tapped]')) tipTimer = win.setTimeout(hideTip, 3000);
    };
    for (const el of doc.querySelectorAll('.sdk-journey[data-grid], .status-track[data-grid]')) {
      const spec = JSON.parse(el.dataset.grid); const alias = el.classList.contains('status-track');
      const C = alias ? { band: 'status-band', box: 'status-band-box', name: 'status-band-name', icon: 'status-band-icon', today: 'status-today' } : { band: 'sdk-band', box: 'sdk-band-box', name: 'sdk-band-name', icon: 'sdk-band-icon', today: 'sdk-today' };
      const draw = () => {
        const width = el.getBoundingClientRect().width; if (!width) return;
        const phone = win.innerWidth <= 640 && Boolean(el.closest('.sdk-strip, .status-strip')); // the slim line is the strip's; a bar on its own keeps the grid
        const L = journeyLayout(spec.phases.filter((p) => p.s), spec.today, width, { zone: phone ? 14 : 28, offs: spec.offs });
        el.dataset.mode = L.tickMode; el.dataset.where = L.where; el.style.setProperty('--day-w', `${L.dayW}px`); el.style.setProperty('--zone', `${L.zl}px`);
        const px = (v) => `${Math.round(v * 100) / 100}px`; const out = [];
        L.bands.forEach((b, k) => {
          const lb = b.label; const tip = `${b.n}, ${b.span}${b.state === 'current' ? ', now' : ''}`;
          const inner = lb.mode === 'none' ? '' : `<span class="${C.box}" data-align="${lb.align}">${b.i ? `<i class="${C.icon} fa-solid fa-${b.i}" aria-hidden="true"></i>` : ''}${lb.mode === 'full' ? `<span class="${C.name}">${h(b.n)}</span>` : ''}${lb.now ? '<span class="sdk-band-now">Now</span>' : ''}</span>`;
          out.push(`<span class="${C.band}${spec.lit === k ? ' lit' : ''}" data-state="${b.state}" data-tint="${b.t}" data-label="${lb.mode}" data-tip="${h(tip)}" aria-label="${h(tip)}" tabindex="0" style="--days:${b.days};--x:${px(b.x)};--w:${px(b.w)}">${inner}${b.progress != null && !spec.plain ? `<span class="sdk-band-progress" style="--p:${px(b.progress)}"></span>` : ''}</span>`);
        });
        if (!spec.plain) for (const g of L.gaps) if (g.w >= 2) out.push(`<span class="sdk-gap" aria-hidden="true" style="--days:${g.days};--x:${px(g.x)};--w:${px(g.w)}"></span>`);
        for (const f of L.offs) out.push(`<span class="${C.band}" data-state="off" data-tint="pink" aria-label="No dates" style="--x:${px(f.x)};--w:${px(f.w)}"></span>`);
        if (!spec.plain) {
          for (const tk of L.ticks) out.push(`<i class="sdk-tick" aria-hidden="true" style="--x:${px(tk.x)}"></i>`);
          for (const lab of L.labels) out.push(`<span class="sdk-tick-label" data-align="${lab.align}" aria-hidden="true" style="--x:${px(lab.x)}">${h(lab.text)}</span>`);
          const d = dateOf(dayNo(spec.today));
          out.push(`<span class="${C.today}" role="img" aria-label="Today, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}" data-where="${L.pin.where}" style="--pin-x:${px(L.pin.x)};--day-offset:${L.pin.offset == null ? 0 : L.pin.offset}">${L.pin.day}<span class="sdk-today-stem" aria-hidden="true"></span></span>`);
        }
        el.innerHTML = out.join('');
      };
      draw(); if (win.ResizeObserver) new win.ResizeObserver(draw).observe(el);
      el.addEventListener('pointerover', (e) => { const b = e.target.closest && e.target.closest('[data-tip]'); if (b && e.pointerType !== 'touch') showTip(b); });
      el.addEventListener('pointerout', (e) => { if (e.target.closest && e.target.closest('[data-tip]') && e.pointerType !== 'touch') hideTip(); });
      el.addEventListener('focusin', (e) => { const b = e.target.closest && e.target.closest('[data-tip]'); if (b) showTip(b); });
      el.addEventListener('focusout', hideTip);
      el.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-tip]'); if (b) { el.dataset.tapped = '1'; showTip(b); } });
    }
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
    win.__jrTip = { show: (sel) => showTip(doc.querySelector(sel)), hide: hideTip };
  };
  const BUFFER = { n: 'Buffer', i: '', t: 'pink', s: '', e: '' }; // a phase with no dates

  const phaseChip = (o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-phase${o.state ? ' ds-force-' + o.state : ''}" data-tint="${o.t || 'purple'}" aria-expanded="${o.open ? 'true' : 'false'}"${o.dis ? ' disabled' : ''}><span class="sdk-strip-dot" aria-hidden="true"></span><span class="sdk-strip-sentence">${o.text || 'Booking · day 14 of 21 · Trip in 22 days'}</span></button>`;
  const count = (n, words, o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-count${o.state ? ' ds-force-' + o.state : ''}"><span class="sdk-strip-count-n">${n}</span><span class="sdk-strip-count-words">${words}</span></button>`;
  const fact = (icon, text, p, o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-fact${o.state ? ' ds-force-' + o.state : ''}"${p != null ? ` style="--p:${p}%"` : ''}>${p != null ? '<span class="sdk-strip-fact-fill" aria-hidden="true"></span>' : ''}${fa(icon)}<span class="sdk-strip-fact-text">${text}</span></button>`;
  const attn = (n, words, o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-attn${o.state ? ' ds-force-' + o.state : ''}" data-tone="warn" aria-expanded="${o.open ? 'true' : 'false'}"><span class="sdk-badge">${n}</span><span>${words || 'need action'}</span></button>`;
  const FACTS = `<div class="sdk-strip-facts">${fact('wallet', '62% of budget', 62)}${fact('plane', '2 flights booked')}${fact('bed', 'Hotel: 3 nights')}</div>`;
  const strip = (o = {}) => `<div class="sdk-strip" role="region" aria-label="Where we are in the journey">${o.chip === false ? '' : `<div class="sdk-strip-said">${phaseChip({ text: o.text, t: o.tint })}</div>`}${journey(o)}${o.nocount ? '' : count(o.n == null ? 22 : o.n, o.words || 'days to Trip')}${o.facts === false ? '' : FACTS}${o.noattn ? '' : attn(3)}</div>`;

  // ---- frame bodies ----
  const stripAt = (w) => wrap(`<div style="display:flex;flex-direction:column;gap:12px">${strip({})}<p class="pm-jr-note" style="margin:0">${w >= 760 ? 'The bar is 81 days, each day a slice of the width; the names, up to three facts (they give way one by one from the end as the line fills), the countdown, the attention pill.' : w > 640 ? 'Below 760 the facts are gone; the bar keeps its proportions and each band shows what fits (the name, the icon, or the fill alone), the pin, the countdown and the pill stay.' : 'A slim 28px line: the phase sentence and the pill, with the journey as a 2px line along the foot (the same proportions) and a 7px dot at today. Tap a band for its name and dates. No names, no grid, no countdown, no facts.'}</p></div>`);

  // Examples that stress the scale (each with its own dates); the same list at 1280, 700 and 390.
  const EXAMPLES = [
    { id: 'weekend', cap: 'A 3-day weekend: three slices, each wide, with day names', today: '2026-11-07', text: 'Stay · day 2 of 3 · Back tomorrow', n: 1, words: 'day to Back', phases: [P('Go', 'plane', 'blue', '2026-11-06', '2026-11-06'), P('Stay', 'bed', 'green', '2026-11-07', '2026-11-07'), P('Back', 'house', 'orange', '2026-11-08', '2026-11-08')] },
    { id: 'week', cap: 'A 7-day trip: a tick for each day', today: '2026-11-05', text: 'Trip · day 2 of 4 · Home in 3 days', n: 3, words: 'days to Home', phases: [P('Prep', 'suitcase-rolling', 'teal', '2026-11-02', '2026-11-03'), P('Trip', 'plane', 'green', '2026-11-04', '2026-11-07'), P('Home', 'house', 'orange', '2026-11-08', '2026-11-08')] },
    { id: 'three', cap: 'A 21-day trip with phases of 1, 3, 10 and 7 days: the 1-day phase is a narrow band with its icon only', today: '2026-10-08', text: 'Trip · day 4 of 10 · Post-trip in 7 days', n: 7, words: 'days to Post-trip', phases: [P('Book', 'ticket', 'purple', '2026-10-01', '2026-10-01'), P('Pack', 'suitcase-rolling', 'teal', '2026-10-02', '2026-10-04'), P('Trip', 'plane', 'green', '2026-10-05', '2026-10-14'), P('Post-trip', 'images', 'orange', '2026-10-15', '2026-10-21')] },
    { id: 'ninety', cap: 'A 90-day trip: a tick for each Monday, the narrow bands show their icon only', today: '2026-10-14', text: 'Booking · day 14 of 20 · Pre-trip in 7 days', n: 7, words: 'days to Pre-trip', phases: [P('Planning', 'clipboard-list', 'blue', '2026-09-01', '2026-09-30'), P('Booking', 'ticket', 'purple', '2026-10-01', '2026-10-20'), P('Pre-trip', 'suitcase-rolling', 'teal', '2026-10-21', '2026-10-30'), P('Trip', 'plane', 'green', '2026-10-31', '2026-11-20'), P('Post-trip', 'images', 'orange', '2026-11-21', '2026-11-29')] },
    { id: 'months', cap: 'A 212-day trip: a tick for each month', today: '2026-11-20', text: 'Booking · day 20 of 61 · Trip in 42 days', n: 42, words: 'days to Trip', phases: [P('Planning', 'clipboard-list', 'blue', '2026-08-01', '2026-10-31'), P('Booking', 'ticket', 'purple', '2026-11-01', '2026-12-31'), P('Trip', 'plane', 'green', '2027-01-01', '2027-02-28')] },
    { id: 'gap', cap: 'A gap between two phases: the days no phase covers are an empty dashed slice (today is in it)', today: '2026-10-12', text: 'Between phases · Trip in 3 days', n: 3, words: 'days to Trip', phases: [P('Booking', 'ticket', 'purple', '2026-10-01', '2026-10-10'), P('Trip', 'plane', 'green', '2026-10-15', '2026-10-25')] },
    { id: 'lead', cap: 'Today before the first phase (lead): the pin in a zone at the left end', today: '2026-10-28', text: 'Pre-trip starts in 4 days', n: 4, words: 'days to Pre-trip', phases: [P('Pre-trip', 'suitcase-rolling', 'teal', '2026-11-01', '2026-11-04'), P('Trip', 'plane', 'green', '2026-11-05', '2026-11-11'), P('Post-trip', 'images', 'orange', '2026-11-12', '2026-11-18')] },
    { id: 'trail', cap: 'Today after the last phase (trail): the pin in a zone at the right end', today: '2026-11-22', text: 'All phases done', nocount: true, phases: [P('Pre-trip', 'suitcase-rolling', 'teal', '2026-11-01', '2026-11-04'), P('Trip', 'plane', 'green', '2026-11-05', '2026-11-11'), P('Post-trip', 'images', 'orange', '2026-11-12', '2026-11-18')] },
    { id: 'oneday', cap: 'Today inside a 1-day phase: the pin on its slice, the band keeps what fits', today: '2026-11-07', text: 'Travel day · Trip tomorrow', n: 1, words: 'day to Trip', phases: [P('Prep', 'suitcase-rolling', 'teal', '2026-11-01', '2026-11-06'), P('Travel', 'plane', 'blue', '2026-11-07', '2026-11-07'), P('Trip', 'location-dot', 'green', '2026-11-08', '2026-11-14')] },
  ];
  const scaleBody = (w) => wrap(`<div class="pm-jr-list">${EXAMPLES.map((x) => `${CAP(x.cap)}<div>${strip({ phases: x.phases, today: x.today, text: x.text, n: x.n, words: x.words, nocount: x.nocount, facts: false })}</div>`).join('')}
    <p class="pm-jr-note">${w > 640 ? 'Every day is an equal slice of the bar; a band is its days wide (less the 2px gap). Ticks are 4px hairlines under the bar. The pin and its 2px stem stand above the bar at the middle of today\'s slice.' : 'The slim line keeps the same proportions: no ticks or dates, a 7px dot at today. Tap a band: its name and dates show in a tooltip.'}</p></div>`);
  const tipBody = () => wrap(`<div class="pm-jr-list" style="padding-top:44px">${CAP('A tap on a band (here the Trip) shows its name and dates')}${strip({ phases: EXAMPLES[2].phases, today: EXAMPLES[2].today, text: EXAMPLES[2].text, n: 7, words: 'days to Post-trip', facts: false })}</div>`);

  const statesBody = () => wrap(`<div class="pm-jr-list">
    ${CAP('Past 12%, current = the neutral selected fill with "Now" and a 2px progress line, ahead 22%, off (a phase with no dates) = a dashed neutral hairline at the end')}<div class="pm-jr-head">${journey({ offs: 1, phases: PHASES.concat([BUFFER]) })}</div>
    ${CAP('Today before the first phase (lead): the pin stands in a 28px zone at the left end')}<div class="pm-jr-head">${journey({ today: '2026-08-25', phases: PHASES })}</div>
    ${CAP('Today after the last phase (trail): the pin stands in a 28px zone at the right end')}<div class="pm-jr-head">${journey({ today: '2026-11-27', phases: PHASES })}</div>
    ${CAP('A band under the pointer or lit by its row in Set up: a stronger fill')}<div class="pm-jr-head">${journey({ lit: 2 })}</div>
    ${CAP('The eight tints, past (12%), current, ahead (22%) and ahead')}<div class="pm-jr-head" style="display:flex;flex-direction:column;gap:6px">${TINTS.map((t) => journey({ plain: true, today: '2026-10-14', label: t, phases: [P(t[0].toUpperCase() + t.slice(1), 'location-dot', t, '2026-10-01', '2026-10-10'), P('Current', 'location-dot', t, '2026-10-11', '2026-10-20'), P('Next', 'location-dot', t, '2026-10-21', '2026-10-30'), P('Later', 'location-dot', t, '2026-10-31', '2026-11-09')] })).join('')}</div>
  </div>`);

  const chipsBody = () => wrap(`<div class="pm-jr-list">
    ${CAP('The phase chip: the phase dot and the sentence. Rest, hover, open, focus, pressed, disabled')}<div class="pm-jr-head"><div class="pm-jr-row">${phaseChip()}${phaseChip({ state: 'hover' })}${phaseChip({ open: true })}${phaseChip({ state: 'focus' })}${phaseChip({ state: 'active' })}${phaseChip({ dis: true })}</div></div>
    ${CAP('The countdown: a 22% accent fill; the number 16px weight 600')}<div class="pm-jr-head"><div class="pm-jr-row">${count(12, 'days to Trip')}${count(1, 'day to Trip')}<button type="button" class="sdk-strip-chip sdk-strip-count"><span class="sdk-strip-count-words">Trip starts today</span></button>${count(12, 'days to Trip', { state: 'hover' })}${count(12, 'days to Trip', { state: 'focus' })}</div></div>
    ${CAP('Facts: an icon and words; one with progress fills from the left')}<div class="pm-jr-head"><div class="pm-jr-row">${fact('wallet', '0% of budget', 0)}${fact('wallet', '62% of budget', 62)}${fact('wallet', 'Budget used', 100)}${fact('plane', '2 flights booked')}${fact('bed', 'Hotel: 3 nights', null, { state: 'hover' })}${fact('bed', 'Hotel: 3 nights', null, { state: 'focus' })}</div></div>
    ${CAP('The attention pill: a tone fill, the count a count badge (99+ at most)')}<div class="pm-jr-head"><div class="pm-jr-row">${attn(1, 'needs action')}${attn(3)}${attn(12)}${attn('99+')}${attn(3, 'need action', { open: true })}${attn(3, 'need action', { state: 'hover' })}${attn(3, 'need action', { state: 'focus' })}</div></div>
    <p class="pm-jr-note">Every chip in the header is 30px high (the Chips choice-chip size; the phone's slim line keeps 22px chips). They are Chips looks: a neutral fill (the header text at 8%), the countdown\'s accent fill, the pill\'s tone fill; the small corner; no edge. Pressed or open is the neutral selected fill with the accent-mix words; focus is a 2px outline inside the chip.</p>
  </div>`);

  const phaseBand = (p, o = {}) => `<li class="sdk-phase-band${o.lit ? ' lit' : ''}" data-state="${p.st}" data-tint="${p.t}"${p.main ? ' data-main="1"' : ''} style="flex:${p.d}" tabindex="0"><span class="sdk-phase-band-label">${p.n}</span><span class="sdk-phase-band-span">${p.span || ''}</span>${p.st === 'current' ? '<span class="sdk-phase-band-now">Now</span>' : ''}</li>`;
  const SPANS = ['Sep 1 to 30', 'Oct 1 to 21', 'Oct 22 to Nov 4', 'Nov 5 to 13', 'Nov 14 to 20'];
  const setupBody = () => wrap(`<div class="pm-jr-panel">
    ${CAP('The Set up phase band, 58px: the same fills, a text "Now", a dashed today line')}
    <div class="sdk-phase-strip"><ol class="sdk-phase-bands" style="margin:0;padding:0">${PHASES.map((p, i) => phaseBand(Object.assign({ span: SPANS[i] }, p), { lit: i === 2 })).join('')}<li class="sdk-phase-band" data-state="off" data-tint="pink" aria-label="Buffer, no dates" tabindex="0"></li><li class="sdk-phase-today" role="presentation" aria-hidden="true" style="--at:32%"><span class="sdk-phase-today-word">Today</span></li></ol></div>
    ${CAP('A row of Set up, with the phase tag (a Chips tag) and "Now" (a Chips status label)')}
    <div class="pm-jr-list">${PHASES.map((p, i) => `<div class="sdk-row"><span class="sdk-card-icon" data-tint="${p.t}">${fa(p.i)}</span><span class="sdk-row-main"><span class="sdk-row-title pm-jr-name">${p.n}${p.main ? ' <span class="sdk-chip-tag" data-tone="info">Main</span>' : ''}${p.st === 'current' ? ' <span class="sdk-status" data-tone="info">Now</span>' : ''}</span><span class="sdk-row-sub">${SPANS[i]}</span></span><span class="sdk-chip-tag" data-tint="${p.t}">${p.n}</span></div>`).join('')}</div>
  </div>`);

  const dayCard = (title, sub, rows, tint) => `<div class="sdk-card"${tint ? ` data-tint="${tint}"` : ''}><div class="sdk-card-head"><div class="sdk-card-main"><h5 class="sdk-card-title">${title}</h5><p class="sdk-card-sub">${sub}</p></div></div>${rows ? `<div class="sdk-card-list">${rows.map((r) => `<div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">${r[0]}</span></span><span class="sdk-row-meta">${r[1]}</span></div>`).join('')}</div>` : ''}</div>`;
  const cap = (p, text, meta, end) => `<h4 class="sdk-cap${end ? ' sdk-cap-end' : ''}"><i class="sdk-cap-icon fa-solid fa-${p.i || 'flag'}" aria-hidden="true"></i><span>${text}</span>${meta ? `<span class="sdk-cap-meta">${meta}</span>` : ''}</h4>`;
  const planBody = () => wrap(`<div class="pm-jr-plan"><div class="pm-jr-panel" style="padding:12px">
    <section class="sdk-phase" data-tint="purple" aria-label="Booking">${cap({ i: 'ticket' }, 'Booking begins', 'Oct 12 · 3 days')}
      <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span>${dayCard('Sat 12 Oct', 'Home', [['Book the flights', '9:00'], ['Reserve the hotel', '14:00']])}${dayCard('Sun 13 Oct', 'Home', [['Buy the museum passes', '10:00']])}${dayCard('Mon 14 Oct', 'Home', [['Confirm the train', '11:30']])}</div>
      ${cap({ i: 'ticket' }, 'Booking ends', '', true)}</section>
    <section class="sdk-phase" data-tint="teal" aria-label="Pre-trip">${cap({ i: 'suitcase-rolling' }, 'Pre-trip begins', 'Oct 15 · 2 days')}
      <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span>${dayCard('Tue 15 Oct', 'Home', [['Pack', '18:00']])}${dayCard('Wed 16 Oct', 'Home', [['Print the tickets', '9:00']])}</div>
      ${cap({ i: 'suitcase-rolling' }, 'Pre-trip ends', '', true)}</section>
    <div class="sdk-phase-gap">${dayCard('Thu 17 Oct', 'No phase: a day no phase covers has no rail', [['Rest', 'All day']])}</div>
    <section class="sdk-phase" data-tint="green" aria-label="Trip">${cap({ i: 'plane' }, 'Trip begins', 'Oct 18')}
      <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span>${dayCard('Fri 18 Oct', 'Paris', [['Flight to Paris', '7:40'], ['Check in', '15:00']])}${dayCard('Sat 19 Oct', 'Paris', [['Louvre', '9:30']])}</div></section>
  </div>
  <p class="pm-jr-note">A proposal for the Planner timeline (plan-itinerary-phases-markers.md): a labelled cap with the phase's own icon at the top and the bottom of each phase, and a 6px rail between them, both fills of the phase's tint. Where one phase ends and the next begins on the same joint the caps stack, the ending one first. A day no phase covers has no rail and no cap. The Trip has no end date, so it has no end cap and its rail runs to the last day. The rail is decorative; a cap is a heading and wraps, never clipped.</p></div>`);

  const tagsBody = () => wrap(`<div class="pm-jr-list"><div class="pm-jr-row">${PHASES.map((p) => `<span class="sdk-chip-tag" data-tint="${p.t}">${p.n}</span>`).join('')}<span class="sdk-status" data-tone="info">Now</span><span class="sdk-chip-tag" data-tone="info">Main</span></div>
    <p class="pm-jr-note">The phase tag is the Chips tag (24px, 12px, a tint fill); "Now" is the Chips status label. The two different phase-tag looks and the 10px upper-case type are retired.</p></div>`);

  const aliasBody = () => wrap(`<div class="pm-jr-list">${CAP('The product\'s strip names (the bar is laid out by journeyLayout)')}<div class="status-strip" role="region" aria-label="Journey"><div class="status-said"><button type="button" class="phase-chip" data-tint="purple" aria-expanded="false"><span class="phase-dot"></span><span class="phase-chip-label">Booking · day 14 of 21</span></button></div>
      <div class="status-track" role="group" aria-label="Journey" data-grid="${h(JSON.stringify({ phases: PHASES.slice(0, 4).concat([BUFFER]), today: TODAY, offs: 1, lit: -1, plain: false }))}"></div>
      <button type="button" class="status-togo"><span class="status-togo-days">12</span><span class="status-togo-words">days to Trip</span></button>
      <div class="status-facts"><button type="button" class="status-fact" style="--p:62%"><span class="status-fact-fill"></span>${fa('wallet')}<span class="status-fact-text">62% of budget</span></button></div>
      <div class="status-attention"><button type="button" class="attention-count" aria-expanded="false">3 need action</button></div></div>
    ${CAP('Today\'s Set up band markup')}<div class="phase-strip"><ol class="phase-bands" style="margin:0;padding:0"><li class="phase-band" data-tint="blue" style="flex:30"><span class="phase-band-label">Planning</span><span class="phase-band-span">Sep 1 to 30</span></li><li class="phase-band current" data-tint="purple" style="flex:21"><span class="phase-band-label">Booking</span><span class="phase-band-span">Oct 1 to 21</span><span class="phase-band-now">Now</span></li><li class="phase-band main" data-tint="green" style="flex:14"><span class="phase-band-label">Trip</span><span class="phase-band-span">Oct 22 to 29</span></li><li class="phase-band off" data-tint="pink"></li></ol></div>
    ${CAP('Today\'s phase tags')}<div class="pm-jr-row"><span class="phase-tag" data-tint="blue">Planning</span><span class="phase-tag phase-tag-now">Now</span><span class="phase-tag phase-tag-main">Main</span></div></div>`);

  const CT_ROWS = [
    ['Strip words on the header', '--header-text', ['--header-bg'], 4.5],
    ['Phase chip words on its neutral fill', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--header-text) 8%, transparent)'], 4.5],
    ['Countdown words on the 22% accent fill', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--accent) 22%, transparent)'], 4.5],
    ['Fact words on its fill with progress', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--header-text) 8%, transparent)', 'color-mix(in srgb, var(--accent) 22%, transparent)'], 4.5],
    ['Attention words on the warn tone fill', 'color-mix(in srgb, var(--warn, var(--tint-gold)) 45%, var(--header-text))', ['--header-bg', 'color-mix(in srgb, var(--warn, var(--tint-gold)) 18%, var(--header-bg))'], 4.5],
    ['A chip that is open: the accent mix on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--header-text))', ['--header-bg', '--selected-bg'], 4.5],
    ['Current band name and "Now": the accent mix on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--header-text))', ['--header-bg', '--selected-bg'], 4.5],
    ['Today pin number on the micro fill', '--on-accent', ['color-mix(in srgb, var(--accent) 88%, var(--text))'], 4.5],
    ['Set up: label on the current band', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-card', '--selected-bg'], 4.5],
    ['Set up: the dates (11px) on the current band', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-card', '--selected-bg'], 4.5],
    ['Date labels under the bar (11px)', '--jr-muted', ['--header-bg'], 4.5],
    ['Focus outline (accent) on the strip', '--accent', ['--header-bg'], 3],
  ].concat(...TINTS.map((t) => [
    [`Band name, ${t}, ahead (22%)`, '--header-text', ['--header-bg', `color-mix(in srgb, var(--tint-${t}) 22%, transparent)`], 4.5],
    [`Band name, ${t}, past (12%)`, '--header-text', ['--header-bg', `color-mix(in srgb, var(--tint-${t}) 12%, transparent)`], 4.5],
    [`Set up label, ${t}, ahead`, '--text', ['--bg-card', `color-mix(in srgb, var(--tint-${t}) 22%, var(--bg-card))`], 4.5],
    [`Set up dates (11px), ${t}, ahead`, 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-card', `color-mix(in srgb, var(--tint-${t}) 22%, var(--bg-card))`], 4.5],
    [`Set up dates (11px), ${t}, lit (32%)`, 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-card', `color-mix(in srgb, var(--tint-${t}) 32%, var(--bg-card))`], 4.5],
    [`Cap words, ${t}, on its fill`, `color-mix(in srgb, var(--tint-${t}) 45%, var(--text))`, ['--bg-section', `color-mix(in srgb, var(--tint-${t}) 18%, var(--bg-section))`], 4.5],
    [`Cap meta, ${t}, on its fill`, `color-mix(in srgb, var(--tint-${t}) 38%, var(--text))`, ['--bg-section', `color-mix(in srgb, var(--tint-${t}) 18%, var(--bg-section))`], 4.5],
  ]));
  const contrastBody = () => wrap(`<table class="pm-jr-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] === 1 ? 'info' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-jr-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = min === 1 ? 'Info' : r >= min ? 'Passes' : 'Fails'; p.className = min === 1 ? '' : r >= min ? 'pm-jr-pass' : 'pm-jr-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // What the product's script does (space.js fitFacts): the facts give way one by one from the end while the journey bar has less than 480px (the day grid needs the room); all are gone at 760px.
  const fitStrip = (doc) => {
    const run = () => { for (const s of doc.querySelectorAll('.sdk-strip')) { const facts = [...s.querySelectorAll('.sdk-strip-fact')]; for (const f of facts) f.hidden = false; const tr = s.querySelector('.sdk-journey'); if (!tr) continue; if (doc.defaultView.innerWidth > 760) for (let i = facts.length - 1; i >= 0 && tr.getBoundingClientRect().width < 480; i -= 1) facts[i].hidden = true; } };
    run(); if (doc.fonts) doc.fonts.ready.then(run); doc.defaultView.addEventListener('resize', run);
  };

  function renderJourney(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="journey-h"><a href="#journey">Journey bar: status strip, phases and countdown</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">the strip, its chips, the journey bar, the Set up band, the Planner's caps and rail</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> (1) The strip is 57px with the day grid (the 1px rule and 56px: the pin, the 24px bar, the ticks and their dates; a slim 28px line on a phone) with the journey as a 2px line along the foot on a phone. (2) Every chip in the header is 28px high and a Chips look: the phase chip, the countdown (a 22% accent fill, the number 16px weight 600, not 800), the facts and the attention pill (the count is a count badge). (3) The journey bar's bands are 24px high and as wide as their days with a hairline and the medium corner, a tint fill by state: past 12%, ahead 22%, current the neutral selected fill with its name in the accent mix and the text "Now"; off is a dashed neutral hairline. (4) The today pin is a 14px high round pin in the micro count's fill with the day number, above the bar, and a 2px stem down through the bar; its label is its name. (5) The phase tag is the Chips tag and "Now" the Chips status label. (6) The Set up band keeps its content with fills only. (7) The Planner's caps and rail are drawn as a proposal. <b>Revised 2026-10-21 (feedback): the journey bar is a proportional day grid.</b> Every day is an equal slice of the bar, so a band is as wide as its phase is long, the gaps between phases show, and the today pin stands above the bar at the middle of today's day. See "The day grid".</p>
<nav class="ds-toc" aria-label="In this family"><a href="#journey-strips">The strip at 1280, 700 and 390</a><a href="#journey-grid">The day grid</a><a href="#journey-scale">Scale examples</a><a href="#journey-states">Band states</a><a href="#journey-chips">Header chips</a><a href="#journey-setup">Set up band</a><a href="#journey-plan">Caps and rail</a><a href="#journey-tags">Phase tags</a><a href="#journey-contrast">Contrast</a><a href="#journey-map">Today to proposed</a><a href="#journey-alias">Aliases</a><a href="#journey-tokens">Tokens</a><a href="#journey-contract">Markup</a><a href="#journey-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="journey-strips">The strip at 1280, 700 and 390</h4>
<p class="ds-desc">Things give way in the existing order as the line narrows: the facts (one by one, all gone at 760px), the names in the bands (below 760px), the days to go, then the end of the sentence. On a phone it is the slim line.</p>
<div data-slot="strips"></div>
${dim([
    ['1 Strip', '57px with the day grid (<code>--jr-strip-grid-h</code>; the product\'s <code>--status-strip-h</code> is 44px without it) on the header surface (<code>--header-bg</code>, words <code>--header-text</code>), 12px of padding, 12px between its parts, a 1px hairline on top. A phone: 28px (<code>--status-strip-slim-h</code>), unchanged.'],
    ['2 Header chip', '30px, 13px words weight 500, <code>--radius-small</code>, a transparent 1px edge, 10px of padding, 6px between icon and words. Neutral fill: the header text at 8%; hover 14%; pressed 20%.'],
    ['3 Phase chip', 'A 10px dot in the phase\'s tint (8px on a phone), then the sentence. It opens the phase sheet. The words stay its name; the dot never stands alone for meaning.'],
    ['4 Countdown', '<code>--accent</code> at 22%; the number 16px weight 600, the words 13px, on one baseline. Gone on a phone.'],
    ['5 Facts', 'Up to three; an icon and words; the budget fills from the left (accent at 22%) as wide as its share. Gone below 760px.'],
    ['6 Attention pill', 'A warn-tone fill (the gold tint at 18% over the header) with readable words, and the count as a Chips count badge. At the right end; it has its own polite status.'],
    ['7 Journey bar', 'A grid of days: the bar\'s width is the whole trip (first phase start to last phase end), each day an equal slice (<code>--day-w</code>). A band is 24px high, <code>days x day width - 2px</code> wide (1px of gap each side), with a 1px <code>--border</code> hairline and <code>--radius-medium</code>. Past 12%, ahead 22%, current <code>--selected-bg</code> with the accent mix, "Now" and a 2px progress line along its foot (how far through the phase today is, ending at the pin). Days no phase covers: an empty slice, a dashed neutral hairline. A phase with no dates (off): a 14px dashed stub at the right end.'],
    ['8 Today pin', 'Above the bar, never on a band: a 14px high round pin (20px wide at least) in the micro count\'s fill with the <code>--on-accent</code> day of the month (11px, weight 600), and a 2px stem of the same fill down through the bar. The stem stands at the middle of today\'s slice. Its name is "Today, 14 October". Today before the first phase or after the last: the pin stands in a 28px zone at that end. On a phone: a 7px dot on the line.'],
    ['9 Band label', 'Inside its own band, never under the stem: icon and name from 96px wide (and "Now" from 140px), the icon alone from 28px, nothing but the fill below that. A label that would touch the stem moves to the other end of its band, then drops a step. Hover, focus or a tap on any band shows its name and dates in a tooltip.'],
    ['10 Grid ticks', '1px neutral hairlines (<code>--header-text</code> at 28%) 4px high under the bar, never coloured. Up to 31 days: one at each day boundary, dates under the slices (day names when a slice is 44px or more); up to 120 days: one at each Monday; beyond: one at each month start. The first and last dates label the ends; 11px muted dates sit every week or month, as many as fit with 8px between. Gone on a phone.'],
  ])}

<h4 class="ds-h4" id="journey-grid">The day grid</h4>
${dim([
    ['Width', 'Bar width = the trip window (first phase start to last phase end, inclusive) + a 28px lead zone if today is before it + a 28px trail zone if after + 16px for each phase with no dates. Day width = the rest / the number of days.'],
    ['Band', 'x = zone + (start day) x day width + 1px; width = days x day width - 2px (never under 2px). Band widths are in proportion to their days within 1px.'],
    ['Pin', 'x = zone + (today\'s day) x day width + half a day: the centre of today\'s slice. In the lead or trail zone: the middle of the zone.'],
    ['Label by band width', '96px or more: icon + name (+ "Now" from 140px); 28px to 96px: icon only; under 28px: none. Never wider than its band, never touching the stem; if it would, it moves to the band\'s other end, then drops a step.'],
    ['Ticks by trip length', '31 days or fewer: every day. 32 to 120: every Monday. More: every month start. Labels at the ends, then as many as fit with 8px between; a phone shows no ticks or labels.'],
    ['The maths', '<code>journeyLayout(phases, today, width, opts)</code> in <code>proposed-journey.js</code> is pure: it takes dated phases (start, end), today and the bar\'s width in px and returns each band\'s x, width, state and label mode, the gaps, the ticks and labels, and the pin\'s x. The product build reuses it; the check tests it on its own.'],
  ])}

<h4 class="ds-h4" id="journey-scale">Scale examples</h4>
<p class="ds-desc">Nine journeys that stress it, at 1280, 700 and 390: a 3-day weekend, a 7-day trip, a 21-day trip with phases of 1, 3, 10 and 7 days, a 90-day trip, a 212-day trip, a gap between two phases, today before the first phase, today after the last, and today inside a 1-day phase. Then the slim line\'s tooltip.</p>
<div data-slot="scale"></div>

<h4 class="ds-h4" id="journey-states">Band states</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="journey-chips">Header chips</h4>
<div data-slot="chips"></div>

<h4 class="ds-h4" id="journey-setup">The Set up phase band</h4>
<p class="ds-desc">58px, with the same content: the name, the dates, "Now" on the current phase, a dashed line and the word "Today" for today. It is a fill by state like the strip's bands. The 4px coloured top edge and the inset ring on the current band are gone.</p>
<div data-slot="setup"></div>

<h4 class="ds-h4" id="journey-plan">The Planner's caps and rail (a proposal)</h4>
<div data-slot="plan"></div>

<h4 class="ds-h4" id="journey-tags">Phase tags</h4>
<div data-slot="tags"></div>

<h4 class="ds-h4" id="journey-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, an icon or an outline 3 to 1. The fills are translucent, so each pair is worked out over the surface under it.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="journey-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.phase-chip</code> (30px, in the strip)', '<code>.sdk-strip-phase</code>: 30px, a Chips look.'],
    ['<code>.status-band</code> fills 12%, 22% and 50% (current), a hairline', 'Past 12%, ahead 22%, current the neutral selected fill (<code>--selected-bg</code>) with the accent-mix name and "Now". The 50% fill goes.'],
    ['<code>.phase-band</code> (Set up, 58px): a 4px coloured top edge and an inset 2px accent ring on the current band', 'The same fills as the strip; no edge, no ring. The current band is the selected fill with "Now".'],
    ['<code>.phase-tag</code> in two looks (the 10px upper-case <code>.phase-band-now</code> and a 12px tag)', 'The Chips tag, and "Now" as the Chips status label. The 10px upper-case type is retired.'],
    ['<code>.status-togo</code>: 28px (today), an accent 22% fill, the number at 1.25 times the nav size in weight 800', '30px, the same fill; the number 16px weight 600 (the type scale and weights).'],
    ['<code>.status-fact</code>: 28px (today), an 8% fill, a neutral edge', '30px, the same fill; the edge is transparent (a Chips look).'],
    ['<code>.attention-count</code>: 24px, round, solid accent, weight 700', 'A 30px tone chip with a count badge in it (99+ at most). Not solid, not round.'],
    ['<code>.status-track</code>: equal-width bands in a flex row (<code>flexGrow</code> by <code>bandShares</code>), a 4px gap, no scale for how long a phase is', 'A day grid: each band <code>days x day width - 2px</code> wide, placed by <code>--x</code> and <code>--w</code> from <code>journeyLayout</code>; gaps between phases show as dashed slices; ticks and dates under the bar.'],
    ['<code>.status-today</code>: an inline 28px circle inside the band (or beside the bands at a lead or trail end), covering the band\'s name and pushing bands about', 'A 14px pin above the bar with a 2px stem through it, at the middle of today\'s slice (<code>--pin-x</code>, <code>--day-offset</code>). It never covers a label and never moves a band.'],
    ['<code>.status-band-box</code>: the name dropped by CSS below a width, the side set by <code>.end</code>', 'The label mode (full, icon, none) and side are decided by <code>journeyLayout</code> from the band\'s width and the stem, written as <code>data-label</code> and <code>data-align</code>.'],
    ['<code>.phase-today</code>: a 2px dashed <code>border-left</code>', 'A 2px dashed neutral line drawn as a block (not an edge).'],
    ['The phone\'s slim line with a 2px bar along its foot', 'Kept: 28px with the 2px journey line and a dot at today.'],
  ])}

<h4 class="ds-h4" id="journey-alias">Aliases</h4>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Strip', '<code>.sdk-strip</code> (<code>-said</code>, <code>-facts</code>)', '<code>.status-strip</code> <code>.status-said</code> <code>.status-facts</code>'],
    ['Header chip', '<code>.sdk-strip-chip</code> with <code>-phase</code> (<code>-dot</code>, <code>-sentence</code>), <code>-count</code> (<code>-n</code>, <code>-words</code>), <code>-fact</code>, <code>-attn</code>', '<code>.phase-chip</code> (<code>.phase-dot</code>, <code>.phase-chip-label</code>), <code>.status-togo</code> (<code>-days</code>, <code>-words</code>), <code>.status-fact</code>, <code>.attention-count</code>'],
    ['Journey bar', '<code>.sdk-journey</code>, <code>.sdk-band</code> (<code>data-state</code> past, current, ahead, off; <code>-box</code>, <code>-name</code>, <code>-icon</code>, <code>-now</code>), <code>.sdk-today</code>', '<code>.status-track</code>, <code>.status-band</code> with <code>.past</code>, <code>.current</code>, <code>.off</code>, <code>.status-band-box</code>, <code>-name</code>, <code>-icon</code>, <code>.status-today</code>'],
    ['Set up band', '<code>.sdk-phase-strip</code>, <code>.sdk-phase-bands</code>, <code>.sdk-phase-band</code> (<code>-label</code>, <code>-span</code>, <code>-now</code>), <code>.sdk-phase-today</code>', '<code>.phase-strip</code>, <code>.phase-bands</code>, <code>.phase-band</code>, <code>.phase-band-label</code>, <code>-span</code>, <code>-now</code>, <code>.phase-today</code>'],
    ['Phase tag', '<code>.sdk-chip-tag</code> (Chips)', '<code>.phase-tag</code> <code>.phase-tag-now</code> <code>.phase-tag-main</code>'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="journey-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--status-strip-h</code> <code>--status-strip-slim-h</code>', '44px, 28px', 'The strip. Same as today.'],
    ['<code>--jr-chip-h</code>', '30px', 'Every chip in the header (22px on the phone\'s slim line). Proposed token.'],
    ['<code>--jr-band-h</code> <code>--jr-pin</code> <code>--jr-line</code> <code>--jr-phase-h</code> <code>--jr-rail</code>', '24px, 28px, 2px, 58px, 6px', 'The journey bar band, the pin, the phone line, the Set up band and the rail. Proposed tokens.'],
    ['<code>--jr-past</code> <code>--jr-ahead</code> <code>--jr-count</code> <code>--jr-fact</code>', '12%, 22%, 22%, 8%', 'The band fills, the countdown fill, the fact fill. Proposed tokens (the values are today\'s).'],
    ['<code>--header-bg</code> <code>--header-text</code> <code>--selected-bg</code> <code>--micro-fill</code> <code>--warn</code> <code>--tint-*</code> <code>--border</code>', 'the theme\'s, and the Chips family\'s', 'The strip, the current band, the pin, the attention tone, the tints, the hairlines.'],
  ])}

<h4 class="ds-h4" id="journey-contract">Markup</h4>
${code(`<div class="sdk-strip" role="region" aria-label="Where we are in the journey">
  <div class="sdk-strip-said">
    <button class="sdk-strip-chip sdk-strip-phase" data-tint="purple" aria-expanded="false">
      <span class="sdk-strip-dot" aria-hidden="true"></span><span class="sdk-strip-sentence">Booking · day 8 of 21</span></button>
  </div>
  <div class="sdk-journey" role="group" aria-label="Journey: ..." style="--day-w: 10.86px; --zone: 0px">   <!-- alias .status-track; written by journeyLayout -->
    <span class="sdk-band" data-state="past" data-tint="blue" data-label="full" aria-label="Planning, Sep 1 to 30" tabindex="0" style="--days: 30; --x: 1px; --w: 324.8px">
      <span class="sdk-band-box" data-align="start"><i class="sdk-band-icon fa-solid fa-clipboard-list"></i><span class="sdk-band-name">Planning</span></span></span>
    <span class="sdk-band" data-state="current" data-tint="purple" data-label="full" style="--days: 21; --x: 326.8px; --w: 226px">
      <span class="sdk-band-box" data-align="end"><span class="sdk-band-name">Booking</span><span class="sdk-band-now">Now</span></span>
      <span class="sdk-band-progress" style="--p: 150px"></span></span>
    <span class="sdk-gap" style="--days: 3; --x: 554px; --w: 30px"></span>   <!-- days no phase covers -->
    <span class="sdk-band" data-state="off"></span>
    <i class="sdk-tick" style="--x: 0px"></i> ...   <span class="sdk-tick-label" data-align="s" style="--x: 0px">Sep 1</span> ...
    <span class="sdk-today" role="img" aria-label="Today, 14 October" style="--pin-x: 403px; --day-offset: 43">14<span class="sdk-today-stem"></span></span>
  </div>
  <button class="sdk-strip-chip sdk-strip-count"><span class="sdk-strip-count-n">12</span><span class="sdk-strip-count-words">days to Trip</span></button>
  <div class="sdk-strip-facts"><button class="sdk-strip-chip sdk-strip-fact" style="--p: 62%">...</button></div>
  <button class="sdk-strip-chip sdk-strip-attn" data-tone="warn"><span class="sdk-badge">3</span><span>need action</span></button>
</div>

<section class="sdk-phase" data-tint="purple">                 <!-- the Planner -->
  <h4 class="sdk-cap"><i class="sdk-cap-icon fa-solid fa-ticket"></i><span>Booking begins</span><span class="sdk-cap-meta">Oct 12 · 3 days</span></h4>
  <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span> ...day cards... </div>
  <h4 class="sdk-cap sdk-cap-end">...<span>Booking ends</span></h4>
</section>`)}
${dim([
    ['State', '<code>data-state="past"</code>, <code>"current"</code>, <code>"ahead"</code> (the default) or <code>"off"</code> on a band; <code>.lit</code> while the band\'s row is under the pointer. The tint is <code>data-tint</code>.'],
    ['Narrow', '640px and below: the slim 28px line (the CSS does it; the markup is the same, the dates and ticks are not drawn). Below 760px the facts are hidden by the CSS; the script still drops facts one by one from the end as the line fills. The names in the bands follow the band\'s width, not the window\'s.'],
    ['Custom properties', '<code>--days</code> a band\'s length in days; <code>--x</code> and <code>--w</code> its place and width in px from the bar\'s left edge; <code>--pin-x</code> the pin\'s centre; <code>--day-offset</code> the days from the first day to today; <code>--day-w</code> and <code>--zone</code> on the bar. <code>journeyLayout</code> computes them from the phases\' dates; the bar is laid out again when its width changes.'],
  ])}

<h4 class="ds-h4" id="journey-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","Why"], [
    ["The header chip is 30px (the Chips choice-chip size), not 28px","It keeps to the Chips scale (tag 24, choice 30) and fits the 44px strip. The phone's slim line keeps 22px chips as drawn."],
    ["The attention pill is a warn (gold) tone, not accent or neutral","It means something needs action. The countdown is already the accent."],
    ["On a phone the journey is a 2px line made of the bands; on a desktop it is the 24px bands, with no separate line","A 24px band does not fit a 28px line. It is how the slim line works today."],
    ["The journey line's bands keep their tints at 28% and 55%","A 2px line needs a stronger fill than a 24px band to be seen."],
    ["The strip is 57px with the day grid; the phone\'s line stays 28px","The pin above the bar, the date labels under it and the 24px band need 56px; a 44px strip cannot hold them. Chips stay 30px on the same centre line."],
    ["The journey bar is a proportional day grid (feedback 2026-10-21)","A bar that says how long things are and where today is. Equal-width bands said neither."],
    ["The current band name is weight 600 with \"Now\"","The selected fill alone is quiet; the word makes it certain."],
    ["The Set up band names are weight 500, the main phase 600","The 700 weight folds into 600 (Typography); the main phase stays heavier."],
    ["The caps are 32px high at least and wrap; the end cap is paler","The plan says a cap wraps and is never clipped; the end is the lesser of the pair."],
    ["The rail is 6px, one block down the days, in the tint at 38%","The plan says 6px at most, one fill so no seam can show."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + JR_CSS, onload: (d) => { mountJourneys(d); fitStrip(d); } }, o || {}));
    const ws = mk('div', '');
    for (const w of [1280, 700, 390]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(stripAt(w), `Journey at ${w}`, { pinWidth: w }));
    }
    slot('strips').appendChild(ws);
    const sc = mk('div', '');
    for (const w of [1280, 700, 390]) { sc.appendChild(mk('p', 'ds-ctx', `Scale examples, ${w} wide (fixed)`)); sc.appendChild(F(scaleBody(w), `Journey, scale at ${w}`, { pinWidth: w })); }
    sc.appendChild(mk('p', 'ds-ctx', 'The tooltip on the slim line, 390 wide (fixed)'));
    sc.appendChild(F(tipBody(), 'Journey, tooltip at 390', { pinWidth: 390, onload: (d) => { mountJourneys(d); fitStrip(d); d.defaultView.setTimeout(() => d.defaultView.__jrTip.show('.sdk-band[data-state="current"]'), 200); } }));
    slot('scale').appendChild(sc);
    slot('states').appendChild(F(statesBody(), 'Journey, band states'));
    slot('chips').appendChild(F(chipsBody(), 'Journey, header chips'));
    slot('setup').appendChild(F(setupBody(), 'Journey, set up band'));
    slot('plan').appendChild(F(planBody(), 'Journey, caps and rail'));
    slot('tags').appendChild(F(tagsBody(), 'Journey, phase tags'));
    slot('contrast').appendChild(F(contrastBody(), 'Journey, contrast', { onload: (d) => { mountJourneys(d); fitStrip(d); measureContrast(d); } }));
    slot('alias').appendChild(F(aliasBody(), 'Journey, aliases'));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'journey', covers: ['status-strip', 'phase-chip', 'status-band', 'phase-band', 'phase-tag', 'status-togo', 'status-fact', 'attention-count', 'status-today'], group: 'Containers', name: 'Journey bar: status strip, phases and countdown', status: 'approved',
    words: 'journey bar status strip phases phase chip countdown days to go facts attention pill band now today pin set up caps rail planner timeline slim line phone tag fill past ahead current off', render: renderJourney,
  });
})();
