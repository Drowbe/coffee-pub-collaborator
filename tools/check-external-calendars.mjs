#!/usr/bin/env node
/*
 * check-external-calendars.mjs -- a person's other calendars (documentation/plans/plan-google-calendar.md, Part 2,
 * step 5), against a local stand-in serving iCalendar.
 *   - The reader (server/ics-read.js) on its own: a Google-shaped file with a weekly repeat, an EXDATE, a moved
 *     occurrence (RECURRENCE-ID) and a TZID across a change from daylight saving; a cancelled occurrence; all-day
 *     events and DURATION; monthly, yearly, COUNT, INTERVAL, BYSETPOS and UNTIL; a zone only the file's VTIMEZONE
 *     defines; folded lines, LF endings and escaped text; an alarm's text never the event's; a repeat from long ago;
 *     at most 2000 events, those to come first; a file that is not a calendar.
 *   - The memory (server/external-calendars.js) with a stand-in store and clock: read every 30 minutes only for
 *     someone seen in the last 14 days, Refresh at most once a minute, a change told only when something changed, 30
 *     days back to 180 ahead, a calendar removed while being read keeps nothing, only the person's own answered.
 *   - The fetch (server/link-preview.js's fetchCalendar) in this process: private addresses refused before any request,
 *     the 15 second limit for the whole read even while bytes keep coming.
 *   - A real single-environment server, its network pointed at the stand-in by tools/fixtures/calendars-net.cjs: the
 *     switch and the hook; http:, a private address, one behind a redirect, a redirect to http:, a wrong address, a
 *     file over 5 MB and a page that is not a calendar each refused and nothing kept; webcal: made https:; the address
 *     sealed at rest and in no answer; one person's events and calendars never in another's answer; a module without
 *     the approved hook refused; a guest gets none; five at most, no duplicates; Refresh, once a minute, and the
 *     stream's `external` event; Remove; the switch off; read again after a restart; deleting the person.
 *   - The move to a hosted install (secretsToHostKey): the sealed address is sealed again with the host's key and
 *     still read.
 *   - The pages (step 6), read as code: Profile's Other calendars section (each id its script looks up, the routes, the
 *     address never drawn or kept), the admin's line for the hook, the SDK and the host page's stream, the Calendar's
 *     hook and its asking, and the destination's filter.
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
const { readCalendar, CalendarFileError } = require('../server/ics-read.js');
const { ExternalCalendars } = require('../server/external-calendars.js');
const auth = require('../server/auth.js');
const { buildModule } = require('../server/module-build.js');

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
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'check-external-calendars-'));
const DAY = 86400000;
const NY = 'America/New_York';
const ics = (...lines) => `${['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stand-in//EN', ...lines.flat(Infinity), 'END:VCALENDAR'].join('\r\n')}\r\n`;
const vevent = (...lines) => ['BEGIN:VEVENT', ...lines.flat(Infinity), 'END:VEVENT'];
const NY_ZONE = ['BEGIN:VTIMEZONE', 'TZID:America/New_York', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE'];
const wallIn = (iso, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');

// --- the reader --------------------------------------------------------------------------------------------------------
const FALL = { from: Date.parse('2026-10-01T00:00:00Z'), to: Date.parse('2027-01-01T00:00:00Z'), now: Date.parse('2026-10-01T00:00:00Z'), tz: 'UTC' };

await test('reader: a Google-shaped file: a weekly repeat across the change from daylight saving, an EXDATE, a moved and a cancelled occurrence', () => {
  const file = ics('X-WR-CALNAME:Work', 'X-WR-TIMEZONE:America/New_York', NY_ZONE,
    vevent('DTSTART;TZID=America/New_York:20261013T180000', 'DTEND;TZID=America/New_York:20261013T193000', 'RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261209T045959Z',
      'EXDATE;TZID=America/New_York:20261027T180000', 'UID:weekly@stand-in', 'SUMMARY:Weekly\\, team\\; all', 'DESCRIPTION:Not answered',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'SUMMARY:An alarm', 'DESCRIPTION:Reminder', 'TRIGGER:-PT10M', 'END:VALARM'),
    vevent('DTSTART;TZID=America/New_York:20261105T090000', 'DTEND;TZID=America/New_York:20261105T100000', 'RECURRENCE-ID;TZID=America/New_York:20261103T180000', 'UID:weekly@stand-in', 'SUMMARY:Moved to Thursday'),
    vevent('DTSTART;TZID=America/New_York:20261117T180000', 'RECURRENCE-ID;TZID=America/New_York:20261117T180000', 'UID:weekly@stand-in', 'STATUS:CANCELLED', 'SUMMARY:Weekly, team'));
  const got = readCalendar(file, FALL);
  const weekly = got.filter((e) => e.title === 'Weekly, team; all');
  assert.deepEqual(weekly.map((e) => e.start), ['2026-10-13T22:00:00.000Z', '2026-10-20T22:00:00.000Z', '2026-11-10T23:00:00.000Z', '2026-11-24T23:00:00.000Z', '2026-12-01T23:00:00.000Z', '2026-12-08T23:00:00.000Z']);
  for (const e of weekly) {
    assert.equal(wallIn(e.start, NY), 'Tue 18:00', 'the wall clock holds across the change');
    assert.equal(Date.parse(e.end) - Date.parse(e.start), 90 * 60000);
    assert.equal(e.allDay, false);
  }
  const moved = got.find((e) => e.title === 'Moved to Thursday');
  assert.deepEqual(moved, { uid: 'weekly@stand-in/2026-11-03T23:00:00.000Z', title: 'Moved to Thursday', start: '2026-11-05T14:00:00.000Z', end: '2026-11-05T15:00:00.000Z', allDay: false });
  assert.equal(new Set(got.map((e) => e.uid)).size, got.length, 'each occurrence has its own uid');
  assert.ok(!got.some((e) => /alarm/i.test(e.title)), 'an alarm\'s text is never the event\'s');
  assert.deepEqual(Object.keys(got[0]).sort(), ['allDay', 'end', 'start', 'title', 'uid']);
});

await test('reader: all day (end inclusive), DURATION, no end, folded lines, LF endings and a time in UTC', () => {
  const lf = ['BEGIN:VCALENDAR', 'VERSION:2.0',
    'BEGIN:VEVENT', 'UID:trip', 'DTSTART;VALUE=DATE:20261010', 'DTEND;VALUE=DATE:20261013', 'SUMMARY:A long trip with a title that is folded across', '  two lines', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:day', 'DTSTART;VALUE=DATE:20261020', 'SUMMARY:One day', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:dur', 'DTSTART:20261021T150000Z', 'DURATION:PT1H30M', 'SUMMARY:Ninety minutes', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:point', 'DTSTART:20261022T150000Z', 'SUMMARY:No end', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:days', 'DTSTART;VALUE=DATE:20261101', 'DURATION:P2D', 'SUMMARY:Two days', 'END:VEVENT',
    'END:VCALENDAR', ''].join('\n');
  const by = Object.fromEntries(readCalendar(lf, FALL).map((e) => [e.uid, e]));
  assert.deepEqual([by.trip.start, by.trip.end, by.trip.allDay, by.trip.title], ['2026-10-10', '2026-10-12', true, 'A long trip with a title that is folded across two lines']);
  assert.deepEqual([by.day.start, by.day.end], ['2026-10-20', '2026-10-20']);
  assert.deepEqual([by.dur.start, by.dur.end], ['2026-10-21T15:00:00.000Z', '2026-10-21T16:30:00.000Z']);
  assert.equal(by.point.end, null);
  assert.deepEqual([by.days.start, by.days.end], ['2026-11-01', '2026-11-02']);
});

await test('reader: monthly, yearly, COUNT, INTERVAL, BYSETPOS and UNTIL', () => {
  const starts = (...lines) => readCalendar(ics(vevent('UID:r', 'SUMMARY:R', ...lines)), { from: Date.parse('2026-01-01T00:00:00Z'), to: Date.parse('2027-12-31T00:00:00Z'), now: 0, tz: 'UTC' }).map((e) => e.start);
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260131', 'RRULE:FREQ=MONTHLY;COUNT=4'), ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31'], 'a month without the 31st has none, and COUNT counts the made ones');
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260130', 'RRULE:FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1;COUNT=3'), ['2026-01-30', '2026-01-31', '2026-02-28'], 'the last day of each month');
  assert.deepEqual(starts('DTSTART:20260113T100000Z', 'RRULE:FREQ=MONTHLY;BYDAY=2TU;COUNT=3'), ['2026-01-13T10:00:00.000Z', '2026-02-10T10:00:00.000Z', '2026-03-10T10:00:00.000Z']);
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260130', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3'), ['2026-01-30', '2026-02-27', '2026-03-27']);
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260704', 'RRULE:FREQ=YEARLY'), ['2026-07-04', '2027-07-04']);
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20261126', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=4TH'), ['2026-11-26', '2027-11-25']);
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260105', 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20260125'), ['2026-01-05', '2026-01-07', '2026-01-19', '2026-01-21']);
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260301', 'RRULE:FREQ=DAILY;UNTIL=20260303', 'EXDATE;VALUE=DATE:20260302'), ['2026-03-01', '2026-03-03']);
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260301', 'RRULE:FREQ=HOURLY;COUNT=5'), ['2026-03-01'], 'a rule this reader does not repeat: read once');
  assert.deepEqual(starts('DTSTART;VALUE=DATE:20260301', 'RDATE;VALUE=DATE:20260305,20260309', 'RRULE:FREQ=YEARLY;COUNT=1'), ['2026-03-01', '2026-03-05', '2026-03-09']);
});

await test('reader: a zone only the file defines, a floating time in the calendar\'s zone, and an unknown zone', () => {
  const file = ics('X-WR-TIMEZONE:Europe/Berlin',
    ['BEGIN:VTIMEZONE', 'TZID:W. Europe Standard Time', 'BEGIN:STANDARD', 'DTSTART:16010101T030000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10', 'END:STANDARD', 'BEGIN:DAYLIGHT', 'DTSTART:16010101T020000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3', 'END:DAYLIGHT', 'END:VTIMEZONE'],
    vevent('UID:win', 'DTSTART;TZID=W. Europe Standard Time:20261020T090000', 'SUMMARY:Summer time'),
    vevent('UID:win2', 'DTSTART;TZID=W. Europe Standard Time:20261102T090000', 'SUMMARY:Winter time'),
    vevent('UID:float', 'DTSTART:20261020T090000', 'SUMMARY:Floating'),
    vevent('UID:nowhere', 'DTSTART;TZID=Nowhere/Special:20261020T090000', 'SUMMARY:Unknown zone'));
  const by = Object.fromEntries(readCalendar(file, FALL).map((e) => [e.uid, e.start]));
  assert.deepEqual(by, { win: '2026-10-20T07:00:00.000Z', win2: '2026-11-02T08:00:00.000Z', float: '2026-10-20T07:00:00.000Z', nowhere: '2026-10-20T07:00:00.000Z' });
});

await test('reader: a daily repeat from 1990 reaches the window at once; at most 2000 events, those to come first', () => {
  const t0 = Date.now();
  const old = readCalendar(ics(vevent('UID:old', 'DTSTART:19900101T120000Z', 'RRULE:FREQ=DAILY', 'SUMMARY:Daily')), FALL);
  assert.equal(old.length, 92);
  assert.equal(old[0].start, '2026-10-01T12:00:00.000Z');
  assert.ok(Date.now() - t0 < 2000, 'quick');
  const many = readCalendar(ics(Array.from({ length: 2500 }, (_, i) => vevent(`UID:m${i}`, `DTSTART:${ymd(Date.parse('2026-10-01T00:00:00Z') + Math.floor(i / 30) * DAY)}T${String(i % 24).padStart(2, '0')}0000Z`, 'SUMMARY:Many'))), { ...FALL, now: Date.parse('2026-11-01T00:00:00Z') });
  assert.equal(many.length, 2000);
  assert.ok(many.some((e) => e.start >= '2026-12-'), 'the latest kept');
  assert.ok(many[0].start > '2026-10-01T', 'the earliest past ones left out first');
});

// Repeats that walk without landing: one that never can is found at once, and any other stops at the file's work budget.
const IMPOSSIBLE = ics(Array.from({ length: 2000 }, (_, i) => vevent(`UID:never${i}`, 'DTSTART:20200101T090000Z', 'RRULE:FREQ=DAILY;COUNT=999999;BYMONTH=2;BYMONTHDAY=30', 'SUMMARY:Never')));
const HEAVY = ics(Array.from({ length: 2000 }, (_, i) => vevent(`UID:heavy${i}`, 'DTSTART:20200101T090000Z', 'RRULE:FREQ=DAILY;COUNT=999999;BYYEARDAY=366;BYMONTH=1', 'SUMMARY:Heavy')));
await test('reader: a small file of repeats that never land costs little: found at once, or refused at the work budget', () => {
  let t0 = Date.now();
  assert.deepEqual(readCalendar(IMPOSSIBLE, FALL), [], 'the 30th of February, 2000 times');
  assert.ok(Date.now() - t0 < 200, `took ${Date.now() - t0} ms`);
  t0 = Date.now();
  // Refused by the period budget, not the clock: the same with all the time in the world.
  const realNow = Date.now;
  Date.now = () => realNow() - 1e9 * (Date.now.calls = (Date.now.calls || 0) + 1);
  try {
    assert.throws(() => readCalendar(HEAVY, FALL), (err) => err instanceof CalendarFileError && err.code === 'complex');
  } finally {
    Date.now = realNow;
  }
  t0 = Date.now();
  assert.throws(() => readCalendar(HEAVY, FALL), (err) => err instanceof CalendarFileError && err.code === 'complex');
  assert.ok(Date.now() - t0 < 400, `refused in ${Date.now() - t0} ms`);
  // A rule that does land keeps working, COUNT and all.
  assert.equal(readCalendar(ics(vevent('UID:ok', 'DTSTART;VALUE=DATE:20261001', 'RRULE:FREQ=DAILY;COUNT=10;BYMONTHDAY=1,2,3', 'SUMMARY:Ok')), FALL).length, 9);
});

await test('reader: not a calendar is refused; a damaged line is skipped', () => {
  assert.throws(() => readCalendar('<!DOCTYPE html><html></html>', FALL), CalendarFileError);
  const got = readCalendar(ics('this is not a line', 'X-ODD;="broken:1', vevent('UID:ok', 'DTSTART:20261021T150000Z', 'SUMMARY:Fine'), vevent('UID:nodate', 'SUMMARY:No start')), FALL);
  assert.deepEqual(got.map((e) => e.uid), ['ok']);
});

// --- the memory, with a stand-in store and clock -----------------------------------------------------------------------
await test('memory: read every 30 minutes only for someone seen in the last 14 days; Refresh once a minute; a change told once', async () => {
  let clock = Date.parse('2026-10-01T12:00:00Z');
  const lists = { ann: [{ id: 'c1', name: 'Work', url: 'sealed:https://cal.example.com/a.ics' }], bo: [{ id: 'c2', name: 'Home', url: 'sealed:https://cal.example.com/b.ics' }] };
  const notes = [];
  const store = { users: [{ key: 'ann' }, { key: 'bo' }], externalCalendarsOf: (k) => lists[k] || [], noteExternalCalendarRead: (k, id, r) => notes.push([k, id, r.error]) };
  const files = {
    'https://cal.example.com/a.ics': ics(vevent('UID:a1', `DTSTART:${ymd(clock - 40 * DAY)}T120000Z`, 'SUMMARY:Too long ago'), vevent('UID:a2', `DTSTART:${ymd(clock - 20 * DAY)}T120000Z`, 'SUMMARY:Recent'), vevent('UID:a3', `DTSTART:${ymd(clock + 170 * DAY)}T120000Z`, 'SUMMARY:Ahead'), vevent('UID:a4', `DTSTART:${ymd(clock + 200 * DAY)}T120000Z`, 'SUMMARY:Too far')),
    'https://cal.example.com/b.ics': ics(vevent('UID:b1', `DTSTART:${ymd(clock)}T150000Z`, 'SUMMARY:Bo only')),
  };
  const fetched = [];
  let hold = null;
  const memory = new ExternalCalendars({
    store,
    open: (s) => (s.startsWith('sealed:') ? s.slice(7) : null),
    fetch: async (url) => { fetched.push(url); if (hold) await hold; if (!files[url]) throw Object.assign(new Error('x'), { code: 'wrong' }); return files[url]; },
    now: () => clock,
    tz: () => 'UTC',
  });
  const changes = [];
  memory.on('change', (c) => changes.push(c.userKey));
  await memory.refreshDue();
  assert.deepEqual(fetched, [], 'nobody seen: nothing read');
  memory.noteSeen('ann');
  await memory.refreshDue();
  assert.deepEqual(fetched, ['https://cal.example.com/a.ics'], 'only the one seen');
  assert.deepEqual(changes, ['ann']);
  assert.deepEqual(memory.eventsFor('ann').events.map((e) => e.title), ['Recent', 'Ahead'], '30 days back to 180 ahead');
  assert.deepEqual(memory.eventsFor('ann').calendars, [{ id: 'c1', name: 'Work' }]);
  assert.deepEqual(memory.eventsFor('ann').events[0].calendar, 'c1');
  assert.deepEqual(memory.eventsFor('ann', { from: clock, to: clock + 365 * DAY }).events.map((e) => e.title), ['Ahead'], 'from and to');
  assert.deepEqual(memory.eventsFor('bo').events, [], 'never another person\'s');
  clock += 29 * 60000;
  await memory.refreshDue();
  assert.equal(fetched.length, 1, 'not again within 30 minutes');
  clock += 2 * 60000;
  await memory.refreshDue();
  assert.equal(fetched.length, 2, 'again after 30');
  assert.deepEqual(changes, ['ann'], 'the same events: no change told');
  files['https://cal.example.com/a.ics'] = ics(vevent('UID:a5', `DTSTART:${ymd(clock + DAY)}T120000Z`, 'SUMMARY:Changed'));
  assert.equal(memory.refreshWait('ann', 'c1'), 0);
  await memory.read('ann', 'c1', { refresh: true });
  assert.deepEqual(changes, ['ann', 'ann'], 'a change told');
  assert.ok(memory.refreshWait('ann', 'c1') > 0 && memory.refreshWait('ann', 'c1') <= 60, 'Refresh once a minute');
  clock += 61000;
  assert.equal(memory.refreshWait('ann', 'c1'), 0);
  // An address that stops working: the plain sentence, by the host the person pasted.
  delete files['https://cal.example.com/a.ics'];
  assert.deepEqual(await memory.read('ann', 'c1'), { ok: false, error: 'cal.example.com said the address is wrong.' });
  assert.equal(memory.view('ann')[0].error, 'cal.example.com said the address is wrong.');
  assert.deepEqual(Object.keys(memory.view('ann')[0]).sort(), ['error', 'host', 'id', 'name', 'readAt']);
  assert.ok(!JSON.stringify(memory.view('ann')).includes('a.ics'), 'the host only');
  // Removed while it was being read: nothing is kept.
  let release;
  hold = new Promise((r) => { release = r; });
  memory.noteSeen('bo');
  const reading = memory.read('bo', 'c2');
  lists.bo = [];
  release();
  await reading;
  hold = null;
  assert.equal(memory.cache.has('bo|c2'), false);
  // Not seen for 14 days: not read on the timer.
  clock += 15 * DAY;
  const before = fetched.length;
  await memory.refreshDue();
  assert.equal(fetched.length, before);
  assert.equal(memory.seen.size, 0, 'the old sightings let go');
});

// --- the fetch, in this process ----------------------------------------------------------------------------------------
const hits = [];
let aliceFile = '';
const SLOW = { open: [] };
const stand = http.createServer((req, res) => {
  const host = String(req.headers.host || '').split(':')[0];
  hits.push(`${host}${req.url}`);
  const send = (status, type, body, headers = {}) => { res.writeHead(status, { 'content-type': type, ...headers }); res.end(body); };
  const p = req.url;
  if (host === 'intranet.example.com') return send(200, 'text/calendar', ics());
  if (p.startsWith('/alice-')) return send(200, 'text/calendar; charset=utf-8', aliceFile);
  if (p.startsWith('/bob-')) return send(200, 'text/calendar', ics(vevent('UID:bob1', `DTSTART:${ymd(Date.now() + 3 * DAY)}T150000Z`, 'SUMMARY:Bob\'s dentist')));
  if (p.startsWith('/extra-')) return send(200, 'text/calendar', ics(vevent(`UID:${p}`, `DTSTART:${ymd(Date.now() + 5 * DAY)}T150000Z`, `SUMMARY:Extra ${p}`)));
  if (p === '/moved.ics') return send(301, 'text/plain', '', { location: '/extra-moved.ics' });
  if (p === '/missing.ics') return send(404, 'text/plain', 'no');
  if (p === '/broken.ics') return send(500, 'text/plain', 'broken');
  if (p === '/impossible.ics') return send(200, 'text/calendar', IMPOSSIBLE);
  if (p === '/heavy.ics') return send(200, 'text/calendar', HEAVY);
  if (p === '/page.html') return send(200, 'text/html', '<!DOCTYPE html><html><title>Not a calendar</title></html>');
  if (p === '/huge.ics') {
    res.writeHead(200, { 'content-type': 'text/calendar' });
    res.write('BEGIN:VCALENDAR\r\n');
    const chunk = `X-FILL:${'x'.repeat(1000)}\r\n`.repeat(100);
    let sent = 0;
    const more = () => { while (sent < 6 * 1048576) { sent += chunk.length; if (!res.write(chunk)) return void res.once('drain', more); } res.end('END:VCALENDAR\r\n'); };
    res.on('error', () => {});
    return more();
  }
  if (p === '/to-private') return send(302, 'text/plain', '', { location: 'https://127.0.0.1/x.ics' });
  if (p === '/to-intranet') return send(302, 'text/plain', '', { location: 'https://intranet.example.com/x.ics' });
  if (p === '/to-http') return send(302, 'text/plain', '', { location: 'http://cal.example.com/extra-plain.ics' });
  if (p === '/slow.ics') {
    res.writeHead(200, { 'content-type': 'text/calendar' });
    res.write('BEGIN:VCALENDAR\r\n');
    const timer = setInterval(() => res.write('X-WAIT:1\r\n'), 1000);
    SLOW.open.push(timer);
    res.on('close', () => clearInterval(timer));
    return undefined;
  }
  return send(500, 'text/plain', 'broken');
});
await new Promise((r) => stand.listen(0, '127.0.0.1', r));
const STUB_PORT = stand.address().port;
process.env.CHECK_STUB_PORT = String(STUB_PORT);
require('./fixtures/calendars-net.cjs');
const { fetchCalendar } = require('../server/link-preview.js');
const hitsOf = (re) => hits.filter((h) => re.test(h)).length;

await test('fetch: private and local addresses refused before any request; only https', async () => {
  for (const url of ['https://127.0.0.1/a.ics', 'https://10.1.2.3/a.ics', 'https://[::1]/a.ics', 'https://localhost/a.ics', 'https://printer.local/a.ics', 'https://2130706433/a.ics', 'https://intranet.example.com/a.ics', 'http://cal.example.com/extra-a.ics', 'https://user:pw@cal.example.com/extra-a.ics']) {
    await assert.rejects(fetchCalendar(url), (err) => err.code === 'blocked', url);
  }
  assert.equal(hitsOf(/^intranet/), 0, 'the stand-in never asked for the private name');
  assert.match(await fetchCalendar('https://cal.example.com/extra-one.ics'), /^BEGIN:VCALENDAR/);
});

// Started now, checked at the end: the whole read is given up after 15 seconds even while bytes keep arriving.
const slowStarted = Date.now();
const slowRead = fetchCalendar('https://cal.example.com/slow.ics').then(() => null, (err) => err);

// --- a real server -----------------------------------------------------------------------------------------------------
async function startServer(dataDir, extraEnv = {}) {
  const child = spawn(process.execPath, ['--require', path.join(ROOT, 'tools', 'fixtures', 'calendars-net.cjs'), path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir, TZ: NY, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234', CHECK_STUB_PORT: String(STUB_PORT), ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${out}`)); }, 25000);
    const onData = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
  const call = (method, urlPath, { body, cookie, host = '', raw } = {}) => {
    const payload = raw || (body === undefined ? null : Buffer.from(JSON.stringify(body)));
    const headers = { host: `${host ? `${host}.` : ''}localhost:${port}`, accept: 'application/json' };
    if (payload) { headers['content-type'] = raw ? 'application/zip' : 'application/json'; headers['content-length'] = payload.length; }
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
  // A live stream, collecting what it says until closed.
  const stream = (urlPath, cookie) => {
    const got = { text: '', close: () => {} };
    const req = http.request({ host: '127.0.0.1', port, method: 'GET', path: urlPath, headers: { host: `localhost:${port}`, cookie, accept: 'text/event-stream' } }, (res) => {
      res.on('data', (d) => { got.text += d; });
    });
    req.on('error', () => {});
    req.end();
    got.close = () => req.destroy();
    return got;
  };
  const signIn = async (login, password, host = '') => {
    const r = await call('POST', '/api/login', { body: { login, password }, host });
    assert.equal(r.status, 200, `${login} signs in: ${r.text}`);
    return [].concat(r.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
  };
  const stop = () => new Promise((resolve) => { if (child.exitCode !== null || child.signalCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });
  return { call, stream, signIn, stop, output: () => out };
}
function moduleZip(id, hooks, version = '1.0.0') {
  const src = fs.mkdtempSync(path.join(base, `module-${id}-`));
  fs.mkdirSync(path.join(src, 'src'));
  fs.writeFileSync(path.join(src, 'module.json'), JSON.stringify({
    id, name: id, version, scope: ['environment'], icon: 'calendar', description: 'A stand-in for check-external-calendars.',
    surfaces: { page: { entry: `${id}.html` } },
    permissions: [{ key: 'view', label: 'See it', default: { member: true, moderator: true, guest: true } }],
    access: { read: 'view' },
    hooks,
  }));
  fs.writeFileSync(path.join(src, 'src', `${id}.html`), '<!DOCTYPE html><html><head><style>/*__CSS__*/</style></head><body><script>/*__JS__*/</script></body></html>');
  fs.writeFileSync(path.join(src, 'src', `${id}.css`), '');
  fs.writeFileSync(path.join(src, 'src', `${id}.js`), '');
  return buildModule(src).zip;
}
const filesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? filesUnder(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const until = async (fn, ms = 8000) => {
  const end = Date.now() + ms;
  for (;;) {
    const got = await fn();
    if (got) return got;
    if (Date.now() > end) return got;
    await new Promise((r) => setTimeout(r, 150));
  }
};

// Alice's calendar: a weekly Tuesday 18:00 in New York from two weeks back, one week left out, one moved, and an
// all-day trip; one event long past and one too far ahead, neither answered.
const tuesday = (() => { let d = Date.now() - 14 * DAY; while (new Date(d).getUTCDay() !== 2) d -= DAY; return d; })();
aliceFile = ics('X-WR-CALNAME:Work', 'X-WR-TIMEZONE:America/New_York', NY_ZONE,
  vevent('UID:alice-weekly@stand-in', `DTSTART;TZID=America/New_York:${ymd(tuesday)}T180000`, `DTEND;TZID=America/New_York:${ymd(tuesday)}T190000`, 'RRULE:FREQ=WEEKLY;COUNT=8',
    `EXDATE;TZID=America/New_York:${ymd(tuesday + 21 * DAY)}T180000`, 'SUMMARY:Alice\'s standup'),
  vevent('UID:alice-weekly@stand-in', `RECURRENCE-ID;TZID=America/New_York:${ymd(tuesday + 28 * DAY)}T180000`, `DTSTART;TZID=America/New_York:${ymd(tuesday + 30 * DAY)}T090000`, `DTEND;TZID=America/New_York:${ymd(tuesday + 30 * DAY)}T100000`, 'SUMMARY:Alice\'s standup, moved'),
  vevent('UID:alice-trip', `DTSTART;VALUE=DATE:${ymd(Date.now() + 10 * DAY)}`, `DTEND;VALUE=DATE:${ymd(Date.now() + 13 * DAY)}`, 'SUMMARY:Alice\'s trip'),
  vevent('UID:alice-old', `DTSTART:${ymd(Date.now() - 100 * DAY)}T120000Z`, 'SUMMARY:Long ago'),
  vevent('UID:alice-far', `DTSTART:${ymd(Date.now() + 300 * DAY)}T120000Z`, 'SUMMARY:Far ahead'));
const ALICE_SECRET = crypto.randomBytes(18).toString('hex');
const BOB_SECRET = crypto.randomBytes(18).toString('hex');
const aliceAddress = `https://cal.example.com/alice-${ALICE_SECRET}.ics`;
const bobAddress = `https://cal.example.com/bob-${BOB_SECRET}.ics`;

const dataDir = path.join(base, 'data');
let server = null;
try {
  server = await startServer(dataDir);
  let { call, signIn } = server;
  let admin = await signIn('admin', 'testpass1234');
  const mk = async (login) => {
    const r = await call('POST', '/api/users', { cookie: admin, body: { login, displayName: login, role: 'member', password: 'memberpass1234' } });
    assert.equal(r.status, 201, r.text);
    return r.json.user.key;
  };
  const [alice, bob] = [await mk('alice'), await mk('bob')];
  let [aliceC, bobC] = [await signIn('alice', 'memberpass1234'), await signIn('bob', 'memberpass1234')];
  const space = (await call('POST', '/api/spaces', { cookie: admin, body: { name: 'Keep', members: [alice, bob] } })).json.space.id;
  const guestToken = (await call('POST', `/api/spaces/${space}/guest-link`, { cookie: admin, body: {} })).json.space.guestToken;
  const add = (cookie, url, name = 'Work') => call('POST', '/api/me/external-calendars', { cookie, body: { name, url } });
  const list = async (cookie) => (await call('GET', '/api/me/external-calendars', { cookie })).json;
  const events = (cookie, query = '', id = 'ext-cal') => call('GET', `/api/modules/${id}/external-events${query}`, { cookie });

  // Whenever the section can't be used, the answer says why in plain words, naming what to do and where (`why`), so
  // Profile never shows the section's title alone; the person who can do it is told to, anyone else that their owner can.
  const HOOK = '"See each person\'s own other calendars"';
  const BUNDLED_CALENDAR = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules', 'calendar', 'module.json'), 'utf8'));
  const why = async (cookie) => (await list(cookie)).why;
  await test('server: off until the switch is on and an enabled module asks with the approved hook; until then it says why', async () => {
    const env = (await call('GET', '/api/settings', { cookie: admin })).json.settings.environmentName;
    assert.deepEqual(await list(aliceC), { allowed: false, why: `Calendar feeds are off in ${env}. Your owner needs to turn on Calendar feeds in Manage > Environment, under Calendar apps.`, calendars: [] });
    assert.equal(await why(admin), `Calendar feeds are off in ${env}. Turn on Calendar feeds in Manage > Environment, under Calendar apps.`, 'an owner is told to do it');
    const off = await add(aliceC, aliceAddress);
    assert.deepEqual([off.status, off.json], [403, { error: 'Calendar feeds are off in this environment.' }]);
    assert.equal((await call('PATCH', '/api/settings', { cookie: admin, body: { calendarFeeds: true } })).status, 200);
    const none = await add(aliceC, aliceAddress);
    assert.deepEqual([none.status, none.json], [403, { error: 'No module here shows other calendars.' }]);
    assert.ok(BUNDLED_CALENDAR.hooks.external, 'the bundled Calendar asks for the hook');
    assert.equal(await why(aliceC), `Your owner needs to install Calendar and approve its ${HOOK} in Manage > Modules.`, 'shipped here, not installed');
    // A Calendar installed in a version from before the hook: the update is named, with its version.
    const older = await call('POST', '/api/modules', { cookie: admin, raw: moduleZip('calendar', {}, '0.0.1') });
    assert.equal(older.status, 201, older.text);
    assert.equal(await why(aliceC), `Your owner needs to update Calendar to ${BUNDLED_CALENDAR.version} and approve its ${HOOK} in Manage > Modules.`);
    assert.equal((await call('DELETE', '/api/modules/calendar?keepData=0', { cookie: admin })).status, 200);
    // The way an existing install goes: on in a version without the hook, then updated to one that asks for it (which
    // switches it off until approved), then approved by turning it on. Not a fresh install with the hook from the start.
    const first = await call('POST', '/api/modules', { cookie: admin, raw: moduleZip('ext-cal', {}, '1.0.0') });
    assert.equal(first.status, 201, first.text);
    assert.equal((await call('PATCH', '/api/modules/ext-cal', { cookie: admin, body: { enabled: true } })).status, 200);
    assert.equal((await list(aliceC)).allowed, false, 'on, but its version does not ask for the hook');
    const update = await call('POST', '/api/modules', { cookie: admin, raw: moduleZip('ext-cal', { external: true }, '1.1.0') });
    assert.equal(update.status, 201, update.text);
    assert.deepEqual([update.json.module.version, update.json.module.enabled, update.json.module.pending.hooks], ['1.1.0', false, ['external']], 'the update waits for approval');
    assert.deepEqual(await list(aliceC), { allowed: false, why: `Your owner needs to approve ext-cal's ${HOOK} in Manage > Modules.`, calendars: [] });
    assert.equal(await why(admin), `Approve ext-cal's ${HOOK} in Manage > Modules.`);
    const approved = await call('PATCH', '/api/modules/ext-cal', { cookie: admin, body: { enabled: true } });
    assert.equal(approved.status, 200, approved.text);
    assert.deepEqual([approved.json.module.enabled, approved.json.module.pending.hooks], [true, []]);
    const registry = JSON.parse(fs.readFileSync(path.join(dataDir, 'modules', 'registry.json'), 'utf8')).modules['ext-cal'];
    assert.ok(registry.approved.hooks.includes('external'), 'the approval is stored with the update');
    assert.deepEqual(await list(aliceC), { allowed: true, why: null, calendars: [] }, 'allowed once the update is approved');
    // Approved but switched off: it says to turn it on.
    assert.equal((await call('PATCH', '/api/modules/ext-cal', { cookie: admin, body: { enabled: false } })).status, 200);
    assert.equal(await why(aliceC), 'Your owner needs to turn on ext-cal in Manage > Modules.');
    assert.equal((await call('PATCH', '/api/modules/ext-cal', { cookie: admin, body: { enabled: true } })).status, 200);
    const up = await call('POST', '/api/modules', { cookie: admin, raw: moduleZip('no-hook', {}) });
    assert.equal(up.status, 201, up.text);
    assert.deepEqual(up.json.module.pending.hooks, [], 'no-hook: nothing waits');
    assert.equal((await call('PATCH', '/api/modules/no-hook', { cookie: admin, body: { enabled: true } })).status, 200);
    assert.equal((await list(aliceC)).allowed, true);
    assert.equal((await call('GET', '/api/me/external-calendars')).status, 401, 'signed in only');
    assert.equal((await call('GET', `/api/me/external-calendars?guest=${guestToken}`)).status, 401, 'a guest has none');
  });

  await test('server: http:, private addresses, redirects to them or to http:, a wrong address, over 5 MB and not a calendar: refused, nothing kept', async () => {
    const refused = async (url, error) => {
      const r = await add(aliceC, url);
      assert.deepEqual([r.status, r.json], [400, { error }], url);
    };
    await refused('http://cal.example.com/extra-a.ics', 'That address is not private. Use the one that starts with https:// or webcal://.');
    await refused('ftp://cal.example.com/a.ics', 'Paste an address that starts with https:// or webcal://.');
    await refused('', 'Paste the calendar’s address.');
    for (const url of ['https://127.0.0.1/a.ics', 'https://localhost/a.ics', 'webcal://192.168.1.10/a.ics', 'https://intranet.example.com/a.ics', 'https://cal.example.com/to-private', 'https://cal.example.com/to-intranet', 'https://cal.example.com/to-http']) {
      await refused(url, 'That address is not allowed.');
    }
    assert.equal(hitsOf(/^intranet/), 0, 'the private name was never asked');
    assert.equal(hitsOf(/extra-plain/), 0, 'nor the http: address a redirect named');
    await refused('https://cal.example.com/missing.ics', 'cal.example.com said the address is wrong.');
    await refused('https://cal.example.com/broken.ics', 'cal.example.com could not send the calendar just now.');
    await refused('https://cal.example.com/huge.ics', 'The calendar is larger than 5 MB.');
    await refused('https://cal.example.com/page.html', 'The address did not give a calendar.');
    assert.deepEqual((await list(aliceC)).calendars, []);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'app.json'), 'utf8')).users.find((u) => u.key === alice).externalCalendars, undefined);
  });

  let aliceCal = null;
  await test('server: webcal: is read as https:, the address sealed at rest and never answered, only its host', async () => {
    const r = await add(aliceC, aliceAddress.replace('https://', 'webcal://'), '  Work  ');
    assert.equal(r.status, 201, r.text);
    aliceCal = r.json.calendar;
    assert.deepEqual(Object.keys(aliceCal).sort(), ['error', 'host', 'id', 'name', 'readAt']);
    assert.deepEqual([aliceCal.name, aliceCal.host, aliceCal.error], ['Work', 'cal.example.com', null]);
    assert.ok(!Number.isNaN(Date.parse(aliceCal.readAt)));
    assert.equal(hitsOf(new RegExp(`alice-${ALICE_SECRET}`)), 1, 'read once on adding');
    const stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'app.json'), 'utf8')).users.find((u) => u.key === alice).externalCalendars;
    assert.equal(stored.length, 1);
    assert.deepEqual(Object.keys(stored[0]).sort(), ['error', 'id', 'name', 'readAt', 'url']);
    assert.match(stored[0].url, /^aesgcm\$/);
    const key = Buffer.from(fs.readFileSync(path.join(dataDir, 'secrets.key'), 'utf8').trim(), 'hex');
    assert.equal(auth.decryptSecret(stored[0].url, key), aliceAddress, 'sealed with the install\'s key; webcal: kept as https:');
    for (const file of filesUnder(dataDir)) assert.ok(!fs.readFileSync(file, 'latin1').includes(ALICE_SECRET), `not in ${path.relative(dataDir, file)}`);
    assert.equal(fs.statSync(path.join(dataDir, 'app.json')).mode & 0o777, 0o600);
    const named = await add(aliceC, 'https://cal.example.com/extra-unnamed.ics', '');
    assert.equal(named.json.calendar.name, 'cal.example.com', 'no name: the host');
    assert.equal((await call('DELETE', `/api/me/external-calendars/${named.json.calendar.id}`, { cookie: aliceC })).status, 204);
  });

  await test('server: a module with the approved hook gets the person\'s own events, each repeat and zone as the plan says', async () => {
    const r = await events(aliceC);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.calendars, [{ id: aliceCal.id, name: 'Work' }]);
    const titles = r.json.events.map((e) => e.title);
    assert.ok(!titles.includes('Long ago') && !titles.includes('Far ahead'), '30 days back to 180 ahead');
    const standups = r.json.events.filter((e) => e.title === 'Alice\'s standup');
    assert.equal(standups.length, 6, 'eight weeks, one left out, one moved');
    for (const e of standups) {
      assert.equal(wallIn(e.start, NY), 'Tue 18:00');
      assert.equal(e.calendar, aliceCal.id);
      assert.deepEqual(Object.keys(e).sort(), ['allDay', 'calendar', 'end', 'start', 'title', 'uid']);
    }
    assert.ok(!standups.some((e) => e.start.startsWith(new Date(tuesday + 21 * DAY).toISOString().slice(0, 10))), 'the EXDATE');
    const moved = r.json.events.find((e) => e.title === 'Alice\'s standup, moved');
    assert.equal(wallIn(moved.start, NY), `${new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(tuesday + 30 * DAY))} 09:00`);
    const trip = r.json.events.find((e) => e.title === 'Alice\'s trip');
    assert.deepEqual([trip.allDay, trip.start, trip.end], [true, new Date(Date.now() + 10 * DAY).toISOString().slice(0, 10), new Date(Date.now() + 12 * DAY).toISOString().slice(0, 10)]);
    const later = await events(aliceC, `?from=${new Date(Date.now() + 9 * DAY).toISOString().slice(0, 10)}&to=${new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10)}`);
    assert.ok(later.json.events.some((e) => e.title === 'Alice\'s trip') && later.json.events.length < r.json.events.length, 'from and to');
    assert.deepEqual([(await events(aliceC, '?from=soon')).status, (await events(aliceC, '?from=soon')).json], [400, { error: 'from and to are dates, such as 2026-10-01.' }]);
    assert.equal((await events(aliceC, '?from=2026-10-05&to=2026-10-01')).status, 400);
  });

  await test('server: never another person\'s events or addresses; a module without the hook refused; a guest gets none', async () => {
    const r = await add(bobC, bobAddress, 'Home');
    assert.equal(r.status, 201, r.text);
    const bobCal = r.json.calendar;
    const bobEvents = (await events(bobC)).json;
    assert.deepEqual(bobEvents.calendars, [{ id: bobCal.id, name: 'Home' }]);
    assert.deepEqual(bobEvents.events.map((e) => e.title), ['Bob\'s dentist']);
    const aliceEvents = (await events(aliceC)).text;
    assert.ok(!aliceEvents.includes('dentist') && !aliceEvents.includes(bobCal.id), 'Bob\'s not in Alice\'s');
    assert.ok(!(await events(bobC)).text.includes('standup'), 'Alice\'s not in Bob\'s');
    assert.deepEqual((await list(bobC)).calendars.map((c) => c.id), [bobCal.id]);
    assert.equal((await call('POST', `/api/me/external-calendars/${aliceCal.id}/refresh`, { cookie: bobC })).status, 404, 'Bob cannot refresh Alice\'s');
    assert.equal((await call('DELETE', `/api/me/external-calendars/${aliceCal.id}`, { cookie: bobC })).status, 404, 'nor remove it');
    const noHook = await events(aliceC, '', 'no-hook');
    assert.deepEqual([noHook.status, noHook.json], [403, { error: 'this module did not ask for the external hook' }]);
    assert.equal((await events(aliceC, '', 'nothing-here')).status, 404);
    assert.equal((await call('GET', '/api/modules/ext-cal/external-events')).status, 401);
    const guest = await call('GET', `/api/modules/ext-cal/external-events?guest=${guestToken}`);
    assert.deepEqual([guest.status, guest.json], [200, { calendars: [], events: [] }]);
    // No address, and no secret part of one, in any answer an owner or anyone else gets.
    const answers = [
      await call('GET', '/api/me', { cookie: aliceC }), await call('GET', '/api/me/external-calendars', { cookie: aliceC }), await events(aliceC),
      await call('GET', '/api/users', { cookie: admin }), await call('GET', `/api/users/${alice}`, { cookie: admin }), await call('GET', `/api/users/${bob}`, { cookie: admin }),
      await call('GET', '/api/settings', { cookie: admin }), await call('GET', '/api/status', { cookie: admin }), await call('GET', '/api/me/feed', { cookie: aliceC }),
    ];
    for (const a of answers) {
      assert.equal(a.status, 200, a.text);
      assert.ok(!a.text.includes(ALICE_SECRET) && !a.text.includes(BOB_SECRET) && !a.text.includes('aesgcm$'), 'no address in any answer');
    }
  });

  await test('server: five at most, no duplicates', async () => {
    const dup = await add(aliceC, aliceAddress);
    assert.deepEqual([dup.status, dup.json], [409, { error: 'That calendar is already added.' }]);
    for (let i = 2; i <= 5; i += 1) assert.equal((await add(aliceC, `https://cal.example.com/extra-${i}.ics`, `Extra ${i}`)).status, 201);
    const sixth = await add(aliceC, 'https://cal.example.com/extra-6.ics', 'Six');
    assert.deepEqual([sixth.status, sixth.json], [400, { error: 'You can add up to five calendars.' }]);
    assert.equal((await list(aliceC)).calendars.length, 5);
    // A redirect within the public internet is followed.
    const last = (await list(aliceC)).calendars.find((c) => c.name === 'Extra 5');
    assert.equal((await call('DELETE', `/api/me/external-calendars/${last.id}`, { cookie: aliceC })).status, 204);
    const moved = await add(aliceC, 'https://cal.example.com/moved.ics', 'Moved');
    assert.equal(moved.status, 201, moved.text);
    assert.equal(hitsOf(/extra-moved\.ics$/), 1);
  });

  await test('server: Refresh reads it now, once a minute, and the person\'s own stream says so', async () => {
    const aliceStream = server.stream('/api/modules/stream', aliceC);
    const bobStream = server.stream('/api/modules/stream', bobC);
    await new Promise((r) => setTimeout(r, 300));
    aliceFile = aliceFile.replace('SUMMARY:Alice\'s trip', 'SUMMARY:Alice\'s trip\\, renamed');
    const hitsBefore = hitsOf(new RegExp(`alice-${ALICE_SECRET}`));
    const r = await call('POST', `/api/me/external-calendars/${aliceCal.id}/refresh`, { cookie: aliceC });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(Object.keys(r.json.calendar).sort(), ['error', 'host', 'id', 'name', 'readAt']);
    assert.equal(hitsOf(new RegExp(`alice-${ALICE_SECRET}`)), hitsBefore + 1);
    assert.ok((await events(aliceC)).json.events.some((e) => e.title === 'Alice\'s trip, renamed'));
    const again = await call('POST', `/api/me/external-calendars/${aliceCal.id}/refresh`, { cookie: aliceC });
    assert.equal(again.status, 429);
    assert.equal(again.json.error, 'This calendar was read less than a minute ago; try again in a minute.');
    assert.ok(Number(again.headers['retry-after']) >= 1 && Number(again.headers['retry-after']) <= 60);
    assert.equal((await call('POST', '/api/me/external-calendars/nope/refresh', { cookie: aliceC })).status, 404);
    await until(() => aliceStream.text.includes('event: external'), 3000);
    aliceStream.close();
    bobStream.close();
    assert.ok(aliceStream.text.includes('event: external\ndata: {"modules":["ext-cal"]}'), aliceStream.text);
    assert.ok(!bobStream.text.includes('event: external'), 'not on another person\'s stream');
  });

  await test('server: Remove takes the address and its events at once', async () => {
    const extra = (await list(aliceC)).calendars.find((c) => c.name === 'Extra 2');
    assert.ok((await events(aliceC)).json.events.some((e) => e.calendar === extra.id));
    assert.equal((await call('DELETE', `/api/me/external-calendars/${extra.id}`, { cookie: aliceC })).status, 204);
    assert.equal((await call('DELETE', `/api/me/external-calendars/${extra.id}`, { cookie: aliceC })).status, 404);
    const after = (await events(aliceC)).json;
    assert.ok(!after.calendars.some((c) => c.id === extra.id) && !after.events.some((e) => e.calendar === extra.id));
    const stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'app.json'), 'utf8')).users.find((u) => u.key === alice).externalCalendars;
    assert.ok(!stored.some((c) => c.id === extra.id));
  });

  await test('server: the switch off: none answered, none added or refreshed, Remove still works; on again, back', async () => {
    assert.equal((await call('PATCH', '/api/settings', { cookie: admin, body: { calendarFeeds: false } })).status, 200);
    assert.deepEqual((await events(aliceC)).json, { calendars: [], events: [] });
    assert.equal((await list(aliceC)).allowed, false);
    assert.match((await list(aliceC)).why, /^Calendar feeds are off in .+\. Your owner needs to turn on Calendar feeds in Manage > Environment, under Calendar apps\.$/);
    assert.equal((await add(aliceC, 'https://cal.example.com/extra-9.ics')).status, 403);
    const extra3 = (await list(aliceC)).calendars.find((c) => c.name === 'Extra 3');
    assert.equal((await call('POST', `/api/me/external-calendars/${extra3.id}/refresh`, { cookie: aliceC })).status, 403);
    assert.equal((await call('DELETE', `/api/me/external-calendars/${extra3.id}`, { cookie: aliceC })).status, 204);
    assert.equal((await call('PATCH', '/api/settings', { cookie: admin, body: { calendarFeeds: true } })).status, 200);
    assert.ok((await events(aliceC)).json.events.length > 0);
  });

  await test('server: after a restart the events are read again, from the sealed address', async () => {
    await server.stop();
    const hitsBefore = hitsOf(new RegExp(`alice-${ALICE_SECRET}`));
    server = await startServer(dataDir);
    ({ call, signIn } = server);
    admin = await signIn('admin', 'testpass1234');
    [aliceC, bobC] = [await signIn('alice', 'memberpass1234'), await signIn('bob', 'memberpass1234')];
    const got = await until(async () => {
      const r = (await call('GET', '/api/modules/ext-cal/external-events', { cookie: aliceC })).json;
      return r.events.some((e) => e.title === 'Alice\'s trip, renamed') ? r : null;
    });
    assert.ok(got, 'read again');
    assert.equal(hitsOf(new RegExp(`alice-${ALICE_SECRET}`)), hitsBefore + 1);
  });

  await test('server: at most 20 adds in ten minutes that reach a read', async () => {
    const carol = await (async () => { const r = await call('POST', '/api/users', { cookie: admin, body: { login: 'carol', displayName: 'carol', role: 'member', password: 'memberpass1234' } }); return r.json.user.key; })();
    assert.ok(carol);
    const carolC = await signIn('carol', 'memberpass1234');
    for (let i = 0; i < 20; i += 1) {
      const r = await add(carolC, `https://cal.example.com/extra-carol-${i}.ics`, 'Mine');
      assert.equal(r.status, 201, r.text);
      assert.equal((await call('DELETE', `/api/me/external-calendars/${r.json.calendar.id}`, { cookie: carolC })).status, 204);
    }
    const over = await add(carolC, 'https://cal.example.com/extra-carol-21.ics', 'Mine');
    assert.deepEqual([over.status, over.json], [429, { error: 'Too many calendars added at once; try again in a few minutes.' }]);
    assert.ok(Number(over.headers['retry-after']) > 0);
    assert.equal(hitsOf(/extra-carol-21/), 0, 'not read');
  });

  await test('server: a file of repeats that never land: the server stays quick for everyone else while it is read', async () => {
    const r = await call('POST', '/api/users', { cookie: admin, body: { login: 'dave', displayName: 'dave', role: 'member', password: 'memberpass1234' } });
    assert.equal(r.status, 201, r.text);
    const daveC = await signIn('dave', 'memberpass1234');
    for (const [file, status, error] of [['impossible', 201, null], ['heavy', 400, 'The calendar is too complex to read.']]) {
      const adding = add(daveC, `https://cal.example.com/${file}.ics`, file);
      const slowest = [];
      for (let i = 0; i < 5; i += 1) {
        const t0 = Date.now();
        assert.equal((await call('GET', '/api/me', { cookie: admin })).status, 200);
        slowest.push(Date.now() - t0);
      }
      const added = await adding;
      assert.equal(added.status, status, added.text);
      if (error) assert.equal(added.json.error, error);
      assert.ok(Math.max(...slowest) < 500, `another request waited ${Math.max(...slowest)} ms`);
    }
  });

  await test('server: deleting the person takes their addresses with them', async () => {
    assert.equal((await call('DELETE', `/api/users/${bob}`, { cookie: admin })).status, 200);
    const stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'app.json'), 'utf8'));
    assert.equal(stored.users.some((u) => u.key === bob), false);
    for (const file of filesUnder(dataDir)) assert.ok(!fs.readFileSync(file, 'latin1').includes(BOB_SECRET), `not in ${path.relative(dataDir, file)}`);
  });

  await server.stop();
  server = null;

  await test('hosted: the move to a hosted install seals the address again with the host\'s key, and it is still read', async () => {
    const installKey = Buffer.from(fs.readFileSync(path.join(dataDir, 'secrets.key'), 'utf8').trim(), 'hex');
    server = await startServer(dataDir, { BASE_DOMAIN: 'localhost', ADMIN_LOGIN: 'hostadmin', ADMIN_PASSWORD: 'hostpass12345', MIGRATE_ENVIRONMENT_SLUG: 'keep' });
    assert.match(server.output(), /Moved \d+ calendar address(es)? of "keep" to the host's key\./, server.output());
    const hostKey = Buffer.from(JSON.parse(fs.readFileSync(path.join(dataDir, 'host.json'), 'utf8')).secrets.key, 'hex');
    const stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'environments', 'keep', 'app.json'), 'utf8')).users.find((u) => u.key === alice).externalCalendars;
    assert.ok(stored.length >= 1);
    for (const c of stored) {
      assert.equal(auth.decryptSecret(c.url, installKey), null, 'no longer the install\'s key');
      assert.match(auth.decryptSecret(c.url, hostKey), /^https:\/\/cal\.example\.com\//);
    }
    const aliceHosted = await server.signIn('alice', 'memberpass1234', 'keep');
    const mine = (await server.call('GET', '/api/me/external-calendars', { cookie: aliceHosted, host: 'keep' })).json;
    assert.equal(mine.calendars.find((c) => c.id === aliceCal.id).host, 'cal.example.com');
    const got = await until(async () => {
      const r = (await server.call('GET', '/api/modules/ext-cal/external-events', { cookie: aliceHosted, host: 'keep' })).json;
      return r && r.events.some((e) => e.title === 'Alice\'s standup') ? r : null;
    });
    assert.ok(got, 'read with the host\'s key');
    await server.stop();
    server = null;
  });
} catch (err) {
  failed += 1;
  console.error(`FAIL the server run\n${err.stack || err}${server ? `\n${server.output().slice(-3000)}` : ''}`);
} finally {
  if (server) await server.stop();
}

