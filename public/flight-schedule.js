// The admin's Flight schedule section (documentation/plans/plan-flight-lookup.md, step 5): how many flights this server
// has learned from saved trips, forgetting one number, and clearing all after asking. The same section on the host
// console (/api/host/flight-schedule, hosted) and on the admin page (/api/flight-schedule, a single install); each page
// holds the markup (#flight-schedule-section and the ids below) and calls wireFlightSchedule with its route. The server's
// own sentences are shown as they come.
import { api } from '/brand.js';

const CLEAR_QUESTION = 'Clear all learned flights? Lookups will find nothing until people save flights again.';
const flights = (n) => `${n} flight${n === 1 ? '' : 's'}`;

export function wireFlightSchedule(route) {
  const $ = (id) => document.getElementById(id);
  const section = $('flight-schedule-section');
  const count = $('flight-schedule-count');
  const status = $('flight-schedule-status');
  const form = $('flight-forget-form');
  const input = $('flight-forget-number');
  const clear = $('flight-clear');
  if (!section || !count || !status || !form || !input || !clear) return { load: async () => {} };

  let timer = 0;
  const say = (text, error = false) => {
    clearTimeout(timer);
    status.textContent = text;
    status.classList.toggle('error', error);
    if (text && !error) timer = setTimeout(() => { status.textContent = ''; }, 5000);
  };
  const show = (answer) => {
    const n = Number(answer && answer.numbers) || 0;
    count.textContent = `This server has learned ${flights(n)} from saved trips.`;
    clear.disabled = n === 0;
  };

  async function load() {
    try {
      show(await api('GET', route));
      section.hidden = false;
    } catch (err) {
      section.hidden = true; // not this kind of install, or not allowed: no section at all
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const typed = input.value.trim();
    if (!typed) { say('Enter a flight number, like WN 2483.', true); input.focus(); return; }
    try {
      show(await api('DELETE', `${route}?number=${encodeURIComponent(typed)}`));
      input.value = '';
      say(`Forgot ${typed.toUpperCase()}.`);
    } catch (err) {
      say(err.message, true);
      input.focus();
    }
  });
  clear.addEventListener('click', async () => {
    if (!window.confirm(CLEAR_QUESTION)) return;
    try {
      const answer = await api('DELETE', route);
      show(answer);
      say(`Cleared ${flights(Number(answer.removed) || 0)}.`);
    } catch (err) {
      say(err.message, true);
    }
  });
  return { load };
}
