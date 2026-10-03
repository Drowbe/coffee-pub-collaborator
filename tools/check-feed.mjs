#!/usr/bin/env node
/*
 * check-feed.mjs -- a person's calendar feed (documentation/plans/plan-google-calendar.md, Part 1, step 1).
 *   - server/ics.js on its own: every line ends in CRLF and is at most 75 octets, folded never inside a UTF-8
 *     character, text escaped, and the whole checked against RFC 5545's rules (components nest, each event has its
 *     UID, DTSTAMP and DTSTART, a TZID has its VTIMEZONE, an UNTIL has DTSTART's type); an all-day event of three days
 *     ends the day after; a timed one is in UTC; each repeat's RRULE, monthly on the 31st and the 29th and yearly on
 *     February 29 clamped with BYSETPOS; a timed weekly repeat written with TZID across a change from daylight saving.
 *   - The manifest: "feed" only on a dated kind, true or false; "dated" takes an optional "repeat".
 *   - A real single-environment server (TZ America/New_York) running from a copy of the app with stand-in modules
 *     bundled, so the check does not depend on which bundled module offers a kind: the Manage setting, off by default;
 *     the address made, shown once, kept only as its hash; 404 (plain text) with the setting off, for an unknown token,
 *     after Turn off, after New address (the old one), after an owner turns it off and after the person is deleted;
 *     what it holds as the person's current rights (a member of space A and not B sees A's and the environment's; not
 *     from a space where the module is off, nor without read); a Planner-like object once, as its twin; a kind
 *     without "feed" never; events long past left out; the link back; ETag and 304; 429 past 30 a minute; a guest
 *     cannot make one.
 *   - The bundled Calendar's own events in the feed, a repeat as its RRULE (step 2).
 *   - The pages (step 3), read as code: Profile's section and the owner's row, Manage's switch and the user list, each
 *     id the scripts look up on the page, the server's routes, and the address kept no longer than the page.
 *   - A server with BASE_DOMAIN and two environments: one environment's address is 404 at the other.
 * No network beyond localhost, no LiveKit.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ics = require('../server/ics.js');
const { cleanManifest } = require('../server/modules.js');

let n = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    n += 1;
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}\n${err.stack || err}`);
  }
};
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'check-feed-'));
const NY = 'America/New_York';
// Dates in next year, so nothing here is ever "long past" whenever the check runs.
const Y = new Date().getUTCFullYear() + 1;

// --- RFC 5545, as far as this feed uses it -----------------------------------------------------------------------------
const TEXT_PROPS = new Set(['SUMMARY', 'DESCRIPTION', 'UID', 'X-WR-CALNAME', 'X-WR-TIMEZONE', 'TZID', 'TZNAME']);
// A TEXT value as RFC 5545 writes it (3.3.11): a comma or semicolon only after a backslash, and a backslash only
// before a backslash, a semicolon, a comma or n.
function escapedText(value) {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '\\') {
      if (!'\\;,nN'.includes(value[i + 1] ?? 'x')) return false;
      i += 1;
    } else if (value[i] === ';' || value[i] === ',') return false;
  }
  return true;
}
const unescapeText = (v) => v.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
// The content lines, unfolded, as { name, params, value }; throws on anything RFC 5545 refuses.
function parseIcs(text) {
  assert.ok(text.endsWith('\r\n'), 'ends with CRLF');
  const physical = text.slice(0, -2).split('\r\n');
  for (const [i, line] of physical.entries()) {
    assert.ok(!/[\r\n]/.test(line), `line ${i + 1}: a bare CR or LF`);
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `line ${i + 1} is ${Buffer.byteLength(line, 'utf8')} octets: ${line}`);
    assert.ok(Buffer.from(line, 'utf8').toString('utf8') === line && !line.includes('�'), `line ${i + 1}: a split UTF-8 character`);
  }
  const logical = [];
  for (const line of physical) {
    if (line.startsWith(' ') || line.startsWith('\t')) logical[logical.length - 1] += line.slice(1);
    else logical.push(line);
  }
  return logical.map((line) => {
    const m = /^([A-Za-z0-9-]+)((?:;[A-Za-z0-9-]+=(?:"[^"]*"|[^";:,]*)(?:,(?:"[^"]*"|[^";:,]*))*)*):(.*)$/.exec(line);
    assert.ok(m, `not a content line: ${line}`);
    const params = {};
    for (const p of m[2].split(';').slice(1)) { const at = p.indexOf('='); params[p.slice(0, at).toUpperCase()] = p.slice(at + 1).replace(/^"|"$/g, ''); }
    return { name: m[1].toUpperCase(), params, value: m[3] };
  });
}
const DATE = /^\d{8}$/;
const DATE_TIME = /^\d{8}T\d{6}Z?$/;
const valueMs = (p) => {
  const v = p.value;
  return Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +(v.slice(9, 11) || 0), +(v.slice(11, 13) || 0), +(v.slice(13, 15) || 0));
};
// Checks the calendar's structure and answers its events, each { props: name -> [line] }.
function rfcEvents(text) {
  const lines = parseIcs(text);
  const stack = [];
  const zones = new Set();
  const events = [];
  let current = null;
  const cal = { props: {} };
  for (const l of lines) {
    if (l.name === 'BEGIN') {
      stack.push(l.value);
      if (l.value === 'VEVENT') current = { props: {} };
      continue;
    }
    if (l.name === 'END') {
      assert.equal(stack.pop(), l.value, `END:${l.value} closes what was open`);
      if (l.value === 'VEVENT') { events.push(current); current = null; }
      continue;
    }
    assert.ok(stack.length, `${l.name} outside any component`);
    const top = stack.at(-1);
    if (top === 'VTIMEZONE' && l.name === 'TZID') zones.add(unescapeText(l.value));
    const into = top === 'VEVENT' ? current.props : top === 'VCALENDAR' ? cal.props : null;
    if (into) (into[l.name] ||= []).push(l);
    if (TEXT_PROPS.has(l.name)) assert.ok(escapedText(l.value), `${l.name} is escaped: ${l.value}`);
  }
  assert.equal(stack.length, 0, 'every component is closed');
  assert.equal(lines[0].name, 'BEGIN');
  assert.equal(lines[0].value, 'VCALENDAR');
  assert.deepEqual([cal.props.VERSION?.[0].value, Boolean(cal.props.PRODID)], ['2.0', true]);
  for (const ev of events) {
    const one = (name) => { assert.equal(ev.props[name]?.length, 1, `one ${name}`); return ev.props[name][0]; };
    one('UID');
    assert.match(one('DTSTAMP').value, /^\d{8}T\d{6}Z$/);
    const start = one('DTSTART');
    assert.ok(!(ev.props.DTEND && ev.props.DURATION), 'DTEND or DURATION, not both');
    const isDate = start.params.VALUE === 'DATE';
    assert.match(start.value, isDate ? DATE : DATE_TIME);
    if (start.params.TZID) assert.ok(zones.has(start.params.TZID), `a VTIMEZONE for ${start.params.TZID}`);
    if (ev.props.DTEND) {
      const end = ev.props.DTEND[0];
      assert.equal(end.params.VALUE === 'DATE', isDate, 'DTEND has DTSTART\'s type');
      assert.ok(valueMs(end) > valueMs(start), 'DTEND is after DTSTART');
    }
    if (ev.props.RRULE) {
      const until = /UNTIL=([0-9TZ]+)/.exec(ev.props.RRULE[0].value)?.[1];
      if (until) assert.match(until, isDate ? DATE : /^\d{8}T\d{6}Z$/, 'UNTIL is a date with a date, else UTC');
    }
  }
  return events;
}
const prop = (ev, name) => ev.props[name]?.[0] || null;
const text = (ev, name) => (prop(ev, name) ? unescapeText(prop(ev, name).value) : null);

// --- server/ics.js on its own ------------------------------------------------------------------------------------------
const ev = (fields) => ({ uid: `event-${Math.random().toString(36).slice(2)}-environment@example.test`, stamp: Date.UTC(Y, 0, 1), title: 'An event', description: '', url: '', allDay: false, start: Date.UTC(Y, 5, 1, 12), end: null, repeat: null, ...fields });
const one = (fields, tz = NY) => {
  const out = ics.buildCalendar({ name: 'Check', tz, events: [ev(fields)] });
  return { out, event: rfcEvents(out)[0] };
};

await test('ics: CRLF, 75 octets, folding never splits a character, and text escaped both ways', () => {
  const awkward = 'Commas, semicolons; back\\slashes and\nline breaks\r\nand é ü 漢字 🎲 '.repeat(6);
  const { out, event } = one({ title: awkward, description: `${'é'.repeat(100)}\n${'🎲'.repeat(40)}` });
  assert.ok(!/(^|[^\r])\n/.test(out), 'no bare LF');
  assert.equal(text(event, 'SUMMARY'), awkward.replace(/\r\n/g, '\n'));
  assert.equal(text(event, 'DESCRIPTION'), `${'é'.repeat(100)}\n${'🎲'.repeat(40)}`);
  assert.ok(out.split('\r\n').some((l) => l.startsWith(' ')), 'long lines are folded');
  assert.equal(ics.fold('A'.repeat(75)), 'A'.repeat(75), 'exactly 75 octets is not folded');
  assert.equal(ics.fold('A'.repeat(76)), `${'A'.repeat(75)}\r\n A`);
  assert.equal(ics.escapeText('a,b;c\\d\ne\u0001'), 'a\\,b\\;c\\\\d\\ne');
});

await test('ics: an all-day event of three days ends the day after its last; a timed one is in UTC', () => {
  const all = one({ allDay: true, start: `${Y}-10-10`, end: `${Y}-10-12` }).event;
  assert.deepEqual([prop(all, 'DTSTART').params.VALUE, prop(all, 'DTSTART').value, prop(all, 'DTEND').value], ['DATE', `${Y}1010`, `${Y}1013`]);
  const day = one({ allDay: true, start: `${Y}-12-31` }).event;
  assert.equal(prop(day, 'DTEND').value, `${Y + 1}0101`, 'one day with no end: the next day, across a year');
  const timed = one({ start: Date.parse(`${Y}-06-01T18:30:00Z`), end: Date.parse(`${Y}-06-01T20:00:00Z`) }).event;
  assert.deepEqual([prop(timed, 'DTSTART').value, prop(timed, 'DTEND').value, prop(timed, 'DTSTART').params.TZID], [`${Y}0601T183000Z`, `${Y}0601T200000Z`, undefined]);
  const noEnd = one({ start: Date.parse(`${Y}-06-01T18:30:00Z`) }).event;
  assert.equal(prop(noEnd, 'DTEND'), null, 'no end, no DTEND');
});

await test('ics: each repeat\'s RRULE, with the Calendar\'s clamping on the 29th to 31st and February 29', () => {
  const rule = (start, every, until = null) => prop(one({ allDay: true, start, repeat: { every, until } }).event, 'RRULE').value;
  assert.equal(rule(`${Y}-03-04`, 'day', `${Y}-03-20`), `FREQ=DAILY;UNTIL=${Y}0320`);
  assert.equal(rule(`${Y}-03-04`, 'week'), 'FREQ=WEEKLY');
  assert.equal(rule(`${Y}-03-04`, '2weeks'), 'FREQ=WEEKLY;INTERVAL=2');
  assert.equal(rule(`${Y}-03-15`, 'month'), 'FREQ=MONTHLY');
  assert.equal(rule(`${Y}-01-31`, 'month'), 'FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1');
  assert.equal(rule(`${Y}-01-30`, 'month'), 'FREQ=MONTHLY;BYMONTHDAY=28,29,30;BYSETPOS=-1');
  assert.equal(rule(`${Y}-01-29`, 'month'), 'FREQ=MONTHLY;BYMONTHDAY=28,29;BYSETPOS=-1');
  assert.equal(rule(`${Y}-01-28`, 'month'), 'FREQ=MONTHLY');
  assert.equal(rule(`${Y}-07-04`, 'year'), 'FREQ=YEARLY');
  assert.equal(rule('2028-02-29', 'year'), 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1');
});

await test('ics: a timed weekly repeat keeps its wall-clock time across the change from daylight saving (TZID and VTIMEZONE)', () => {
  // 18:00 in New York, daylight time, a week or two before it ends on the first Sunday of November.
  const { out, event } = one({ start: Date.parse(`${Y}-10-20T22:00:00Z`), end: Date.parse(`${Y}-10-20T23:30:00Z`), repeat: { every: 'week', until: `${Y}-11-30` } });
  assert.deepEqual([prop(event, 'DTSTART').params.TZID, prop(event, 'DTSTART').value], [NY, `${Y}1020T180000`]);
  assert.deepEqual([prop(event, 'DTEND').params.TZID, prop(event, 'DTEND').value], [NY, `${Y}1020T193000`]);
  // The last day ends at 23:59:59 in New York, standard time by then: 04:59:59 UTC the next day.
  assert.equal(prop(event, 'RRULE').value, `FREQ=WEEKLY;UNTIL=${Y}1201T045959Z`);
  const firstSunday = [1, 2, 3, 4, 5, 6, 7].find((d) => new Date(Date.UTC(Y, 10, d)).getUTCDay() === 0);
  assert.ok(out.includes(`BEGIN:STANDARD\r\nDTSTART:${Y}11${String(firstSunday).padStart(2, '0')}T020000\r\nTZOFFSETFROM:-0400\r\nTZOFFSETTO:-0500\r\n`), 'the VTIMEZONE has the change back to standard time');
  assert.ok(out.includes(`BEGIN:DAYLIGHT\r\nDTSTART:${Y}03`), 'and the spring change');
  assert.ok(out.includes(`X-WR-TIMEZONE:${NY}\r\n`));
  // A zone with no daylight saving still has its VTIMEZONE.
  const utc = one({ start: Date.parse(`${Y}-10-20T22:00:00Z`), repeat: { every: 'day', until: null } }, 'UTC');
  assert.equal(prop(utc.event, 'DTSTART').value, `${Y}1020T220000`);
  assert.ok(utc.out.includes('BEGIN:VTIMEZONE\r\nTZID:UTC\r\nBEGIN:STANDARD\r\n'));
});

await test('ics: reading a dated object, either shape, and leaving out what is long past', () => {
  const instant = { form: 'instant', title: 'title', start: 'start', end: 'end', allDay: 'allDay', repeat: 'repeat' };
  const wall = { form: 'wall', title: 'title', day: 'date', time: 'time', endDay: 'checkOut' };
  assert.deepEqual(ics.readDated({ title: 'A', start: `${Y}-05-01`, end: `${Y}-05-03`, allDay: true, repeat: { every: 'month', until: 'soon' } }, instant, NY), { title: 'A', allDay: true, start: `${Y}-05-01`, end: `${Y}-05-03`, repeat: { every: 'month', until: null } });
  assert.equal(ics.readDated({ title: 'A', start: 'whenever' }, instant, NY), null);
  assert.deepEqual(ics.readDated({ title: 'Dinner', date: `${Y}-07-01`, time: '19:30' }, wall, NY), { title: 'Dinner', allDay: false, start: Date.parse(`${Y}-07-01T23:30:00Z`), end: null, repeat: null });
  assert.deepEqual(ics.readDated({ title: 'Stay', date: `${Y}-07-01`, checkOut: `${Y}-07-04` }, wall, NY), { title: 'Stay', allDay: true, start: `${Y}-07-01`, end: `${Y}-07-04`, repeat: null });
  const now = Date.now();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
  assert.equal(ics.recentEnough({ allDay: false, start: Date.parse(daysAgo(100)), end: Date.parse(daysAgo(91)) }, now), false);
  assert.equal(ics.recentEnough({ allDay: false, start: Date.parse(daysAgo(100)), end: Date.parse(daysAgo(89)) }, now), true);
  assert.equal(ics.recentEnough({ allDay: true, start: daysAgo(120).slice(0, 10), end: null, repeat: { every: 'week', until: daysAgo(95).slice(0, 10) } }, now), false);
  assert.equal(ics.recentEnough({ allDay: true, start: daysAgo(400).slice(0, 10), end: null, repeat: { every: 'year', until: null } }, now), true);
});

// --- the manifest ------------------------------------------------------------------------------------------------------
await test('manifest: "feed" only on a dated kind and only true or false; "dated" takes "repeat"', () => {
  const files = new Set(['page.html']);
  const manifest = (kind) => ({ id: 'thing', name: 'Thing', version: '1.0.0', scope: ['environment'], surfaces: { page: { entry: 'page.html' } }, refs: { produces: [{ kind: 'event', key: 'event:{id}', summary: { title: 'title' }, ...kind }] } });
  assert.throws(() => cleanManifest(manifest({ feed: true }), files), { message: 'module.json: refs "event" feed needs "dated"' });
  assert.throws(() => cleanManifest(manifest({ feed: 'yes', dated: { title: 'title', start: 'start' } }), files), { message: 'module.json: refs "event" feed must be true or false' });
  assert.throws(() => cleanManifest(manifest({ dated: { title: 'title', start: 'start', repeat: 'a b' } }), files), { message: 'module.json: refs "event" dated.repeat must name a stored field' });
  const kept = cleanManifest(manifest({ feed: true, dated: { title: 'title', start: 'start', allDay: 'allDay', repeat: 'repeat' } }), files).refs.produces[0];
  assert.deepEqual([kept.feed, kept.dated], [true, { form: 'instant', title: 'title', start: 'start', allDay: 'allDay', repeat: 'repeat' }]);
  assert.equal('feed' in cleanManifest(manifest({ feed: false, dated: { title: 'title', start: 'start' } }), files).refs.produces[0], false);
  assert.equal(cleanManifest(manifest({ dated: { title: 'title', day: 'date', repeat: 'again' } }), files).refs.produces[0].dated.repeat, 'again');
});

// --- the pages (step 3) ------------------------------------------------------------------------------------------------
// Profile's section and the owner's row, Manage's switch and the user list: every id the scripts look up is on the page,
// the routes are the server's, and the address is never put anywhere it would outlive the page.
await test('pages: Profile\'s Calendar feed section and the owner\'s row, Manage\'s switch, wired to the server\'s routes', () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const looked = (js, re) => [...new Set([...js.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map((m) => m[1]).filter((id) => re.test(id)))];
  const profileHtml = read('public/profile.html');
  const profileJs = read('public/profile.js');
  const onProfile = ids(profileHtml);
  const feedIds = looked(profileJs, /^(section-)?feed/);
  for (const id of ['section-feed', 'feed-make', 'feed-new', 'feed-off', 'feed-url', 'feed-copy', 'feed-row', 'feed-row-off']) assert.ok(feedIds.includes(id), `profile.js looks up #${id}`);
  for (const id of feedIds) assert.ok(onProfile.has(id), `public/profile.html has #${id}`);
  assert.match(profileHtml, /<section class="[^"]+" id="section-feed" hidden>\s*<h2>Calendar feed<\/h2>/, 'the section is called Calendar feed and starts hidden');
  assert.ok(profileHtml.indexOf('id="section-call"') < profileHtml.indexOf('id="section-feed"'), 'after Call Settings');
  assert.ok(profileHtml.includes('Copy it now. It will not be shown again.'), 'the address is said to be shown once');
  assert.ok(profileHtml.includes('From URL'), 'the Google steps name From URL');
  for (const [method, route] of [['GET', "'/api/me/feed'"], ['POST', "'/api/me/feed'"], ['DELETE', "'/api/me/feed'"], ['DELETE', '`/api/users/${user.key}/feed`']]) {
    assert.ok(profileJs.includes(`api('${method}', ${route}`), `profile.js: ${method} ${route}`);
  }
  assert.doesNotMatch(profileJs, /(localStorage|sessionStorage|history\.(push|replace)State)[^\n]*feedUrl/, 'the address is not kept beyond the page');
  const adminHtml = read('public/admin.html');
  const adminJs = read('public/admin.js');
  assert.match(adminHtml, /<input id="set-calendar-feeds" type="checkbox" class="switch" role="switch" aria-describedby="calendar-feeds-hint"> Calendar feeds<\/label>/, 'Manage has the Calendar feeds switch');
  assert.ok(ids(adminHtml).has('calendar-feeds-hint') && ids(adminHtml).has('calendar-feeds-status'));
  assert.ok(adminJs.includes("api('PATCH', '/api/settings', { calendarFeeds: input.checked })"), 'the switch saves calendarFeeds as it is flipped');
  assert.ok(adminJs.includes('api(\'DELETE\', `/api/users/${user.key}/feed`)'), 'the user list turns someone\'s feed off');
  assert.match(adminHtml, /data-feed hidden/, 'the user card marks a feed, hidden until there is one');
});

// --- a real server -----------------------------------------------------------------------------------------------------
// The app copied with its modules/ linked one by one, plus three stand-ins bundled beside them: dates that offer
// themselves to the feed and take twins (as the Calendar does), plans that send twins (as the Planner does), and
// notes that are dated but not offered.
function writeModule(dir, id, refs, { scope = ['environment', 'space'], destination } = {}) {
  const root = path.join(dir, id);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'module.json'), JSON.stringify({
    id, name: id, version: '1.0.0', scope, icon: 'circle', description: 'A stand-in for check-feed.',
    surfaces: { page: { entry: `${id}.html` }, canvas: { entry: `${id}.html` }, ...(destination ? { destination } : {}) },
    permissions: [
      { key: 'view', label: 'See it', default: { member: true, moderator: true, guest: true } },
      { key: 'edit', label: 'Change it', default: { member: true, moderator: true, guest: false } },
    ],
    access: { read: 'view', write: 'edit' },
    refs,
  }, null, 2));
  fs.writeFileSync(path.join(root, 'src', `${id}.html`), '<!DOCTYPE html><html><head><style>/*__CSS__*/</style></head><body><script>/*__JS__*/</script></body></html>');
  fs.writeFileSync(path.join(root, 'src', `${id}.css`), '');
  fs.writeFileSync(path.join(root, 'src', `${id}.js`), '');
}
function appCopy(name) {
  const root = path.join(base, name);
  fs.mkdirSync(path.join(root, 'modules'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'server'), path.join(root, 'server'), { recursive: true });
  for (const link of ['public', 'templates', 'node_modules', 'package.json']) fs.symlinkSync(path.join(ROOT, link), path.join(root, link));
  for (const m of fs.readdirSync(path.join(ROOT, 'modules'))) fs.symlinkSync(path.join(ROOT, 'modules', m), path.join(root, 'modules', m));
  const mods = path.join(root, 'modules');
  writeModule(mods, 'feed-dates', { produces: [{
    kind: 'event', name: 'Event', open: true, key: 'event:{id}',
    summary: { title: 'title', subtitle: 'desc', when: 'start', end: 'end', allDay: 'allDay' },
    dated: { title: 'title', start: 'start', end: 'end', allDay: 'allDay', repeat: 'repeat' },
    mirror: 'in', create: { id: '{id}', desc: '', repeat: null, by: '{by}' }, feed: true,
  }] }, { destination: [{ id: 'calendar', part: 'main', entry: 'feed-dates.html' }] });
  writeModule(mods, 'feed-plans', { produces: [{
    kind: 'plan', name: 'Plan', key: 'plan:{id}', summary: { title: 'title', when: 'date' },
    dated: { title: 'title', day: 'date', time: 'time' }, mirror: 'out',
  }], consumes: ['feed-dates:event'] });
  writeModule(mods, 'feed-quiet', { produces: [{
    kind: 'note', name: 'Note', key: 'note:{id}', summary: { title: 'title', when: 'start' },
    dated: { title: 'title', start: 'start' },
  }] });
  return root;
}
async function startServer(root, extraEnv = {}) {
  const child = spawn(process.execPath, [path.join(root, 'server', 'index.js')], {
    cwd: root,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: path.join(root, 'data'), TZ: NY, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${out}`)); }, 20000);
    const onData = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
  const call = (method, urlPath, { body, cookie, host = '', headers: more = {} } = {}) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const headers = { host: `${host ? `${host}.` : ''}localhost:${port}`, accept: 'application/json', ...more };
    if (payload) { headers['content-type'] = 'application/json'; headers['content-length'] = payload.length; }
    if (cookie) headers.cookie = cookie;
    return new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = JSON.parse(text); } catch { /* not JSON */ }
          resolve({ status: res.statusCode, headers: res.headers, text, json });
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };
  const signIn = async (login, password, host = '') => {
    const r = await call('POST', '/api/login', { body: { login, password }, host });
    assert.equal(r.status, 200, `${login} signs in: ${r.text}`);
    return [].concat(r.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
  };
  const stop = () => new Promise((resolve) => { if (child.exitCode !== null || child.signalCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });
  return { call, signIn, stop, root, output: () => out };
}

const feedPath = (url) => new URL(url).pathname;
const hashOf = (url) => crypto.createHash('sha256').update(/\/feed\/([A-Za-z0-9_-]+)\.ics$/.exec(url)[1]).digest('hex');
const NOT_HERE = 'There is no calendar at this address.';

const servers = [];
try {
  const single = await startServer(appCopy('single'));
  servers.push(single);
  const { call, signIn } = single;
  const admin = await signIn('admin', 'testpass1234');
  const mk = async (login) => {
    const r = await call('POST', '/api/users', { cookie: admin, body: { login, displayName: login, role: 'member', password: 'memberpass1234' } });
    assert.equal(r.status, 201, r.text);
    return r.json.user.key;
  };
  const [alice, bob, carol] = [await mk('alice'), await mk('bob'), await mk('carol')];
  const spaceA = (await call('POST', '/api/spaces', { cookie: admin, body: { name: 'Keep, East', members: [alice, carol] } })).json.space.id;
  const spaceB = (await call('POST', '/api/spaces', { cookie: admin, body: { name: 'Tower', members: [bob] } })).json.space.id;
  const guestToken = (await call('POST', `/api/spaces/${spaceA}/guest-link`, { cookie: admin, body: {} })).json.space.guestToken;
  const [aliceC, bobC, carolC] = [await signIn('alice', 'memberpass1234'), await signIn('bob', 'memberpass1234'), await signIn('carol', 'memberpass1234')];
  const setting = async (value) => {
    const r = await call('PATCH', '/api/settings', { cookie: admin, body: { calendarFeeds: value } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.settings.calendarFeeds, value);
  };
  const put = async (moduleId, key, value, where = 'environment') => {
    const q = where === 'environment' ? 'scope=environment' : `scope=space&space=${where}`;
    const r = await call('PUT', `/api/modules/${moduleId}/data/${encodeURIComponent(key)}?${q}`, { cookie: admin, body: { value, tz: NY } });
    assert.equal(r.status, 200, r.text);
  };
  const read = (url, headers = {}) => call('GET', feedPath(url), { headers: { accept: 'text/calendar', ...headers } });
  const notHere = async (url, why) => {
    const r = await read(url);
    assert.deepEqual([r.status, r.text, String(r.headers['content-type']).split(';')[0], r.headers.location], [404, NOT_HERE, 'text/plain', undefined], why);
  };

  await test('server: the setting is off by default, refused when not true or false, and a feed is not allowed until it is on and a kind is offered', async () => {
    assert.equal((await call('GET', '/api/settings', { cookie: admin })).json.settings.calendarFeeds, false);
    const bad = await call('PATCH', '/api/settings', { cookie: admin, body: { calendarFeeds: 'yes' } });
    assert.equal(bad.status, 400, bad.text);
    assert.deepEqual(await call('GET', '/api/me/feed', { cookie: aliceC }).then((r) => [r.status, r.json]), [200, { allowed: false, on: false, made: null, readAt: null }]);
    const refused = await call('POST', '/api/me/feed', { cookie: aliceC, body: {} });
    assert.equal(refused.status, 403);
    assert.equal(typeof refused.json.error, 'string');
    assert.equal((await call('PATCH', '/api/settings', { cookie: aliceC, body: { calendarFeeds: true } })).status, 403, 'a member cannot turn it on');
    await setting(true);
    assert.equal((await call('GET', '/api/me/feed', { cookie: aliceC })).json.allowed, false, 'on, but no enabled module offers a kind');
    for (const id of ['feed-dates', 'feed-plans', 'feed-quiet']) {
      { const r = await call('POST', `/api/modules/bundled/${id}/install`, { cookie: admin, body: {} }); assert.equal(r.status, 201, `${id}: ${r.text}\n${single.output().slice(-1500)}`); }
      assert.equal((await call('PATCH', `/api/modules/${id}`, { cookie: admin, body: { enabled: true, allSpaces: true } })).status, 200, id);
    }
    assert.equal((await call('GET', '/api/me/feed', { cookie: aliceC })).json.allowed, true);
    // A guest has no account, so no feed.
    assert.equal((await call('GET', `/api/me/feed?guest=${guestToken}`)).status, 401);
    assert.equal((await call('POST', `/api/me/feed?guest=${guestToken}`, { body: {} })).status, 401);
  });

  // The events, written as the admin.
  await put('feed-dates', 'event:env1', { title: 'Market day, all; welcome', start: `${Y}-10-10`, end: `${Y}-10-12`, allDay: true, desc: 'Bring coin.\nAnd bags.' });
  await put('feed-dates', 'event:a1', { title: 'Session in A', start: `${Y}-10-20T22:00:00.000Z`, end: `${Y}-10-20T23:30:00.000Z`, allDay: false, desc: '', repeat: { every: 'week', until: `${Y}-11-30` } }, spaceA);
  await put('feed-dates', 'event:a2', { title: 'Rent in A', start: `${Y}-01-31`, allDay: true, repeat: { every: 'month', until: null } }, spaceA);
  await put('feed-dates', 'event:b1', { title: 'Session in B', start: `${Y}-10-21T22:00:00.000Z`, allDay: false }, spaceB);
  await put('feed-dates', 'event:old', { title: 'Long ago', start: new Date(Date.now() - 200 * 86400000).toISOString(), end: new Date(Date.now() - 199 * 86400000).toISOString(), allDay: false });
  await put('feed-plans', 'plan:p1', { title: 'Dinner at the inn', date: `${Y}-10-22`, time: '19:30' }, spaceA);
  await put('feed-quiet', 'note:n1', { title: 'A quiet note', start: `${Y}-10-23T12:00:00.000Z` }, spaceA);

  let aliceUrl = null;
  await test('server: the address is shown once, kept only as its hash, and holds the environment\'s and space A\'s events for a member of A', async () => {
    const made = await call('POST', '/api/me/feed', { cookie: aliceC, body: {} });
    assert.equal(made.status, 201, made.text);
    assert.match(made.json.url, /^http:\/\/localhost:\d+\/feed\/[A-Za-z0-9_-]{43}\.ics$/);
    assert.ok(!Number.isNaN(Date.parse(made.json.made)));
    aliceUrl = made.json.url;
    const token = /\/feed\/(.+)\.ics$/.exec(aliceUrl)[1];
    const stored = fs.readFileSync(path.join(single.root, 'data', 'app.json'), 'utf8');
    assert.ok(!stored.includes(token), 'no token in app.json');
    assert.deepEqual(Object.keys(JSON.parse(stored).users.find((u) => u.key === alice).calendarFeed).sort(), ['hash', 'made', 'readAt']);
    assert.equal(JSON.parse(stored).users.find((u) => u.key === alice).calendarFeed.hash, hashOf(aliceUrl));
    const state = (await call('GET', '/api/me/feed', { cookie: aliceC })).json;
    assert.deepEqual([state.allowed, state.on, state.made, state.readAt], [true, true, made.json.made, null]);
    assert.ok(!JSON.stringify(state).includes(token) && !JSON.stringify(state).includes(hashOf(aliceUrl)), 'not shown again');

    const r = await read(aliceUrl);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.headers['content-type'], 'text/calendar; charset=utf-8');
    assert.ok(r.headers.etag);
    const events = rfcEvents(r.text);
    const titles = events.map((e) => text(e, 'SUMMARY')).sort();
    assert.deepEqual(titles, ['Dinner at the inn', 'Market day, all; welcome', 'Rent in A', 'Session in A'], 'not B\'s, not the quiet note, not one long past');
    assert.ok(r.text.includes('X-WR-CALNAME:') && r.text.includes(`X-WR-TIMEZONE:${NY}\r\n`));
    const byTitle = Object.fromEntries(events.map((e) => [text(e, 'SUMMARY'), e]));
    assert.equal(text(byTitle['Market day, all; welcome'], 'UID'), 'event-env1-environment@localhost');
    assert.equal(text(byTitle['Session in A'], 'UID'), `event-a1-${spaceA}@localhost`);
    assert.equal(prop(byTitle['Market day, all; welcome'], 'DTEND').value, `${Y}1013`);
    assert.equal(prop(byTitle['Session in A'], 'DTSTART').value, `${Y}1020T180000`);
    assert.equal(prop(byTitle['Session in A'], 'DTSTART').params.TZID, NY);
    assert.equal(prop(byTitle['Rent in A'], 'RRULE').value, 'FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1');
    // The Planner-like object appears once, as its twin: the dates module's own event, timed in UTC.
    const dinner = byTitle['Dinner at the inn'];
    assert.match(text(dinner, 'UID'), new RegExp(`^event-[A-Za-z0-9_-]+-${spaceA}@localhost$`));
    assert.equal(prop(dinner, 'DTSTART').value, `${Y}1022T233000Z`);
    // The description: the space's name, the event's own, then the link back; URL the same link. The Calendar
    // destination is off, so the link is the module's page in that space.
    const envName = (await call('GET', '/api/settings', { cookie: admin })).json.settings.environmentName;
    assert.ok(envName, 'the environment has a name');
    assert.deepEqual(text(byTitle['Market day, all; welcome'], 'DESCRIPTION').split('\n').slice(0, 3), [envName, 'Bring coin.', 'And bags.']);
    assert.equal(text(byTitle['Market day, all; welcome'], 'DESCRIPTION').split('\n').length, 4, 'the name, two lines of its own, the link');
    assert.equal(text(byTitle['Session in A'], 'DESCRIPTION').split('\n')[0], 'Keep, East');
    const link = prop(byTitle['Session in A'], 'URL').value;
    assert.ok(link.startsWith(`http://localhost:`) && link.includes(`/modules/feed-dates?space=${spaceA}#ref=`), link);
    assert.deepEqual(JSON.parse(decodeURIComponent(link.split('#ref=')[1])), { module: 'feed-dates', kind: 'event', id: 'a1', scope: 'space', space: spaceA });
    assert.equal(text(byTitle['Session in A'], 'DESCRIPTION').split('\n').at(-1), link);
    // Read once: Profile's "Last read".
    assert.ok((await call('GET', '/api/me/feed', { cookie: aliceC })).json.readAt);
  });

  await test('server: with the Calendar destination shown, the link goes to /calendar#ref=', async () => {
    assert.equal((await call('PATCH', '/api/settings', { cookie: admin, body: { showCalendar: true } })).status, 200);
    const r = await read(aliceUrl);
    const env1 = rfcEvents(r.text).find((e) => text(e, 'SUMMARY').startsWith('Market'));
    const link = prop(env1, 'URL').value;
    assert.match(link, /^http:\/\/localhost:\d+\/calendar#ref=/);
    assert.deepEqual(JSON.parse(decodeURIComponent(link.split('#ref=')[1])), { module: 'feed-dates', kind: 'event', id: 'env1', scope: 'environment' });
    assert.equal((await call('PATCH', '/api/settings', { cookie: admin, body: { showCalendar: false } })).status, 200);
  });

  await test('server: ETag and 304', async () => {
    const r = await read(aliceUrl);
    const again = await read(aliceUrl, { 'if-none-match': r.headers.etag });
    assert.deepEqual([again.status, again.text], [304, '']);
    assert.equal((await read(aliceUrl, { 'if-none-match': '"something-else"' })).status, 200);
    await put('feed-dates', 'event:env2', { title: 'Something new', start: `${Y}-11-01`, allDay: true });
    const changed = await read(aliceUrl, { 'if-none-match': r.headers.etag });
    assert.equal(changed.status, 200, 'a change makes a new ETag');
    assert.notEqual(changed.headers.etag, r.headers.etag);
  });

  await test('server: each read uses the person\'s current rights: a module off in a space, or no read, empties it', async () => {
    const titles = async () => rfcEvents((await read(aliceUrl)).text).map((e) => text(e, 'SUMMARY')).sort();
    assert.equal((await call('PATCH', '/api/modules/feed-dates', { cookie: admin, body: { enabled: true, allSpaces: false, spaces: [spaceB] } })).status, 200);
    assert.deepEqual(await titles(), ['Market day, all; welcome', 'Something new'], 'the module off in A: A\'s events go');
    assert.equal((await call('PATCH', '/api/modules/feed-dates', { cookie: admin, body: { enabled: true, allSpaces: true } })).status, 200);
    assert.equal((await call('PATCH', '/api/roles/member', { cookie: admin, body: { 'module.feed-dates.view': false } })).status, 200);
    const r = await read(aliceUrl);
    assert.equal(r.status, 200, 'still answers, empty');
    assert.deepEqual(rfcEvents(r.text), []);
    assert.equal((await call('GET', '/api/me/feed', { cookie: aliceC })).json.allowed, false);
    assert.equal((await call('POST', '/api/me/feed', { cookie: bobC, body: {} })).status, 403, 'nothing offered to bob now');
    assert.equal((await call('PATCH', '/api/roles/member', { cookie: admin, body: { 'module.feed-dates.view': true } })).status, 200);
    // Bob, a member of B only, sees B's and the environment's.
    const bobUrl = (await call('POST', '/api/me/feed', { cookie: bobC, body: {} })).json.url;
    assert.deepEqual(rfcEvents((await read(bobUrl)).text).map((e) => text(e, 'SUMMARY')).sort(), ['Market day, all; welcome', 'Session in B', 'Something new']);
  });

  await test('server: 404 for an unknown token and with the setting off; on again, the same address works', async () => {
    await notHere(`http://localhost/feed/${'A'.repeat(43)}.ics`, 'an unknown token');
    await notHere('http://localhost/feed/nonsense.ics', 'not a token');
    await setting(false);
    await notHere(aliceUrl, 'the setting off');
    assert.equal((await call('GET', '/api/me/feed', { cookie: aliceC })).json.on, true, 'turning the setting off deletes nothing');
    await setting(true);
    assert.equal((await read(aliceUrl)).status, 200);
  });

  await test('server: New address stops the old one; Turn off stops it; an owner\'s Turn off stops it and never shows the address', async () => {
    const old = aliceUrl;
    const fresh = await call('POST', '/api/me/feed', { cookie: aliceC, body: {} });
    assert.equal(fresh.status, 201);
    await notHere(old, 'the old address after New address');
    assert.equal((await read(fresh.json.url)).status, 200);
    const off = await call('DELETE', '/api/me/feed', { cookie: aliceC });
    assert.deepEqual([off.status, off.text], [204, '']);
    await notHere(fresh.json.url, 'after Turn off');
    assert.deepEqual((await call('GET', '/api/me/feed', { cookie: aliceC })).json, { allowed: true, on: false, made: null, readAt: null });
    // The owner's view and Turn off.
    const again = (await call('POST', '/api/me/feed', { cookie: aliceC, body: {} })).json.url;
    const seen = await call('GET', `/api/users/${alice}`, { cookie: admin });
    assert.deepEqual(Object.keys(seen.json.user.calendarFeed).sort(), ['made', 'on', 'readAt']);
    assert.equal(seen.json.user.calendarFeed.on, true);
    for (const r of [seen, await call('GET', '/api/users', { cookie: admin }), await call('GET', '/api/me', { cookie: aliceC })]) {
      assert.ok(!r.text.includes(/\/feed\/(.+)\.ics/.exec(again)[1]) && !r.text.includes(hashOf(again)), 'neither the token nor its hash in any answer');
    }
    assert.equal((await call('DELETE', `/api/users/${alice}/feed`, { cookie: carolC })).status, 403, 'a member cannot');
    assert.equal((await call('DELETE', '/api/users/nobody1/feed', { cookie: admin })).status, 404);
    assert.equal((await call('DELETE', `/api/users/${alice}/feed`, { cookie: admin })).status, 204);
    await notHere(again, 'after an owner turns it off');
    assert.equal((await call('GET', `/api/users/${alice}`, { cookie: admin })).json.user.calendarFeed.on, false);
    aliceUrl = (await call('POST', '/api/me/feed', { cookie: aliceC, body: {} })).json.url;
  });

  await test('server: 429 past 30 reads a minute for one address, with Retry-After', async () => {
    const url = (await call('POST', '/api/me/feed', { cookie: carolC, body: {} })).json.url;
    for (let i = 0; i < 30; i += 1) assert.equal((await read(url)).status, 200, `read ${i + 1}`);
    const r = await read(url);
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers['retry-after']) > 0);
    assert.equal(String(r.headers['content-type']).split(';')[0], 'text/plain');
    assert.equal((await read(aliceUrl)).status, 200, 'another address is not held back');
  });

  // The bundled Calendar (1.20.0) itself: its events reach the feed, a repeat as its RRULE.
  await test('server: the bundled Calendar\'s events are in the feed, with their repeat', async () => {
    for (const id of ['feed-dates', 'feed-plans']) assert.equal((await call('PATCH', `/api/modules/${id}`, { cookie: admin, body: { enabled: false } })).status, 200, id);
    { const r = await call('POST', '/api/modules/bundled/calendar/install', { cookie: admin, body: {} }); assert.ok([201, 409].includes(r.status), r.text); }
    assert.equal((await call('PATCH', '/api/modules/calendar', { cookie: admin, body: { enabled: true, allSpaces: true } })).status, 200);
    await put('calendar', 'event:c1', { title: 'Weekly game', start: `${Y}-03-04T23:00:00.000Z`, end: `${Y}-03-05T02:00:00.000Z`, allDay: false, desc: 'Bring dice.', remind: null, repeat: { every: 'week', until: `${Y}-06-30` }, by: 'admin' }, spaceA);
    const url = (await call('POST', '/api/me/feed', { cookie: carolC, body: {} })).json.url;
    const r = await read(url);
    assert.equal(r.status, 200);
    const game = rfcEvents(r.text).find((e) => text(e, 'SUMMARY') === 'Weekly game');
    assert.ok(game, 'the Calendar\'s event is in the feed');
    assert.match(prop(game, 'RRULE').value, /^FREQ=WEEKLY;UNTIL=/);
    assert.ok(text(game, 'DESCRIPTION').includes('Bring dice.'));
    assert.ok(!rfcEvents(r.text).some((e) => text(e, 'SUMMARY') === 'Session in A'), 'a module turned off is not read');
    assert.equal((await call('PATCH', '/api/modules/calendar', { cookie: admin, body: { enabled: false } })).status, 200);
    for (const id of ['feed-dates', 'feed-plans']) assert.equal((await call('PATCH', `/api/modules/${id}`, { cookie: admin, body: { enabled: true, allSpaces: true } })).status, 200, id);
  });

  await test('server: deleting the person stops their address', async () => {
    assert.equal((await call('DELETE', `/api/users/${alice}`, { cookie: admin })).status, 200);
    await notHere(aliceUrl, 'after the person is deleted');
  });

  // --- BASE_DOMAIN: one environment's address is 404 at another --------------------------------------------------------
  const hosted = await startServer(appCopy('hosted'), { BASE_DOMAIN: 'localhost', ADMIN_LOGIN: 'host', ADMIN_PASSWORD: 'host-password-1' });
  servers.push(hosted);
  await test('hosted: a token belongs to its own environment', async () => {
    const hostCookie = await (async () => {
      const r = await hosted.call('POST', '/api/host/login', { host: 'admin', body: { login: 'host', password: 'host-password-1' } });
      assert.equal(r.status, 200, r.text);
      return [].concat(r.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
    })();
    const owners = {};
    for (const slug of ['acme', 'beta']) {
      const made = await hosted.call('POST', '/api/host/environments', { host: 'admin', cookie: hostCookie, body: { slug, name: slug, owner: { login: 'owner', password: 'owner-password-1' } } });
      assert.equal(made.status, 201, made.text);
      const cookie = await hosted.signIn('owner', 'owner-password-1', slug);
      owners[slug] = cookie;
      assert.equal((await hosted.call('POST', '/api/modules/bundled/feed-dates/install', { host: slug, cookie, body: {} })).status, 201);
      assert.equal((await hosted.call('PATCH', '/api/modules/feed-dates', { host: slug, cookie, body: { enabled: true, allSpaces: true } })).status, 200);
      assert.equal((await hosted.call('PATCH', '/api/settings', { host: slug, cookie, body: { calendarFeeds: true } })).status, 200);
      assert.equal((await hosted.call('PUT', '/api/modules/feed-dates/data/event:e1?scope=environment', { host: slug, cookie, body: { value: { title: `In ${slug}`, start: `${Y}-05-05`, allDay: true } } })).status, 200);
    }
    const made = await hosted.call('POST', '/api/me/feed', { host: 'acme', cookie: owners.acme, body: {} });
    assert.equal(made.status, 201, made.text);
    assert.match(made.json.url, /^http:\/\/acme\.localhost:\d+\/feed\//);
    const at = (slug) => hosted.call('GET', feedPath(made.json.url), { host: slug });
    const home = await at('acme');
    assert.equal(home.status, 200);
    assert.deepEqual(rfcEvents(home.text).map((e) => text(e, 'SUMMARY')), ['In acme']);
    assert.ok(home.text.includes('@acme.localhost\r\n'), 'the UID names the environment\'s host');
    const away = await at('beta');
    assert.deepEqual([away.status, away.text], [404, NOT_HERE]);
  });
} finally {
  for (const s of servers) await s.stop();
  fs.rmSync(base, { recursive: true, force: true });
}

if (failed) {
  console.error(`check-feed: ${failed} failed, ${n} passed`);
  process.exit(1);
}
console.log(`check-feed: OK (${n} groups)`);
