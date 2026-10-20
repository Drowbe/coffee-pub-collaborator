/* The Calendar cells family (proposed): the one cell look of the Calendar's month and week and the date picker's grid, the event chip in a cell, the hour row,
   and the Calendar's kept left bar. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family
   through window.DS_PROPOSED.families.push and draws it with the rules in proposed-calendar.css. Nothing here is a style of the product: markup, words and
   tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const CL_CSS = `
.pm-cl-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; align-items: start; }
.pm-cl-states { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 14px 12px; align-items: start; }
.pm-cl-states > div > small, .pm-cl-cap { display: block; margin-bottom: 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-cl-cap { margin-top: 12px; }
.pm-cl-cap:first-child { margin-top: 0; }
.pm-cl-note { margin: 6px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-cl-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.pm-cl-bar h4 { margin: 0 8px 0 0; font-size: 16px; font-weight: 600; }
.pm-cl-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-cl-ct th, .pm-cl-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-cl-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-cl-pass { color: var(--ok); font-weight: 600; }
.pm-cl-fail { color: var(--danger); font-weight: 600; }
.pm-cl-pad { box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); }
`;

  // ---- the data of the examples: October 2026, weeks start on Monday, today is Tuesday the 20th ----
  const TODAY = 20;
  const EV = {
    1: [['Passport photos', 'gold']], 5: [['Team call', ''], ['Flight check', 'blue']], 8: [['Visa deadline', 'purple', 'marker']],
    12: [['Dinner with Sam', 'orange', 'ext']], 14: [['Packing', 'teal']], 19: [['Stand-up', '']], 20: [['Team call', ''], ['Book the hotel', 'green'], ['Visa deadline', 'purple', 'marker'], ['Dinner', 'orange', 'ext']],
    21: [['Lunch with Ana', 'pink']], 22: [['Train to Lyon', 'teal'], ['Hotel check-in', 'gold']], 26: [['Louvre', 'blue']], 27: [['Louvre', 'blue']], 28: [['Seine walk', 'green']],
  };
  // Days of the month grid: Monday 28 September to Sunday 1 November. d is the day number; m is 'prev', 'cur' or 'next'.
  const MONTH = []; for (let i = 0; i < 35; i += 1) { const n = 28 + i; MONTH.push(n <= 30 ? { d: n, m: 'prev' } : n <= 61 ? { d: n - 30, m: 'cur' } : { d: n - 61, m: 'next' }); }
  const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowRow = () => DOWS.map((d) => `<div class="sdk-cal-dow" role="columnheader">${d}</div>`).join('');

  // One event chip. e: [title, tint, kind]. kind: '' (ours), 'ext' (another calendar), 'marker' (a module's date). Ext and marker keep the bar.
  const event = (e, o = {}) => {
    const [t, tint, kind] = e;
    const cls = ['sdk-cal-event', kind ? 'sdk-bar-kept' : '', kind === 'ext' ? 'is-ext' : '', kind === 'marker' ? 'is-marker' : '', o.cls || ''].filter(Boolean).join(' ');
    return `<span class="${cls}"${tint ? ` data-tint="${tint}"` : ''}>${h(t)}</span>`;
  };

  // One cell. o: n (number), cls (is-today ...), ev (events), max (events shown), week (weekday word), word (a text marker), state (hover|focus|active), sel, pick, label.
  const cell = (o = {}) => {
    const cls = ['sdk-cal-cell', o.cls || '', o.state === 'hover' ? 'ds-force-hover' : '', o.state === 'focus' ? 'ds-force-focus' : '', o.state === 'active' ? 'ds-force-active' : ''].filter(Boolean).join(' ');
    const shown = (o.ev || []).slice(0, o.max == null ? 3 : o.max);
    const more = (o.ev || []).length - shown.length;
    const num = o.week ? `<span class="sdk-cal-n">${o.week}<b>${o.n}</b></span>` : `<span class="sdk-cal-n">${o.n}</span>`;
    return `<div class="${cls}" role="gridcell" tabindex="${o.tab ? 0 : -1}"${o.sel ? ' aria-selected="true"' : ''}${o.today ? ' aria-current="date"' : ''} aria-label="${h(o.label || String(o.n))}">${num}${o.word ? `<span class="sdk-cal-word">${o.word}</span>` : ''}${shown.length || more > 0 ? `<span class="sdk-cal-chips">${shown.map((e) => event(e)).join('')}${more > 0 ? `<span class="sdk-cal-more">+${more} more</span>` : ''}</span>` : ''}</div>`;
  };

  const monthGrid = (o = {}) => `<div class="sdk-cal-grid" role="grid" aria-label="October 2026" data-grid>${dowRow()}${MONTH.map((x) => {
    const cur = x.m === 'cur';
    const cls = [!cur ? 'is-other' : '', cur && x.d === TODAY ? 'is-today' : '', cur && o.range && x.d >= o.range[0] && x.d <= o.range[1] ? 'in-range' : '', cur && o.sel === x.d ? 'is-selected' : ''].filter(Boolean).join(' ');
    return cell({ n: x.d, cls, ev: cur ? EV[x.d] : [], max: o.max, today: cur && x.d === TODAY, sel: cur && o.sel === x.d, tab: cur && x.d === (o.tab || TODAY), label: `${x.d} ${cur ? 'October' : x.m === 'prev' ? 'September' : 'November'}` });
  }).join('')}</div>`;

  const weekGrid = () => `<div class="sdk-cal-grid sdk-cal-week" role="grid" aria-label="Week of 19 October 2026" data-grid>${[19, 20, 21, 22, 23, 24, 25].map((d, i) => cell({ n: d, week: DOWS[i], cls: d === TODAY ? 'is-today' : d === 22 ? 'is-selected' : '', sel: d === 22, today: d === TODAY, tab: d === TODAY, ev: EV[d] || [], max: 5, label: `${DOWS[i]} ${d} October` })).join('')}</div>`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s) => `<small>${s}</small>`;
  const CAPB = (s) => `<span class="pm-cl-cap">${s}</span>`;

  // The arrow keys move between the cells of a grid (roving tab index); Enter or Space chooses the day. The frames are live.
  const gridKeys = (doc) => {
    for (const g of doc.querySelectorAll('[data-grid]')) {
      const list = () => [...g.querySelectorAll('.sdk-cal-cell:not(:disabled)')];
      const choose = (el) => { for (const c of list()) { c.removeAttribute('aria-selected'); c.classList.remove('is-selected'); } el.setAttribute('aria-selected', 'true'); el.classList.add('is-selected'); };
      g.addEventListener('keydown', (e) => {
        const l = list(); const i = l.indexOf(doc.activeElement); if (i < 0) return;
        const k = e.key; let n = i;
        if (k === 'ArrowRight') n = i + 1; else if (k === 'ArrowLeft') n = i - 1; else if (k === 'ArrowDown') n = i + 7; else if (k === 'ArrowUp') n = i - 7;
        else if (k === 'Home') n = i - (i % 7); else if (k === 'End') n = i - (i % 7) + 6;
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(l[i]); return; } else return;
        e.preventDefault(); n = Math.max(0, Math.min(l.length - 1, n)); l[i].tabIndex = -1; l[n].tabIndex = 0; l[n].focus();
      });
      g.addEventListener('click', (e) => { const c = e.target.closest('.sdk-cal-cell'); if (c && g.contains(c)) { choose(c); c.tabIndex = 0; } });
    }
  };

  // ---- frame bodies ----
  const STATES = [
    ['Rest', {}], ['Hover', { state: 'hover' }], ['Pressed', { state: 'active' }], ['Focus', { state: 'focus' }], ['Today', { cls: 'is-today', today: true }],
    ['Today, hover', { cls: 'is-today', state: 'hover', today: true }], ['Selected (chosen day)', { cls: 'is-selected', sel: true }], ['Selected, focus', { cls: 'is-selected', sel: true, state: 'focus' }],
    ['In a range', { cls: 'in-range' }], ['Outside the month', { cls: 'is-other' }], ['Opened by a link', { cls: 'is-linked', word: 'Linked' }], ['Drop target', { cls: 'is-drop' }],
  ];
  const statesBody = () => wrap(`<div class="pm-cl-pad"><div class="pm-cl-states">${STATES.map(([n, o]) => `<div>${CAP(n)}${cell(Object.assign({ n: 21, ev: [['Lunch with Ana', 'pink']], label: n }, o))}</div>`).join('')}</div>
    <p class="pm-cl-note">Every state is a fill, never a border. Hover is the text colour at 10% over the cell. Today is the accent at 14% (the selected fill at half strength). The chosen day is solid accent with <code>--on-accent</code> text. The link marker (was an accent ring) is the full selected fill and the word "Linked".</p></div>`);

  const monthBody = () => wrap(`<div class="pm-cl-pad"><div class="pm-cl-bar"><h4>October 2026</h4><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Previous month">${fa('chevron-left')}</button><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Next month">${fa('chevron-right')}</button></div>${monthGrid({ range: [26, 28], sel: 22, max: 2 })}
    <p class="pm-cl-note">Live: click a day, or focus a day and use the arrow keys, Home and End. Enter or Space chooses the day. Today is the 20th, the chosen day the 22nd, the range 26 to 28.</p></div>`);

  const weekBody = () => wrap(`<div class="pm-cl-pad">${weekGrid()}<p class="pm-cl-note">A week cell is 150px high and its chips wrap. The number is the Calendar's own: the weekday in small caps and the day at 14px.</p></div>`);

  const compactBody = () => wrap(`<div class="sdk-cal-compact pm-cl-pad"><div class="pm-cl-cap">Compact month: a pane beside the call (cells 54px, events as 7px dots)</div>${monthGrid({ sel: 22, max: 6 })}
    <div class="pm-cl-cap">Compact week: a list, the day on the left</div><div class="sdk-cal-grid sdk-cal-week" role="grid" aria-label="Week of 19 October 2026" data-grid>${[19, 20, 21, 22].map((d, i) => cell({ n: d, week: DOWS[i], cls: d === TODAY ? 'is-today' : '', today: d === TODAY, tab: d === TODAY, ev: EV[d] || [], max: 3, label: `${DOWS[i]} ${d} October` })).join('')}</div></div>`);

  const barRow = (o) => `<div class="sdk-row sdk-bar-kept${o.cls ? ' ' + o.cls : ''}"${o.ext ? ' data-ext' : ''} data-tint="${o.tint}"><span class="sdk-row-meta">${o.when}</span><span class="sdk-row-main"><span class="sdk-row-title">${o.title}</span>${o.sub ? `<span class="sdk-row-sub">${o.sub}</span>` : ''}</span></div>`;
  const agendaBody = () => wrap(`<div class="sdk-panel"><div class="pm-cl-cap">Agenda: a day's events as rows</div>
    <div class="sdk-cal-agenda" data-exception="calendar">
      ${barRow({ tint: 'blue', when: '9:00 to 9:30', title: 'Team call', sub: 'Agenda row (.item)' })}
      ${barRow({ tint: 'orange', when: '19:30 to 21:00', title: 'Dinner with Sam', sub: 'Another calendar (.item.ext)', ext: true })}
      ${barRow({ tint: 'purple', when: 'All day', title: 'Visa deadline', sub: 'A marker from another module (.item.marker)', cls: 'is-marker' })}
    </div>
    <div class="pm-cl-cap">Exception, kept: the chips of another calendar and of a marker in a cell (.chip.ext, .chip.marker)</div>
    <div class="sdk-cal-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))" data-exception="calendar-chips">
      <div class="sdk-cal-cell" style="min-height:0"><span class="sdk-cal-n">12</span><span class="sdk-cal-chips"><span class="sdk-cal-event">Team call</span><span class="sdk-cal-event sdk-bar-kept is-ext" data-tint="orange">Dinner with Sam</span></span></div>
      <div class="sdk-cal-cell" style="min-height:0"><span class="sdk-cal-n">8</span><span class="sdk-cal-chips"><span class="sdk-cal-event sdk-bar-kept is-marker" data-tint="purple">Visa deadline</span><span class="sdk-cal-event sdk-bar-kept is-marker is-past" data-tint="green">Poll closed</span></span></div>
      <div class="sdk-cal-cell is-today" style="min-height:0"><span class="sdk-cal-n">20</span><span class="sdk-cal-chips"><span class="sdk-cal-event">Stand-up</span><span class="sdk-cal-event sdk-bar-kept is-marker" data-tint="blue">Task due</span></span></div>
    </div>
    <div class="pm-cl-note"><span class="sdk-cal-flag">Exception, kept</span> Thomas, 2026-10-18: Calendar's agenda rows (<code>.item</code>, <code>.item.ext</code>, <code>.item.marker</code>) and chips (<code>.chip.ext</code>, <code>.chip.marker</code>) keep their 3px bar on the left. It is a 3px block, not a border, in the event's colour. Nowhere else on this page. The rows are the Cards rows; the chips are the small tag with the bar. The compact month draws these as dots. Italic is not bundled, so the other calendars' chips are no longer slanted: the bar and the muted text say it.</div></div>`);

  const hourBody = () => wrap(`<div class="sdk-panel"><div class="pm-cl-cap">Day view: an all-day row, then the hours</div><div class="sdk-cal-hours">
    <div class="sdk-cal-allday"><span class="sdk-cal-hr">All day</span><span class="sdk-cal-chips"><span class="sdk-cal-event sdk-bar-kept is-marker" data-tint="purple">Visa deadline</span></span></div>
    <div class="sdk-cal-hour" tabindex="0"><span class="sdk-cal-hr">9:00</span><span class="sdk-cal-chips"><span class="sdk-cal-event">Team call</span></span></div>
    <div class="sdk-cal-hour" tabindex="0"><span class="sdk-cal-hr">10:00</span></div>
    <div class="sdk-cal-hour is-now" tabindex="0"><span class="sdk-cal-hr">11:00</span><span class="sdk-cal-chips"><span class="sdk-cal-event" data-tint="green">Book the hotel</span></span><span class="sdk-status" data-tone="info">${fa('clock')}<span class="sdk-chip-label">Now</span></span></div>
    <div class="sdk-cal-hour ds-force-hover" tabindex="0"><span class="sdk-cal-hr">12:00 (hover)</span></div>
    <div class="sdk-cal-hour" tabindex="0"><span class="sdk-cal-hr">13:00</span></div>
  </div><p class="pm-cl-note">"Now" was an accent border. It is the selected fill and the word Now, so it does not depend on colour. The hour rows have the cell's hairline, corner and hover.</p></div>`);

  // The picker: the Menus surface with the one cell. Live: arrow keys and click.
  const pickerGrid = (o = {}) => {
    const cells = [];
    for (const d of [28, 29, 30]) cells.push(cell({ n: d, cls: 'sdk-cal-pick is-other', label: `${d} September` }));
    for (let d = 1; d <= 31; d += 1) {
      const cls = ['sdk-cal-pick', d === TODAY ? 'is-today' : '', o.range && d > o.range[0] && d < o.range[1] ? 'in-range' : '', o.sel === d || (o.range && (d === o.range[0] || d === o.range[1])) ? 'is-selected' : ''].filter(Boolean).join(' ');
      cells.push(cell({ n: d, cls, sel: cls.includes('is-selected'), today: d === TODAY, tab: d === (o.tab || TODAY), label: `${d} October 2026`, state: o.hover === d ? 'hover' : o.focus === d ? 'focus' : '' }));
    }
    cells.push(cell({ n: 1, cls: 'sdk-cal-pick is-other', label: '1 November' }));
    return `<div class="sdk-dp"><div class="sdk-dp-head"><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Previous month">${fa('chevron-left')}</button><span class="sdk-dp-title">October 2026</span><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Next month">${fa('chevron-right')}</button></div>
      <div class="sdk-cal-grid sdk-cal-grid-pick" role="grid" aria-label="October 2026" data-grid>${DOWS.map((d) => `<div class="sdk-cal-dow" role="columnheader">${d}</div>`).join('')}${cells.join('')}</div>
      <div class="sdk-dp-foot"><button type="button" class="btn btn-quiet btn-small">Clear</button><button type="button" class="btn btn-small">Today</button></div></div>`;
  };
  const pickerBody = () => wrap(`<div class="pm-cl-two">
    <div>${CAPB('The picker, with the one cell (live: arrows, click)')}<div class="sdk-cal-pickbox">${pickerGrid({ sel: 22, hover: 15, range: [26, 28] })}</div>
      <p class="sdk-cal-keys">Arrow keys move by a day or a week. Home and End go to the start or end of the week. Enter or Space chooses. The day with focus keeps the tab stop.</p></div>
    <div>${CAPB('Menus\' own date cell, side by side (.sdk-dp-day): the same values')}
      <div class="sdk-cal-pickbox"><div class="sdk-dp"><div class="sdk-dp-grid" role="group" aria-label="Menus date cells" style="grid-template-columns:repeat(4,var(--cal-pick))">
        <button type="button" class="sdk-dp-day" data-pair="rest">15</button><button type="button" class="sdk-dp-day today" data-pair="today">20</button><button type="button" class="sdk-dp-day sel" data-pair="sel">22</button><button type="button" class="sdk-dp-day inrange" data-pair="range">27</button></div>
        <div class="sdk-cal-grid sdk-cal-grid-pick" style="grid-template-columns:repeat(4,var(--cal-pick));margin-top:2px"><button type="button" class="sdk-cal-cell sdk-cal-pick" data-pair="rest">15</button><button type="button" class="sdk-cal-cell sdk-cal-pick is-today" data-pair="today">20</button><button type="button" class="sdk-cal-cell sdk-cal-pick is-selected" data-pair="sel">22</button><button type="button" class="sdk-cal-cell sdk-cal-pick in-range" data-pair="range">27</button></div></div></div>
      <p class="sdk-cal-keys">Top row: the Menus family's cell. Bottom row: this family's. Rest, today, chosen and range look the same, so the picker and the Calendar share one look.</p></div></div>`);

  const phoneBody = () => wrap(`<div class="sdk-cal-compact pm-cl-pad"><div class="pm-cl-bar"><h4>October 2026</h4></div>${monthGrid({ sel: 22, max: 6 })}
    <div class="pm-cl-cap">Picker: 44px cells</div><div class="sdk-cal-pickbox">${pickerGrid({ sel: 22 })}</div>
    <div class="pm-cl-cap">Agenda</div><div class="sdk-cal-agenda">${barRow({ tint: 'blue', when: '9:00 to 9:30', title: 'Team call' })}${barRow({ tint: 'orange', when: '19:30', title: 'Dinner with Sam', ext: true })}</div></div>`);

  const aliasBody = () => wrap(`<div class="sdk-panel"><div class="pm-cl-cap">Names that take the look with no markup edit</div>
    <div class="sdk-cal-grid"><div class="dow">Mon</div><div class="dow">Tue</div><div class="dow">Wed</div></div>
    <div class="sdk-cal-hours"><div class="allday"><span class="hr">All day</span><span class="sdk-cal-chips"><span class="sdk-cal-event">Trip</span></span></div><div class="hour now" tabindex="0"><span class="hr">11:00</span></div><div class="hour" tabindex="0"><span class="hr">12:00</span></div></div></div>`);

  // ---- contrast ----
  const ACC = (p, s) => `color-mix(in srgb, var(--accent) ${p}%, var(--${s}))`;
  const TONE = (t) => `color-mix(in srgb, var(--tint-${t}) 45%, var(--text))`;
  const TFILL = (t) => `color-mix(in srgb, var(--tint-${t}) 22%, var(--bg-card))`;
  const CT_ROWS = [
    ['Day number on a cell (dim on card)', '--text-dim', ['--bg-card'], 4.5],
    ['Today: the bold number (text on the half-strength fill)', '--text', ['--bg-card', ACC(14, 'bg-card')], 4.5],
    ['Today: a weekday on the half-strength fill (muted, stronger mix)', 'color-mix(in srgb, var(--text-dim) 55%, var(--text))', ['--bg-card', ACC(14, 'bg-card')], 4.5],
    ['Hover: the number on the quiet fill (muted, stronger mix)', 'color-mix(in srgb, var(--text-dim) 55%, var(--text))', ['--bg-card', 'color-mix(in srgb, var(--text) 10%, var(--bg-card))'], 4.5],
    ['Chosen day: number on the solid accent', '--on-accent', ['--accent'], 4.5],
    ['Chosen day: chip text on the accent', '--on-accent', ['--accent', 'color-mix(in srgb, var(--text) 22%, var(--accent))'], 4.5],
    ['Event chip, accent tone (text on its 22% fill)', ACC(45, 'text').replace('var(--accent) 45%', 'var(--accent) 45%'), ['--bg-card', 'color-mix(in srgb, var(--accent) 22%, var(--bg-card))'], 4.5],
    ['Event chip on the today cell', ACC(45, 'text'), ['--bg-card', ACC(14, 'bg-card'), 'color-mix(in srgb, var(--accent) 22%, var(--bg-card))'], 4.5],
    ['Another calendar\'s chip (muted, stronger mix, on its quiet fill)', 'color-mix(in srgb, var(--text-dim) 55%, var(--text))', ['--bg-card', 'color-mix(in srgb, var(--text-dim) 12%, var(--bg-card))'], 4.5],
    ['Link marker word on the selected fill', '--text', ['--bg-card', '--selected-bg', 'color-mix(in srgb, var(--text) 10%, transparent)'], 4.5],
    ['Hour label on "now"', '--text', ['--bg-card', '--selected-bg'], 4.5],
    ['Focus outline (accent) on a cell', '--accent', ['--bg-card'], 3],
    ['Focus outline (on-accent) on the chosen day', '--on-accent', ['--accent'], 3],
    ['Hairline on the panel', '--border', ['--bg-section'], 1],
    ['Outside the month: dim number at 55% (info, 55% is chosen)', 'color-mix(in srgb, var(--text-dim) 55%, var(--bg-card))', ['--bg-card'], 1],
  ].concat(['blue', 'teal', 'orange', 'green', 'pink', 'gold', 'purple'].map((t) => [`Event chip, ${t} (text on its 22% fill)`, TONE(t), ['--bg-card', TFILL(t)], 4.5]));
  const contrastBody = () => wrap(`<table class="pm-cl-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] === 1 ? 'info' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-cl-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = min === 1 ? 'Info' : r >= min ? 'Passes' : 'Fails'; p.className = min === 1 ? '' : r >= min ? 'pm-cl-pass' : 'pm-cl-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderCalendar(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="calendar-h"><a href="#calendar">Calendar cells</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">the month, week and picker cell; the event chip; the hour row; the kept bar</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from the research recommendations Thomas approved as a batch the same day.</b> One cell look for the Calendar's month and week and the date picker's grid. (1) Hover is the quiet neutral fill, never an accent border. (2) Today is the neutral selected fill at half strength, the same as the date picker's today in Menus. (3) The chosen day is solid accent with <code>--on-accent</code> text: the approved exception for a single chosen value. (4) A range is the quiet fill. (5) Outside the month is 55% opacity. (6) Focus is the outline mechanism of Fields, Tabs and Cards. (7) An event in a cell is the Chips family's small tag: the event's tone at 22%, readable text, 11px, a small corner. (8) Calendar's agenda rows and the chips of other calendars and markers keep their 3px bar, flagged "Exception, kept". (9) The "now" line of the hour grid and the link marker on a day lose their accent border and ring; each is the neutral selected fill and a word. The hard-coded <code>#c0574a</code> fallback goes. The Planner's day gap count (<code>.gapcount</code>) is drawn with the Days family.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#calendar-anatomy">Anatomy</a><a href="#calendar-states">Cell states</a><a href="#calendar-month">Month</a><a href="#calendar-week">Week</a><a href="#calendar-compact">Compact</a><a href="#calendar-agenda">Agenda and the kept bar</a><a href="#calendar-hours">Day view</a><a href="#calendar-picker">Date picker</a><a href="#calendar-phone">On a phone</a><a href="#calendar-contrast">Contrast</a><a href="#calendar-map">Today to proposed</a><a href="#calendar-alias">Aliases</a><a href="#calendar-tokens">Tokens</a><a href="#calendar-contract">Markup</a><a href="#calendar-decide">What Thomas chooses</a></nav>

<h4 class="ds-h4" id="calendar-anatomy">Anatomy</h4>
${dim([
    ['1 Cell', 'Card step <code>--bg-card</code>, a 1px <code>--border</code> hairline, <code>--radius-medium</code>, padding 4px. Minimum height 74px; 54px compact; 150px in a week. A picker cell is 30px square (44px on a phone), <code>--radius-small</code>, no hairline.'],
    ['2 Number', '12px, <code>--text-dim</code>, tabular. Today: bold and <code>--text</code>. In a week: the weekday in 11px small caps and the day at 14px.'],
    ['3 Event chip', 'The Chips tag, small: 18px high, 11px, <code>--radius-small</code>, the tone at 22% over the cell and the tone mixed 45% into <code>--text</code> for the words. One line with an ellipsis in a month, wrapping in a week. "+2 more" is 11px dim.'],
    ['4 Fills', 'Hover: <code>--text</code> at 10% over the cell. Pressed: 16%. Today: the accent at 14%. Range: as hover. Chosen: solid <code>--accent</code>. Linked and now: <code>--selected-bg</code>.'],
    ['5 Keys', 'One cell in the grid is the tab stop. The arrow keys move a day or a week, Home and End the start or end of the week, Enter or Space chooses. Drawn live below.'],
    ['6 Words', 'Anything a colour says is also said in words: a cell\'s label names the date and its events, "Today" is <code>aria-current="date"</code>, "Now" and "Linked" are written.'],
  ])}

<h4 class="ds-h4" id="calendar-states">Cell states</h4>
<p class="ds-desc">Each state forced from the proposed rules. Today (accent 14%) and the quiet hover read as fills; the chosen day is the one solid accent.</p>
<div data-slot="states"></div>

<h4 class="ds-h4" id="calendar-month">Month</h4>
<div data-slot="month"></div>

<h4 class="ds-h4" id="calendar-week">Week</h4>
<div data-slot="week"></div>

<h4 class="ds-h4" id="calendar-compact">Compact</h4>
<p class="ds-desc">In a narrow pane the month shows 54px cells with events as 7px dots, and the week is a list.</p>
<div data-slot="compact"></div>

<h4 class="ds-h4" id="calendar-agenda">Agenda and the kept bar</h4>
<div data-slot="agenda"></div>

<h4 class="ds-h4" id="calendar-hours">Day view</h4>
<div data-slot="hours"></div>

<h4 class="ds-h4" id="calendar-picker">Date picker</h4>
<p class="ds-desc">The picker uses the same cell: 30px, 44px on a phone, a small corner, no hairline (it sits on the popover). The popover, its head and its foot are the Menus family's. The Menus' <code>.sdk-dp-day</code> and this cell are drawn side by side to show the values agree.</p>
<div data-slot="picker"></div>

<h4 class="ds-h4" id="calendar-phone">On a phone (390 wide)</h4>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="calendar-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, an outline 3 to 1. The chosen day's text is the same pair as the Primary button: just under 4.5 in light mode until the Colour family fixes text-on-accent once.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="calendar-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.day:hover</code>, <code>.hour:hover</code>: an accent border (55% mix)', 'The quiet neutral fill. No border change.'],
    ['<code>.day.today</code>: <code>--selected-bg</code>, the number in accent bold; <code>.day.today.ph</code>: accent 28% over the phase wash', 'Accent 14% (the selected fill at half strength); the number in the text colour, bold. The phase wash is Calendar\'s own and is not drawn here.'],
    ['<code>.day.sel</code>: accent 22% over the card', 'Solid accent with <code>--on-accent</code> text (the chosen day).'],
    ['<code>.day.pick</code>: accent border and a 2px accent ring', 'The selected fill and the word "Linked".'],
    ['<code>.hour.now</code>: an accent border', 'The selected fill and a "Now" status label.'],
    ['<code>.day.drop</code>: a 2px accent outline', 'Kept: the focus outline mechanism (2px inside).'],
    ['<code>.day:focus-visible</code>: outline offset 1px', 'The mechanism: 2px, offset -2px, equal on four edges.'],
    ['<code>.chip</code>: accent 22% over nothing, <code>--radius-min</code>, text colour', 'The small tag: 22% over the cell, readable tone text, <code>--radius-small</code>.'],
    ['<code>.chip.ext</code>, <code>.chip.marker</code>, <code>.item.ext</code>, <code>.item.marker</code>, <code>.item</code>: an inset 3px shadow', '<b>Exception, kept</b>: the 3px bar, as a block (<code>.sdk-bar-kept</code>), on a Cards row or a small tag. Not italic (not bundled).'],
    ['<code>.compact .chip.ext</code>: a 1.5px inset ring', 'A 7px dim dot.'],
    ['<code>.tag</code> (a 1px hairline pill, 10px text) in the agenda', 'The Chips tag, 12px.'],
    ['<code>.note.bad</code>: <code>border-color: var(--danger, #c0574a)</code>', 'The fallback goes: <code>var(--danger)</code> always exists. The note itself is the Toasts family\'s.'],
    ['<code>.gapcount</code> (the Planner): a 2px dim border', 'A neutral count chip. Drawn with the Days family.'],
    ['Date picker (host.css): its own 252px popup, accent hover and range, 10px weekdays', 'This cell: neutral hover and range, a quieter today, 44px on a phone, 11px weekdays.'],
  ])}

<h4 class="ds-h4" id="calendar-alias">Aliases</h4>
<p class="ds-desc"><code>.day</code>, <code>.chip</code>, <code>.item</code> and <code>.n</code> are too general to alias (the Chips family already uses <code>.chip</code> for the choice chip), so the Calendar adds the <code>sdk-cal-</code> class beside the old one. The names that are the Calendar's alone take the look as they are.</p>
${tbl(['Component', 'New name', 'Older names'], [
    ['Cell', '<code>.sdk-cal-cell</code>', 'add beside <code>.day</code>'],
    ['Event chip', '<code>.sdk-cal-event</code>', 'add beside <code>.chip</code>'],
    ['Weekday name', '<code>.sdk-cal-dow</code>', '<code>.dow</code>'],
    ['Hour row', '<code>.sdk-cal-hour</code> <code>.sdk-cal-allday</code> <code>.sdk-cal-hr</code>', '<code>.hour</code> <code>.allday</code> <code>.hr</code>; now is <code>.hour.now</code>'],
    ['The kept bar', '<code>.sdk-bar-kept</code> (Cards)', '<code>.item.ext</code> <code>.item.marker</code> <code>.chip.ext</code> <code>.chip.marker</code>'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="calendar-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--cal-hover</code> <code>--cal-press</code>', '10%, 16%', 'The share of <code>--text</code> over the cell for hover and pressed. Proposed tokens (the Menus\' hover value).'],
    ['<code>--cal-today</code>', '14%', 'The share of <code>--accent</code> over the cell for today: the selected fill at half strength.'],
    ['<code>--cal-tint</code>', '22%', 'The share of the event\'s tone in its chip.'],
    ['<code>--cal-out</code>', '0.55', 'Opacity outside the month.'],
    ['<code>--cal-pick</code> <code>--cal-cell-h</code>', '30px (44px on a phone), 74px', 'The picker cell and the minimum month cell height.'],
    ['<code>--bg-card</code> <code>--border</code> <code>--accent</code> <code>--on-accent</code> <code>--selected-bg</code> <code>--tint-*</code>', 'the theme\'s', 'Everything else.'],
  ])}

<h4 class="ds-h4" id="calendar-contract">Markup</h4>
${code(`<div class="sdk-cal-grid" role="grid" aria-label="October 2026">
  <div class="sdk-cal-dow" role="columnheader">Mon</div> ...
  <div class="sdk-cal-cell is-today" role="gridcell" tabindex="0" aria-current="date" aria-label="20 October, 4 events">
    <span class="sdk-cal-n">20</span>
    <span class="sdk-cal-chips">
      <button class="sdk-cal-event" data-tint="green">Book the hotel</button>
      <button class="sdk-cal-event sdk-bar-kept is-ext" data-tint="orange">Dinner</button>  <!-- the kept exception -->
    </span>
  </div>
</div>
<!-- a picker cell: class="sdk-cal-cell sdk-cal-pick"; a chosen day: aria-selected="true" -->`)}
${dim([
    ['State classes', '<code>.is-today</code>, <code>.is-selected</code> or <code>aria-selected="true"</code>, <code>.in-range</code>, <code>.is-other</code>, <code>.is-linked</code>, <code>.is-drop</code>. The hour row: <code>.is-now</code>.'],
    ['Keys', 'Roving tab index; arrows, Home, End, Enter and Space as above. The module does the moving; the look is here.'],
    ['The exception', '<code>.sdk-bar-kept</code> on a Calendar agenda row or chip of another calendar or a marker. Nowhere else.'],
  ])}

<h4 class="ds-h4" id="calendar-decide">What Thomas chooses</h4>
${tbl(['Chosen here', 'Why', 'Other way'], [
    ['The event chip is 18px high, not the Chips tag\'s 24px', 'A 74px cell holds two or three chips; 24px holds one.', 'Keep 24px and show one chip and "+n more".'],
    ['Today is the accent at 14% over the cell, not the translucent <code>--selected-bg</code> at half alpha', 'The cell keeps its card fill underneath; the result is the same colour as the picker\'s today over its popover.', 'A translucent fill over the panel.'],
    ['The link marker (was <code>.day.pick</code>) is the full selected fill with the word "Linked"', 'The brief asks for the neutral selected fill and a text marker; the word is mine.', 'Another word, or the half-strength fill.'],
    ['"Now" is a status label with a clock and the selected fill', 'Colour must not be the only cue.', 'The fill alone.'],
    ['Other calendars\' chips are not italic', 'Italics are not bundled.', 'Bundle an italic.'],
    ['The compact month\'s dots: ours accent, other calendars dim, markers in their tint', 'A 1.5px ring is a coloured edge.', 'One dot colour.'],
    ['The phase wash on a Calendar day is not drawn or changed', 'The plan keeps it (decision 8). How it sits with the half-strength today is Thomas\'s call.', 'Draw a phase label in the cell.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + CL_CSS, onload: gridKeys }, o || {}));
    slot('states').appendChild(F(statesBody(), 'Calendar, cell states'));
    slot('month').appendChild(F(monthBody(), 'Calendar, month'));
    slot('week').appendChild(F(weekBody(), 'Calendar, week'));
    slot('compact').appendChild(F(compactBody(), 'Calendar, compact', { pinWidth: 360 }));
    slot('agenda').appendChild(F(agendaBody(), 'Calendar, agenda and the kept bar'));
    slot('hours').appendChild(F(hourBody(), 'Calendar, day view'));
    slot('picker').appendChild(F(pickerBody(), 'Calendar, date picker'));
    slot('phone').appendChild(F(phoneBody(), 'Calendar, on a phone', { pinWidth: 390 }));
    slot('contrast').appendChild(F(contrastBody(), 'Calendar, contrast', { onload: measureContrast }));
    slot('alias').appendChild(F(aliasBody(), 'Calendar, aliases'));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'calendar', covers: ['calendar', 'cell', 'month', 'week', 'date-picker', 'agenda', 'hour'], group: 'Content', name: 'Calendar cells', status: 'proposed',
    words: 'calendar cell cells month week day compact agenda hour now today selected chosen range hover focus picker date event chip tag exception left bar keyboard arrows link pick phase wash', render: renderCalendar,
  });
})();
