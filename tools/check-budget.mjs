#!/usr/bin/env node
/*
 * check-budget.mjs -- the Budget module (modules/budget; documentation/plans/plan-budget-module.md, step 2).
 *
 * On their own, with no server and no browser: the manifest as the server reads it (cleanManifest: the `budget` flag, the
 * two permissions with guests off, the `addCost` action, the `cost` kind, the categories list with a fixed Other); the
 * model in src/budget-lib.js (written to be inlined into the page, so it is loaded here as a function body): the amount
 * rules, the cost sanitiser and what is stored, what `addCost` makes of a request, the totals, the categories (an unknown one
 * under Other), the filter, sort and groups, the settle-up maths (uneven cents, shares that add up, the fewest payments, when
 * the view shows), the burndown's data (its range from the phases or the costs, steps, undated and planned costs), the
 * target's rule (who is offered Edit target, and that an amount goes with its currency), and the strip's fact against the
 * server's own check of facts; then the host's side of the target (host.budget.can and .set, sliced out of
 * public/module-host.js and run on a stand-in api): only an owner, the admin or the space's moderator; a PATCH that carries
 * only `budget`.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let n = 0;
const test = (name, fn) => { fn(); n += 1; };
const atest = async (name, fn) => { await fn(); n += 1; };

// --- the manifest ---------------------------------------------------------------------------------------------------
const { cleanManifest } = require('../server/modules.js');
const { cleanFacts } = require('../server/facts.js');
const raw = JSON.parse(read('modules/budget/module.json'));

test('the manifest is valid as the server reads it, and says what Budget is', () => {
  const m = cleanManifest(raw, new Set(['module.json', 'canvas.html']));
  assert.equal(m.id, 'budget');
  assert.equal(m.name, 'Budget');
  assert.equal(m.icon, 'wallet');
  assert.match(m.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(m.scope, ['space'], 'space only');
  assert.ok(m.surfaces.canvas && !m.surfaces.page, 'a canvas, no page of its own');
  assert.deepEqual(m.surfaces.canvas.mode, ['dock', 'float']);
  assert.equal(m.budget, true, 'it reads the space\'s target, so Set up offers the field while it is on');
  assert.deepEqual(m.access, { read: 'view', write: 'edit' });
  const perm = (k) => m.permissions.find((p) => p.key === k);
  assert.deepEqual(perm('view').default, { member: true, moderator: true, guest: false });
  assert.deepEqual(perm('edit').default, { member: true, moderator: true, guest: false });
  assert.equal(m.permissions.length, 2, 'no permission for the target: it is the space\'s own, and the server decides');
});

test('addCost, the cost kind and the categories setting', () => {
  const m = cleanManifest(raw, new Set(['module.json', 'canvas.html']));
  const add = m.actions.provides.find((a) => a.name === 'addCost');
  assert.ok(add && !add.local, 'addCost is an ordinary action other modules may ask for');
  assert.deepEqual(add.input, { title: 'string', amount: 'number?', planned: 'number?', actual: 'number?', category: 'string?', payer: 'string?', date: 'date?', notes: 'text?', ref: 'ref?' });
  const cost = m.refs.produces.find((k) => k.kind === 'cost');
  assert.ok(cost && cost.open, 'a cost can be opened');
  assert.equal(cost.key, 'cost:{id}');
  assert.equal(cost.summary.title, 'title');
  assert.equal(cost.summary.done, 'done');
  assert.equal(raw.refs.produces[0].summary.amount, 'amount', 'the amount a booking shows (the server reads it once `amount` is a summary field)');
  const cats = m.settings.find((s) => s.key === 'categories');
  assert.equal(cats.type, 'list');
  assert.deepEqual(cats.fixed, ['other']);
  assert.deepEqual(cats.default.map((c) => c.id), ['travel', 'lodging', 'food', 'supplies', 'services', 'fees', 'activities', 'other']);
  for (const c of cats.default) assert.ok(fs.existsSync(path.join(ROOT, 'node_modules', '@fortawesome', 'fontawesome-free', 'svgs', 'solid', `${c.icon}.svg`)), `${c.icon} is an icon`);
});

test('the stylesheet uses theme tokens only: no colour of its own', () => {
  const css = read('modules/budget/src/budget.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual(css.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) || [], []);
});

// --- the model ------------------------------------------------------------------------------------------------------
const lib = new Function('word', `${read('modules/budget/src/budget-lib.js')}
return { cleanAmount, readAmount, isDay, dayNum, dayOf, cleanCost, costValue, costFromRequest, DEFAULT_CATS, cleanCategories, catRow, toneOf,
  totals, byCategory, filterCosts, sortCosts, groupCosts, balances, settleShows, burndown, burndownWords, targetView, targetToSend, stripFacts, statusWords, cutText, pulledCosts, allCosts, withheldNote, categoryByName };`)((key, o) => (o && o.a ? `a ${key}` : key)); // the page's `word`, a stand-in
const {
  cleanAmount, readAmount, isDay, cleanCost, costValue, costFromRequest, DEFAULT_CATS, cleanCategories, toneOf, totals, byCategory, filterCosts, sortCosts, groupCosts,
  balances, settleShows, burndown, burndownWords, targetView, targetToSend, stripFacts, statusWords, cutText, pulledCosts, allCosts, withheldNote, categoryByName,
} = lib;
const cost = (id, o) => cleanCost(id, { title: `Cost ${id}`, ...o });
const money = (a, code = 'USD') => `${code === 'EUR' ? '€' : '$'}${Number(a).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

test('amounts: positive, below 12 digits, to cents; what a person types', () => {
  assert.equal(cleanAmount(12.345), 12.35);
  assert.equal(cleanAmount('40'), 40);
  assert.equal(cleanAmount(0.004), null, 'rounds to nothing');
  for (const bad of [0, -1, '', null, undefined, NaN, Infinity, 'x', true, 1e12, 1e15]) assert.equal(cleanAmount(bad), null, String(bad));
  assert.equal(cleanAmount(999999999999.99), 999999999999.99);
  assert.equal(readAmount(''), null);
  assert.equal(readAmount('  '), null);
  assert.equal(readAmount('12.50'), 12.5);
  assert.equal(readAmount('1,234.50'), 1234.5);
  assert.equal(readAmount('12,5'), 12.5);
  assert.equal(readAmount('1.234,56'), 1234.56);
  assert.equal(readAmount('1234,56'), 1234.56);
  assert.equal(readAmount('1,234.56'), 1234.56);
  assert.equal(readAmount('1.234.567,5'), 1234567.5);
  for (const bad of ['1,23.456,7', '1.2,345', '12.345,6.7', '1,2.3']) assert.equal(readAmount(bad), undefined, bad);
  assert.equal(readAmount('$ 40'), 40);
  assert.equal(readAmount('€1 200'), 1200);
  for (const bad of ['abc', '0', '-5', '1.2.3', '12,34,5x', '1e3']) assert.equal(readAmount(bad), undefined, bad);
});

test('the cost sanitiser: a title is needed, the rest is cleaned and kept as it was', () => {
  assert.equal(cleanCost('a', null), null);
  assert.equal(cleanCost('a', {}), null);
  assert.equal(cleanCost('a', { title: '   ' }), null);
  const c = cleanCost('a', { title: '  Ferry\n tickets  ', category: 'travel', planned: '90', actual: 80.456, paidBy: 'u1', sharedBy: ['u1', 'u2', 'u1', 5, ''], date: '2026-10-05', notes: 'x'.repeat(2000), by: 'u1', ref: { module: 'travel', kind: 'item', id: 'b1', scope: 'space', space: 's', extra: 1 } });
  assert.equal(c.title, 'Ferry tickets');
  assert.equal(c.planned, 90);
  assert.equal(c.actual, 80.46);
  assert.deepEqual(c.sharedBy, ['u1', 'u2']);
  assert.equal(c.notes.length, 1000);
  assert.deepEqual(c.ref, { module: 'travel', kind: 'item', id: 'b1', scope: 'space', space: 's' });
  assert.equal(cleanCost('a', { title: 't', category: 'Not An Id!' }).category, 'other', 'a bad category id is Other');
  assert.equal(cleanCost('a', { title: 't', category: 'gone-from-list' }).category, 'gone-from-list', 'an id off the list is kept');
  assert.equal(cleanCost('a', { title: 't', date: '2026-02-30' }).date, '', 'a day that is not a day');
  assert.equal(cleanCost('a', { title: 't', planned: -4, actual: 0 }).planned, null);
  assert.equal(cleanCost('a', { title: 'x'.repeat(300) }).title.length, 120);
  assert.ok(isDay('2026-10-14') && !isDay('2026-13-01') && !isDay('14/10/2026') && !isDay(20261014));
});

test('what is stored: no empty fields; `amount`, `done` and the category\'s words for the summary', () => {
  const paid = costValue(cost('a', { category: 'food', planned: 50, actual: 42.5, date: '2026-10-09', paidBy: 'u1', by: 'u1' }), 'Food');
  assert.deepEqual(paid, { title: 'Cost a', category: 'food', categoryName: 'Food', planned: 50, actual: 42.5, amount: 42.5, done: true, paidBy: 'u1', date: '2026-10-09', notes: '', by: 'u1' });
  const plan = costValue(cost('b', { planned: 90 }), 'Other');
  assert.equal(plan.amount, 90);
  assert.equal(plan.done, false);
  assert.ok(!('actual' in plan) && !('date' in plan) && !('paidBy' in plan) && !('sharedBy' in plan) && !('ref' in plan));
  const none = costValue(cost('c', {}), 'Other');
  assert.ok(!('amount' in none) && none.done === false, 'no amount, no `amount`');
  // stored and read back, a cost is the same
  assert.deepEqual(cleanCost('a', paid), cost('a', paid));
});

test('addCost: what another module may ask for, checked', () => {
  const people = ['u1', 'u2'];
  const c = costFromRequest({ title: ' Taxi ', amount: 45, category: 'travel', payer: 'u1', date: '2026-10-12', notes: 'to the pier', ref: { module: 'travel', kind: 'item', id: 'b1', scope: 'space', space: 's' } }, 'u9', people);
  assert.deepEqual([c.title, c.planned, c.actual, c.paidBy, c.date, c.category, c.by], ['Taxi', null, 45, 'u1', '2026-10-12', 'travel', 'u9'], '`amount` with a payer is what was paid');
  assert.deepEqual([costFromRequest({ title: 'Hotel', amount: 300 }, 'u1', people).planned, costFromRequest({ title: 'Hotel', amount: 300 }, 'u1', people).actual], [300, null], '`amount` alone is what is planned');
  const both = costFromRequest({ title: 'Hotel', amount: 1, planned: 300, actual: 280 }, 'u1', people);
  assert.deepEqual([both.planned, both.actual], [300, 280], '`planned` and `actual` win over `amount`');
  assert.throws(() => costFromRequest({}, 'u1', people), /a cost needs a title/);
  assert.throws(() => costFromRequest({ title: 't', amount: -3 }, 'u1', people), /amount must be an amount above zero/);
  assert.throws(() => costFromRequest({ title: 't', actual: 'lots' }, 'u1', people), /actual must be an amount above zero/);
  assert.throws(() => costFromRequest({ title: 't', payer: 'stranger' }, 'u1', people), /not in this space/);
  assert.throws(() => costFromRequest({ title: 't', date: 'tomorrow' }, 'u1', people), /must be a day/);
  assert.equal(costFromRequest({ title: 't' }, 'u1', people).category, 'other');
});

const cats = DEFAULT_CATS;
test('categories: the list, Other always there, an unknown id counted under Other', () => {
  assert.deepEqual(cleanCategories(null), DEFAULT_CATS);
  assert.deepEqual(cleanCategories([]), DEFAULT_CATS);
  const own = cleanCategories([{ id: 'rent', label: 'Rent', icon: 'house', color: '#888888' }, { id: 'rent', label: 'Again' }, { id: 'Bad Id', label: 'x' }, { id: 'tools', label: '  Tools  ' }]);
  assert.deepEqual(own.map((c) => c.id), ['rent', 'tools', 'other'], 'duplicates and bad ids dropped, Other put back');
  assert.equal(own[1].label, 'Tools');
  assert.equal(cleanCategories([{ id: 'other', label: 'Misc' }])[0].label, 'Misc', 'Other may be renamed');
  const costs = [cost('1', { category: 'food', planned: 20 }), cost('2', { category: 'gone', actual: 5 }), cost('3', { category: 'other', actual: 1.5 })];
  const rows = byCategory(costs, cats);
  assert.deepEqual(rows.map((r) => r.id), cats.map((c) => c.id), 'the list\'s order, every category present');
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.deepEqual([by.food.count, by.food.planned, by.food.actual], [1, 20, 0]);
  assert.deepEqual([by.other.count, by.other.actual], [2, 6.5], 'the unknown category under Other');
  assert.deepEqual([by.travel.count, by.travel.planned, by.travel.actual], [0, 0, 0], 'a category with no costs: zeros');
  assert.match(toneOf(cats, 'food'), /^var\(--tint-[a-z]+\)$/, 'a tint token by default');
  assert.equal(toneOf([{ id: 'other', label: 'O', color: '#12ab34' }], 'zzz'), '#12ab34', 'the colour the owner chose');
});

test('totals: spent is what was paid, expected counts each cost once, left is the target less spent', () => {
  const costs = [cost('1', { planned: 100, actual: 80 }), cost('2', { planned: 50 }), cost('3', { actual: 20.1 }), cost('4', {})];
  assert.deepEqual(totals(costs, 300), { count: 4, spent: 100.1, planned: 150, expected: 150.1, target: 300, left: 199.9, over: false });
  assert.deepEqual(totals(costs, 90), { count: 4, spent: 100.1, planned: 150, expected: 150.1, target: 90, left: -10.1, over: true });
  assert.deepEqual(totals(costs, null), { count: 4, spent: 100.1, planned: 150, expected: 150.1, target: null, left: null, over: false });
  assert.deepEqual(totals([], 50), { count: 0, spent: 0, planned: 0, expected: 0, target: 50, left: 50, over: false });
  const cents = Array.from({ length: 10 }, (_, i) => cost(String(i), { actual: 0.1 }));
  assert.equal(totals(cents).spent, 1, 'ten dimes are a dollar: no float drift');
  assert.equal(statusWords(costs, money), '4 costs · $150.10 expected');
  assert.equal(statusWords([costs[0]], money), '1 cost · $80.00 expected');
  assert.equal(statusWords([], money), 'No costs yet');
});

test('the list: filter by category, payer and words; sort; group by day or category', () => {
  const costs = [
    cost('a', { title: 'Flights', category: 'travel', actual: 300, paidBy: 'u1', date: '2026-10-05' }),
    cost('b', { title: 'Hotel', category: 'lodging', planned: 500, date: '2026-10-05', notes: 'near the pier' }),
    cost('c', { title: 'Dinner', category: 'food', actual: 80, paidBy: 'u2', date: '2026-10-03' }),
    cost('d', { title: 'Mystery', category: 'gone', actual: 5 }),
  ];
  const ids = (list) => list.map((c) => c.id).join('');
  assert.equal(ids(filterCosts(costs, cats, {})), 'abcd');
  assert.equal(ids(filterCosts(costs, cats, { category: 'travel' })), 'a');
  assert.equal(ids(filterCosts(costs, cats, { category: 'other' })), 'd', 'an unknown category is under Other');
  assert.equal(ids(filterCosts(costs, cats, { payer: 'u2' })), 'c');
  assert.equal(ids(filterCosts(costs, cats, { payer: '-' })), 'bd', 'nobody paid yet');
  assert.equal(ids(filterCosts(costs, cats, { text: 'PIER' })), 'b', 'words, in the title or the notes');
  assert.equal(ids(sortCosts(costs, 'date-asc')), 'cabd', 'earliest first, no date last');
  assert.equal(ids(sortCosts(costs, 'date-desc')), 'abcd');
  assert.equal(ids(sortCosts(costs, 'amount-desc')), 'bacd');
  assert.equal(ids(sortCosts(costs, 'amount-asc')), 'dcab');
  assert.deepEqual(sortCosts(costs, 'title').map((c) => c.title), ['Dinner', 'Flights', 'Hotel', 'Mystery']);
  const days = groupCosts(sortCosts(costs, 'date-asc'), cats, 'day', 'asc');
  assert.deepEqual(days.map((g) => [g.key, ids(g.costs)]), [['2026-10-03', 'c'], ['2026-10-05', 'ab'], ['', 'd']], 'days in order, no date last');
  assert.deepEqual(groupCosts(sortCosts(costs, 'date-desc'), cats, 'day', 'desc').map((g) => g.key), ['2026-10-05', '2026-10-03', ''], 'latest first, no date still last');
  assert.equal(days[1].total.expected, 800);
  const groups = groupCosts(costs, cats, 'category', 'asc');
  assert.deepEqual(groups.map((g) => g.key), ['travel', 'lodging', 'food', 'other'], 'the list\'s order; the unknown one under Other');
});

test('settle up: uneven cents, shares that add up, the fewest payments, who is owed', () => {
  const people = ['a', 'b', 'c'];
  // 100.00 among three: 33.34, 33.33, 33.33. a paid it all: b and c owe 33.33, a is owed 66.67.
  const b1 = balances([cost('1', { actual: 100, paidBy: 'a' })], people);
  assert.deepEqual([b1.total, b1.paid.a, b1.share.a, b1.share.b, b1.share.c], [100, 100, 33.34, 33.33, 33.33]);
  assert.deepEqual([b1.net.a, b1.net.b, b1.net.c], [66.66, -33.33, -33.33]);
  assert.deepEqual(b1.payments, [{ from: 'b', to: 'a', amount: 33.33 }, { from: 'c', to: 'a', amount: 33.33 }]);
  // shares always add up to what was paid, and nets to zero, whatever the cents
  for (const amount of [0.01, 0.02, 10, 99.99, 100.01, 1234.57]) {
    const r = balances([cost('x', { actual: amount, paidBy: 'b' })], people);
    const shares = people.reduce((s, k) => s + Math.round(r.share[k] * 100), 0);
    const nets = people.reduce((s, k) => s + Math.round(r.net[k] * 100), 0);
    assert.equal(shares, Math.round(amount * 100), `shares add up for ${amount}`);
    assert.equal(nets, 0, `nets add up to zero for ${amount}`);
    assert.equal(r.payments.reduce((s, p) => s + Math.round(p.amount * 100), 0), Math.round(r.net.b * 100), `the payments cover what b is owed for ${amount}`);
  }
  // a cost shared by two only; a cost nobody paid or with no amount paid counts for nothing
  const b2 = balances([cost('1', { actual: 60, paidBy: 'a', sharedBy: ['a', 'b'] }), cost('2', { planned: 500, paidBy: 'c' }), cost('3', { actual: 40 })], people);
  assert.deepEqual([b2.total, b2.share.a, b2.share.b, b2.share.c || 0], [60, 30, 30, 0]);
  assert.deepEqual(b2.payments, [{ from: 'b', to: 'a', amount: 30 }], 'only a planned amount, or no payer: nothing to settle');
  // the fewest payments: everyone square settles with nothing; a chain settles with one fewer payment than people owing
  const b3 = balances([cost('1', { actual: 30, paidBy: 'a' }), cost('2', { actual: 30, paidBy: 'b' }), cost('3', { actual: 30, paidBy: 'c' })], people);
  assert.deepEqual(b3.payments, [], 'square');
  const four = ['a', 'b', 'c', 'd'];
  const b4 = balances([cost('1', { actual: 400, paidBy: 'a' }), cost('2', { actual: 200, paidBy: 'b' })], four);
  assert.ok(b4.payments.length <= 3, 'at most one fewer than the people');
  for (const k of four) {
    const got = b4.payments.reduce((s, p) => s + (p.to === k ? p.amount : 0) - (p.from === k ? p.amount : 0), 0);
    assert.equal(Math.round(got * 100), Math.round(b4.net[k] * 100), `${k} ends square`);
  }
  // a person who left (paid, no longer in the space) is still settled
  assert.ok(balances([cost('1', { actual: 10, paidBy: 'gone' })], ['a', 'b']).payments.every((p) => p.to === 'gone'));
  assert.deepEqual(balances([], people).payments, []);
});

test('settle up shows only when some cost has a payer and the space has more than one person', () => {
  const paid = [cost('1', { actual: 5, paidBy: 'a' })];
  assert.equal(settleShows(paid, ['a', 'b']), true);
  assert.equal(settleShows(paid, ['a']), false, 'one person');
  assert.equal(settleShows(paid, []), false);
  assert.equal(settleShows([cost('1', { actual: 5 })], ['a', 'b']), false, 'no payer');
  assert.equal(settleShows([], ['a', 'b']), false, 'no costs');
});

test('the burndown: range, steps, planned and undated costs', () => {
  const costs = [
    cost('1', { actual: 1000, date: '2026-10-05' }),
    cost('2', { actual: 500, planned: 600, date: '2026-10-08' }),
    cost('3', { planned: 300, date: '2026-10-20' }),
    cost('4', { actual: 100 }),
  ];
  assert.equal(burndown(costs, { target: 0 }), null, 'no target, no chart');
  assert.equal(burndown([cost('1', { actual: 5 })], { target: 100 }), null, 'no day to draw from');
  const b = burndown(costs, { target: 4000 });
  assert.deepEqual([b.from, b.to, b.phased], ['2026-10-05', '2026-10-20', false], 'from the costs\' dates');
  assert.deepEqual(b.actual, [{ day: '2026-10-05', remaining: 3900 }, { day: '2026-10-05', remaining: 2900 }, { day: '2026-10-08', remaining: 2400 }], 'the undated 100 first, then a step on each day');
  assert.deepEqual(b.expected.map((p) => p.remaining), [3900, 2900, 2400, 2100], 'paid, else planned: the 500 paid counts, not the 600 planned, and the 300 planned is taken off on its day');
  assert.deepEqual([b.endActual, b.endExpected, b.undated, b.high, b.low], [2400, 2100, 1, 4000, 0]);
  // the range from the phases when there are some; a cost outside widens it, a phase with no end counts its start
  const phased = burndown(costs, { target: 4000, dates: { plan: { start: '2026-10-01', end: '2026-10-10' }, trip: { start: '2026-10-11' }, junk: { start: 'soon' } } });
  assert.deepEqual([phased.from, phased.to, phased.phased], ['2026-10-01', '2026-10-20', true], 'earliest phase day to the last; the costs\' dates widen it');
  const only = burndown([cost('1', { actual: 10 })], { target: 100, dates: { a: { start: '2026-10-01', end: '2026-10-31' } } });
  assert.deepEqual([only.from, only.to, only.actual.length, only.endActual], ['2026-10-01', '2026-10-31', 1, 90], 'phases alone give the range, an undated cost is taken off the start');
  // over the target: below zero, and the low point is kept for the axis
  const over = burndown([cost('1', { actual: 150, date: '2026-10-02' })], { target: 100 });
  assert.deepEqual([over.endActual, over.low, over.to], [-50, -50, '2026-10-03'], 'one day gives a range of two');
  // cents do not drift
  const dimes = burndown(Array.from({ length: 10 }, () => cost('x', { actual: 0.1, date: '2026-10-02' })), { target: 1 });
  assert.equal(dimes.endActual, 0);
  // the words a screen reader hears
  const say = (d) => d.slice(5);
  const words = burndownWords(b, say, money);
  assert.match(words, /from 10-05 to 10-20/);
  assert.match(words, /target is \$4,000\.00/);
  assert.match(words, /\$2,400\.00 is left/);
  assert.match(words, /Left if all planned costs are spent: \$2,100\.00/);
  assert.match(words, /1 cost has no date and is counted from the first day/);
  assert.match(burndownWords(over, say, money), /\$50\.00 over the target/);
  assert.equal(burndownWords(null, say, money), '');
});

test('the target: who is offered Edit target, and an amount goes with its currency', () => {
  assert.deepEqual(targetView(true, { amount: 4000, currency: 'EUR' }), { amount: 4000, currency: 'EUR', readOnly: false, action: 'edit' });
  assert.deepEqual(targetView(true, null), { amount: null, currency: '', readOnly: false, action: 'set' });
  assert.deepEqual(targetView(true, { currency: 'GBP' }), { amount: null, currency: 'GBP', readOnly: false, action: 'set' }, 'a currency alone is no target yet');
  for (const t of [null, { amount: 4000, currency: 'EUR' }, { currency: 'EUR' }]) {
    const v = targetView(false, t);
    assert.deepEqual([v.readOnly, v.action], [true, null], 'someone who may not change it is never offered a button');
  }
  assert.deepEqual(targetToSend(4000, 'usd'), { amount: 4000, currency: 'USD' });
  assert.deepEqual(targetToSend('3500.456', 'EUR'), { amount: 3500.46, currency: 'EUR' });
  assert.deepEqual(targetToSend(4000, ''), { amount: 4000 }, 'an amount without a currency is the module\'s own');
  assert.deepEqual(targetToSend(null, 'EUR'), { currency: 'EUR' }, 'an empty amount: the currency alone, which is what was asked for');
  assert.deepEqual(targetToSend(0, 'EUR'), { currency: 'EUR' });
  assert.equal(targetToSend(null, ''), null);
  assert.equal(targetToSend(null, 'dollars'), null);
  // the form starts with the stored amount, so changing only the currency sends both (the server replaces the whole target)
  const stored = { amount: 1234.5, currency: 'USD' };
  assert.deepEqual(targetToSend(targetView(true, stored).amount, 'EUR'), { amount: 1234.5, currency: 'EUR' });
});

test('the strip\'s fact: the words, the progress, over and under, another currency, and the server accepts it', () => {
  const costs = [cost('1', { actual: 2340 }), cost('2', { planned: 999 })];
  const fact = (o) => stripFacts({ costs, currency: 'USD', money, ...o });
  assert.deepEqual(fact({ target: { amount: 4000 } }), [{ id: 'spent', icon: 'coins', text: '$2,340.00 of $4,000.00', value: '$1,660.00 left', progress: 0.585, order: 10, budget: true }]);
  assert.deepEqual(fact({ target: { amount: 2000, currency: 'USD' } }), [{ id: 'spent', icon: 'circle-exclamation', text: '$2,340.00 of $2,000.00 · over', value: '$340.00 over', progress: 1, order: 10, budget: true }]);
  assert.deepEqual(fact({ target: null }), [{ id: 'spent', icon: 'coins', text: 'Spent $2,340.00', order: 10, budget: true }], 'no target: spent only, still marked so Set up offers the field');
  assert.deepEqual(fact({ target: { currency: 'EUR' } }), fact({ target: null }), 'a currency alone is no target');
  assert.deepEqual(fact({ costs: [], target: { amount: 500 } })[0].progress, 0);
  const other = fact({ target: { amount: 4000, currency: 'EUR' } })[0];
  assert.deepEqual([other.text, other.value, 'progress' in other], ['$2,340.00 of €4,000.00', 'Another currency', false], 'shown, not compared');
  for (const f of [fact({ target: { amount: 4000 } }), fact({ target: { amount: 2000 } }), fact({ target: null }), fact({ target: { amount: 4000, currency: 'EUR' } }), fact({ costs: [], target: { amount: 3 } })]) {
    assert.ok(!cleanFacts({ facts: f }).error, `the server accepts it: ${JSON.stringify(f)} ${cleanFacts({ facts: f }).error}`);
    assert.ok([...f[0].text].length <= 40 && [...(f[0].value || '')].length <= 24);
  }
  // a very large amount is cut to the strip's 40 characters, never refused
  const big = stripFacts({ costs: [cost('1', { actual: 999999999999.99 })], target: { amount: 999999999999.99 }, currency: 'USD', money: (a) => `USD ${Number(a).toFixed(2)}${'0'.repeat(30)}` })[0];
  assert.ok([...big.text].length <= 40 && [...big.value].length <= 24);
  assert.ok(!cleanFacts({ facts: [big] }).error);
  assert.equal(cutText('é'.repeat(41), 40), `${'é'.repeat(39)}…`);
  assert.equal(cutText('😀'.repeat(41), 40).length, 39 * 2 + 1, 'emoji are not split');
});


// --- costs pulled in from other modules (step 3) --------------------------------------------------------------------------
const booking = (id, o = {}) => ({ title: `Booking ${id}`, when: '2026-10-05', amount: 100, module: { id: 'travel', name: 'Itinerary' }, ref: { module: 'travel', kind: 'plan', id, scope: 'space', space: 'S1' }, ...o });

test('a pulled-in cost: read-only, no category (Other), counted as paid, from its summary', () => {
  const [p] = pulledCosts([booking('b1', { amount: 80.456, paidBy: 'u1', sharedBy: ['u1', 'u2', 'u1'], when: '2026-10-05T12:50' })], 'budget');
  assert.equal(p.pulled, true);
  assert.equal(p.id, 'pulled:travel:plan:b1@S1');
  assert.equal(p.actual, 80.46, 'the amount, to cents, is what was paid');
  assert.equal(p.planned, null);
  assert.equal(p.category, 'other');
  assert.equal(p.paidBy, 'u1');
  assert.deepEqual(p.sharedBy, ['u1', 'u2']);
  assert.equal(p.date, '2026-10-05', 'a time on the day is cut to the day');
  assert.deepEqual(p.source, { id: 'travel', name: 'Itinerary' }, 'the module as this environment shows it');
  assert.deepEqual(p.ref, { module: 'travel', kind: 'plan', id: 'b1', scope: 'space', space: 'S1' });
  const bare = pulledCosts([booking('b2', { when: undefined, paidBy: undefined, sharedBy: undefined })], 'budget')[0];
  assert.deepEqual([bare.date, bare.paidBy, bare.sharedBy], ['', '', []]);
  assert.deepEqual(pulledCosts([booking('b3', { amount: 0 }), booking('b4', { amount: 'x' }), { title: 'no ref', amount: 5 }, null, booking('b5', { ref: { module: 'budget', kind: 'cost', id: 'c' } })], 'budget'), [], 'no amount, no ref, or its own: not pulled');
  assert.deepEqual(pulledCosts(undefined, 'budget'), []);
});

test('a pulled-in cost takes the category its source names: by name, any case, else Other', () => {
  const kinds = { Travel: 'travel', Lodging: 'lodging', Food: 'food', Activities: 'activities', Other: 'other' };
  for (const [words, id] of Object.entries(kinds)) assert.equal(categoryByName(DEFAULT_CATS, words), id, words);
  assert.deepEqual(DEFAULT_CATS.map((c) => c.id).slice(-2), ['activities', 'other'], 'Activities is a default, before Other');
  assert.equal(categoryByName(DEFAULT_CATS, 'lodging'), 'lodging', 'case-insensitive: the source\'s words come lower case');
  assert.equal(categoryByName(DEFAULT_CATS, '  LODGING '), 'lodging');
  assert.equal(categoryByName(DEFAULT_CATS, ''), 'other', 'no words: Other');
  assert.equal(categoryByName(DEFAULT_CATS, 'castle'), 'other', 'not on the list: Other');
  const rows = [booking('h', { category: 'Lodging', amount: 80 }), booking('f', { category: 'travel', amount: 300 }), booking('r', { category: 'Food', amount: 40 }), booking('s', { category: 'Activities', amount: 25 }), booking('n', { amount: 5 })];
  const pulled = pulledCosts(rows, 'budget');
  assert.equal(pulled[0].category, 'other', 'on its own a pulled-in cost is under Other until the list is known');
  assert.deepEqual(allCosts([], pulled, DEFAULT_CATS).map((c) => c.category), ['lodging', 'travel', 'food', 'activities', 'other']);
  const by = Object.fromEntries(byCategory(allCosts([], pulled, DEFAULT_CATS), DEFAULT_CATS).map((r) => [r.id, r]));
  assert.deepEqual([by.lodging.actual, by.travel.actual, by.food.actual, by.activities.actual, by.other.actual], [80, 300, 40, 25, 5], 'counted under its category');
  assert.equal(filterCosts(allCosts([], pulled, DEFAULT_CATS), DEFAULT_CATS, { category: 'lodging' }).length, 1);
  assert.deepEqual(groupCosts(allCosts([], pulled, DEFAULT_CATS), DEFAULT_CATS, 'category').map((g) => g.key), ['travel', 'lodging', 'food', 'activities', 'other']);
  // the owner removed Lodging and renamed Food: the hotel falls to Other (never lost); Food's cost follows its new name only if the words match
  const edited = cleanCategories(DEFAULT_CATS.filter((c) => c.id !== 'lodging').map((c) => (c.id === 'food' ? { ...c, label: 'Meals' } : c)));
  const after = allCosts([], pulled, edited);
  assert.deepEqual(after.map((c) => c.category), ['other', 'travel', 'other', 'activities', 'other'], 'removed or renamed: Other');
  assert.equal(totals(after).spent, 450, 'nothing is lost');
  assert.equal(categoryByName(edited, 'Meals'), 'food', 'a source that says Meals finds the renamed one');
  assert.deepEqual(pulledCosts(rows, 'budget')[0].categoryWord, 'Lodging');
});

test('the Planner names its categories in plain words, and the server keeps them', () => {
  const tm = cleanManifest(JSON.parse(read('modules/travel/module.json')), new Set(['module.json', 'page.html', 'canvas.html', 'travel.html', 'widget.html', 'travel-widget.html']));
  const plan = tm.refs.produces.find((k) => k.kind === 'plan');
  assert.equal(plan.summary.category, 'category');
  assert.deepEqual(plan.categoryNames, { travel: 'Travel', journey: 'Travel', stay: 'Lodging', eat: 'Food', do: 'Activities', other: 'Other' });
  const names = DEFAULT_CATS.map((c) => c.label);
  for (const w of new Set(Object.values(plan.categoryNames))) assert.ok(names.includes(w), `${w} is a default Budget category`);
  const bad = JSON.parse(read('modules/travel/module.json'));
  bad.refs.produces[1].summary.category = undefined;
  assert.throws(() => cleanManifest(bad, new Set(['module.json', 'page.html', 'canvas.html', 'travel.html', 'widget.html', 'travel-widget.html'])), /categoryNames needs a summary.category/);
});

test('a booking with an actual is paid (its estimate only shown); with only an estimate it is planned, not spent', () => {
  const [both, only, actual, none] = pulledCosts([booking('a', { amount: 80, planned: 70 }), booking('b', { amount: undefined, planned: 45.678 }), booking('c', { planned: undefined }), booking('d', { amount: undefined })], 'budget');
  assert.deepEqual([both.actual, both.planned, both.estimate], [80, null, 70], 'the actual replaces the estimate in the sums; the estimate is kept to show');
  assert.deepEqual([only.actual, only.planned, only.estimate], [null, 45.68, null], 'an estimate alone is planned');
  assert.deepEqual([actual.actual, actual.planned, actual.estimate], [100, null, null]);
  assert.equal(none, undefined, 'no amount and no estimate: not pulled');
  const all = [both, only, actual];
  const t = totals(all);
  assert.deepEqual([t.spent, t.planned, t.expected], [180, 45.68, 225.68], 'spent counts the actuals; planned only the estimate-only booking; no double count');
  const people = ['u1', 'u2'];
  const paid = pulledCosts([booking('p', { amount: undefined, planned: 50, paidBy: 'u1' })], 'budget');
  assert.equal(balances(paid, people).total, 0, 'settle up uses actual only');
  // the burndown: the solid line takes the actual on its day; the projected line also takes the estimate; an actual replaces its estimate
  const dated = pulledCosts([booking('x', { amount: 80, planned: 70, when: '2026-10-05' }), booking('y', { amount: undefined, planned: 40, when: '2026-10-08' }), booking('z', { amount: undefined, planned: 10, when: undefined })], 'budget');
  const b = burndown(dated, { target: 500 });
  assert.deepEqual(b.actual.map((p) => p.remaining), [500, 420], 'solid: only the 80 paid; the estimate beside it is not taken off again');
  assert.deepEqual(b.expected.map((p) => p.remaining), [490, 410, 370], 'projected: the undated 10 first, the paid 80, then the 40 estimated on its day');
  assert.deepEqual([b.endActual, b.endExpected, b.undated], [420, 370, 1]);
});

test('the same booking twice is counted once; a Budget cost that refs a booking is its own cost', () => {
  const own = [cost('c1', { actual: 40, ref: { module: 'travel', kind: 'plan', id: 'b1', scope: 'space', space: 'S1' } })];
  const pulled = pulledCosts([booking('b1'), booking('b1'), booking('b2')], 'budget');
  assert.equal(pulled.length, 2, 'a repeated summary is one cost');
  const all = allCosts(own, pulled);
  assert.equal(all.length, 3);
  assert.equal(totals(all).spent, 240, 'own 40 + booking 100 + booking 100: each counted once, the deposit is its own figure');
  assert.equal(own.length, 1, 'nothing is added to Budget\'s own list: pulled costs are never stored');
  assert.equal(allCosts(own, []).length, 1, 'Budget off or the module gone: only its own');
});

test('totals, categories and the strip count pulled-in costs as paid, under Other', () => {
  const own = [cost('a', { category: 'food', planned: 50, actual: 42.5 }), cost('b', { planned: 30 })];
  const all = allCosts(own, pulledCosts([booking('b1', { amount: 100 }), booking('b2', { amount: 20.25 })], 'budget'));
  const t = totals(all, 500);
  assert.deepEqual([t.count, t.spent, t.planned, t.expected, t.left, t.over], [4, 162.75, 80, 192.75, 337.25, false]);
  const cats = byCategory(all, DEFAULT_CATS);
  const row = (id) => cats.find((c) => c.id === id);
  assert.deepEqual([row('other').count, row('other').actual, row('other').planned], [3, 120.25, 30], 'two bookings and one own cost without a category');
  assert.deepEqual([row('food').count, row('food').actual], [1, 42.5]);
  const f = stripFacts({ costs: all, target: { amount: 500 }, currency: 'USD', money })[0];
  assert.equal(f.text, '$162.75 of $500.00', 'one fact, with the bookings in it');
  assert.equal(statusWords(all, money), '4 costs · $192.75 expected');
  // sorting, filtering and grouping take them like any other cost
  assert.equal(filterCosts(all, DEFAULT_CATS, { category: 'other' }).length, 3);
  assert.equal(filterCosts(all, DEFAULT_CATS, { payer: '-' }).length, 4);
  assert.equal(groupCosts(sortCosts(all, 'date-asc'), DEFAULT_CATS, 'category').find((g) => g.key === 'other').costs.length, 3);
});

test('Settle up uses the booking\'s payer and sharers; no sharers means everyone; cents add up', () => {
  const people = ['a', 'b', 'c'];
  const pulled = pulledCosts([booking('h', { amount: 100, paidBy: 'a' }), booking('t', { amount: 30, paidBy: 'b', sharedBy: ['b', 'c'] }), booking('n', { amount: 50 })], 'budget');
  const b = balances(allCosts([], pulled), people);
  assert.equal(b.total, 130, 'the booking with no payer is left out');
  assert.deepEqual([b.paid.a, b.paid.b, b.share.a, b.share.b, b.share.c], [100, 30, 33.34, 48.33, 48.33], 'empty sharedBy is everyone; uneven cents go to the first');
  assert.equal(Math.round((b.share.a + b.share.b + b.share.c) * 100), 13000);
  assert.deepEqual(b.payments.map((p) => [p.from, p.to, p.amount]), [['c', 'a', 48.33], ['b', 'a', 18.33]], 'c and b pay a');
  assert.equal(settleShows(pulled, people), true, 'a booking with a payer opens Settle up');
  assert.equal(settleShows(pulledCosts([booking('n')], 'budget'), people), false, 'none with a payer: it stays hidden');
  const mixed = balances(allCosts([cost('x', { actual: 60, paidBy: 'c' })], pulled), people);
  assert.equal(mixed.total, 190);
  assert.equal(Math.abs(Math.round(Object.values(mixed.net).reduce((a, v) => a + v, 0) * 100)), 0, 'what is owed and what is owed to add to nothing');
});

test('the burndown plots a pulled-in cost on its day; with no day it is counted from the start', () => {
  const pulled = pulledCosts([booking('d', { amount: 100, when: '2026-10-05' }), booking('u', { amount: 40, when: undefined })], 'budget');
  const b = burndown(allCosts([cost('c', { actual: 10, date: '2026-10-09' })], pulled), { target: 500, dates: {} });
  assert.equal(b.from, '2026-10-05');
  assert.deepEqual(b.actual.map((p) => [p.day, p.remaining]), [['2026-10-05', 460], ['2026-10-05', 360], ['2026-10-09', 350]]);
  assert.equal(b.undated, 1);
  assert.equal(burndown(allCosts([], pulledCosts([booking('u', { when: undefined })], 'budget')), { target: 500, dates: {} }), null, 'only an undated cost and no phase dates: nothing to draw');
});

test('the note for a person who cannot read every module: only when the server left something out', () => {
  assert.equal(withheldNote(0), '');
  assert.equal(withheldNote(undefined), '');
  assert.equal(withheldNote(3), "Some costs are from a module you can't see.");
  assert.equal(withheldNote(1), "Some costs are from a module you can't see.");
});

test('the page pulls costs through host.objects.priced, never storage, and gives them no edit or delete', () => {
  const page = read('modules/budget/src/budget.js');
  assert.ok(page.includes('host.objects.priced()'));
  const refresh = page.slice(page.indexOf('async function refreshPulled'), page.indexOf('const openSource'));
  assert.ok(!/storage/.test(refresh), 'the pulled-in costs are not written to storage');
  const click = page.slice(page.indexOf("$('groups').addEventListener('click'"), page.indexOf('function openRowMenu'));
  assert.ok(click.indexOf('pulled') < click.indexOf('openRowMenu(id, menu)'), 'a pulled-in row is handled before the edit and delete menu');
  assert.ok(click.includes('`Open in ${pulled.source.name}`'));
  assert.ok(read('modules/budget/src/budget.html').includes('data-slot="withheld-note"'));
  assert.deepEqual(raw.refs.consumes, ['*'], 'Budget is asked to read other modules\' kinds');
});

// --- the host's side of the target ----------------------------------------------------------------------------------
const hostText = read('public/module-host.js');
const slice = (name, until) => {
  const start = hostText.indexOf(`async '${name}'(`);
  const end = hostText.indexOf(until, start);
  assert.ok(start > 0 && end > start, `${name} is in public/module-host.js`);
  return hostText.slice(start, end);
};
const handlers = (ctx) => new Function('ctx', 'api', 'word', 'window', 'CustomEvent', `const { module, scope, spaceId, keyed, guestToken, phasesChannel, tellSpace } = ctx;\nreturn { ${slice('budget.can', '    // Save the target')}${slice('budget.set', "    // The address of a file")} };`);

await atest('who may change the target: the owner, the admin, a moderator of this space; the host asks the server again on every save', async () => {
  const run = (user, over = {}) => {
    const calls = [];
    const api = async (method, url, body) => { calls.push([method, url, body]); if (url === '/api/me') { if (user === 401) throw Object.assign(new Error('sign in'), { status: 401 }); return { user }; } return { space: { id: 'S1', budget: body && body.budget } }; };
    const told = [];
    const ctx = { module: { id: 'budget', budget: true }, scope: 'space', spaceId: 'S1', keyed: false, guestToken: '', phasesChannel: null, tellSpace: (b) => told.push(b), ...over };
    const h = handlers(ctx)(ctx, api, (k) => k, { dispatchEvent: () => {} }, class { constructor(t, d) { this.detail = d; } });
    return { h, calls, told };
  };
  const can = async (user, over) => run(user, over).h['budget.can']();
  assert.equal(await can({ role: 'owner' }), true);
  assert.equal(await can({ role: 'admin' }), true);
  assert.equal(await can({ role: 'member', spaces: { S1: { permissions: { moderator: true } } } }), true, 'a moderator of this space');
  assert.equal(await can({ role: 'member', spaces: { S2: { permissions: { moderator: true } } } }), false, 'a moderator of another');
  assert.equal(await can({ role: 'member', spaces: { S1: { permissions: { moderator: false } } } }), false);
  assert.equal(await can({ role: 'member' }), false, 'a member');
  assert.equal(await can({ role: 'guest', spaces: { S1: { permissions: { moderator: true } } } }), false, 'a guest');
  assert.equal(await can(401), false, 'nobody signed in');
  assert.equal(await can({ role: 'owner' }, { scope: 'environment' }), false, 'outside a space');
  assert.equal(await can({ role: 'owner' }, { keyed: true }), false, 'a keyed page');
  assert.equal(await can({ role: 'owner' }, { guestToken: 'tok' }), false, 'a guest link');
  // A module whose manifest does not say "budget": true (an uploaded one) may neither ask nor change the target.
  for (const module of [{ id: 'x' }, { id: 'x', budget: false }, { id: 'x', budget: 'true' }]) {
    const none = run({ role: 'owner' }, { module });
    assert.equal(await none.h['budget.can'](), false, 'can() is false without the flag');
    await assert.rejects(() => none.h['budget.set']({ budget: { amount: 1 } }), /does not use the budget/);
    await assert.rejects(() => none.h['budget.set']({ budget: null }), /does not use the budget/);
    assert.deepEqual(none.calls, [], 'nothing reached the server');
  }
  // set: only `budget` goes in the PATCH, whole (the amount with its currency), and the module is told
  const { h, calls, told } = run({ role: 'owner' });
  const kept = await h['budget.set']({ budget: { amount: 4000, currency: 'EUR' } });
  assert.deepEqual(calls, [['PATCH', '/api/spaces/S1', { budget: { amount: 4000, currency: 'EUR' } }]]);
  assert.deepEqual(kept, { amount: 4000, currency: 'EUR' });
  assert.deepEqual(told, [{ amount: 4000, currency: 'EUR' }]);
  assert.deepEqual((await h['budget.set']({ budget: null })), null, 'null clears it');
  assert.deepEqual(calls[1], ['PATCH', '/api/spaces/S1', { budget: null }]);
  const nothing = run({ role: 'owner' });
  await assert.rejects(() => nothing.h['budget.set']({ budget: undefined }), /say the target/);
  await assert.rejects(() => nothing.h['budget.set']({}), /say the target/);
  assert.deepEqual(nothing.calls, [], 'no target sent is refused, never a clear');
  await assert.rejects(() => run({ role: 'owner' }, { scope: 'environment' }).h['budget.set']({ budget: { amount: 1 } }), /only in/);
});

await atest('host.objects.priced asks for amounts in this space only; host.budget.elsewhere finds another module with the flag', async () => {
  const src = hostText;
  const sliceTo = (name, until) => { const a = src.indexOf(`async '${name}'(`); const b = src.indexOf(until, a); assert.ok(a > 0 && b > a, name); return src.slice(a, b); };
  const searchSrc = src.slice(src.indexOf('function objectSearchParams('), src.indexOf('// --- end of the search'));
  const placeSrc = src.slice(src.indexOf('const SPACE_ID'), src.indexOf("\n  return { scope: 'space', space };\n}\n") + "\n  return { scope: 'space', space };\n}\n".length);
  const build = new Function('api', 'ctx', `const { module, scope, spaceId, keyed, guestToken } = ctx;\n${placeSrc}\n${searchSrc}\nreturn { ${sliceTo('objects.priced', "    // Whether another module")}${sliceTo('budget.elsewhere', '    // Each space with its')} };`);
  const calls = [];
  const api = async (method, url) => {
    calls.push(url);
    if (url.startsWith('/api/objects/search')) return { summaries: [{ title: 'x' }], withheld: 2 };
    return { modules: [{ id: 'travel', budget: true }, { id: 'budget', budget: true }, { id: 'chat', budget: false }] };
  };
  const ctx = { module: { id: 'budget', scope: ['space'] }, scope: 'space', spaceId: 'S1', keyed: false, guestToken: '' };
  const h = build(api, ctx);
  assert.deepEqual(await h['objects.priced'](), { summaries: [{ title: 'x' }], withheld: 2 });
  const q = new URL(calls[0], 'http://x').searchParams;
  assert.deepEqual([q.get('from'), q.get('scope'), q.get('space'), q.get('has')], ['budget', 'space', 'S1', 'amount']);
  assert.equal(await h['budget.elsewhere'](), true, 'another module with the flag is on here');
  const alone = build(async () => ({ modules: [{ id: 'budget', budget: true }] }), ctx);
  assert.equal(await alone['budget.elsewhere'](), false, 'itself does not count');
  const out = build(api, { ...ctx, scope: 'environment', spaceId: '' });
  assert.deepEqual(await out['objects.priced'](), { summaries: [], withheld: 0 });
  assert.equal(await out['budget.elsewhere'](), false);
  assert.ok(read('public/sdk/host.js').includes("priced: () => call('objects.priced', {}),") && read('public/sdk/host.js').includes("elsewhere: async () => (await call('budget.elsewhere')) === true"));
});

console.log(`check-budget: OK (${n} tests)`);
