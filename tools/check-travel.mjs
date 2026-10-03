#!/usr/bin/env node
/*
 * check-travel.mjs -- run the Travel module's model (modules/travel/src/travel-lib.js) on its own.
 * The library is written to be inlined into a module page, so it is loaded here as a function body with the two
 * date helpers a page gets from the SDK.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (name) => fs.readFileSync(new URL(`../modules/travel/src/${name}`, import.meta.url), 'utf8');
// In the build's order: travel-lib.js, then travel-lib-*.js by name.
const src = read('travel-lib.js') + '\n' + read('travel-lib-object.js') + '\n' + read('travel-lib-plan.js');
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const names = ['bookings', 'balances', 'summaryWhen', 'TRIP_KEY', 'PLAN_PREFIX', 'OLD_PLAN_PREFIX', 'MOVED_KEY', 'PHASES_MOVED_KEY', 'planIdOf', 'createPlan', 'cleanTrip', 'cleanItem', 'coverTrip', 'coverDaysOf', 'tripDays', 'planDays', 'dayLabel', 'daysUntil', 'sortDay', 'itemsByDay', 'orderBetween', 'renumber', 'placeUntimed', 'nudge', 'gapMinutes', 'gapText', 'stayNights', 'MODES', 'STOP_TYPES', 'STAY_TYPES', 'TRAVEL_MODES', 'jointOrder', 'lineOf', 'joints', 'sortLine', 'placeFields', 'tripBounds', 'tileOf', 'fromTile', 'cardOf', 'TILES', 'LEG_ICONS', 'JOURNEY_TILES', 'KICKERS', 'BADGES', 'splitMinutes', 'joinMinutes', 'legsOf', 'returnOf', 'outboundOf', 'returnBefore', 'costItems', 'MAX_MINUTES', 'arrivalOf', 'laterText', 'effectiveStart', 'currentPhase', 'phaseOf', 'phaseLine', 'planName', 'createdDay', 'fitsPlan', 'objectFields', 'minutesBetween', 'arrivalFits', 'shiftArrives', 'relativeArrives', 'datedArrives'];
const lib = new Function('ymd', 'parseYmd', `${src}\nreturn { ${names.join(', ')} };`)(ymd, parseYmd);
// The SDK's own text and time helpers (host.util.plain and host.util.localWhen in public/sdk/host.js), which the plan is given.
const sdkText = (() => {
  const win = { addEventListener() {}, location: { search: '' } };
  win.parent = win;
  new Function('window', 'document', fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8'))(win, { createElement: (tag) => ({ tag }) });
  return win.hostText;
})();
const { plain, localWhen } = sdkText;

let n = 0;
const test = (name, fn) => { fn(); n += 1; };

test('cleanItem needs a title, keeps good fields and drops bad ones', () => {
  assert.equal(lib.cleanItem({ kind: 'stop', title: '' }), null);
  const i = lib.cleanItem({ id: 'a', kind: 'stop', title: ' Museum ', date: '2026-10-03', time: '09:30', minutes: 90, category: 'nope', order: 5 });
  assert.equal(i.title, 'Museum');
  assert.equal(i.date, '2026-10-03');
  assert.equal(i.time, '09:30');
  assert.equal(i.category, 'do');
  assert.equal(lib.cleanItem({ id: 'b', title: 'x', date: '2026-02-30' }).date, null);
  assert.equal(lib.cleanItem({ id: 'b', title: 'x', time: '25:00' }).time, null);
  assert.equal(lib.cleanItem({ id: 'c', kind: 'stay', title: 'Hotel' }).category, 'stay');
  assert.equal(lib.cleanItem({ id: 'c', kind: 'journey', title: 'Train' }).category, 'travel');
});

test('a link item needs a pointer and may have no title', () => {
  assert.equal(lib.cleanItem({ id: 'l', kind: 'link' }), null);
  const l = lib.cleanItem({ id: 'l', kind: 'link', ref: { module: 'calendar', kind: 'event', id: 'e1', scope: 'space', space: 'lobby' } });
  assert.deepEqual(l.ref, { module: 'calendar', kind: 'event', id: 'e1', scope: 'space', space: 'lobby' });
  assert.equal(l.pinned, false);
  assert.equal(lib.cleanItem({ id: 'l', kind: 'link', ref: l.ref, pinned: true }).pinned, true);
  assert.equal(lib.cleanItem({ id: 's', kind: 'stop', title: 'Museum', pinned: true }).pinned, true);
  assert.equal(lib.cleanItem({ id: 's', kind: 'stop', title: 'Museum' }).pinned, false);
});

test('a stay cannot check out before it checks in', () => {
  assert.equal(lib.cleanItem({ id: 's', kind: 'stay', title: 'Hotel', date: '2026-10-05', checkOut: '2026-10-03' }).checkOut, null);
  assert.equal(lib.stayNights(lib.cleanItem({ id: 's', kind: 'stay', title: 'Hotel', date: '2026-10-05', checkOut: '2026-10-08' })), 3);
});

test('tripDays runs from start to end, across a month, and is capped', () => {
  assert.deepEqual(lib.tripDays({ start: '2026-09-29', end: '2026-10-02' }), ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  assert.deepEqual(lib.tripDays({ start: '2026-10-02', end: '2026-10-01' }), []);
  assert.deepEqual(lib.tripDays({}), []);
  assert.equal(lib.tripDays({ start: '2026-01-01', end: '2027-12-31' }).length, 60);
});

test('coverTrip grows the first and last day to include given dates, and never shrinks', () => {
  const trip = { start: '2026-10-03', end: '2026-10-05' };
  assert.deepEqual(lib.coverTrip(trip, ['2026-10-01']), { start: '2026-10-01', end: '2026-10-05' });
  assert.deepEqual(lib.coverTrip(trip, ['2026-10-07']), { start: '2026-10-03', end: '2026-10-07' });
  assert.deepEqual(lib.coverTrip(trip, ['2026-10-01', '2026-10-08']), { start: '2026-10-01', end: '2026-10-08' });
  assert.equal(lib.coverTrip(trip, ['2026-10-03', '2026-10-05', '2026-10-04']), null);
  assert.equal(lib.coverTrip(trip, [null, 'not-a-day', '']), null);
  assert.equal(lib.coverTrip(null, ['2026-10-01']), null);
  assert.equal(lib.coverTrip({}, ['2026-10-01']), null);
  const stay = lib.cleanItem({ id: 's', kind: 'stay', title: 'Hotel', date: '2026-10-05', checkOut: '2026-10-08' });
  assert.deepEqual(lib.coverDaysOf(stay), ['2026-10-05', '2026-10-08']);
  const flight = lib.cleanItem({ id: 'f', kind: 'journey', title: 'Night flight', date: '2026-10-05', time: '22:00', minutes: 180 });
  assert.deepEqual(lib.coverDaysOf(flight), ['2026-10-05', '2026-10-06']);
});

test('coverTrip will not grow a trip past 60 days, and names the days it leaves off', () => {
  const trip = { start: '2026-01-01', end: '2026-01-10' };
  assert.deepEqual(lib.coverTrip(trip, ['2026-03-01']), { start: '2026-01-01', end: '2026-03-01' });
  assert.deepEqual(lib.coverTrip(trip, ['2026-03-02']), { outside: ['2026-03-02'] });
  assert.deepEqual(lib.coverTrip({ start: '2026-01-01', end: '2026-03-01' }, ['2025-12-31']), { outside: ['2025-12-31'] });
  assert.equal(lib.coverTrip({ start: '2026-01-01', end: '2026-03-01' }, ['2026-02-01']), null);
  const both = lib.coverTrip(trip, ['2026-01-20', '2026-06-01']);
  assert.deepEqual(both, { start: '2026-01-01', end: '2026-01-20', outside: ['2026-06-01'] });
});

test('dayLabel says which day of how many', () => {
  const days = lib.tripDays({ start: '2026-09-29', end: '2026-10-05' });
  assert.equal(lib.dayLabel('2026-10-01', days).position, 'Day 3 of 7');
});

test('daysUntil counts to the start, negative once it has begun', () => {
  assert.equal(lib.daysUntil({ start: '2026-10-01' }, '2026-09-20'), 11);
  assert.equal(lib.daysUntil({ start: '2026-10-01' }, '2026-10-03'), -2);
  assert.equal(lib.daysUntil({}, '2026-10-03'), null);
});

const it = (id, extra) => lib.cleanItem({ id, title: id, date: '2026-10-01', ...extra });

test('sortDay puts the untimed first in hand order, then the timed by time', () => {
  const sorted = lib.sortDay([it('late', { time: '18:00' }), it('b', { order: 2000 }), it('early', { time: '08:15' }), it('a', { order: 1000 })]);
  assert.deepEqual(sorted.map((i) => i.id), ['a', 'b', 'early', 'late']);
});

test('itemsByDay groups by day, keeps ideas apart and drops days outside the trip', () => {
  const days = ['2026-10-01', '2026-10-02'];
  const by = lib.itemsByDay([it('a'), it('b', { date: '2026-10-02' }), it('idea', { date: null }), it('out', { date: '2026-11-01' })], days);
  assert.deepEqual(by.get('2026-10-01').map((i) => i.id), ['a']);
  assert.deepEqual(by.get('2026-10-02').map((i) => i.id), ['b']);
  assert.deepEqual(by.get(null).map((i) => i.id), ['idea']);
  assert.equal([...by.values()].flat().some((i) => i.id === 'out'), false);
});

test('a linked object is placed by its summary when it has no day of its own', () => {
  const l = lib.cleanItem({ id: 'l', kind: 'link', ref: { module: 'calendar', kind: 'event', id: 'e', scope: 'environment' } });
  const by = lib.itemsByDay([l], ['2026-10-01', '2026-10-02'], (i) => i.date || '2026-10-02');
  assert.equal(by.get('2026-10-02').length, 1);
});

test('orderBetween finds a number, or says the day needs renumbering', () => {
  assert.equal(lib.orderBetween(undefined, undefined), 1000);
  assert.equal(lib.orderBetween(1000, undefined), 2000);
  assert.equal(lib.orderBetween(undefined, 1000), 0);
  assert.equal(lib.orderBetween(1000, 2000), 1500);
  assert.equal(lib.orderBetween(1, 1 + 1e-9), null);
});

test('placeUntimed puts an item between neighbours and renumbers when squeezed', () => {
  const a = it('a', { order: 1000 }); const b = it('b', { order: 2000 }); const m = it('m', { order: 9000, date: '2026-10-02' });
  assert.deepEqual(lib.placeUntimed([a, b], m, '2026-10-01', 1), { m: { date: '2026-10-01', order: 1500 } });
  assert.deepEqual(lib.placeUntimed([], m, '2026-10-01', 0), { m: { date: '2026-10-01', order: 1000 } });
  const c = it('c', { order: 1 }); const d = it('d', { order: 1 + 1e-9 });
  const changes = lib.placeUntimed([c, d], m, '2026-10-01', 1);
  assert.equal(changes.m.order, 2000);
  assert.equal(changes.d.order, 3000);
});

test('nudge swaps untimed neighbours and moves a timed item by half an hour', () => {
  const a = it('a', { order: 1000 }); const b = it('b', { order: 2000 }); const t = it('t', { time: '09:00' });
  assert.deepEqual(lib.nudge([a, b, t], b, -1), { b: { order: 1000 }, a: { order: 2000 } });
  assert.equal(lib.nudge([a, b, t], a, -1), null);
  assert.deepEqual(lib.nudge([a, b, t], t, 1), { t: { time: '09:30' } });
  assert.equal(lib.nudge([a, b, it('z', { time: '23:45' })], it('z', { time: '23:45' }), 1), null);
});

test('gaps are the minutes between the end of one timed item and the next start', () => {
  assert.equal(lib.gapMinutes(it('a', { time: '09:00', minutes: 60 }), it('b', { time: '10:45' })), 45);
  assert.equal(lib.gapMinutes(it('a', { time: '09:00', minutes: 120 }), it('b', { time: '10:45' })), null);
  assert.equal(lib.gapMinutes(it('a'), it('b', { time: '10:45' })), null);
  assert.equal(lib.gapText(45), '45 min');
  assert.equal(lib.gapText(120), '2 h');
  assert.equal(lib.gapText(135), '2 h 15 min');
});

test('a summary says when in a day, a moment or milliseconds', () => {
  assert.deepEqual(lib.summaryWhen({ when: '2026-10-03' }), { day: '2026-10-03', time: '' });
  const d = new Date(2026, 9, 3, 18, 30);
  assert.deepEqual(lib.summaryWhen({ when: d.toISOString() }), { day: '2026-10-03', time: '18:30' });
  assert.deepEqual(lib.summaryWhen({ when: d.getTime() }), { day: '2026-10-03', time: '18:30' });
  assert.deepEqual(lib.summaryWhen({ when: new Date(2026, 9, 3, 0, 0).getTime() }), { day: '2026-10-03', time: '' }); // local midnight: no time of day
  assert.deepEqual(lib.summaryWhen({ when: d.toISOString(), allDay: true }), { day: '2026-10-03', time: '' });
  assert.equal(lib.summaryWhen({}), null);
  assert.equal(lib.summaryWhen({ when: 'soon' }), null);
});

test('bookings are stays and journeys by date and time', () => {
  const list = [it('a', { kind: 'stop', date: '2026-10-01' }), it('s', { kind: 'stay', date: '2026-10-02' }), it('j2', { kind: 'journey', date: '2026-10-01', time: '18:00' }), it('j1', { kind: 'journey', date: '2026-10-01', time: '08:00' })];
  assert.deepEqual(lib.bookings(list).map((i) => i.id), ['j1', 'j2', 's']);
});

test('balances share a cost among its owners (or everyone) and settle in the fewest payments', () => {
  const people = ['a', 'b', 'c'];
  const dinner = it('d', { cost: 90, paidBy: 'a' }); // shared by all three: 30 each
  const taxi = it('t', { cost: 20, paidBy: 'b', owners: ['b', 'c'] }); // 10 each
  const r = lib.balances([dinner, taxi, it('free')], people);
  assert.equal(r.total, 110);
  assert.deepEqual(r.net, { a: 60, b: -20, c: -40 });
  assert.deepEqual(r.payments.map((p) => [p.from, p.to, p.amount]), [['c', 'a', 40], ['b', 'a', 20]]);
  // odd cents are handed out, not lost
  const odd = lib.balances([it('o', { cost: 10, paidBy: 'a' })], people);
  assert.equal(Math.round((odd.share.a + odd.share.b + odd.share.c) * 100), 1000);
  assert.equal(lib.balances([it('x', { cost: 5 })], people).total, 0); // no payer: not counted
});

test('a trip has an optional three-letter currency, an item an optional cost', () => {
  assert.equal(lib.cleanTrip({ start: '2026-10-01', currency: 'eur' }).currency, 'EUR');
  assert.equal(lib.cleanTrip({ start: '2026-10-01', currency: 'euros' }).currency, '');
  assert.equal(it('c', { cost: 12.345 }).cost, 12.35);
  assert.equal(it('c', { cost: -3 }).cost, null);
});

// The trip's Currency picker (host.ui.currencySelect in public/sdk/host.js), on a stand-in <select>: the server's list, a
// first "" choice for the server's currency, and a stored code kept and selected even when the server would not take it.
await (async () => {
  const sdk = fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8');
  const win = { addEventListener() {}, location: { search: '' } };
  win.parent = win;
  // host.ready() adds the SDK's shared styles to the module's root once hello answers, so the stand-ins take a <style>.
  new Function('window', 'document', sdk)(win, { createElement: (tag) => ({ tag }) });
  const el = (tag) => ({ tag, value: '', textContent: '', label: '', children: [], append(...c) { this.children.push(...c); } });
  const doc = { createElement: el };
  const select = { ownerDocument: doc, children: [], _v: '', listeners: [],
    replaceChildren(...c) { this.children = c; this._v = ''; },
    options() { return this.children.flatMap((c) => (c.tag === 'optgroup' ? c.children : [c])); },
    get value() { return this._v; },
    set value(v) { this._v = this.options().some((o) => o.value === v) ? v : ''; },
    addEventListener(_e, fn) { this.listeners.push(fn); }, removeEventListener() {} };
  const locale = { language: 'en', clock: '12', currency: 'USD', currencies: ['EUR', 'JPY', 'USD', 'XAF'] };
  const { host } = win.createHost({ call: async (m) => (m === 'hello' ? { locale } : {}), root: { appendChild() {} }, rootElement: {} });
  await host.ready();
  const pick = host.ui.currencySelect(select, { value: '', empty: true });
  test('the trip Currency picker: empty is the server currency, Common then All, odd codes kept', () => {
    assert.equal(select.children[0].value, '');
    assert.equal(select.children[0].textContent, 'Default (USD)');
    assert.equal(select.value, '');
    assert.deepEqual(select.children[1].children.map((o) => o.value), ['USD', 'EUR', 'JPY']);
    assert.equal(select.children[1].label, 'Common');
    assert.deepEqual(select.children[2].children.map((o) => o.value), ['XAF']);
    pick.set('eur');
    assert.equal(pick.value, 'EUR');
    pick.set('XYZ');
    assert.equal(select.children[1].value, 'XYZ'); // shown before the groups, and selected
    assert.equal(pick.value, 'XYZ');
    delete locale.currencies; // a built-in fallback locale has no list: the browser's
    pick.set('GBP');
    assert.equal(pick.value, 'GBP');
  });
})();

// --- the plan, against a small stand-in for the SDK -------------------------------------------------------------

function fakeHost({ summaries = [], search = [], readOnly = false, phases = [], space = null } = {}) {
  const store = new Map(); // key -> { value, version }
  const handlers = { change: [] };
  const provided = {};
  let clock = 0;
  const objectKey = (r) => [r.module, r.kind, r.id, r.scope, r.space || ''].join('|');
  const refuse = () => { if (readOnly) throw Object.assign(new Error('you may not change this'), { status: 403 }); };
  const t = {
    user: { key: 'u1', name: 'Ann' },
    phases: () => phases,
    space: () => space,
    util: { id: () => 'id' + (++clock), objectKey, ymd, parseYmd, word: (k) => k, plain, localWhen },
    storage: {
      get: async (key) => (store.has(key) ? { key, ...store.get(key) } : null),
      list: async (prefix) => [...store].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, ...v })),
      // As the server: a version given must be the one stored (0 when there is none).
      set: async (key, value, o = {}) => {
        refuse();
        const cur = store.get(key);
        if (o.version !== undefined && (cur ? cur.version : 0) !== o.version) throw Object.assign(new Error('stale'), { status: 409 });
        const version = (cur ? cur.version : 0) + 1;
        store.set(key, { value, version });
        return { key, value, version };
      },
      delete: async (key, o = {}) => {
        refuse();
        const cur = store.get(key);
        if (cur && o.version !== undefined && cur.version !== o.version) throw Object.assign(new Error('stale'), { status: 409 });
        store.delete(key);
      },
    },
    on: (event, fn) => { (handlers[event] ||= []).push(fn); },
    objects: {
      resolve: async (refs) => refs.map((r) => summaries.find((c) => objectKey(c.ref) === objectKey(r)) || { error: 'gone' }),
      search: async () => search,
      make: (kind, id) => ({ module: 'travel', kind, id, scope: 'space' }),
    },
    actions: { provide: (h) => Object.assign(provided, h) },
  };
  return { t, store, provided, push: (e) => handlers.change.forEach((fn) => fn(e)) };
}

const run = async () => {
  const f = fakeHost();
  const plan = lib.createPlan(f.t);
  await plan.load();
  assert.equal(plan.trip, null);
  await plan.saveTrip({ title: 'Cabin', start: '2026-10-01', end: '2026-10-03' });
  assert.deepEqual(plan.days(), ['2026-10-01', '2026-10-02', '2026-10-03']);
  await assert.rejects(() => plan.addItem({ kind: 'stop', title: '' }));

  const a = await plan.addItem({ kind: 'stop', title: 'Hike', date: '2026-10-01' });
  const b = await plan.addItem({ kind: 'stop', title: 'Dinner', date: '2026-10-01' });
  assert.deepEqual(plan.byDay().get('2026-10-01').map((i) => i.title), ['Hike', 'Dinner']);
  n += 1;

  await plan.nudgeItem(b.id, -1);
  assert.deepEqual(plan.byDay().get('2026-10-01').map((i) => i.title), ['Dinner', 'Hike']);
  await plan.moveTo(a.id, '2026-10-02', 0);
  assert.deepEqual(plan.byDay().get('2026-10-02').map((i) => i.title), ['Hike']);
  assert.deepEqual(plan.byDay().get('2026-10-01').map((i) => i.title), ['Dinner']);
  n += 1;

  // a pointer whose object's summary has a time sorts by it
  const evc = { ref: { module: 'calendar', kind: 'event', id: 'ev9', scope: 'space', space: 'lobby' }, module: { id: 'calendar' }, title: 'Dinner', when: new Date(2026, 9, 1, 20, 0).toISOString() };
  const h = fakeHost({ summaries: [evc] });
  const plan3 = lib.createPlan(h.t);
  await plan3.load();
  await plan3.saveTrip({ start: '2026-10-01', end: '2026-10-02' });
  await plan3.addItem({ kind: 'stop', title: 'Lunch', date: '2026-10-01', time: '13:00' });
  await plan3.addItem({ kind: 'stop', title: 'Museum', date: '2026-10-01', time: '15:00' });
  await plan3.addLink(evc.ref, null);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(plan3.byDay().get('2026-10-01').map((i) => i.title || 'link'), ['Lunch', 'Museum', 'link']);
  n += 1;

  // two people: an edit to something changed meanwhile is refused and the newer copy is loaded
  await f.t.storage.set('plan:' + a.id, { ...f.store.get('plan:' + a.id).value, title: 'Long hike' }, {});
  await assert.rejects(() => plan.updateItem(a.id, { notes: 'x' }), (e) => e.conflict === true);
  assert.equal(plan.list().find((i) => i.id === a.id).title, 'Long hike');
  await plan.updateItem(a.id, { notes: 'x' });
  n += 1;

  // live changes from someone else
  f.push({ key: 'plan:zz', value: { kind: 'note', title: 'Bring cash', date: '2026-10-03', order: 1000 }, version: 1 });
  assert.equal(plan.byDay().get('2026-10-03').length, 1);
  f.push({ key: 'plan:zz', deleted: true });
  assert.equal(plan.byDay().get('2026-10-03').length, 0);
  n += 1;

  // what other modules may ask
  plan.provide();
  await f.provided.addStop({ title: 'Winning hotel', date: '2026-10-02' });
  assert.equal(plan.byDay().get('2026-10-02').some((i) => i.title === 'Winning hotel'), true);
  // acceptSuggestion: a recognised kind becomes the right sort of item; anything else (or none) is a plain stop
  await assert.rejects(() => f.provided.acceptSuggestion({ title: '' }));
  await f.provided.acceptSuggestion({ title: 'LIS to FAO', kind: 'flight', date: '2026-10-01', content: 'window seat', place: 'Lisbon airport' });
  const flight = plan.list().find((i) => i.title === 'LIS to FAO');
  assert.equal(flight.kind, 'journey');
  assert.equal(flight.mode, 'flight');
  assert.equal(flight.category, 'travel');
  assert.equal(flight.notes, 'window seat');
  assert.equal(flight.place, 'Lisbon airport');
  await f.provided.acceptSuggestion({ title: 'Seaside Inn', kind: 'hotel', date: '2026-10-01' });
  const stay = plan.list().find((i) => i.title === 'Seaside Inn');
  assert.equal(stay.kind, 'stay');
  assert.equal(stay.type, 'hotel');
  await f.provided.acceptSuggestion({ title: 'The old town', kind: 'sight', date: '2026-10-01' });
  const sight = plan.list().find((i) => i.title === 'The old town');
  assert.equal(sight.kind, 'stop');
  assert.equal(sight.type, 'sight');
  await f.provided.acceptSuggestion({ title: 'A surprise' });
  const plain = plan.list().find((i) => i.title === 'A surprise');
  assert.equal(plain.kind, 'stop');
  assert.equal(plain.type, null);
  await f.provided.acceptSuggestion({ title: 'Something odd', kind: 'nonsense' });
  assert.equal(plan.list().find((i) => i.title === 'Something odd').kind, 'stop');
  const ev = { ref: { module: 'calendar', kind: 'event', id: 'e1', scope: 'space', space: 'lobby' }, module: { id: 'calendar' }, title: 'Train', when: '2026-10-03' };
  const g = fakeHost({ summaries: [ev], search: [ev, { ...ev, ref: { ...ev.ref, id: 'e2' }, when: '2026-12-25' }, { ...ev, ref: { ...ev.ref, id: 'e3' }, module: { id: 'travel' } }] });
  const plan2 = lib.createPlan(g.t);
  await plan2.load();
  await plan2.saveTrip({ start: '2026-10-01', end: '2026-10-03' });
  const sug = await plan2.suggest();
  assert.deepEqual(sug.map((c) => c.ref.id), ['e1']);
  plan2.provide();
  await g.provided.addToDay({ object: ev.ref, date: null });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(plan2.byDay().get('2026-10-03').length, 1); // placed by the linked item's own day
  assert.equal((await plan2.suggest()).length, 0); // and no longer suggested
  n += 1;
};
await run();

// --- the plan's own keys renamed (plan-names decision 19): item:<id> becomes plan:<id>, once, recorded ------------------
await (async () => {
  const old = (f, id, title, extra = {}) => f.store.set(lib.OLD_PLAN_PREFIX + id, { value: { kind: 'stop', title, date: '2026-10-01', order: 1000, ...extra }, version: 3 });
  assert.equal(lib.PLAN_PREFIX, 'plan:');
  assert.equal(lib.planIdOf('plan:a1'), 'a1');
  assert.equal(lib.planIdOf('item:a1'), 'a1');
  assert.equal(lib.planIdOf('trip:main'), null);
  assert.equal(lib.planIdOf('_moved:plan-keys'), null);

  // Someone who may edit opens the plan: every old key moves, values intact, and the move is recorded.
  const f = fakeHost();
  old(f, 'a1', 'Ferry', { notes: 'deck' });
  old(f, 'a2', 'Castle');
  const plan = lib.createPlan(f.t);
  await plan.load();
  assert.deepEqual([...f.store.keys()].filter((k) => k.startsWith('item:')), [], 'no old key is left');
  assert.equal(f.store.get('plan:a1').value.notes, 'deck', 'the value moved as it was');
  assert.ok(f.store.get(lib.MOVED_KEY), 'the move is recorded');
  assert.deepEqual(plan.list().map((i) => i.title).sort(), ['Castle', 'Ferry']);
  // Loading again moves nothing and changes nothing.
  const before = JSON.stringify([...f.store]);
  await lib.createPlan(f.t).load();
  assert.equal(JSON.stringify([...f.store]), before, 'a second load changes nothing');
  n += 1;

  // Recorded already: an old key that turns up later (an old page still open) is shown, and moved on its change.
  old(f, 'a3', 'Late');
  f.push({ key: 'item:a3', value: f.store.get('item:a3').value, version: 3 });
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(plan.list().some((i) => i.title === 'Late'), 'an old key is still read');
  assert.ok(f.store.has('plan:a3') && !f.store.has('item:a3'), 'and moved');
  n += 1;

  // A different copy already under the new key: the plan shows the new one, and the old key is kept, never deleted.
  const g = fakeHost();
  old(g, 'b1', 'Old title');
  g.store.set('plan:b1', { value: { kind: 'stop', title: 'New title', date: '2026-10-01', order: 1000 }, version: 1 });
  const plan2 = lib.createPlan(g.t);
  await plan2.load();
  assert.equal(g.store.get('plan:b1').value.title, 'New title');
  assert.equal(g.store.get('item:b1').value.title, 'Old title', 'a different old value is kept');
  assert.deepEqual(plan2.list().map((i) => i.title), ['New title']);
  // The same value under both keys (someone else moved it first): the old key goes.
  const same = fakeHost();
  old(same, 'b2', 'Twin');
  same.store.set('plan:b2', { value: same.store.get('item:b2').value, version: 1 });
  await lib.createPlan(same.t).load();
  assert.ok(same.store.has('plan:b2') && !same.store.has('item:b2'), 'an identical old copy is removed');
  n += 1;

  // Someone who cannot edit moves nothing and records nothing, and still sees the whole plan.
  const r = fakeHost({ readOnly: true });
  old(r, 'c1', 'Museum');
  const plan3 = lib.createPlan(r.t);
  await plan3.load();
  assert.ok(r.store.has('item:c1') && !r.store.has(lib.MOVED_KEY), 'nothing moved or recorded');
  assert.deepEqual(plan3.list().map((i) => i.title), ['Museum']);
  n += 1;

  // An item still under its old key, changed by someone who can edit: saved under the new key, the old one gone.
  const e = fakeHost();
  old(e, 'd1', 'Walk');
  e.store.set(lib.MOVED_KEY, { value: { at: 'x' }, version: 1 }); // recorded, but this one was left behind
  const plan4 = lib.createPlan(e.t);
  await plan4.load();
  await plan4.updateItem('d1', { notes: 'bring water' });
  assert.equal(e.store.get('plan:d1').value.notes, 'bring water');
  assert.ok(!e.store.has('item:d1'));
  await plan4.removeItem('d1');
  assert.ok(!e.store.has('plan:d1'));
  n += 1;
})();

test('details for the cards: a journey has a mode, a stop and a stay a type, any item a leg to it', () => {
  const f = lib.cleanItem({ id: 'f', kind: 'journey', title: 'LIS to FAO', mode: 'flight', operator: 'TAP', number: 'tp 1234', fromCode: 'lis!', toCode: 'fao', terminal: '1', seat: '12A', travelClass: 'economy' });
  assert.equal(f.mode, 'flight');
  assert.equal(f.fromCode, 'LIS');
  assert.equal(f.number, 'tp 1234');
  assert.equal(f.seat, '12A');
  assert.equal(lib.cleanItem({ id: 'j', kind: 'journey', title: 'x', mode: 'rocket' }).mode, 'other');
  assert.equal(lib.cleanItem({ id: 'j', kind: 'journey', title: 'x' }).mode, 'other');
  const t = lib.cleanItem({ id: 't', kind: 'journey', title: 'x', mode: 'train', operator: 'CP', platform: '4', carriage: '7' });
  assert.equal(t.platform, '4');
  assert.equal(t.carriage, '7');
  const c = lib.cleanItem({ id: 'c', kind: 'journey', title: 'x', mode: 'car', pickup: 'Airport', dropoff: 'Lisbon' });
  assert.equal(c.pickup, 'Airport');
  const meal = lib.cleanItem({ id: 'm', kind: 'stop', title: 'Dinner', type: 'restaurant', partySize: 4.4, reservationName: 'Ann', admissionCount: 0 });
  assert.equal(meal.type, 'restaurant');
  assert.equal(meal.partySize, 4);
  assert.equal(meal.reservationName, 'Ann');
  assert.equal(meal.admissionCount, null);
  assert.equal(lib.cleanItem({ id: 's', kind: 'stop', title: 'x', type: 'casino' }).type, null);
  assert.equal(lib.cleanItem({ id: 's', kind: 'stop', title: 'x', mode: 'flight' }).mode, undefined);
  const show = lib.cleanItem({ id: 'e', kind: 'stop', title: 'Fado', type: 'show', admissionCount: 2, gate: 'b' });
  assert.equal(show.admissionCount, 2);
  const stay = lib.cleanItem({ id: 'h', kind: 'stay', title: 'Hotel', type: 'hotel', roomType: 'double', guests: 2 });
  assert.equal(stay.type, 'hotel');
  assert.equal(stay.guests, 2);
  assert.equal(lib.cleanItem({ id: 'h', kind: 'stay', title: 'x', checkOutTime: '11:00' }).checkOutTime, '11:00');
  assert.equal(lib.cleanItem({ id: 'h', kind: 'stay', title: 'x', checkOutTime: '25:00' }).checkOutTime, null);
  assert.equal(lib.cleanItem({ id: 'h', kind: 'stay', title: 'x', type: 'igloo' }).type, null);
  const leg = lib.cleanItem({ id: 'l', kind: 'stop', title: 'x', travelMode: 'walk', travelMinutes: 12.4 });
  assert.equal(leg.travelMode, 'walk');
  assert.equal(leg.travelMinutes, 12);
  assert.equal(lib.cleanItem({ id: 'l', kind: 'stop', title: 'x', travelMode: 'teleport', travelMinutes: -5 }).travelMode, null);
  assert.equal(lib.cleanItem({ id: 'l', kind: 'stop', title: 'x', travelMode: 'teleport', travelMinutes: -5 }).travelMinutes, null);
  assert.equal(lib.MODES.length, 9);
  assert.ok(lib.STOP_TYPES.includes('cafe') && lib.STAY_TYPES.includes('camp') && lib.TRAVEL_MODES.includes('none'));
});

test('what an item is: its editor tile, the fields a tile decides, and its card', () => {
  const it = (o) => lib.cleanItem({ id: 'x', title: 't', ...o });
  assert.equal(lib.tileOf(it({ kind: 'journey', mode: 'flight' })), 'flight');
  assert.equal(lib.tileOf(it({ kind: 'journey' })), 'bus');
  assert.equal(lib.tileOf(it({ kind: 'stay' })), 'hotel');
  assert.equal(lib.tileOf(it({ kind: 'note' })), 'note');
  assert.equal(lib.tileOf(it({ kind: 'stop', type: 'cafe' })), 'cafe');
  assert.equal(lib.tileOf(it({ kind: 'stop', type: 'hike' })), 'tour');
  assert.equal(lib.tileOf(it({ kind: 'stop', category: 'eat' })), 'restaurant');
  assert.equal(lib.tileOf(it({ kind: 'stop', category: 'do' })), 'sight');
  assert.equal(lib.tileOf(null), 'sight');
  assert.deepEqual(lib.fromTile('flight'), { kind: 'journey', mode: 'flight', category: 'travel' });
  assert.deepEqual(lib.fromTile('cafe'), { kind: 'stop', type: 'cafe', category: 'eat' });
  assert.deepEqual(lib.fromTile('museum'), { kind: 'stop', type: 'museum', category: 'do' });
  assert.deepEqual(lib.fromTile('note'), { kind: 'note', category: 'other' });
  assert.equal(lib.fromTile('tour', it({ kind: 'stop', type: 'hike' })).type, 'hike');
  assert.equal(lib.fromTile('sight', it({ kind: 'stop', type: 'hike' })).type, 'sight');
  assert.equal(lib.fromTile('hotel', it({ kind: 'stay', type: 'camp' })).type, 'camp');
  assert.equal(lib.cardOf(it({ kind: 'journey', mode: 'train' })).template, 'train');
  assert.equal(lib.cardOf(it({ kind: 'journey', mode: 'ferry' })).template, 'transit');
  assert.equal(lib.cardOf(it({ kind: 'journey', mode: 'ferry' })).badge, 'ship');
  assert.equal(lib.cardOf(it({ kind: 'journey' })).family, 'bus');
  assert.equal(lib.cardOf(it({ kind: 'stay', type: 'hostel' })).kicker, 'Hostel');
  assert.equal(lib.cardOf(it({ kind: 'stop', type: 'bar' })).template, 'meal');
  assert.equal(lib.cardOf(it({ kind: 'stop', type: 'spa' })).family, 'sight');
  assert.equal(lib.cardOf(it({ kind: 'stop', type: 'show' })).template, 'show');
  assert.equal(lib.cardOf(it({ kind: 'stop', category: 'eat' })).family, 'restaurant');
  assert.equal(lib.cardOf(it({ kind: 'stop', category: 'other' })).kicker, 'Stop');
  assert.equal(lib.cardOf(it({ kind: 'note' })).template, 'note');
  assert.equal(lib.cardOf({ kind: 'link' }, { kind: 'place', title: 'x' }).template, 'place');
  assert.equal(lib.cardOf({ kind: 'link' }, { kind: 'event', title: 'x' }).template, 'link');
  assert.equal(lib.cardOf({ kind: 'link' }, { error: 'gone' }).template, 'link');
  assert.ok(lib.TILES.every((t) => lib.tileOf(it(lib.fromTile(t))) === t), 'every tile round-trips');
  assert.equal(lib.LEG_ICONS.walk, 'person-walking');
});

test('where the trip starts and ends: the first and last booked item', () => {
  const it = (o) => lib.cleanItem({ id: 'x', title: 't', order: 1, ...o });
  assert.equal(lib.tripBounds([]), null);
  assert.equal(lib.tripBounds([it({ id: 'n', kind: 'note', date: '2026-10-03' }), it({ id: 'u', kind: 'stop', date: '2026-10-03' })]), null, 'untimed stops and notes are not booked');
  const items = [
    it({ id: 'dinner', kind: 'stop', date: '2026-10-03', time: '20:00' }),
    it({ id: 'flight', kind: 'journey', mode: 'flight', date: '2026-10-03', time: '08:10', minutes: 65 }),
    it({ id: 'hotel', kind: 'stay', date: '2026-10-03', checkOut: '2026-10-05', checkOutTime: '11:00' }),
    it({ id: 'home', kind: 'journey', mode: 'flight', date: '2026-10-05', time: '15:00', minutes: 120 }),
    it({ id: 'idea', kind: 'stop', date: null, time: '01:00' }),
  ];
  const b = lib.tripBounds(items);
  assert.deepEqual(b.start, { id: 'flight', day: '2026-10-03', time: '08:10' });
  assert.deepEqual(b.end, { id: 'home', day: '2026-10-05', time: '17:00' });
  const stayLast = lib.tripBounds([items[2]]);
  assert.deepEqual(stayLast.end, { id: 'hotel', day: '2026-10-05', time: '11:00' });
  const fallback = lib.tripBounds([it({ id: 'a', kind: 'stop', date: '2026-10-04', time: '09:00' }), it({ id: 'b', kind: 'stop', date: '2026-10-04', time: '18:00', minutes: 30 })]);
  assert.equal(fallback.start.id, 'a');
  assert.deepEqual(fallback.end, { id: 'b', day: '2026-10-04', time: '18:30' });
  assert.equal(lib.tripBounds([it({ id: 'c', kind: 'stop', date: '2026-10-04', confirm: 'XY1' })]).start.id, 'c', 'anything with a confirmation is booked');
});

test('a time block is an item with a marker type and no place', () => {
  const b = lib.cleanItem({ id: 'b', kind: 'block', type: 'free-time', title: ' ', date: '2026-10-03', time: '14:00', minutes: 90 });
  assert.equal(b.kind, 'block');
  assert.equal(b.type, 'free-time');
  assert.equal(b.title, '');
  assert.equal(b.minutes, 90);
  assert.equal(lib.cleanItem({ id: 'b', kind: 'block', title: 'x' }), null, 'a block needs a type');
  assert.equal(lib.cleanItem({ id: 'b', kind: 'block', type: 'Bad Type' }), null);
  assert.equal(lib.tileOf(b), 'block:free-time');
  assert.deepEqual(lib.fromTile('block:rest'), { kind: 'block', type: 'rest', category: 'other' });
  assert.equal(lib.cardOf(b).template, 'block');
  assert.equal(lib.tripBounds([b, lib.cleanItem({ id: 'j', kind: 'journey', title: 'x', date: '2026-10-04', time: '09:00' })]).start.id, 'j', 'a block is never the start of the trip');
});

test('a marker between the days follows a day and has no time', () => {
  const l = lib.cleanItem({ id: 'l', kind: 'lane', type: 'free-time', title: '', after: '2026-10-04', date: '2026-10-09', time: '10:00', minutes: 30, notes: 'n' });
  assert.equal(l.kind, 'lane');
  assert.equal(l.after, '2026-10-04');
  assert.equal(l.date, null);
  assert.equal(l.time, null);
  assert.equal(l.minutes, null);
  assert.equal(lib.cleanItem({ id: 'l', kind: 'lane', type: 'rest', after: 'nope' }).after, '', 'the head of the line');
  assert.equal(lib.cleanItem({ id: 'l', kind: 'lane', type: 'rest', after: null }).after, '', 'a stored null reads as the head');
  assert.equal(lib.cleanItem({ id: 'l', kind: 'lane', title: 'x' }), null, 'a marker needs a type');
  assert.equal(lib.tileOf(l), 'lane:free-time');
  assert.deepEqual(lib.fromTile('lane:rest'), { kind: 'lane', type: 'rest', category: 'other' });
  assert.equal(lib.cardOf(l).template, 'lane');
});

test('an item is on a day or at a joint, never both; nothing is read as the head or the borrowed day', () => {
  assert.equal(lib.cleanItem({ id: 'a', title: 'x', date: '2026-10-01', after: '2026-10-01' }).after, null, 'a day clears the joint');
  assert.equal(lib.cleanItem({ id: 'a', title: 'x', after: '2026-10-01' }).after, '2026-10-01');
  assert.equal(lib.cleanItem({ id: 'a', title: 'x', after: '' }).after, '', 'the head');
  assert.equal(lib.cleanItem({ id: 'a', title: 'x' }).after, null, 'nowhere in particular');
  assert.equal(lib.cleanItem({ id: 'a', title: 'x', after: 'nope' }).after, null);
  assert.equal(lib.lineOf({ after: '2026-10-02' }, null), '2026-10-02');
  assert.equal(lib.lineOf({ after: '' }, null), '');
  assert.equal(lib.lineOf({ after: null, date: '2026-10-02' }, '2026-10-02'), null, 'on a day');
  assert.equal(lib.lineOf({ after: null }, '2026-10-02'), null, 'a pointer borrowing its day');
  assert.equal(lib.lineOf({ after: null }, null), '', 'an old idea is at the head');
  assert.deepEqual(lib.joints(['2026-10-01', '2026-10-02']), ['', '2026-10-01', '2026-10-02']);
  assert.deepEqual(lib.sortLine([{ id: 'b', after: '2026-10-01', order: 1000 }, { id: 'a', after: '', order: 2000 }, { id: 'c', after: '', order: 1000 }]).map((i) => i.id), ['c', 'a', 'b']);
  assert.deepEqual(lib.placeFields({ date: '2026-10-01' }), { date: '2026-10-01', after: null });
  assert.deepEqual(lib.placeFields({ after: '' }), { date: null, after: '' });
  assert.deepEqual(lib.placeFields({ after: '2026-10-01' }), { date: null, after: '2026-10-01' });
  assert.deepEqual(lib.placeFields(null), { date: null, after: null });
  assert.deepEqual(lib.placeFields({ date: 'nope', after: 'nope' }), { date: null, after: null });
});

test('an item dropped among others at a joint gets an order between its neighbours', () => {
  const others = [{ id: 'a', order: 1000 }, { id: 'b', order: 2000 }];
  assert.equal(lib.jointOrder([], null, null), 1000);
  assert.equal(lib.jointOrder(others, null, null), 3000, 'at the end');
  assert.equal(lib.jointOrder(others, 'a', 'before'), 0);
  assert.equal(lib.jointOrder(others, 'a', 'after'), 1500);
  assert.equal(lib.jointOrder(others, 'b', 'before'), 1500);
  assert.equal(lib.jointOrder(others, 'b', 'after'), 3000);
});

test('a length is typed as hours and minutes and stored as minutes, and shown as "8 h 15 min"', () => {
  assert.deepEqual(lib.splitMinutes(495), { hours: 8, minutes: 15 });
  assert.deepEqual(lib.splitMinutes(45), { hours: null, minutes: 45 });
  assert.deepEqual(lib.splitMinutes(120), { hours: 2, minutes: null });
  assert.deepEqual(lib.splitMinutes(null), { hours: null, minutes: null });
  assert.equal(lib.joinMinutes(8, 15), 495);
  assert.equal(lib.joinMinutes(8, null), 480);
  assert.equal(lib.joinMinutes(null, 90), 90, 'minutes past 59 still count');
  assert.equal(lib.joinMinutes(null, null), null, 'nothing entered');
  assert.equal(lib.joinMinutes(0, 0), null);
  assert.equal(lib.joinMinutes(24, 30), 24 * 60 + 30, 'a journey longer than a day keeps its length (#14)');
  assert.equal(lib.joinMinutes(26, 0), 26 * 60);
  assert.equal(lib.MAX_MINUTES, 7 * 24 * 60);
  assert.equal(lib.joinMinutes(200, 0), lib.MAX_MINUTES, 'at most 7 days, as cleanItem keeps');
  assert.equal(lib.gapText(495), '8 h 15 min');
  assert.equal(lib.gapText(480), '8 h');
  // A length saved before (whole minutes) reads back the same: the stored shape did not change.
  assert.equal(lib.cleanItem({ id: 'f', kind: 'journey', mode: 'flight', title: 'x', minutes: 495 }).minutes, 495);
  assert.equal(lib.cleanItem({ id: 'l', kind: 'stop', title: 'x', travelMode: 'taxi', travelMinutes: 20 }).travelMinutes, 20);
  assert.equal(lib.cleanItem({ id: 'f', kind: 'journey', mode: 'flight', title: 'x', minutes: 1470 }).minutes, 1470, '24 h 30 min is stored as it is');
  assert.equal(lib.cleanItem({ id: 'f', kind: 'journey', mode: 'ferry', title: 'x', minutes: 99999 }).minutes, lib.MAX_MINUTES);
});

// The page's own one-line helpers (`const name = ...;`), run with the model and a stand-in for host.util.time on either clock.
const pageLine = (name) => {
  const line = read('travel.js').split('\n').find((l) => l.trimStart().startsWith(`const ${name} = `));
  assert.ok(line, `travel.js has ${name}`);
  return line.trim();
};
const clockTime = (clock) => (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return hhmm || '';
  if (clock === '24') return `${m[1].padStart(2, '0')}:${m[2]}`;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};
const pageHelpers = (clock) => new Function('lib', 'host', 'parseYmd', `const { arrivalOf, laterText } = lib;\n${pageLine('tt')}\n${pageLine('arriveText')}\n${pageLine('dayTime')}\nreturn { tt, arriveText, dayTime };`)(lib, { util: { time: clockTime(clock) } }, parseYmd);

test('a journey arrives on the day it arrives: the next day, or +2 days (#14)', () => {
  const ferry = lib.cleanItem({ id: 'f', kind: 'journey', mode: 'ferry', title: 'Ferry', date: '2026-10-03', time: '08:00', minutes: 26 * 60 });
  assert.deepEqual(lib.arrivalOf(ferry), { day: '2026-10-04', time: '10:00', days: 1 });
  assert.deepEqual(lib.arrivalOf({ time: '22:30', minutes: 90 }), { day: null, time: '00:00', days: 1 });
  assert.deepEqual(lib.arrivalOf({ date: '2026-10-31', time: '20:00', minutes: 50 * 60 }), { day: '2026-11-02', time: '22:00', days: 2 });
  assert.deepEqual(lib.arrivalOf({ date: '2026-10-03', time: '09:00', minutes: 60 }), { day: '2026-10-03', time: '10:00', days: 0 });
  assert.equal(lib.arrivalOf({ time: '09:00' }), null);
  assert.equal(lib.laterText(0), '');
  assert.equal(lib.laterText(1), 'the next day');
  assert.equal(lib.laterText(3), '+3 days');
  const page = pageHelpers('12');
  assert.equal(page.arriveText(ferry), '10:00 AM the next day', 'the card and the time column say the day');
  assert.equal(page.arriveText({ date: '2026-10-03', time: '20:00', minutes: 50 * 60 }), '10:00 PM +2 days');
  assert.equal(page.arriveText({ date: '2026-10-03', time: '09:00', minutes: 40 }), '9:40 AM');
  // The trip ends when and where the last journey arrives.
  assert.deepEqual(lib.tripBounds([ferry]).end, { id: 'f', day: '2026-10-04', time: '10:00' });
  const js = read('travel.js');
  assert.ok(!/tt\(hm\(minutesOfDay\(item\.time\) \+ item\.minutes\)\)/.test(js), 'no arrival is worked out without its day');
  const html = read('travel.html');
  // One message for a length over 7 days: the form's own (no browser bubble from a max on the hours box).
  for (const id of ['f-hours', 'f-back-hours', 'f-travelHours']) assert.match(html, new RegExp(`id="${id}" name="\\w+" type="number" min="0" step="1"`), `${id} has no max of its own`);
  assert.ok(js.includes("fail('A length can be at most 7 days (168 hours).')"), 'the form says the longest length');
  // The narrow time column holds the whole arrival: the day on its own line, wrapping, never running under the card.
  assert.ok(js.includes("`→ ${arriveText(item, '\\n')}`"), 'the time column puts the arrival day on its own line');
  assert.match(read('travel-lib-cards.css'), /\.when small, \.row\.marker \.when b \{ white-space: pre-line; \}/, 'the time column keeps those lines and wraps');
  assert.equal(page.arriveText(ferry, '\n'), '10:00 AM\nthe next day');
});

test('Bookings and Money follow the environment\'s clock (#15)', () => {
  const flight = lib.cleanItem({ id: 'f', kind: 'journey', mode: 'flight', title: 'Flight', date: '2026-10-03', time: '09:40' });
  const day = parseYmd('2026-10-03').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  assert.equal(pageHelpers('12').dayTime(flight), `${day} 9:40 AM`);
  assert.equal(pageHelpers('24').dayTime(flight), `${day} 09:40`);
  assert.equal(pageHelpers('12').dayTime({ ...flight, date: null, time: '16:40' }), 'no day yet 4:40 PM');
  // No stored time goes on the page as it is stored: Decisions' card times too.
  assert.ok(!/w\.time \? ' ' \+ w\.time/.test(read('travel.js')), 'Decisions shows a card\'s time on the clock');
});

test('taxi, ride share and shuttle are journeys with a tile and a card, and ride share is a way to a stop', () => {
  const it = (o) => lib.cleanItem({ id: 'x', title: 't', ...o });
  for (const mode of ['taxi', 'rideshare', 'shuttle']) {
    assert.ok(lib.MODES.includes(mode) && lib.JOURNEY_TILES.includes(mode) && lib.TILES.includes(mode), mode);
    assert.equal(it({ kind: 'journey', mode }).mode, mode);
    assert.equal(lib.tileOf(it({ kind: 'journey', mode })), mode);
    assert.deepEqual(lib.fromTile(mode), { kind: 'journey', mode, category: 'travel' });
    const c = lib.cardOf(it({ kind: 'journey', mode }));
    assert.equal(c.template, 'transit');
    assert.equal(c.family, mode);
    assert.ok(c.kicker && c.badge, mode);
  }
  assert.equal(lib.cardOf(it({ kind: 'journey', mode: 'rideshare' })).kicker, 'Ride share');
  assert.ok(lib.TRAVEL_MODES.includes('rideshare') && lib.LEG_ICONS.rideshare);
});

test('the page: every journey kind has its tile and colours, lengths are hours and minutes, a stay checks out on any date', () => {
  const html = read('travel.html');
  const cardStyles = read('travel-lib-cards.css');
  const editor = read('travel-lib-editor.css');
  for (const t of lib.JOURNEY_TILES) {
    assert.ok(html.includes(`class="tile" type="button" data-type="${t}"`), `a tile for ${t}`);
    assert.ok(cardStyles.includes(`.entry[data-type="${t}"]`), `a card colour for ${t}`);
    assert.ok(editor.includes(`.tile[data-type="${t}"]`), `a tile colour for ${t}`);
  }
  for (const m of Object.keys(lib.LEG_ICONS)) assert.ok(html.includes(`data-mode="${m}"`), `a way-to-a-stop button for ${m}`);
  assert.ok(!/\(minutes\)|Minutes from/.test(html), 'no length is asked for in minutes alone');
  for (const id of ['f-hours', 'f-minutes', 'f-travelHours', 'f-travelMinutes']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /id="f-checkout" name="checkOut" type="date"/, 'a checkout is a date, not a list of the trip\'s days');
  assert.ok(html.includes('<span class="side">Departs</span>') && html.includes('<span class="side">Arrives</span>'), 'a flight card says which end departs and which arrives');
});

test('an empty day is a button that opens the day\'s add menu, worded for the pointer', () => {
  const html = read('travel.html');
  const js = read('travel.js');
  assert.match(html, /<template id="tpl-day-empty-add"><li class="day-empty has-add"><button class="day-empty-add" type="button" data-action="day-menu"/, 'the empty day uses the header\'s own day-menu action');
  assert.ok(js.includes("matchMedia('(pointer: coarse)')") && js.includes('Nothing planned yet. ${') && js.includes("'Tap' : 'Click'"), 'Click or Tap to add, chosen by the pointer');
  assert.ok(!js.includes('Add something below'), 'the old sentence pointing at a hidden row is gone');
});

// --- round trips (#9): two journeys, the return pointing at the outbound with `legOf` --------------------------------

const leg = (id, extra) => lib.cleanItem({ id, kind: 'journey', title: id, mode: 'flight', date: '2026-10-03', ...extra });

test('cleanItem keeps legOf on a journey that is not a car, and keeps the leg\'s own booking details', () => {
  const back = leg('b', { legOf: 'a', confirm: 'XYZ', cost: 300, paidBy: 'u1' });
  assert.equal(back.legOf, 'a');
  assert.equal(back.confirm, 'XYZ', 'set aside only where its outbound is found');
  assert.equal(back.cost, 300);
  assert.equal(leg('b', { mode: 'car', legOf: 'a' }).legOf, null, 'a car cannot be a round trip');
  assert.equal(leg('a', { legOf: 'a' }).legOf, null, 'never its own leg');
  assert.equal(leg('b', { legOf: 42 }).legOf, null);
  assert.equal(lib.cleanItem({ id: 's', kind: 'stop', title: 'x', legOf: 'a' }).legOf, undefined, 'only a journey');
  const old = leg('o', { confirm: 'ABC', cost: 120, paidBy: 'u1' });
  assert.equal(old.legOf, null, 'an existing one-way journey has none');
  assert.equal(old.confirm, 'ABC');
  assert.equal(old.cost, 120);
  assert.equal(leg('b', { mode: 'train', legOf: 'a' }).legOf, 'a');
  assert.equal(leg('b', { mode: 'taxi', legOf: 'a' }).legOf, 'a');
});

test('returnOf and outboundOf read the pair; a return with no outbound, or a second one, reads as one-way', () => {
  const out = leg('a', { confirm: 'XYZ', cost: 300, paidBy: 'u1' });
  const back = leg('b', { legOf: 'a', date: '2026-10-09', order: 1000 });
  const second = leg('c', { legOf: 'a', date: '2026-10-09', order: 2000 });
  const items = [out, back, second];
  assert.equal(lib.returnOf(items, 'a').id, 'b');
  assert.equal(lib.outboundOf(items, back).id, 'a');
  assert.equal(lib.outboundOf(items, second), null, 'the second return reads as a journey of its own');
  assert.deepEqual(lib.legsOf(items, 'a').map((i) => i.id), ['b', 'c']);
  assert.equal(lib.returnOf(items, 'b'), null);
  assert.equal(lib.outboundOf(items, out), null);
  assert.equal(lib.outboundOf([back], back), null, 'the outbound is gone');
  assert.equal(lib.returnOf([leg('a', { mode: 'car' }), back], 'a'), null, 'a car has no return');
});

test('Bookings lists a round trip once; Money counts its cost once', () => {
  const out = leg('a', { confirm: 'XYZ', cost: 300, paidBy: 'u1' });
  const back = leg('b', { legOf: 'a', date: '2026-10-09', cost: 300, paidBy: 'u2' });
  assert.deepEqual(lib.bookings([out, back]).map((i) => i.id), ['a']);
  assert.deepEqual(lib.bookings([back]).map((i) => i.id), ['b'], 'a return whose outbound is gone is its own row');
  assert.deepEqual(lib.costItems([out, back]).map((i) => i.id), ['a'], 'a return found with its outbound is not counted again');
  const b = lib.balances(lib.costItems([out, back]), ['u1', 'u2']);
  assert.equal(b.total, 300);
  assert.equal(b.paid.u1, 300);
  assert.equal(b.paid.u2 || 0, 0);
});

test('a return placed before its outbound is noticed', () => {
  const out = leg('a', { date: '2026-10-05', time: '10:00' });
  assert.equal(lib.returnBefore(leg('b', { date: '2026-10-04' }), out), true);
  assert.equal(lib.returnBefore(leg('b', { date: '2026-10-05', time: '09:00' }), out), true);
  assert.equal(lib.returnBefore(leg('b', { date: '2026-10-05' }), out), false);
  assert.equal(lib.returnBefore(leg('b', { date: '2026-10-09' }), out), false);
  assert.equal(lib.returnBefore(leg('b', { date: null }), out), false);
});

test('a journey with a leftover legOf (its outbound gone) keeps its own booking details, in Bookings and Money', () => {
  const orphan = leg('bus', { mode: 'bus', legOf: 'gone123', confirm: 'BUS-9', cost: 15, paidBy: 'u1' });
  assert.equal(orphan.confirm, 'BUS-9');
  assert.equal(orphan.cost, 15);
  assert.equal(orphan.paidBy, 'u1');
  assert.equal(lib.outboundOf([orphan], orphan), null);
  assert.deepEqual(lib.bookings([orphan]).map((i) => i.id), ['bus']);
  assert.deepEqual(lib.costItems([orphan]).map((i) => i.id), ['bus']);
  // the second return of a pair keeps its own too
  const out = leg('a');
  const back = leg('b', { legOf: 'a', order: 1 });
  const second = leg('c', { legOf: 'a', order: 2, confirm: 'C2', cost: 9, paidBy: 'u1' });
  assert.deepEqual(lib.costItems([out, back, second]).map((i) => i.id), ['c']);
});

const roundTrips = async () => {
  const f = fakeHost();
  const plan = lib.createPlan(f.t);
  await plan.load();
  await plan.saveTrip({ start: '2026-10-03', end: '2026-10-09' });
  await assert.rejects(() => plan.addRoundTrip({ title: 'Car', mode: 'car', date: '2026-10-03' }, { title: 'Back', date: '2026-10-09' }), /car/);
  assert.equal(plan.list().length, 0, 'nothing is added for a car');

  const { out, back } = await plan.addRoundTrip({ title: 'Flight to New York', mode: 'flight', date: '2026-10-03', fromCode: 'LHR', toCode: 'JFK', confirm: 'XYZ', cost: 800, paidBy: 'u1' }, { title: 'Flight to London', date: '2026-10-09', fromCode: 'JFK', toCode: 'LHR', confirm: 'NO', cost: 5 });
  assert.equal(back.legOf, out.id);
  assert.equal(back.mode, 'flight');
  assert.equal(back.cost, null);
  assert.equal(plan.returnFor(out.id).id, back.id);
  assert.equal(plan.outboundFor(back).id, out.id);
  assert.equal(plan.byDay().get('2026-10-03')[0].id, out.id, 'each leg on its own day');
  assert.equal(plan.byDay().get('2026-10-09')[0].id, back.id);
  assert.equal(lib.balances(lib.costItems(plan.list()), ['u1']).total, 800);
  // a return moved before its outbound is allowed
  await plan.moveTo(back.id, '2026-10-03', 0);
  assert.equal(plan.list().find((i) => i.id === back.id).date, '2026-10-03');
  await plan.moveTo(back.id, '2026-10-09', 0);
  // an orphan saved alone (its outbound gone) keeps its booking details
  const lone = await plan.addItem({ kind: 'journey', mode: 'bus', title: 'Old bus', date: '2026-10-05', legOf: 'gone123', confirm: 'BUS-9', cost: 15, paidBy: 'u1' });
  await plan.updateItem(lone.id, { notes: 'x' });
  const saved = f.store.get('plan:' + lone.id).value;
  assert.equal(saved.confirm, 'BUS-9');
  assert.equal(saved.cost, 15);
  await plan.removeItem(lone.id);
  n += 1;

  // deleting only the outbound: the return becomes one-way and keeps the booking details
  await plan.removeLeg(out.id, false);
  const alone = plan.list().find((i) => i.id === back.id);
  assert.equal(plan.list().some((i) => i.id === out.id), false);
  assert.equal(alone.legOf, null);
  assert.equal(alone.confirm, 'XYZ');
  assert.equal(alone.cost, 800);
  assert.equal(alone.paidBy, 'u1');
  n += 1;

  // deleting both legs, from the return; deleting only the return keeps the outbound as it was
  const p2 = await plan.addRoundTrip({ title: 'Train to Porto', mode: 'train', date: '2026-10-04', confirm: 'T1', cost: 40, paidBy: 'u1' }, { title: 'Train to Lisbon', date: '2026-10-06' });
  await plan.removeLeg(p2.back.id, true);
  assert.equal(plan.list().some((i) => i.id === p2.out.id || i.id === p2.back.id), false);
  const p3 = await plan.addRoundTrip({ title: 'Ferry', mode: 'ferry', date: '2026-10-04', confirm: 'F1', cost: 20, paidBy: 'u1' }, { title: 'Ferry back', date: '2026-10-05' });
  await plan.removeLeg(p3.back.id, false);
  const kept = plan.list().find((i) => i.id === p3.out.id);
  assert.equal(kept.confirm, 'F1');
  assert.equal(kept.cost, 20);
  assert.equal(plan.returnFor(p3.out.id), null);
  // a journey that is not a round trip is deleted alone
  await plan.removeLeg(p3.out.id, true);
  assert.equal(plan.list().some((i) => i.id === p3.out.id), false);
  n += 1;

  // two returns for one outbound (two people at once): the first by order is the return; the other is an extra
  const p4 = await plan.addRoundTrip({ title: 'Bus', mode: 'bus', date: '2026-10-04' }, { title: 'Bus back', date: '2026-10-07' });
  const extra = await plan.addItem({ kind: 'journey', mode: 'bus', title: 'Bus back again', date: '2026-10-07', legOf: p4.out.id });
  assert.equal(plan.returnFor(p4.out.id).id, p4.back.id);
  assert.deepEqual(plan.extraReturns(p4.out.id).map((i) => i.id), [extra.id]);
  assert.equal(plan.outboundFor(extra), null);
  n += 1;
};
await roundTrips();

const longNotes = async () => {
  const f = fakeHost();
  const plan = lib.createPlan(f.t);
  await plan.load();
  await plan.saveTrip({ title: 'Trip', start: '2026-10-01', end: '2026-10-03' });
  const fields = plan.fromSuggestion({ title: 'Hotel', content: 'x'.repeat(7000) });
  assert.equal(fields.notes.length, 7000);
  assert.equal(lib.cleanItem({ id: 'n', kind: 'stop', title: 'Hotel', notes: fields.notes }).notes.length, 7000);
  n += 1;
};
await longNotes();

const coverDates = async () => {
  const f = fakeHost();
  const plan = lib.createPlan(f.t);
  await plan.load();
  await plan.saveTrip({ title: 'Faro', start: '2026-10-03', end: '2026-10-05' });
  plan.provide();
  await f.provided.acceptSuggestion({ title: 'LIS to FAO', kind: 'flight', date: '2026-10-01' });
  assert.equal(plan.trip.start, '2026-10-01');
  assert.equal(plan.trip.end, '2026-10-05');
  assert.ok(plan.days().includes('2026-10-01'));
  await f.provided.acceptSuggestion({ title: 'Dinner in town', kind: 'restaurant', date: '2026-10-07' });
  assert.equal(plan.trip.start, '2026-10-01');
  assert.equal(plan.trip.end, '2026-10-07');
  await plan.addItem({ kind: 'stay', title: 'Seaside Inn', type: 'hotel', date: '2026-10-06', checkOut: '2026-10-09' });
  assert.equal(plan.trip.end, '2026-10-09');
  const dinner = plan.list().find((i) => i.title === 'Dinner in town');
  await plan.updateItem(dinner.id, { date: '2026-09-30' });
  assert.equal(plan.trip.start, '2026-09-30');
  assert.equal(plan.trip.end, '2026-10-09');
  const inside = plan.trip;
  await plan.addItem({ kind: 'stop', title: 'A walk', date: '2026-10-04' });
  assert.equal(plan.trip.start, inside.start);
  assert.equal(plan.trip.end, inside.end);
  await plan.addItem({ kind: 'note', title: 'Packing list' });
  assert.equal(plan.trip.start, inside.start);
  assert.equal(plan.trip.end, inside.end);
  n += 1;
};
await coverDates();

const TRAVEL_PHASES = [
  { id: 'planning', label: 'Planning' },
  { id: 'booking', label: 'Booking' },
  { id: 'trip', label: 'Trip', main: true },
  { id: 'post-trip', label: 'Post-trip' },
];

test('a phase keeps a sound id, and its end is never before its start', () => {
  assert.equal(lib.cleanItem({ id: 'a', kind: 'stop', title: 'Pack', phase: 'pre-trip' }).phase, 'pre-trip');
  assert.equal(lib.cleanItem({ id: 'a', kind: 'stop', title: 'Pack', phase: 'Pre' }).phase, null);
  assert.equal(lib.cleanItem({ id: 'a', kind: 'stop', title: 'Pack' }).phase, null);
  const t = lib.cleanTrip({ title: 'Harbour', start: '2026-10-01', end: '2026-10-05', phases: { planning: { start: '2026-10-08', end: '2026-10-01' }, 'Not Id': { start: '2026-10-01' }, booking: { start: 'nope' } } });
  assert.equal(t.v, 2);
  assert.equal(t.start, '2026-10-01');
  assert.equal(t.end, '2026-10-05');
  assert.deepEqual(t.phases, { planning: { start: '2026-10-08' } });
  assert.equal(lib.planName(null, { name: 'Harbour' }), 'Harbour');
  assert.equal(lib.planName({ title: '' }, { name: 'Harbour' }), 'Harbour');
  assert.equal(lib.planName({ title: 'Cabin' }, { name: 'Harbour' }), 'Cabin');
  assert.equal(lib.planName(null, null), '');
});

test('the current phase is the latest one that has started', () => {
  const none = { phases: {} };
  assert.equal(lib.currentPhase(TRAVEL_PHASES, none, '2026-09-15', null).id, 'planning', 'no dates');
  const created = '2026-09-01';
  assert.equal(lib.currentPhase(TRAVEL_PHASES, none, '2026-09-15', created).id, 'planning', 'only the created date');
  assert.equal(lib.effectiveStart(TRAVEL_PHASES, none, 0, created), created);
  const trip = { start: '2026-10-01', end: '2026-10-09', phases: {} };
  assert.equal(lib.currentPhase(TRAVEL_PHASES, trip, '2026-09-15', null).id, 'planning', 'only the trip dates, before it');
  assert.equal(lib.currentPhase(TRAVEL_PHASES, trip, '2026-10-03', null).id, 'trip', 'only the trip dates, during it');
  const between = { start: '2026-10-01', end: '2026-10-09', phases: { planning: { start: '2026-09-01', end: '2026-09-10' } } };
  assert.equal(lib.effectiveStart(TRAVEL_PHASES, between, 1, null), '2026-09-11');
  assert.equal(lib.currentPhase(TRAVEL_PHASES, between, '2026-09-20', null).id, 'booking', 'a day between phases');
  assert.equal(lib.effectiveStart(TRAVEL_PHASES, trip, 3, null), '2026-10-10');
  assert.equal(lib.currentPhase(TRAVEL_PHASES, trip, '2026-10-15', null).id, 'post-trip', 'after the trip');
  assert.equal(lib.phaseOf({ phase: 'planning' }, TRAVEL_PHASES, trip, '2026-10-03', null), 'planning');
  assert.equal(lib.phaseOf({ phase: 'gone' }, TRAVEL_PHASES, trip, '2026-10-03', null), 'trip');
  assert.equal(lib.phaseOf({}, TRAVEL_PHASES, trip, '2026-10-03', null), 'trip');
  assert.equal(lib.currentPhase([], trip, '2026-10-03', null), null);
});

test('the phase line names the current phase, and counts toward or through the main one', () => {
  const trip = { start: '2026-10-01', end: '2026-10-09', phases: {} };
  assert.equal(lib.phaseLine([], trip, '2026-09-15', null), '');
  assert.equal(lib.phaseLine(TRAVEL_PHASES, trip, '2026-09-15', null), 'Planning · 16 days to go');
  assert.equal(lib.phaseLine(TRAVEL_PHASES, trip, '2026-09-30', null), 'Planning · 1 day to go');
  assert.equal(lib.phaseLine(TRAVEL_PHASES, trip, '2026-10-03', null), 'Trip · day 3 of 9');
  assert.equal(lib.phaseLine(TRAVEL_PHASES, trip, '2026-10-15', null), 'Post-trip');
  assert.equal(lib.phaseLine(TRAVEL_PHASES, { phases: {} }, '2026-09-15', null), 'Planning');
});

test('days run from the earliest date to the latest, and there are none without one', () => {
  assert.deepEqual(lib.planDays(null, []), []);
  assert.deepEqual(lib.planDays({}, []), []);
  const one = lib.cleanItem({ id: 'a', kind: 'stop', title: 'Museum', date: '2026-10-04' });
  assert.deepEqual(lib.planDays(null, [one]), ['2026-10-04']);
  const pre = lib.cleanItem({ id: 'b', kind: 'stop', title: 'Pack', date: '2026-09-28', phase: 'planning' });
  assert.deepEqual(lib.planDays({ start: '2026-10-01', end: '2026-10-03' }, [pre]), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']);
});

test('coverTrip grows for the main phase and for no phase, and not for another phase or with no start', () => {
  const trip = { start: '2026-10-03', end: '2026-10-05' };
  assert.deepEqual(lib.coverTrip(trip, ['2026-10-01'], { phase: 'trip' }, TRAVEL_PHASES), { start: '2026-10-01', end: '2026-10-05' });
  assert.deepEqual(lib.coverTrip(trip, ['2026-10-01'], {}, TRAVEL_PHASES), { start: '2026-10-01', end: '2026-10-05' });
  assert.equal(lib.coverTrip(trip, ['2026-09-20'], { phase: 'planning' }, TRAVEL_PHASES), null);
  assert.equal(lib.coverTrip({}, ['2026-10-01'], { phase: 'trip' }, TRAVEL_PHASES), null);
  assert.equal(lib.coverTrip(null, ['2026-10-01'], { phase: 'trip' }, TRAVEL_PHASES), null);
});

await (async () => {
  const space = { id: 'harbour', name: 'Harbour', createdAt: '2026-09-01T12:00:00.000Z' };
  const day = lib.createdDay(space);

  const f = fakeHost({ phases: TRAVEL_PHASES, space });
  f.store.set(lib.TRIP_KEY, { value: { title: 'Old', destination: 'Faro', start: '2026-10-01', end: '2026-10-09', currency: 'EUR' }, version: 1 });
  f.store.set('plan:keep', { value: { kind: 'stop', title: 'Museum', date: '2026-10-02', order: 1000 }, version: 4 });
  const plan = lib.createPlan(f.t);
  await plan.load();
  const saved = f.store.get(lib.TRIP_KEY).value;
  assert.equal(saved.start, '2026-10-01', 'the trip dates stay');
  assert.equal(saved.end, '2026-10-09');
  assert.equal(saved.title, 'Old');
  assert.equal(saved.destination, 'Faro');
  assert.equal(saved.currency, 'EUR');
  assert.equal(saved.v, 2);
  assert.equal(saved.phases.planning.start, day, 'planning starts on the day the space was created');
  assert.deepEqual(f.store.get('plan:keep'), { value: { kind: 'stop', title: 'Museum', date: '2026-10-02', order: 1000 }, version: 4 }, 'an object is not rewritten');
  assert.ok(f.store.get(lib.PHASES_MOVED_KEY));
  const before = JSON.stringify([...f.store]);
  await lib.createPlan(f.t).load();
  assert.equal(JSON.stringify([...f.store]), before, 'a second load changes nothing');
  n += 1;

  const mainFirst = [{ id: 'trip', label: 'Trip', main: true }, { id: 'post-trip', label: 'Post-trip' }];
  const g = fakeHost({ phases: mainFirst, space });
  g.store.set(lib.TRIP_KEY, { value: { title: 'Only', start: '2026-10-01', end: '2026-10-05' }, version: 1 });
  await lib.createPlan(g.t).load();
  const only = g.store.get(lib.TRIP_KEY).value;
  assert.equal(only.start, '2026-10-01');
  assert.equal(only.v, 2);
  assert.deepEqual(only.phases, {});
  n += 1;

  const h = fakeHost({ phases: TRAVEL_PHASES, space });
  h.store.set(lib.TRIP_KEY, { value: { title: 'Old', start: '2026-10-01', end: '2026-10-05' }, version: 1 });
  const theirs = { title: 'Theirs', start: '2026-10-01', end: '2026-10-05', v: 2, phases: { planning: { start: day } } };
  const orig = h.t.storage.set;
  h.t.storage.set = async (key, value, o) => {
    if (key === lib.TRIP_KEY) {
      h.store.set(lib.TRIP_KEY, { value: theirs, version: 9 });
      throw Object.assign(new Error('stale'), { status: 409 });
    }
    return orig(key, value, o);
  };
  const planH = lib.createPlan(h.t);
  await planH.load();
  assert.equal(h.store.get(lib.TRIP_KEY).value.title, 'Theirs');
  assert.equal(h.store.get(lib.TRIP_KEY).version, 9);
  assert.equal(planH.trip.title, 'Theirs');
  assert.ok(h.store.get(lib.PHASES_MOVED_KEY));
  n += 1;

  const r = fakeHost({ readOnly: true, phases: TRAVEL_PHASES, space });
  r.store.set(lib.TRIP_KEY, { value: { title: 'Old', start: '2026-10-01', end: '2026-10-09' }, version: 1 });
  const planR = lib.createPlan(r.t);
  await planR.load();
  assert.equal(r.store.get(lib.TRIP_KEY).value.v, undefined);
  assert.ok(!r.store.has(lib.PHASES_MOVED_KEY));
  assert.equal(lib.effectiveStart(TRAVEL_PHASES, planR.trip, 0, lib.createdDay(r.t.space())), day);
  assert.equal(lib.currentPhase(TRAVEL_PHASES, planR.trip, '2026-09-15', day).id, 'planning');
  n += 1;

  const empty = fakeHost({ space });
  const planE = lib.createPlan(empty.t);
  await planE.load();
  assert.equal(planE.trip, null);
  assert.equal(lib.planName(planE.trip, empty.t.space()), 'Harbour');
  assert.ok(!empty.store.has(lib.TRIP_KEY));
  assert.deepEqual(planE.days(), []);
  n += 1;

  const p = fakeHost({ phases: TRAVEL_PHASES, space });
  const planP = lib.createPlan(p.t);
  await planP.load();
  await planP.addItem({ kind: 'stop', title: 'Idea', date: '2026-10-04', phase: 'trip' });
  assert.equal(planP.trip, null, 'no start, so nothing is written');
  assert.deepEqual(planP.days(), ['2026-10-04']);
  await planP.saveTrip({ title: 'Faro', start: '2026-10-03', end: '2026-10-05' });
  await planP.addItem({ kind: 'stop', title: 'Pack', date: '2026-09-20', phase: 'planning' });
  assert.equal(planP.trip.start, '2026-10-03');
  assert.equal(planP.trip.end, '2026-10-05');
  assert.equal(planP.days()[0], '2026-09-20');
  assert.equal(planP.days().at(-1), '2026-10-05');
  await planP.addItem({ kind: 'stop', title: 'Fly', date: '2026-10-01', phase: 'trip' });
  assert.equal(planP.trip.start, '2026-10-01');
  n += 1;
})();

test('the page: the round trip switch, its mark on a card, and the delete question', () => {
  const html = read('travel.html');
  const js = read('travel.js');
  assert.match(html, /<div class="fieldgroup roundtrip" data-types="flight train ferry bus taxi rideshare shuttle">/, 'every journey but a car offers a round trip');
  assert.ok(html.includes('id="f-roundtrip" name="roundtrip" type="checkbox" role="switch"'));
  for (const id of ['f-return', 'f-back-date', 'f-back-time', 'f-back-hours', 'f-back-minutes', 'f-back-number', 'f-back-from', 'f-back-to', 'f-back-fromCode', 'f-back-toCode']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('<template id="tpl-card-roundtrip">'));
  for (const words of ['Delete both legs', 'Delete only this leg', 'Remove the return leg', 'Return is before the outbound']) assert.ok(js.includes(words), words);
  assert.ok(!js.includes("e.target === $('editor')"), 'clicking the dimmed area does not close the editor');
});

// --- the SDK's host.util.plain and host.util.localWhen (public/sdk/host.js; plan-object-handoff.md, step 4) ---------------

test('host.util.plain: Markdown and HTML as plain text, lines kept or made one', () => {
  assert.equal(plain('**Southwest** 2483'), 'Southwest 2483');
  assert.equal(plain('# Flight ##\n- MDW to SJC\n* seat 12A\n1. board\n> a quote'), 'Flight\n- MDW to SJC\n- seat 12A\n1. board\na quote');
  assert.equal(plain('[Manage it](https://southwest.com/x) and ![a map](https://m.example/p.png) and [https://a.example](https://a.example)'), 'Manage it (https://southwest.com/x) and a map and https://a.example');
  assert.equal(plain('*one* _two_ `three` ~~four~~ __five__'), 'one two three four five');
  assert.equal(plain('\\*kept\\* and snake_case_word and 2*3*4 and a < b > c'), '*kept* and snake_case_word and 2*3*4 and a < b > c');
  assert.equal(plain('```\n**raw** in a fence\n```\n---\n|a|b|\n|---|:-:|\n|1|2|'), '**raw** in a fence\na|b\n1|2');
  assert.equal(plain('<p>Hi&nbsp;<b>there</b><br>next &amp; &#8594; &#x41; &bogus; <https://x.example></p><script>alert(1)</script><style>p{}</style>end'), 'Hi there\nnext & → A &bogus; https://x.example\nend');
  assert.equal(plain('<ul><li>one</li><li>two</li></ul>'), '- one\n- two');
  assert.equal(plain('a\n\n\n\n b  \n'), 'a\n\n b');
  assert.equal(plain('**Southwest**\n\n2483\u0007', { line: true }), 'Southwest 2483');
  assert.equal(plain(null), '');
  // An unclosed <script> or <style> loses only its tag, not the words after it; a closed one goes with what it holds.
  assert.equal(plain('a<script>b'), 'ab');
  assert.equal(plain('Use a<script> tag here'), 'Use a tag here');
  assert.equal(plain('x<style>p{}</style>y<script>z'), 'xyz');
  assert.equal(plain(2483), '2483');
});

test('host.util.plain takes linear time on long and crafted text (100 KB each)', () => {
  const crafted = ['*'.repeat(1e5), '_'.repeat(1e5), '['.repeat(1e5), '[a]('.repeat(25000), '!['.repeat(5e4), '<a'.repeat(5e4), '<'.repeat(1e5), '<a>'.repeat(33000), '<script>'.repeat(12500), '**a'.repeat(33000), '`'.repeat(1e5), '~~a'.repeat(33000), '&#'.repeat(5e4), '&amp'.repeat(25000), '#'.repeat(1e5), `# ${' '.repeat(1e5)}x`, `${' '.repeat(1e5)}x`, `x${' '.repeat(1e5)}#x`, `|${' '.repeat(1e5)}x`, `${'- '.repeat(5e4)}x`, '> '.repeat(5e4), '\n'.repeat(1e5), ' \n'.repeat(5e4), '\\*'.repeat(5e4), `${'-|'.repeat(5e4)}x`, 'a_'.repeat(5e4), '*a '.repeat(33000), '[a](b "'.repeat(14000), `${'a'.repeat(1e5)}`];
  plain('warm up **the** [engine](https://x.example)');
  for (const text of crafted) {
    const t = performance.now();
    plain(text);
    plain(text, { line: true });
    const ms = performance.now() - t;
    assert.ok(ms < 1500, `${JSON.stringify(text.slice(0, 10))} took ${Math.round(ms)} ms`);
  }
});

test('host.util.localWhen: a local day and time from a when, the clock as written', () => {
  assert.deepEqual(localWhen('2026-11-14T12:50'), { date: '2026-11-14', time: '12:50' });
  assert.deepEqual(localWhen('2026-11-14T12:50:30Z'), { date: '2026-11-14', time: '12:50' }, 'seconds and the zone dropped, the clock kept');
  assert.deepEqual(localWhen('2026-11-14T12:50+05:30'), { date: '2026-11-14', time: '12:50' });
  assert.deepEqual(localWhen('2026-11-14 3:25 PM'), { date: '2026-11-14', time: '15:25' });
  assert.deepEqual(localWhen('12:05 am'), { date: null, time: '00:05' });
  assert.deepEqual(localWhen('2026-11-14'), { date: '2026-11-14', time: null });
  assert.deepEqual(localWhen('15:25', '2026-11-14'), { date: '2026-11-14', time: '15:25' }, 'a time alone takes the object\'s day');
  assert.deepEqual(localWhen('2026-11-15T09:00', '2026-11-14'), { date: '2026-11-15', time: '09:00' }, 'its own day wins');
  assert.deepEqual(localWhen(undefined, '2026-11-14'), { date: '2026-11-14', time: null }, 'none given: the object\'s day');
  for (const bad of ['2026-02-30', '2026-11-14T25:00', '24:00', '13:00 PM', 'tomorrow', '', 7, null]) assert.equal(localWhen(bad), null, String(bad));
  assert.equal(localWhen('nonsense', '2026-11-14'), null, 'a when that cannot be read is no value');
  assert.equal(localWhen(`${'1'.repeat(1e5)}:00`), null, 'a long text is read only as far as a when can be');
});

// --- an object handed in (plan-object-handoff.md, step 5) ---------------------------------------------------------------

const util = { plain, localWhen };
// Thomas's Southwest flight (#182), as the bus hands it over (cleaned by server/object-format.js's cleanHandoff).
const SOUTHWEST = { kind: 'flight', icon: 'plane', title: 'Southwest **2483**, Chicago to San Jose', content: 'Booked with **points**.\n\n- Wanna Get Away', date: '2026-11-14', basis: 'imported', details: { airline: 'Southwest', number: '2483', from: { code: 'MDW', name: 'Chicago Midway' }, to: { code: 'SJC', name: 'San Jose' }, departs: '2026-11-14T12:50', arrives: '2026-11-14T15:25', minutes: 275, terminal: '1', gate: 'B12', seat: '12A', class: 'Wanna Get Away', reference: 'ABC123' } };

test('fromObject: Thomas\'s Southwest flight fills every flight field, the ticket\'s arrival beside the flight time', () => {
  const f = lib.objectFields(SOUTHWEST, util);
  const item = lib.cleanItem({ ...f, id: 'sw' });
  assert.equal(item.kind, 'journey');
  assert.equal(item.mode, 'flight');
  assert.equal(item.title, 'Southwest 2483, Chicago to San Jose', 'the title is plain text');
  assert.equal(item.operator, 'Southwest');
  assert.equal(item.number, '2483');
  assert.equal(item.fromCode, 'MDW');
  assert.equal(item.from, 'Chicago Midway');
  assert.equal(item.toCode, 'SJC');
  assert.equal(item.to, 'San Jose');
  assert.equal(item.date, '2026-11-14');
  assert.equal(item.time, '12:50');
  assert.equal(item.arrives, '2026-11-14T15:25');
  assert.equal(item.minutes, 275, 'the time in the air, which a ticket\'s two local times cannot give across zones');
  assert.equal(item.terminal, '1');
  assert.equal(item.gate, 'B12');
  assert.equal(item.seat, '12A');
  assert.equal(item.travelClass, 'Wanna Get Away');
  assert.equal(item.confirm, 'ABC123');
  assert.equal(item.notes, 'Booked with **points**.\n\n- Wanna Get Away\n\nExternal source', 'the notes keep their Markdown, which the plan draws');
  assert.deepEqual(lib.arrivalOf(item), { day: '2026-11-14', time: '15:25', days: 0, ticket: true });
  assert.equal(pageHelpers('12').arriveText(item), '3:25 PM', 'shown as on the ticket, not 12:50 plus 4 h 35 min');
  // Without a day: the times stay, the flight is under "Not on a day yet".
  const undated = lib.cleanItem({ ...lib.objectFields({ ...SOUTHWEST, date: undefined, details: { ...SOUTHWEST.details, departs: '12:50', arrives: '15:25' } }, util), id: 'u' });
  assert.equal(undated.date, null);
  assert.equal(undated.time, '12:50');
  assert.equal(undated.arrives, '15:25');
  assert.deepEqual(lib.coverDaysOf(undated), [], 'no day of its own: it stretches nothing');
  // A time alone takes the object's own day; a ticket arriving across the date line says so.
  assert.equal(lib.objectFields({ ...SOUTHWEST, details: { departs: '12:50', arrives: '15:25' } }, util).arrives, '2026-11-14T15:25');
  const back = lib.cleanItem({ id: 'b', kind: 'journey', mode: 'flight', title: 'HNL', date: '2026-11-15', time: '01:00', arrives: '2026-11-14T13:00' });
  assert.equal(pageHelpers('12').arriveText(back), '1:00 PM the day before');
  assert.equal(lib.cleanItem({ id: 'c', kind: 'journey', mode: 'car', title: 'Car', arrives: '2026-11-14T15:25' }).arrives, null, 'not for a car');
  assert.equal(lib.cleanItem({ id: 'c', kind: 'journey', mode: 'flight', title: 'F', arrives: '2026-11-14T25:00' }).arrives, null);
});

test('fromObject: each kind\'s details in the plan\'s own fields, and what has no field as a notes line', () => {
  const at = (o) => lib.cleanItem({ ...lib.objectFields(o, util), id: 'x' });
  const train = at({ kind: 'train', title: 'To Porto', details: { operator: 'CP', number: '521', from: { code: 'LIS', name: 'Lisboa Santa Apolonia' }, to: 'Porto Campanha', departs: '2026-10-02T09:00', arrives: '2026-10-02T11:50', platform: '4', carriage: '21', seat: '55', class: 'First', reference: 'CP9' } });
  assert.deepEqual([train.mode, train.operator, train.number, train.from, train.to, train.date, train.time, train.arrives, train.platform, train.carriage, train.seat, train.travelClass, train.confirm], ['train', 'CP', '521', 'Lisboa Santa Apolonia (LIS)', 'Porto Campanha', '2026-10-02', '09:00', '2026-10-02T11:50', '4', '21', '55', 'First', 'CP9']);
  const bus = at({ kind: 'bus', title: 'Bus', details: { operator: 'Rede', number: '7', seat: '3', reference: 'R1', from: 'FAO' } });
  assert.deepEqual([bus.mode, bus.operator, bus.number, bus.seat, bus.confirm, bus.from], ['bus', 'Rede', '7', '3', 'R1', 'FAO']);
  const ferry = at({ kind: 'ferry', title: 'Ferry', content: 'Deck chairs', details: { operator: 'Naxos', cabin: '4B', seat: '9', departs: '2026-10-03T22:00', minutes: 600 } });
  assert.deepEqual([ferry.mode, ferry.seat, ferry.minutes, ferry.notes], ['ferry', '9', 600, 'Deck chairs\n\nCabin: 4B']);
  assert.deepEqual(lib.arrivalOf(ferry), { day: '2026-10-04', time: '08:00', days: 1 });
  const car = at({ kind: 'car', title: 'Car', details: { company: 'Hertz', from: { code: 'FAO', name: 'Faro airport' }, to: 'Lagos', departs: '2026-10-01T10:00', arrives: '2026-10-04T09:30', class: 'Compact', reference: 'H7' } });
  assert.deepEqual([car.mode, car.operator, car.pickup, car.dropoff, car.date, car.time, car.minutes, car.confirm, car.arrives, car.notes], ['car', 'Hertz', 'Faro airport (FAO)', 'Lagos', '2026-10-01', '10:00', 3 * 1440 - 30, 'H7', null, 'Class: Compact']);
  const longCar = at({ kind: 'car', title: 'Car', details: { departs: '2026-10-01T10:00', arrives: '2026-10-20T10:00' } });
  assert.deepEqual([longCar.minutes, longCar.notes], [null, 'Drop off: 2026-10-20 10:00'], 'more than 7 days: a notes line');
  const item = at({ kind: 'hotel', title: 'Seaside **Inn**', details: { address: '1 Beach Rd', checkIn: '2026-10-01T15:00', checkOut: '2026-10-04T11:00', roomType: 'Double', guests: 2, reference: 'B55' } });
  assert.deepEqual([item.kind, item.type, item.title, item.date, item.time, item.checkOut, item.checkOutTime, item.roomType, item.guests, item.address, item.confirm], ['stay', 'hotel', 'Seaside Inn', '2026-10-01', '15:00', '2026-10-04', '11:00', 'Double', 2, '1 Beach Rd', 'B55']);
  const badOut = at({ kind: 'hotel', title: 'Inn', date: '2026-10-05', details: { checkOut: '2026-10-03' } });
  assert.deepEqual([badOut.date, badOut.checkOut, badOut.notes], ['2026-10-05', null, 'Check out: 2026-10-03']);
  const dinner = at({ kind: 'restaurant', title: 'Ramiro', details: { starts: '2026-10-02T20:00', ends: '2026-10-02T22:15', address: 'Av. Almirante Reis', partySize: 4, name: 'Thomas', reference: 'T4' } });
  assert.deepEqual([dinner.kind, dinner.type, dinner.category, dinner.time, dinner.minutes, dinner.address, dinner.partySize, dinner.reservationName, dinner.confirm], ['stop', 'restaurant', 'eat', '20:00', 135, 'Av. Almirante Reis', 4, 'Thomas', 'T4']);
  for (const kind of ['cafe', 'bar']) assert.equal(at({ kind, title: 'x', details: { partySize: 2 } }).partySize, 2, kind);
  for (const kind of ['sight', 'museum', 'tour', 'show']) {
    const visit = at({ kind, title: 'x', details: { starts: '10:00', minutes: 90, tickets: 3, reference: 'V1', address: 'Here' }, date: '2026-10-03' });
    assert.deepEqual([visit.type, visit.category, visit.date, visit.time, visit.minutes, visit.admissionCount, visit.confirm, visit.address], [kind, 'do', '2026-10-03', '10:00', 90, 3, 'V1', 'Here'], kind);
  }
  const allDay = at({ kind: 'event', title: 'Festival', details: { starts: '2026-10-03T10:00', allDay: true, address: 'The square' } });
  assert.deepEqual([allDay.kind, allDay.type, allDay.date, allDay.time, allDay.address, allDay.notes], ['stop', 'other', '2026-10-03', null, 'The square', '']);
  const timed = at({ kind: 'event', title: 'Talk', details: { starts: '2026-10-03T18:00', ends: '2026-10-03T19:30' } });
  assert.deepEqual([timed.time, timed.minutes], ['18:00', 90]);
  const note = at({ kind: 'note', title: 'Pack', content: '- passport\n- **charger**', links: [{ title: 'List', url: 'https://x.example/list' }] });
  assert.deepEqual([note.kind, note.notes], ['note', '- passport\n- **charger**\n\nLinks:\n- List: https://x.example/list']);
  const none = at({ title: 'Something', content: 'words' });
  assert.deepEqual([none.kind, none.type, none.notes], ['stop', null, 'words']);
  assert.throws(() => lib.objectFields({ title: '** **' }, util), /title/);
  // The details win over the object's own date; the Planner's own drop wins over both.
  assert.equal(at({ kind: 'sight', title: 'x', date: '2026-10-01', details: { starts: '2026-10-02T09:00' } }).date, '2026-10-02');
  const dropped = lib.cleanItem({ ...lib.objectFields(SOUTHWEST, util, { date: '2026-11-13' }), id: 'd' });
  assert.deepEqual([dropped.date, dropped.time], ['2026-11-13', '12:50']);
  assert.deepEqual(lib.objectFields(SOUTHWEST, util, { after: '' }).after, '');
});

test('a relative arrival: kept while there is no day, dated on one', () => {
  assert.equal(lib.relativeArrives('2026-11-12', '2026-11-13T06:30'), '06:30+1');
  assert.equal(lib.relativeArrives('2026-11-14', '2026-11-13T13:00'), '13:00-1');
  assert.equal(lib.relativeArrives('2026-11-14', '2026-11-14T15:25'), '15:25');
  assert.equal(lib.datedArrives('2026-11-30', '06:30+1'), '2026-12-01T06:30');
  assert.equal(lib.datedArrives('2026-11-14', '15:25'), '2026-11-14T15:25');
  const kept = lib.cleanItem({ id: 'r', kind: 'journey', mode: 'flight', title: 'R', arrives: '06:30+1' });
  assert.equal(kept.arrives, '06:30+1');
  assert.deepEqual(lib.arrivalOf({ ...kept, time: '23:00' }), { day: null, time: '06:30', days: 1, ticket: true });
  assert.equal(lib.cleanItem({ ...kept, date: '2026-11-30' }).arrives, '2026-12-01T06:30', 'given a day, dated again');
  for (const bad of ['06:30+8', '06:30-2', '06:30+', '25:00', '06:30+1x']) assert.equal(lib.cleanItem({ ...kept, arrives: bad }).arrives, null, bad);
  assert.equal(lib.cleanItem({ ...kept, arrives: '06:30+0' }).arrives, '06:30');
  // The editor: an undated journey's kept arrival is dated on the day picked, and one moved off its days is kept relative.
  const js = read('travel.js');
  assert.ok(js.includes('arrival.value = datedArrives(day, ed.arrivesKept);'));
  assert.ok(js.includes('ed.arrivesKept = relativeArrives(ed.dayWas, arrival.value);'));
  assert.ok(js.includes(': v.date ? datedArrives(v.date, v.arrives) :'));
});

test('a ticket\'s arrival is at most 7 days after it leaves and at most a day before; else a notes line', () => {
  assert.equal(lib.arrivalFits('2026-11-14', '12:50', '2026-11-21T12:50'), true, 'exactly 7 days');
  assert.equal(lib.arrivalFits('2026-11-14', '12:50', '2026-11-21T12:51'), false);
  assert.equal(lib.arrivalFits('2026-11-14', '12:50', '2026-11-13T12:50'), true, 'a day before, across the date line');
  assert.equal(lib.arrivalFits('2026-11-14', '12:50', '2026-11-13T12:49'), false);
  assert.equal(lib.arrivalFits('2026-11-14', null, '2026-11-21T23:00'), true, 'no departure time: by days');
  assert.equal(lib.arrivalFits('2026-11-14', null, '2026-11-22T00:10'), false);
  assert.equal(lib.arrivalFits(null, null, '2027-11-22T00:10'), true, 'no day to leave on yet');
  const far = lib.cleanItem({ id: 'f', kind: 'journey', mode: 'flight', title: 'F', date: '2026-11-14', time: '12:50', arrives: '2027-01-01T15:25', notes: 'Booked' });
  assert.deepEqual([far.arrives, far.notes], [null, 'Booked\n\nArrives: 2027-01-01 15:25'], 'cleanItem: +46 days is a notes line');
  const before = lib.cleanItem({ id: 'f', kind: 'journey', mode: 'flight', title: 'F', date: '2026-11-14', time: '12:50', arrives: '2026-10-01T15:25' });
  assert.deepEqual([before.arrives, before.notes], [null, 'Arrives: 2026-10-01 15:25'], '-44 days too');
  const again = lib.cleanItem(far);
  assert.equal(again.notes, far.notes, 'cleaning again adds nothing');
  const odd = lib.cleanItem({ ...lib.objectFields({ ...SOUTHWEST, details: { ...SOUTHWEST.details, arrives: '2027-03-01T15:25' } }, util), id: 'o' });
  assert.equal(odd.arrives, null, 'objectFields: +107 days is not the ticket\'s arrival');
  assert.ok(odd.notes.includes('Arrives: 2027-03-01 15:25'));
  assert.deepEqual([...new Set(lib.coverDaysOf(odd))], ['2026-11-14'], 'so it stretches nothing (its flight time lands the same day)');
  const early = lib.objectFields({ kind: 'train', title: 'T', details: { departs: '2026-11-14T09:00', arrives: '2026-11-12T09:00' } }, util);
  assert.equal(early.arrives, undefined);
  assert.ok(early.notes.includes('Arrives: 2026-11-12 09:00'));
  const js = read('travel.js');
  assert.ok(js.includes("if (fields.arrives && !arrivalFits(fields.date, fields.time, fields.arrives)) return fail('The arrival on the ticket can be at most 7 days after it leaves, and at most a day before.');"), 'the editor refuses one');
  assert.ok(js.includes('arrival.value = shiftArrives(arrival.value'), 'and moves it along with the departure day');
});

test('fitsPlan: a day shows when the plan can stretch to it within 60 days', () => {
  const days = lib.tripDays({ start: '2026-11-10', end: '2026-11-14' });
  assert.equal(lib.fitsPlan([], '2027-06-01'), true, 'nothing yet: any day');
  assert.equal(lib.fitsPlan(days, '2026-11-12'), true);
  assert.equal(lib.fitsPlan(days, '2027-01-08'), true, 'the 60th day from the first');
  assert.equal(lib.fitsPlan(days, '2027-01-09'), false);
  assert.equal(lib.fitsPlan(days, '2026-09-16'), true, 'before, inside the 60');
  assert.equal(lib.fitsPlan(days, '2026-09-15'), false, 'before, past them');
  assert.equal(lib.fitsPlan(days, null), true);
});

const handedIn = async () => {
  // A full itinerary, as Keep sends it: 10 objects over 4 days, in no particular order, onto a plan with no dates yet.
  const f = fakeHost();
  const plan = lib.createPlan(f.t);
  await plan.load();
  const heard = [];
  plan.onSaid((text) => heard.push(text));
  plan.provide();
  const itinerary = [
    SOUTHWEST,
    { kind: 'hotel', title: 'Hotel Valencia', details: { checkIn: '2026-11-14T16:00', checkOut: '2026-11-17T11:00', address: '355 Santana Row' } },
    { kind: 'restaurant', title: 'Dinner at Lazy Dog', details: { starts: '2026-11-14T19:30', partySize: 2 } },
    { kind: 'museum', title: 'Tech Interactive', details: { starts: '2026-11-15T10:00', minutes: 180, tickets: 2 } },
    { kind: 'cafe', title: 'Coffee', date: '2026-11-15', details: { starts: '08:30' } },
    { kind: 'tour', title: 'Winchester House', details: { starts: '2026-11-16T13:00' } },
    { kind: 'car', title: 'Rental car', details: { company: 'Hertz', departs: '2026-11-16T09:00', arrives: '2026-11-17T09:00' } },
    { kind: 'show', title: 'Comedy night', details: { starts: '2026-11-16T20:00' } },
    { kind: 'event', title: 'Farmers market', date: '2026-11-15', details: { allDay: true } },
    { kind: 'flight', title: 'Southwest 1170 home', details: { airline: 'Southwest', number: '1170', from: 'SJC', to: 'MDW', departs: '2026-11-17T14:10', arrives: '2026-11-17T20:15' } },
  ];
  for (const object of itinerary) {
    const out = await f.provided.acceptSuggestion({ title: object.title, object });
    assert.ok(out.ref && out.ref.kind === 'plan', object.title);
  }
  assert.deepEqual(plan.days(), ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']);
  const by = plan.byDay();
  const titles = (day) => by.get(day).map((i) => i.title);
  assert.deepEqual(titles('2026-11-14'), ['Southwest 2483, Chicago to San Jose', 'Hotel Valencia', 'Dinner at Lazy Dog']);
  assert.deepEqual(titles('2026-11-15'), ['Farmers market', 'Coffee', 'Tech Interactive'], 'the all-day one first, then by time');
  assert.deepEqual(titles('2026-11-16'), ['Rental car', 'Winchester House', 'Comedy night']);
  assert.deepEqual(titles('2026-11-17'), ['Southwest 1170 home']);
  assert.equal(by.get(null).length, 0, 'nothing left without a day');
  assert.deepEqual(heard, [], 'nothing to say');
  n += 1;

  // 90 days out: under "Not on a day yet", its day in its notes, and the person told (decision 12).
  const far = await f.provided.acceptSuggestion({ title: 'x', object: { kind: 'hotel', title: 'Ski lodge', content: 'Two **nights**', details: { checkIn: '2027-02-12T15:00', checkOut: '2027-02-14T10:00' } } });
  const lodge = plan.list().find((i) => i.title === 'Ski lodge');
  assert.equal(lodge.date, null);
  assert.equal(lodge.after, null);
  assert.equal(lodge.notes.split('\n')[0], 'Dated 2027-02-12, outside the plan');
  assert.ok(lodge.notes.includes('Two **nights**'));
  assert.deepEqual(plan.days(), ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'], 'the plan did not grow to its check-out');
  // No day and no place on the line is what the page lists under "Not on a day yet" (undatedItems in travel.js).
  assert.match(far.data.note, /^Ski lodge is dated 2027-02-12, outside the plan's 60 days, so it is under Not on a day yet\.$/);
  assert.deepEqual(heard, [far.data.note]);
  // The older flat fields go the same way.
  await f.provided.acceptSuggestion({ title: 'Far dinner', kind: 'restaurant', date: '2027-03-01' });
  assert.equal(plan.list().find((i) => i.title === 'Far dinner').date, null);
  assert.equal(heard.length, 2);
  // A day inside the 60 still stretches the plan, as adding by hand does.
  await f.provided.acceptSuggestion({ title: 'x', object: { kind: 'sight', title: 'Lick Observatory', date: '2026-11-20' } });
  assert.equal(plan.days().at(-1), '2026-11-20');
  n += 1;

  // With a trip set: the trip stretches to an object's day within 60 days; its check-out past them leaves the stay on its day.
  const g = fakeHost();
  const plan2 = lib.createPlan(g.t);
  await plan2.load();
  await plan2.saveTrip({ title: 'Bay', start: '2026-11-14', end: '2026-11-17' });
  const said2 = [];
  plan2.onSaid((text) => said2.push(text));
  plan2.provide();
  await g.provided.acceptSuggestion({ title: 'x', object: { kind: 'sight', title: 'Early', date: '2026-11-12' } });
  assert.equal(plan2.trip.start, '2026-11-12');
  const long = await g.provided.acceptSuggestion({ title: 'x', object: { kind: 'hotel', title: 'Long stay', details: { checkIn: '2026-11-17T15:00', checkOut: '2027-01-30T10:00' } } });
  const longStay = plan2.list().find((i) => i.title === 'Long stay');
  assert.equal(longStay.date, '2026-11-17', 'on its day');
  assert.deepEqual([longStay.checkOut, longStay.checkOutTime], [null, null], 'its check-out does not stretch the plan');
  assert.ok(longStay.notes.endsWith('Check out: 2027-01-30 10:00'), 'it is kept in its notes');
  assert.equal(long.data.note, "Long stay: its check-out, 2027-01-30, is outside the plan's 60 days, so it is in its notes.");
  assert.equal(plan2.days().length, 6, 'Nov 12 to Nov 17');
  assert.equal(said2.length, 1);
  n += 1;

  // QA: the same with NO trip set, where nothing used to say it and the plan quietly grew to 60 days of "Staying at".
  const h = fakeHost();
  const plan3 = lib.createPlan(h.t);
  await plan3.load();
  const said3 = [];
  plan3.onSaid((text) => said3.push(text));
  plan3.provide();
  await h.provided.acceptSuggestion({ title: 'x', object: { kind: 'sight', title: 'Pier', date: '2026-11-14' } });
  const lodge3 = await h.provided.acceptSuggestion({ title: 'x', object: { kind: 'hotel', title: 'Long stay', details: { checkIn: '2026-11-17T15:00', checkOut: '2027-01-30T10:00' } } });
  assert.equal(plan3.trip, null);
  assert.deepEqual(plan3.days(), ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'], 'the plan stays small');
  assert.equal(plan3.list().find((i) => i.title === 'Long stay').checkOut, null);
  assert.match(lodge3.data.note, /its check-out, 2027-01-30, is outside the plan's 60 days/);
  assert.deepEqual(said3, [lodge3.data.note], 'and the person is told');
  // A check-out that fits is kept as it is.
  await h.provided.acceptSuggestion({ title: 'x', object: { kind: 'hotel', title: 'Short stay', details: { checkIn: '2026-11-17T15:00', checkOut: '2026-11-19T10:00' } } });
  assert.equal(plan3.list().find((i) => i.title === 'Short stay').checkOut, '2026-11-19');
  assert.equal(said3.length, 1);
  // A ticket's arrival past the 60 days (a long ferry from the plan's last day) is held the same way.
  const boat = await h.provided.acceptSuggestion({ title: 'x', object: { kind: 'ferry', title: 'Long ferry', details: { departs: '2027-01-12T09:00', arrives: '2027-01-15T09:00' } } });
  const ferry3 = plan3.list().find((i) => i.title === 'Long ferry');
  assert.deepEqual([ferry3.date, ferry3.arrives], ['2027-01-12', null]);
  assert.ok(ferry3.notes.endsWith('Arrives: 2027-01-15 09:00'));
  assert.match(boat.data.note, /its arrival, 2027-01-15, is outside the plan's 60 days/);
  assert.equal(plan3.days().at(-1), '2027-01-12');
  n += 1;

  // QA (must-fix): a move takes the ticket's dated arrival along, the same days later or earlier.
  const m = fakeHost();
  const plan4 = lib.createPlan(m.t);
  await plan4.load();
  await plan4.saveTrip({ start: '2026-11-10', end: '2026-11-20' });
  plan4.provide();
  await m.provided.acceptSuggestion({ title: 'x', object: SOUTHWEST });
  const red = await plan4.addItem({ kind: 'journey', mode: 'flight', title: 'Red-eye', date: '2026-11-12', time: '23:00', arrives: '2026-11-13T06:30' });
  const sw = () => plan4.list().find((i) => i.title.startsWith('Southwest'));
  await plan4.moveTo(sw().id, '2026-11-18', 0);
  assert.deepEqual([sw().date, sw().arrives], ['2026-11-18', '2026-11-18T15:25'], 'moveTo, four days later');
  assert.equal(pageHelpers('12').arriveText(sw()), '3:25 PM', 'not "-4 days"');
  await plan4.moveTo(red.id, '2026-11-10', 0);
  const redNow = plan4.list().find((i) => i.id === red.id);
  assert.deepEqual([redNow.date, redNow.arrives], ['2026-11-10', '2026-11-11T06:30'], 'earlier: still the next morning');
  await plan4.nudgeItem(sw().id, -1);
  assert.deepEqual([sw().date, sw().time, sw().arrives], ['2026-11-18', '12:20', '2026-11-18T15:25'], 'earlier in its day: the day stays');
  await plan4.applyChanges({ [sw().id]: { date: '2026-11-17', order: 1 } });
  assert.equal(sw().arrives, '2026-11-17T15:25', 'any change of day, as the drag of an untimed one makes');
  await plan4.updateItem(sw().id, { date: '2026-11-19', arrives: '2026-11-19T16:00' });
  assert.equal(sw().arrives, '2026-11-19T16:00', 'a change that says its own arrival (the editor) keeps it');
  await plan4.moveTo(sw().id, null, 0);
  assert.deepEqual([sw().date, sw().arrives], [null, '16:00'], 'to Not on a day yet: kept relative to the day it left');
  // QA: a round trip through the line or "Not on a day yet" keeps the arrival's offset from its departure.
  await plan4.moveTo(red.id, '2026-11-12', 0);
  await plan4.moveToJoint(red.id, '', 0);
  const onLine = plan4.list().find((i) => i.id === red.id);
  assert.deepEqual([onLine.date, onLine.arrives], [null, '06:30+1'], 'on the line: the next morning, whatever day it goes back on');
  await plan4.moveTo(red.id, '2026-11-15', 0);
  const back = plan4.list().find((i) => i.id === red.id);
  assert.deepEqual([back.date, back.arrives, back.notes], ['2026-11-15', '2026-11-16T06:30', ''], 'back on a day: dated again, one day after');
  assert.equal(pageHelpers('12').arriveText(back), '6:30 AM the next day', 'not "the day before"');
  await plan4.moveToJoint(red.id, '', 0);
  await plan4.moveTo(red.id, '2026-11-20', 0);
  const later = plan4.list().find((i) => i.id === red.id);
  assert.deepEqual([later.arrives, later.notes], ['2026-11-21T06:30', ''], 'more than 7 days on: no notes line, still the next morning');
  await plan4.moveTo(sw().id, '2026-11-11', 0);
  assert.equal(sw().arrives, '2026-11-11T16:00', 'from Not on a day yet, the same');
  assert.equal(lib.objectFields(SOUTHWEST, util, { date: '2026-11-16' }).arrives, '2026-11-16T15:25', 'the Planner\'s own drop onto another day');
  assert.equal(lib.shiftArrives('15:25', 3), '15:25', 'a time alone follows its day already');
  // The Planner's own drop at a joint on the line: relative too.
  assert.equal(lib.objectFields({ kind: 'flight', title: 'Red-eye', details: { departs: '2026-11-12T23:00', arrives: '2026-11-13T06:30' } }, util, { after: '' }).arrives, '06:30+1');
  // Over a far day: under "Not on a day yet" with the offset kept.
  const farFlight = await m.provided.acceptSuggestion({ title: 'x', object: { kind: 'flight', title: 'Far red-eye', details: { departs: '2027-06-01T23:00', arrives: '2027-06-02T06:30' } } });
  assert.ok(farFlight.data.note);
  assert.deepEqual(['date', 'arrives'].map((k) => plan4.list().find((i) => i.title === 'Far red-eye')[k]), [null, '06:30+1']);
  n += 1;
};
await handedIn();

test('the page: the ticket\'s arrival field, and objects dated outside the plan under Not on a day yet', () => {
  const html = read('travel.html');
  const js = read('travel.js');
  assert.ok(html.includes('<div class="editor-row" data-types="flight train ferry bus"><label>Arrival on the ticket<input id="f-arrival" name="arrives" type="datetime-local"></label></div>'));
  assert.ok(html.includes('<label data-types="flight train ferry bus">Seat<input id="f-seat"'), 'a bus or ferry seat survives an edit');
  assert.ok(html.includes('<label data-types="flight train">Class<select id="f-travelClass"'), 'a train class survives an edit');
  assert.ok(js.includes("fields.arrives = get('f-arrival')"));
  assert.ok(js.includes('plan.onSaid((text) => note(text));'));
  assert.ok(js.includes('(!i.date || !shownDays.has(i.date))'), 'one saved before, dated past the plan, shows under Not on a day yet');
  const manifest = JSON.parse(fs.readFileSync(new URL('../modules/travel/module.json', import.meta.url), 'utf8'));
  const accept = manifest.actions.provides.find((a) => a.name === 'acceptSuggestion');
  assert.equal(accept.input.object, 'object?', 'older callers still send the flat fields');
  assert.deepEqual(accept.takes.flatMap((e) => e.kinds).sort(), ['bar', 'bus', 'cafe', 'car', 'event', 'ferry', 'flight', 'hotel', 'museum', 'note', 'restaurant', 'show', 'sight', 'tour', 'train']);
});

console.log(`check-travel: OK (${n} checks)`);