// --- the pages (step 6) ------------------------------------------------------------------------------------------------
await test('pages: Profile\'s Other calendars section, wired to the routes; the address is never drawn or kept', () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const html = read('public/profile.html');
  const js = read('public/profile.js');
  const looked = [...new Set([...js.matchAll(/\$\('((?:section-)?external[a-z0-9-]*)'\)/g)].map((m) => m[1]))];
  for (const id of ['section-external', 'external-list', 'external-add', 'external-name', 'external-url', 'external-add-btn', 'external-status', 'external-full', 'external-off']) assert.ok(looked.includes(id), `profile.js looks up #${id}`);
  const onPage = ids(html);
  for (const id of looked) assert.ok(onPage.has(id), `public/profile.html has #${id}`);
  assert.match(html, /<section class="[^"]+" id="section-external" hidden>\s*<h2>Other calendars<\/h2>/, 'called Other calendars, hidden until the server allows it');
  assert.ok(html.indexOf('id="section-feed"') < html.indexOf('id="section-external"'), 'under Calendar feed');
  assert.ok(html.includes('Secret address in iCal format'), 'the how-to names Google\'s Secret address in iCal format');
  // Never its title alone: shown while the server says why it can't be used, and that reason drawn in #external-off.
  const render = js.slice(js.indexOf('function renderExternal('), js.indexOf('async function loadExternal('));
  assert.match(render, /section\.hidden = editing \|\| !external \|\| !\(external\.allowed \|\| calendars\.length \|\| external\.why\)/, 'shown while there is a reason to give');
  assert.match(render, /\$\('external-off'\)\.hidden = external\.allowed;/, 'the reason shows whenever it is not allowed');
  assert.match(render, /\$\('external-off'\)\.textContent = external\.allowed \? ''\s*: \[external\.why \|\| `Other calendars are off in \$\{place\} for now\.`/, 'the server\'s reason, else a plain one: never empty');
  assert.match(render, /\$\('external-add'\)\.hidden = !external\.allowed/, 'no form unless allowed');
  // The Calendar feed section says plainly that Google reads a subscribed address on its own schedule.
  const feed = html.slice(html.indexOf('id="section-feed"'), html.indexOf('id="section-external"'));
  assert.match(feed, /<p class="hint" id="feed-timing">Google Calendar reads the address on its own schedule, often every 8 to 24 hours, so new events, changes and deletions show there later\. Apple Calendar is usually quicker\.<\/p>/, 'the feed section says how often Google reads it');
  assert.ok(!/<p class="hint" id="feed-timing" hidden/.test(feed), 'always shown with the section');
  for (const [method, route] of [['GET', "'/api/me/external-calendars'"], ['POST', "'/api/me/external-calendars'"], ['POST', '`/api/me/external-calendars/${encodeURIComponent(id)}/refresh`'], ['DELETE', '`/api/me/external-calendars/${encodeURIComponent(id)}`']]) {
    assert.ok(js.includes(`api('${method}', ${route}`), `profile.js: ${method} ${route}`);
  }
  assert.doesNotMatch(js, /c\.url|calendar\.url/, 'a row never draws an address (the server answers only its host)');
  assert.doesNotMatch(js, /(localStorage|sessionStorage)[^\n]*external/i, 'nothing about them is kept in the browser');
  assert.match(js, /window\.confirm\(`Remove \$\{calendar\.name\}\?/, 'Remove asks first');
  assert.match(js, /This can take up to 15 seconds/, 'Add says it may take a while');
  const refreshAt = js.indexOf("api('POST', `/api/me/external-calendars/${encodeURIComponent(id)}/refresh`");
  const refreshCode = js.slice(refreshAt, js.indexOf('return;', refreshAt));
  const onFail = refreshCode.slice(refreshCode.indexOf('(err) => {'));
  assert.ok(onFail.includes('const said = rowStatus(id);') && onFail.includes('sayField(said, err.message, true)'), 'a failed Refresh (a 429 too) is said on its own row');
  assert.doesNotMatch(refreshCode, /external-status/, 'never in the section\'s line under Add');
  assert.match(read('public/admin.js'), /m\.hooks\.external \? \['<li><strong>See each person\\'s own other calendars<\/strong> <span class="hint">only to them<\/span><\/li>'\]/, 'the admin approves the hook by name');
});

await test('pages: the SDK, the stream on the host page, the Calendar and the destination\'s filter', () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sdk = read('public/sdk/host.js');
  assert.match(sdk, /external: \{\n\s+events: \(o\) => call\('external\.events'/, 'host.external.events');
  const hostPage = read('public/module-host.js');
  assert.match(hostPage, /async 'external\.events'\(\{ from, to \}\) \{[\s\S]{0,400}?url\('\/external-events'/, 'the host page asks the module\'s own route');
  assert.match(hostPage, /if \(type === 'external'\) \{\n\s+if \(externalHere && Array\.isArray\(d\.modules\) && d\.modules\.includes\(module\.id\)\) send\('external', \{\}\);/, 'only the modules the server named hear it, and never within a space');
  assert.match(hostPage, /async 'external\.events'\(\{ from, to \}\) \{\n\s+if \(!externalHere\) return \{ calendars: \[\], events: \[\] \};/, 'within a space a module is answered none');
  const manifest = JSON.parse(read('modules/calendar/module.json'));
  assert.equal(manifest.hooks.external, true, 'the Calendar asks for the hook');
  const cal = read('modules/calendar/src/calendar.js');
  assert.doesNotMatch(cal, /storage\.set\([^)]*external/i, 'their events are never stored');
  assert.doesNotMatch(cal, /events\.publish\([^)]*external/i, 'nor published');
  assert.match(cal, /From your \$\{externalName\(x\.calendar\)\} calendar\. Only you see this\./, 'opening one says whose it is');
  const dest = read('public/destination.js');
  assert.match(dest, /api\('GET', '\/api\/me\/external-calendars'\)/, 'the destination\'s filter lists them');
  assert.match(dest, /externalOff: \[\.\.\.externalOff\]/, 'and hands the parts the ones it has off');
  assert.match(cal, /Array\.isArray\(st\.externalOff\)/, 'which the Calendar takes');
  assert.match(dest, /if \(kind\.external && !withinSpacePage\(\)\) await loadExternals\(\);/, 'and lists none over a call');
  // Over a call the module's page is redirected to /calendar without its ?from=space, so the space page's overlay frame
  // is recognised by its id too.
  assert.match(read('public/brand.js'), /window\.frameElement && window\.frameElement\.id === 'page-overlay-frame'/, 'the overlay frame counts as within a space');
  assert.match(read('public/space.html'), /<iframe[^>]* id="page-overlay-frame"/, 'and that is the space page\'s overlay frame');
  // The filter's label counts them apart from the spaces.
  const paint = dest.slice(dest.indexOf('function paintFilter()'), dest.indexOf('\n}\n', dest.indexOf('function paintFilter()')) + 3);
  const label = (spaceList, offSpaces, calendars, offCalendars) => {
    const el = { textContent: '', title: '', setAttribute() {} };
    new Function('spaces', 'off', 'ownOn', 'kind', 'mineOn', 'externals', 'externalOff', 'word', '$', `let filterLabel;\n${paint}\npaintFilter();\nreturn filterLabel;`)(
      spaceList, new Set(offSpaces), true, {}, true, calendars, new Set(offCalendars), () => 'Trips', () => el);
    return el.textContent;
  };
  const two = [{ id: 'a' }, { id: 'b' }];
  assert.equal(label(two, [], two, []), 'Trips');
  assert.equal(label(two, ['a'], two, ['b']), 'Trips (2 of 3) · Other calendars (1 of 2)');
  assert.equal(label(two, [], two, ['a', 'b']), 'Trips · Other calendars (0 of 2)');
  assert.equal(label(two, ['a'], [], []), 'Trips (2 of 3)', 'other calendars never count as spaces');
});

await test('fetch: the whole read is given up after 15 seconds, even while bytes keep arriving', async () => {
  const err = await slowRead;
  const took = Date.now() - slowStarted;
  assert.ok(err && err.code === 'timeout', `a timeout: ${err && err.code}`);
  assert.ok(took >= 14500 && took < 20000, `took ${took} ms`);
});

for (const t of SLOW.open) clearInterval(t);
stand.closeAllConnections?.();
stand.close();
fs.rmSync(base, { recursive: true, force: true });
if (failed) {
  console.error(`check-external-calendars: ${failed} failed, ${n} passed`);
  process.exit(1);
}
console.log(`check-external-calendars: ${n} checks passed`);
