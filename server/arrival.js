// How a library upload must keep arriving (documentation/plans/plan-attachments-vault.md, section 2), and what happens to
// someone whose uploads keep stalling. Kept apart from index.js, with its clock given, so a check can run the minutes
// through in an instant.
'use strict';

// Watches one body arrive. After its first `windowMs` (a minute), at every `tickMs` (five seconds), the bytes that
// arrived over the last `windowMs` must be at least `minRate` bytes a second for that window, or everything that was
// still to come at the window's start; else `onSlow()`, once. The window is measured in the time the sender could
// send: a moment the server itself stopped reading (`waiting(true)`, its disk being slow) is taken out of it, and
// nothing else is. A sender that sends nothing is slow. `got(n)` counts bytes, `stop()` ends it; `tick()` is the
// check itself (a timer calls it unless `timer: false`).
function watchArrival(declared, onSlow, { minRate, windowMs = 60000, tickMs = 5000, clock = Date.now, timer = true } = {}) {
  const start = clock();
  let size = 0;
  let pausedSince = null;
  let pausedMs = 0;
  let over = false;
  const active = (t) => t - start - pausedMs - (pausedSince === null ? 0 : t - pausedSince);
  const samples = [[0, 0]]; // [time the sender could send, bytes by then], one a tick
  let interval = null;
  const watch = {
    got(n) { size += n; },
    waiting(on) {
      const t = clock();
      if (on && pausedSince === null) pausedSince = t;
      else if (!on && pausedSince !== null) { pausedMs += t - pausedSince; pausedSince = null; }
    },
    stop() { over = true; if (interval) clearInterval(interval); },
    tick() {
      if (over) return false;
      const a = active(clock());
      samples.push([a, size]);
      while (samples.length > 1 && samples[1][0] <= a - windowMs) samples.shift();
      if (a < windowMs) return false;
      const [, from] = samples[0];
      if (size - from >= Math.min((minRate * windowMs) / 1000, declared - from)) return false;
      watch.stop();
      onSlow();
      return true;
    },
  };
  if (timer) interval = setInterval(() => watch.tick(), tickMs);
  return watch;
}

// Who keeps being cut off: after `most` cut-offs of one person's uploads within `windowMs`, wait(key) is the seconds
// until the oldest of those is out of the window (else 0).
function slowSenders({ most = 3, windowMs = 10 * 60000, clock = Date.now } = {}) {
  const cuts = new Map(); // key -> times
  const recent = (key) => {
    const now = clock();
    const list = (cuts.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length) cuts.set(key, list); else cuts.delete(key);
    return list;
  };
  return {
    note(key) { cuts.set(key, [...recent(key), clock()]); },
    wait(key) {
      const list = recent(key);
      if (list.length < most) return 0;
      return Math.max(1, Math.ceil((list[list.length - most] + windowMs - clock()) / 1000));
    },
    sweep() { for (const key of [...cuts.keys()]) recent(key); },
  };
}

module.exports = { watchArrival, slowSenders };
