  // The Budget module's model: no page in it, so the page and tools/check-budget.mjs can both use it. A cost is one stored
  // value (`cost:<id>`): { title, category, categoryName, planned?, actual?, amount?, done, paidBy?, sharedBy?, date?, notes,
  // by, ref? }. `planned` is the amount expected and `actual` the amount paid, either may be left out. `amount` (the amount
  // to show: what was paid, else what is planned), `done` (it has been paid) and `categoryName` (the category's words when
  // it was saved) are kept as fields of their own so the cost's summary can name them for other modules. `paidBy` is a
  // person's key; `sharedBy` the keys of the people it is shared by (none: everyone in the space). Amounts are in the
  // space's one currency, positive, at most 12 digits, rounded to cents. The page defines `word` (host.util.word) ahead of this
  // code, as the check does. Money is worked out in whole cents so the
  // totals and the settle-up never drift.
  const COST_PREFIX = 'cost:';
  const CATEGORY_ID = /^[a-z][a-z0-9-]{0,29}$/;
  const MAX_AMOUNT = 1e12;
  const TINTS = ['blue', 'green', 'teal', 'purple', 'orange', 'pink', 'gold', 'red'];
  const AUTO_COLOR = '#888888';

  const oneLine = (x, n) => String(x == null ? '' : x).replace(/[\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const toCents = (n) => Math.round(Number(n) * 100);
  const fromCents = (c) => Math.round(c) / 100;

  // An amount as stored: a positive number below 1e12, rounded to cents; null for anything else (empty included).
  function cleanAmount(x) {
    if (x === null || x === undefined || x === '' || typeof x === 'boolean') return null;
    const n = Number(x);
    if (!Number.isFinite(n)) return null;
    const r = Math.round(n * 100) / 100;
    return r > 0 && r < MAX_AMOUNT ? r : null;
  }
  // What a person typed in an amount field: '' is none (null), a good amount is the number, anything else is undefined.
  // "1,234.50", "12,5" and "$ 40" are read.
  function readAmount(text) {
    let t = String(text == null ? '' : text).trim();
    if (!t) return null;
    t = t.replace(/[\s $€£¥]/g, '');
    // Both marks: the last one is the decimal point and the other must group thousands ('1.234,56' and '1,234.56' are
    // 1234.56); anything else is refused rather than read as some other number.
    if (t.includes(',') && t.includes('.')) {
      if (/^\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
      else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(t)) t = t.replace(/,/g, '');
      else return undefined;
    } else if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');
    else t = t.replace(/,/g, '');
    if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return undefined;
    const n = cleanAmount(t);
    return n === null ? undefined : n;
  }

  // --- days (YYYY-MM-DD, plain days: no time zone enters) ------------------------------------------------------------
  const isDay = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };
  const dayNum = (s) => Math.round(Date.parse(`${s}T00:00:00Z`) / 86400000);
  const dayOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10);

  // --- the cost -------------------------------------------------------------------------------------------------------
  const cleanRef = (r) => (r && typeof r === 'object' && typeof r.module === 'string' && typeof r.kind === 'string' && typeof r.id === 'string'
    ? { module: r.module, kind: r.kind, id: r.id, ...(typeof r.scope === 'string' ? { scope: r.scope } : {}), ...(typeof r.space === 'string' ? { space: r.space } : {}) }
    : null);

  // A stored value as a cost, or null when it is not one.
  function cleanCost(id, v) {
    if (!v || typeof v !== 'object') return null;
    const title = oneLine(v.title, 120);
    if (!title) return null;
    return {
      id: String(id),
      title,
      category: typeof v.category === 'string' && CATEGORY_ID.test(v.category) ? v.category : 'other',
      planned: cleanAmount(v.planned),
      actual: cleanAmount(v.actual),
      paidBy: typeof v.paidBy === 'string' && v.paidBy && v.paidBy.length <= 64 ? v.paidBy : '',
      sharedBy: Array.isArray(v.sharedBy) ? [...new Set(v.sharedBy.filter((k) => typeof k === 'string' && k && k.length <= 64))].slice(0, 50) : [],
      date: isDay(v.date) ? v.date : '',
      notes: String(v.notes == null ? '' : v.notes).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').slice(0, 1000),
      by: typeof v.by === 'string' ? v.by.slice(0, 64) : '',
      ref: cleanRef(v.ref),
    };
  }
  // What is stored for a cost. `categoryLabel` is the words of its category now. No field at all for what is empty, so a
  // cost with no date has no `when` in its summary.
  const costValue = (c, categoryLabel) => {
    const shown = c.actual !== null && c.actual !== undefined ? c.actual : c.planned;
    return {
      title: c.title,
      category: c.category,
      categoryName: oneLine(categoryLabel || '', 40),
      ...(c.planned ? { planned: c.planned } : {}),
      ...(c.actual ? { actual: c.actual } : {}),
      ...(shown ? { amount: shown } : {}),
      done: Boolean(c.actual),
      ...(c.paidBy ? { paidBy: c.paidBy } : {}),
      ...(c.sharedBy && c.sharedBy.length ? { sharedBy: c.sharedBy } : {}),
      ...(c.date ? { date: c.date } : {}),
      notes: c.notes || '',
      by: c.by || '',
      ...(c.ref ? { ref: c.ref } : {}),
    };
  };
  const amountOf = (c) => (c.actual ? c.actual : c.planned ? c.planned : 0);

  // What another module asks for through `addCost`: a checked cost, or an Error saying what is wrong. `people` are the keys
  // of the people in the space. `amount` alone is what was paid when the request names who paid, else what is planned.
  function costFromRequest(input, by, people) {
    const i = input || {};
    const title = oneLine(i.title, 120);
    if (!title) throw new Error('a cost needs a title');
    const has = (x) => x !== undefined && x !== null && x !== '';
    for (const k of ['amount', 'planned', 'actual']) if (has(i[k]) && cleanAmount(i[k]) === null) throw new Error(`the ${k} must be an amount above zero`);
    let planned = cleanAmount(i.planned);
    let actual = cleanAmount(i.actual);
    const payer = has(i.payer) ? String(i.payer) : '';
    if (payer && !(people || []).includes(payer)) throw new Error(`that person is not in this ${word('space')}`);
    const amount = cleanAmount(i.amount);
    if (amount !== null && planned === null && actual === null) { if (payer) actual = amount; else planned = amount; }
    if (has(i.date) && !isDay(i.date)) throw new Error('the date must be a day, such as 2026-10-14');
    const c = cleanCost('new', { title, category: i.category, planned, actual, paidBy: payer, date: i.date, notes: i.notes, by, ref: i.ref });
    if (!c) throw new Error('that is not a cost');
    return c;
  }

  // --- categories ------------------------------------------------------------------------------------------------------
  // The environment's list ([{ id, label, icon, color }]); `other` is always on it. A cost whose category is not on the
  // list is counted and shown under Other and is not rewritten.
  const DEFAULT_CATS = [
    { id: 'travel', label: 'Travel', icon: 'plane', color: AUTO_COLOR }, { id: 'lodging', label: 'Lodging', icon: 'bed', color: AUTO_COLOR },
    { id: 'food', label: 'Food', icon: 'utensils', color: AUTO_COLOR }, { id: 'supplies', label: 'Supplies', icon: 'box', color: AUTO_COLOR },
    { id: 'services', label: 'Services', icon: 'screwdriver-wrench', color: AUTO_COLOR }, { id: 'fees', label: 'Fees', icon: 'receipt', color: AUTO_COLOR },
    { id: 'other', label: 'Other', icon: 'tag', color: AUTO_COLOR },
  ];
  function cleanCategories(v) {
    const list = Array.isArray(v) ? v.filter((c) => c && typeof c.id === 'string' && CATEGORY_ID.test(c.id) && typeof c.label === 'string' && c.label.trim()) : [];
    const seen = new Set();
    const out = list.filter((c) => !seen.has(c.id) && seen.add(c.id)).map((c) => ({ id: c.id, label: oneLine(c.label, 30), icon: typeof c.icon === 'string' && c.icon ? c.icon : 'tag', color: typeof c.color === 'string' && c.color ? c.color : AUTO_COLOR }));
    if (!out.length) return DEFAULT_CATS;
    return out.some((c) => c.id === 'other') ? out : [...out, DEFAULT_CATS[DEFAULT_CATS.length - 1]];
  }
  const catRow = (cats, id) => cats.find((c) => c.id === id) || cats.find((c) => c.id === 'other') || DEFAULT_CATS[DEFAULT_CATS.length - 1];
  // The colour of a category: the one chosen in the list, else one of the eight tints by its place in the list. A CSS value
  // made of a token or a colour the owner picked, never a colour of our own.
  function toneOf(cats, id) {
    const row = catRow(cats, id);
    const hex = String(row.color || '').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(hex) && hex !== AUTO_COLOR) return hex;
    const at = Math.max(0, cats.findIndex((c) => c.id === row.id));
    return `var(--tint-${TINTS[at % TINTS.length]})`;
  }

  // --- the totals -----------------------------------------------------------------------------------------------------
  // Spent is the sum of `actual`; planned the sum of `planned`; expected counts each cost once, by what was paid when it is
  // known, else what is planned. `target` is the space's amount or null: left is the target less spent (below zero when over).
  function totals(costs, target) {
    let spent = 0;
    let planned = 0;
    let expected = 0;
    for (const c of costs) {
      if (c.actual) spent += toCents(c.actual);
      if (c.planned) planned += toCents(c.planned);
      expected += toCents(c.actual || c.planned || 0);
    }
    const goal = target && Number(target) > 0 ? toCents(target) : 0;
    return { count: costs.length, spent: fromCents(spent), planned: fromCents(planned), expected: fromCents(expected), target: goal ? fromCents(goal) : null, left: goal ? fromCents(goal - spent) : null, over: goal ? spent > goal : false };
  }
  // Each category's costs, planned and paid, in the list's order (a category with no costs is there with zeros).
  function byCategory(costs, cats) {
    const rows = cats.map((c) => ({ id: c.id, label: c.label, icon: c.icon, count: 0, planned: 0, actual: 0 }));
    const at = new Map(rows.map((r) => [r.id, r]));
    const other = at.get('other') || rows[rows.length - 1];
    for (const c of costs) {
      const r = at.get(c.category) || other;
      r.count += 1;
      if (c.planned) r.planned += toCents(c.planned);
      if (c.actual) r.actual += toCents(c.actual);
    }
    return rows.map((r) => ({ ...r, planned: fromCents(r.planned), actual: fromCents(r.actual) }));
  }

  // --- the list: filter, sort, group ---------------------------------------------------------------------------------
  function filterCosts(costs, cats, f) {
    const q = String((f && f.text) || '').trim().toLowerCase();
    return costs.filter((c) => (!f || !f.category || catRow(cats, c.category).id === f.category)
      && (!f || !f.payer || (f.payer === '-' ? !c.paidBy : c.paidBy === f.payer))
      && (!q || [c.title, c.notes].some((t) => String(t).toLowerCase().includes(q))));
  }
  const SORTS = ['date-asc', 'date-desc', 'amount-desc', 'amount-asc', 'title'];
  function sortCosts(costs, how) {
    const by = (a, b) => String(a.title).localeCompare(String(b.title)) || String(a.id).localeCompare(String(b.id));
    const dated = (dir) => (a, b) => (a.date && b.date ? dir * a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0) || by(a, b);
    const cmp = how === 'date-desc' ? dated(-1) : how === 'amount-desc' ? (a, b) => amountOf(b) - amountOf(a) || by(a, b) : how === 'amount-asc' ? (a, b) => amountOf(a) - amountOf(b) || by(a, b) : how === 'title' ? by : dated(1);
    return costs.slice().sort(cmp);
  }
  // Groups for the Costs list: by day (days in order, "no date" last) or by category (the list's order). Each group has the
  // costs in the order given, and what they come to (paid, and expected).
  function groupCosts(costs, cats, by, dir) {
    const groups = new Map();
    const put = (key, label, c) => {
      if (!groups.has(key)) groups.set(key, { key, label, costs: [] });
      groups.get(key).costs.push(c);
    };
    for (const c of costs) {
      if (by === 'category') { const r = catRow(cats, c.category); put(r.id, r.label, c); } else put(c.date || '', c.date || '', c);
    }
    let list = [...groups.values()];
    if (by === 'category') list.sort((a, b) => cats.findIndex((c) => c.id === a.key) - cats.findIndex((c) => c.id === b.key));
    else list.sort((a, b) => (a.key && b.key ? (dir === 'desc' ? -1 : 1) * a.key.localeCompare(b.key) : a.key ? -1 : b.key ? 1 : 0));
    return list.map((g) => ({ ...g, total: totals(g.costs) }));
  }

  // --- who owes whom -------------------------------------------------------------------------------------------------
  // A cost with an actual amount and a payer was paid by one person and is shared by the people in `sharedBy` (everyone in
  // the space when it names nobody). Returns each person's paid, share and net (positive: owed money), the total, and the
  // fewest payments that settle it. Amounts are in the space's one currency, rounded to cents: an amount that does not
  // divide evenly leaves the extra cents with the first people, so shares always add up to what was paid.
  function balances(costs, people) {
    const keys = people.slice();
    const paid = {};
    const share = {};
    let total = 0;
    for (const c of costs) {
      if (!c.actual || !c.paidBy) continue;
      const among = (c.sharedBy && c.sharedBy.length ? c.sharedBy : keys).filter(Boolean);
      if (!among.length) continue;
      const amount = toCents(c.actual);
      total += amount;
      paid[c.paidBy] = (paid[c.paidBy] || 0) + amount;
      const each = Math.floor(amount / among.length);
      let rest = amount - each * among.length;
      for (const k of among) { share[k] = (share[k] || 0) + each + (rest > 0 ? 1 : 0); if (rest > 0) rest -= 1; }
    }
    const everyone = [...new Set([...keys, ...Object.keys(paid), ...Object.keys(share)])];
    const net = {};
    for (const k of everyone) net[k] = (paid[k] || 0) - (share[k] || 0);
    const owed = everyone.filter((k) => net[k] > 0).map((k) => [k, net[k]]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const owing = everyone.filter((k) => net[k] < 0).map((k) => [k, -net[k]]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const payments = [];
    let i = 0;
    let j = 0;
    while (i < owing.length && j < owed.length) {
      const amount = Math.min(owing[i][1], owed[j][1]);
      if (amount > 0) payments.push({ from: owing[i][0], to: owed[j][0], amount: amount / 100 });
      owing[i][1] -= amount;
      owed[j][1] -= amount;
      if (owing[i][1] === 0) i += 1;
      if (owed[j][1] === 0) j += 1;
    }
    const out = { total: total / 100, paid: {}, share: {}, net: {}, payments };
    for (const k of everyone) { out.paid[k] = (paid[k] || 0) / 100; out.share[k] = (share[k] || 0) / 100; out.net[k] = net[k] / 100; }
    return out;
  }
  // Settle up shows only when some cost has a payer and the space has more than one person.
  const settleShows = (costs, people) => people.length > 1 && costs.some((c) => Boolean(c.paidBy));

  // --- the burndown ----------------------------------------------------------------------------------------------------
  // The target left over time. `dates` are the space's phase dates, { <id>: { start?, end? } }: the range runs from the
  // earliest day among them to the latest, else from the costs' first date to their last; a cost dated outside it widens
  // the range, so nothing is hidden. `actual` starts at the target and steps down by each cost's paid amount on its day (a
  // cost on the first day is a step at the left edge); `expected` steps down by what is paid, else planned. A cost with no
  // date is taken off before the first step (`undated` says how many). null when there
  // is no target or no day to draw from.
  function burndown(costs, o) {
    const target = o && Number(o.target) > 0 ? toCents(o.target) : 0;
    if (!target) return null;
    const days = [];
    for (const v of Object.values((o && o.dates) || {})) for (const d of [v && v.start, v && v.end]) if (isDay(d)) days.push(d);
    const phased = days.length > 0;
    for (const c of costs) if (c.date && (c.actual || c.planned)) days.push(c.date);
    if (!days.length) return null;
    days.sort();
    const from = days[0];
    let to = days[days.length - 1];
    if (to === from) to = dayOf(dayNum(from) + 1);
    const series = (pick) => {
      const undated = costs.filter((c) => !c.date).reduce((s, c) => s + toCents(pick(c)), 0);
      const byDay = new Map();
      for (const c of costs) if (c.date && pick(c)) byDay.set(c.date, (byDay.get(c.date) || 0) + toCents(pick(c)));
      let left = target - undated;
      const points = [{ day: from, remaining: fromCents(left) }];
      for (const d of [...byDay.keys()].sort()) {
        left -= byDay.get(d);
        points.push({ day: d, remaining: fromCents(left) });
      }
      return points;
    };
    const actual = series((c) => c.actual || 0);
    const expected = series((c) => c.actual || c.planned || 0);
    const low = Math.min(...actual.map((p) => p.remaining), ...expected.map((p) => p.remaining), 0);
    const undated = costs.filter((c) => !c.date && (c.actual || c.planned)).length;
    return { from, to, phased, target: fromCents(target), actual, expected, low, high: fromCents(target), undated, endActual: actual[actual.length - 1].remaining, endExpected: expected[expected.length - 1].remaining };
  }
  // The burndown in words, for a screen reader and under the chart. `say(day)` words a day, `money(n)` an amount.
  function burndownWords(b, say, money) {
    if (!b) return '';
    const parts = [`Target left, from ${say(b.from)} to ${say(b.to)}. The target is ${money(b.target)}.`];
    parts.push(b.endActual < 0 ? `Paid so far is ${money(-b.endActual)} over the target.` : `After what is paid, ${money(b.endActual)} is left.`);
    if (b.endExpected !== b.endActual) parts.push(b.endExpected < 0 ? `With the planned costs it is ${money(-b.endExpected)} over.` : `With the planned costs, ${money(b.endExpected)} is left.`);
    const steps = b.actual.slice(1);
    if (steps.length) parts.push(`Payments on ${steps.length} ${steps.length === 1 ? 'day' : 'days'}: ${steps.slice(0, 5).map((p) => `${say(p.day)}, ${money(p.remaining)} left`).join('; ')}${steps.length > 5 ? '; and more' : ''}.`);
    if (b.undated) parts.push(`${b.undated} ${b.undated === 1 ? 'cost has' : 'costs have'} no date and ${b.undated === 1 ? 'is' : 'are'} counted from the first day.`);
    return parts.join(' ');
  }

  // --- the target ------------------------------------------------------------------------------------------------------
  // What the Overview offers for the target, and to whom. `can` is whether this person may change it (the space's owner,
  // the admin, or a moderator of the space: host.budget.can()); everyone else sees it read-only, and never an Edit target.
  function targetView(can, target) {
    const amount = target && Number(target.amount) > 0 ? Number(target.amount) : null;
    return { amount, currency: (target && target.currency) || '', readOnly: !can, action: can ? (amount ? 'edit' : 'set') : null };
  }
  // The target to send for what the form holds. A currency alone replaces the whole target on the server, so an amount that
  // is left empty is the person's choice to have none, and the form always starts with the stored amount in its field:
  // the amount is sent whenever the field holds one. `null` when there is nothing to send (no amount, no currency).
  function targetToSend(amount, currency) {
    const code = String(currency || '').trim().toUpperCase();
    const a = cleanAmount(amount);
    if (a !== null) return { amount: a, ...(/^[A-Z]{3}$/.test(code) ? { currency: code } : {}) };
    return /^[A-Z]{3}$/.test(code) ? { currency: code } : null;
  }

  // --- what Budget tells the space's status strip (host.facts) ----------------------------------------------------------
  // One fact, `spent`, marked `budget`: "Spent $X" with no target, "$X of $Y" with one (with a progress fill, "$Z left" or
  // "over" with a warning icon). `target` is the space's { amount?, currency? } or null; `currency` the space's currency
  // when the target names none; `money(amount, code)` words an amount. A target in another currency than the costs' is shown, not
  // compared. The words are cut to the strip's 40 characters (24 for the value) as a person counts them.
  const cutText = (s, n) => { const cps = [...String(s)]; return cps.length > n ? `${cps.slice(0, n - 1).join('')}…` : String(s); };
  function stripFacts({ costs = [], target = null, currency = '', money }) {
    const spent = totals(costs).spent;
    const goal = target && Number(target.amount) > 0 ? Number(target.amount) : 0;
    const goalCode = goal ? String(target.currency || currency || '').toUpperCase() : '';
    const sameCode = !goal || !target.currency || goalCode === String(currency || '').toUpperCase();
    if (!goal) return [{ id: 'spent', icon: 'coins', text: cutText(`Spent ${money(spent, currency)}`, 40), order: 10, budget: true }];
    if (!sameCode) return [{ id: 'spent', icon: 'coins', text: cutText(`${money(spent, currency)} of ${money(goal, goalCode)}`, 40), value: 'Another currency', order: 10, budget: true }];
    const over = spent > goal;
    return [{
      id: 'spent',
      icon: over ? 'circle-exclamation' : 'coins',
      text: cutText(`${money(spent, currency)} of ${money(goal, currency)}${over ? ' · over' : ''}`, 40),
      value: cutText(over ? `${money(Math.round((spent - goal) * 100) / 100, currency)} over` : `${money(Math.round((goal - spent) * 100) / 100, currency)} left`, 24),
      progress: Math.min(1, Math.round((spent / goal) * 1000) / 1000),
      order: 10,
      budget: true,
    }];
  }
  // The status line: "14 costs · $3,120 expected".
  function statusWords(costs, money) {
    const t = totals(costs);
    return t.count ? `${t.count} ${t.count === 1 ? 'cost' : 'costs'} · ${money(t.expected)} expected` : 'No costs yet';
  }
