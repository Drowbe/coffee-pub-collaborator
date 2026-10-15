// The fixed data tools/shots.mjs takes its screenshots of (documentation/plans/plan-design-system.md, step 1).
//
// seedServer(call) fills a throwaway server through its API: the travel template, an admin and two members, three modules'
// worth of everything (Planner, Places, To-do, Polls, Calendar, Budget, Research), two trips, the phases with fixed dates.
// seedChat(dataDir, ids) then writes the chat (an AI answer with suggestion cards, a message with a link card, ordinary
// messages) straight into DATA_DIR, because the AI and the link reader are not available here. Run with the server stopped
// and with tools/shots-clock.cjs preloaded, so the message times are the same fixed day as the server's.
//
// Every date is fixed (the server's clock starts on 2026-10-15, see shots-clock.cjs, and the page's clock is frozen on the
// same day), so two runs hold the same data. Ids that the server makes (a trip's id, an object's id) differ from run to run
// and are never drawn.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const TODAY = '2026-10-15';
export const PASSWORD = 'testpass1234';
const day = (n) => { const d = new Date(`${TODAY}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export { day };

const MODULES = ['travel', 'places', 'todo', 'polls', 'calendar', 'budget', 'research', 'maps', 'assistant', 'stream'];

// `call(method, url, body, as)` answers { status, json }; `as` is 'admin' or a member's login. Throws on an unexpected refusal.
export async function seedServer(call) {
  const ok = async (method, url, body, as = 'admin') => {
    const r = await call(method, url, body, as);
    if (r.status >= 300) throw new Error(`seed: ${method} ${url} answered ${r.status}: ${JSON.stringify(r.json)}`);
    return r.json;
  };
  await ok('PATCH', '/api/settings', { template: 'travel' });
  await ok('PATCH', '/api/settings', { showCalendar: true });
  const users = {};
  for (const [login, displayName] of [['mia', 'Mia Alvarez'], ['sam', 'Sam Okafor'], ['lee', 'Lee Chen']]) {
    const made = await ok('POST', '/api/users', { login, displayName, role: 'member', password: PASSWORD });
    users[login] = made.user.key;
  }
  // Research and the Assistant need the AI service on; a key and a model are enough, nothing is ever asked of it here.
  await ok('PUT', '/api/ai', { source: 'custom', provider: 'openai', key: 'sk-shots-not-a-real-key', model: 'gpt-4o-mini', enabled: true });
  for (const id of MODULES) {
    const had = await call('POST', `/api/modules/bundled/${id}/install`, undefined, 'admin');
    if (had.status >= 300 && !/already installed/.test(JSON.stringify(had.json))) throw new Error(`seed: installing ${id} answered ${had.status}: ${JSON.stringify(had.json)}`);
    await ok('PATCH', `/api/modules/${id}`, { enabled: true });
  }
  const trip = (await ok('POST', '/api/spaces', { name: 'Lisbon in autumn', description: 'Ten days of trams, tiles and custard tarts.', members: [users.mia, users.sam] })).space;
  const second = (await ok('POST', '/api/spaces', { name: 'Kyoto in spring', description: 'Blossom season, if we are lucky.', members: [users.mia] })).space;
  await ok('POST', '/api/spaces', { name: 'Weekend in the Algarve', members: [users.sam] });
  await ok('PATCH', `/api/users/${users.mia}/spaces/${trip.id}`, { permissions: { moderator: true } });
  // The phases, on fixed days, whatever phases the template holds: the first starts a month before today, the ones before the main
  // phase follow at even steps, the main phase runs from day 10 to day 19 and the next phase starts the day after.
  const phaseList = (await ok('GET', '/api/branding')).phases || [];
  const main = Math.max(0, phaseList.findIndex((p) => p.main));
  const dates = {};
  phaseList.forEach((p, i) => {
    if (i < main) dates[p.id] = { start: day(-30 + Math.floor((38 * i) / main)) };
    else if (i === main) dates[p.id] = { start: day(10), end: day(19) };
    else if (i === main + 1) dates[p.id] = { start: day(20) };
  });
  if (phaseList.length) await ok('PATCH', `/api/spaces/${trip.id}`, { phases: dates });

  const put = (module, key, value, space = trip.id, as = 'admin') => ok('PUT', `/api/modules/${module}/data/${encodeURIComponent(key)}?scope=space&space=${space}`, { value }, as);
  const by = 'Mia Alvarez';

  // --- Planner: a trip, and one object of each kind on its days.
  await put('travel', 'trip:main', { title: 'Lisbon in autumn', start: day(10), end: day(19) });
  const plan = [
    ['a1', { kind: 'journey', mode: 'flight', title: 'Flight to Lisbon', date: day(10), time: '07:40', minutes: 175, operator: 'TAP Air Portugal', number: 'TP 205', fromCode: 'JFK', toCode: 'LIS', terminal: '1', gate: 'B22', seat: '14A', travelClass: 'Economy', confirm: 'QX81ZP', cost: 612, owners: [users.mia], order: 1 }],
    ['a2', { kind: 'journey', mode: 'train', title: 'Train to Sintra', date: day(12), time: '09:15', minutes: 40, operator: 'CP', fromCode: '', toCode: '', platform: '3', order: 1 }],
    ['a3', { kind: 'stay', type: 'hotel', title: 'Hotel Avenida Palace', date: day(10), checkOut: day(15), time: '15:00', checkOutTime: '11:00', address: 'Praca dos Restauradores', roomType: 'Double', guests: 2, confirm: 'HAP-4471', cost: 880, order: 2 }],
    ['a4', { kind: 'stop', type: 'restaurant', title: 'Dinner at Taberna da Rua', date: day(10), time: '20:00', minutes: 90, place: 'Taberna da Rua', address: 'Rua das Flores 18', partySize: 3, reservationName: 'Alvarez', owners: [users.mia, users.sam], estimate: 120, order: 3 }],
    ['a5', { kind: 'stop', type: 'museum', title: 'Tile Museum', date: day(11), time: '10:30', minutes: 120, place: 'Museu Nacional do Azulejo', admissionCount: 3, order: 1 }],
    ['a6', { kind: 'stop', type: 'cafe', title: 'Pastries in Belem', date: day(11), time: '15:00', minutes: 45, place: 'Pasteis de Belem', done: true, order: 2 }],
    ['a7', { kind: 'note', title: 'Bring a rain jacket', date: day(11), notes: 'Forecast says showers on the second afternoon. The trams are slippery when wet.', order: 3 }],
    ['a8', { kind: 'block', type: 'free', title: 'Free time', date: day(12), time: '14:00', minutes: 120, order: 2 }],
    ['a9', { kind: 'stop', type: 'sight', title: 'Castelo de Sao Jorge', date: day(12), time: '17:00', minutes: 90, order: 3, pinned: true }],
    ['a10', { kind: 'lane', type: 'rest', title: 'Rest day', after: day(12), order: 1 }],
    ['a11', { kind: 'link', title: 'Tram 28', date: day(13), ref: { module: 'places', kind: 'place', id: 'p1', scope: 'space', space: trip.id }, order: 1 }],
    ['a12', { kind: 'stop', type: 'restaurant', title: 'Lunch near the market', date: day(13), time: '13:00', minutes: 60, order: 2, notes: 'Conflicts with the tour below.' }],
    ['a14', { kind: 'stop', type: 'show', title: 'Fado night', date: day(14), time: '21:00', minutes: 120, admissionCount: 3, gate: 'Door B', confirm: 'FD-22', order: 1 }],
    ['a15', { kind: 'journey', mode: 'bus', title: 'Airport shuttle bus', date: day(19), time: '10:00', minutes: 40, to: 'Humberto Delgado Airport', operator: 'Aerobus', order: 1 }],
    ['a13', { kind: 'stop', type: 'tour', title: 'Tuk-tuk tour', date: day(13), time: '13:30', minutes: 120, order: 3 }],
  ];
  for (const [id, v] of plan) await put('travel', `plan:${id}`, { by, ...v });

  // --- Places
  const places = [
    ['p1', { title: 'Tram 28 stop, Martim Moniz', category: 'transport', address: 'Largo Martim Moniz', point: { lat: 38.7167, lng: -9.1359 }, notes: 'Get there before 9 to find a seat.', owners: [users.mia] }],
    ['p2', { title: 'Time Out Market', category: 'food', status: 'want', address: 'Av. 24 de Julho 49', point: { lat: 38.7066, lng: -9.1459 }, notes: 'Lots of stalls, one bench for three.', owners: [] }],
    ['p3', { title: 'Miradouro da Senhora do Monte', category: 'sights', address: 'Largo Monte', point: { lat: 38.7203, lng: -9.1329 }, notes: '', owners: [users.sam] }],
    ['p4', { title: 'Cabo da Roca', category: 'nature', address: 'Colares', point: { lat: 38.7804, lng: -9.4989 }, notes: 'The westernmost point of mainland Europe.', owners: [] }],
    ['p5', { title: 'A bookshop with a cat', category: 'shopping', address: 'Rua Anchieta 4', point: { lat: 38.7108, lng: -9.1417 }, notes: '', owners: [] }],
  ];
  for (const [id, v] of places) await put('places', `place:${id}`, { address: '', notes: '', owners: [], by, ...v });

  // --- To-do
  const tasks = [
    ['t1', { title: 'Book the Sintra train', notes: 'Tickets are cheaper online.', due: day(2) }],
    ['t2', { title: 'Exchange some euros', notes: '', due: day(5), remind: true }],
    ['t3', { title: 'Download offline maps', notes: '', due: null }],
    ['t4', { title: 'Renew passport', notes: 'Done in September.', due: day(-20), done: true, doneAt: Date.parse(`${day(-18)}T10:00:00Z`) }],
    ['t5', { title: 'Pack adapters', notes: '', due: day(9) }],
  ];
  for (const [id, v] of tasks) await put('todo', `task:${id}`, { id, remind: false, done: false, doneAt: null, createdAt: Date.parse(`${day(-12)}T10:00:00Z`), by, links: [], autoDone: false, ...v });

  // --- Polls
  const polls = [
    ['q1', { question: 'Where do we eat on the first night?', options: [{ id: 'o1', text: 'Taberna da Rua' }, { id: 'o2', text: 'Time Out Market' }, { id: 'o3', text: 'Somewhere near the hotel', desc: 'We will be tired.' }], multi: false, addable: true, closed: false, closesAt: null, createdAt: Date.parse(`${day(-5)}T10:00:00Z`), by, byKey: users.mia }],
    ['q2', { question: 'Which days for the day trip?', options: [{ id: 'o1', text: 'Sintra', date: day(12) }, { id: 'o2', text: 'Cascais', date: day(14) }], multi: true, addable: false, closed: true, closesAt: null, createdAt: Date.parse(`${day(-9)}T10:00:00Z`), by: 'Sam Okafor', byKey: users.sam }],
  ];
  for (const [id, v] of polls) await put('polls', `poll:${id}`, { id, ...v });
  await put('polls', `vote:q1:${users.mia}`, { options: ['o1'], name: 'Mia Alvarez', at: Date.parse(`${day(-4)}T10:00:00Z`) });
  await put('polls', `vote:q1:${users.sam}`, { options: ['o2'], name: 'Sam Okafor', at: Date.parse(`${day(-4)}T11:00:00Z`) }, trip.id, 'sam');

  // --- Calendar
  const events = [
    ['e1', { title: 'Passport photos', allDay: false, start: `${day(1)}T16:00:00.000Z`, end: `${day(1)}T16:30:00.000Z`, desc: '', remind: null, repeat: null }],
    ['e2', { title: 'Pack the suitcases', allDay: true, start: day(9), end: null, desc: '', remind: null, repeat: null }],
    ['e3', { title: 'Trip', allDay: true, start: day(10), end: day(19), desc: 'Lisbon and Sintra.', remind: null, repeat: null }],
    ['e4', { title: 'Weekly planning call', allDay: false, start: `${day(-3)}T19:00:00.000Z`, end: `${day(-3)}T19:45:00.000Z`, desc: '', remind: 15, repeat: { every: 'week', until: null } }],
    ['e5', { title: 'Farewell dinner', allDay: false, start: `${day(18)}T20:00:00.000Z`, end: null, desc: 'At the hotel.', remind: null, repeat: null }],
  ];
  for (const [id, v] of events) await put('calendar', `event:${id}`, { id, by, ...v });

  // --- Budget
  const costs = [
    ['c1', { title: 'Flights', category: 'transport', categoryName: 'Transport', planned: 1250, actual: 1224, amount: 1224, paidBy: users.mia, sharedBy: [users.mia, users.sam], date: day(-8) }],
    ['c2', { title: 'Hotel Avenida Palace', category: 'stay', categoryName: 'Stay', planned: 900, actual: 880, amount: 880, paidBy: users.sam, sharedBy: [users.mia, users.sam], date: day(-6) }],
    ['c3', { title: 'Dinners', category: 'food', categoryName: 'Food', planned: 600, amount: 600, paidBy: '', sharedBy: [], date: '' }],
    ['c4', { title: 'Museum tickets', category: 'activities', categoryName: 'Activities', planned: 90, amount: 90, paidBy: '', sharedBy: [], date: day(11) }],
  ];
  for (const [id, v] of costs) await put('budget', `cost:${id}`, { notes: '', by, ...v });

  // --- Research
  await put('research', 'note:n1', { title: 'Where to eat near the hotel', body: 'Three places the neighbours recommended, all within ten minutes.', tags: ['food'], icon: 'utensils', by, at: Date.parse(`${day(-7)}T10:00:00Z`) });
  await put('research', 'link:l1', { title: 'Lisbon tram guide', url: 'https://example.com/lisbon-trams', excerpt: 'Which lines are worth the ride, and when to avoid the crowds.', tags: [], by, at: Date.parse(`${day(-6)}T10:00:00Z`) });
  return { trip, second, users };
}

// The chat, written to DATA_DIR/chat.json and chat-private.json while the server is stopped: the same talk in Home's chat
// (the Lobby, the only chat a page can show without a call) and in the trip's.
export function seedChat(dataDir, { tripId, users }) {
  const { ChatHistory } = require(path.join(root, 'server', 'chat-history.js'));
  const h = new ChatHistory(dataDir);
  const at = (hh, mm) => Date.parse(`${TODAY}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`);
  for (const spaceId of ['lobby', tripId]) {
    const say = (key, who, text, when, extra = {}) => h.add(spaceId, { by: key, who, text, at: when, ...extra });
    say(users.mia, 'Mia Alvarez', 'I found a hotel near the square. Want to see it?', at(7, 40));
    say(users.sam, 'Sam Okafor', 'Yes please. Is breakfast included?', at(7, 44));
    const link = say(users.mia, 'Mia Alvarez', 'Here is the one I mean: https://example.com/avenida-palace', at(7, 50), { link: 'https://example.com/avenida-palace' });
    h.setPreview(spaceId, link.id, 'research', { title: 'Hotel Avenida Palace', description: 'A grand old hotel by Restauradores Square, with a tiled lobby and a breakfast hall.', at: at(7, 51) });
    say(users.mia, 'Mia Alvarez', 'What should we see on the second day?', at(8, 10), { kind: 'command', command: 'ai', visibility: 'private' });
    say(users.mia, 'Mia Alvarez',
      'The second day suits the old town. Start with this:\n\n{{summary:0}}\n\nThen, for lunch, **one good idea**:\n\n{{summary:1}}\n\nBook ahead if you can.',
      at(8, 11), {
        kind: 'ai',
        summaries: [
          { title: 'Tile Museum', kind: 'museum', description: 'Five hundred years of azulejos, in a former convent.', place: { name: 'Museu Nacional do Azulejo' }, date: day(11), tags: ['museum'], icon: 'landmark' },
          { title: 'Lunch at Cervejaria Ramiro', kind: 'restaurant', description: 'Seafood, loud and busy. Go early.', place: { name: 'Cervejaria Ramiro' }, date: day(11), tags: ['food'], icon: 'utensils' },
        ],
      });
    say(users.sam, 'Sam Okafor', 'That sounds good. I will add it to the plan.', at(8, 30));
    say(users.sam, 'Sam Okafor', '/poll Where do we eat on the first night?', at(8, 35), { kind: 'command', command: 'poll', module: 'polls' });
  }
  h.flush();
}
