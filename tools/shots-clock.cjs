// Preloaded into the throwaway server (and the chat seeder) by tools/shots.mjs, so that two runs build the same environment.
//   - The server's idea of "now" starts at a fixed instant (SHOTS_NOW, an ISO string) and then runs at the real speed, so every
//     date it writes (a trip's created day, a message's time) is the same day in every run, whatever day the run is on.
//   - crypto.randomBytes, crypto.randomInt, crypto.randomUUID and Math.random answer from a seeded sequence (SHOTS_SEED names
//     it), so the keys and ids the server makes (a person's key, a trip's id, an object's id) are the same in every run and
//     what is drawn from them (an order, a key printed on a page) does not change. This is for the screenshot tool's throwaway
//     server only; it makes nothing secret, and nothing else loads this file.
'use strict';
const nodeCrypto = require('crypto');

const start = Date.parse(process.env.SHOTS_NOW || '2026-10-15T09:00:00.000Z');
if (Number.isFinite(start)) {
  const offset = start - Date.now();
  const Real = Date;
  class Shifted extends Real {
    constructor(...args) { if (args.length === 0) super(Real.now() + offset); else super(...args); }
    static now() { return Real.now() + offset; }
  }
  global.Date = Shifted;
}

const seed = String(process.env.SHOTS_SEED || 'shots');
let counter = 0;
function bytes(n) {
  const out = Buffer.alloc(n);
  let filled = 0;
  while (filled < n) {
    const block = nodeCrypto.createHash('sha256').update(`${seed}|${counter}|${filled}`).digest();
    counter += 1;
    block.copy(out, filled, 0, Math.min(block.length, n - filled));
    filled += block.length;
  }
  return out;
}
const done = (cb, value) => { if (typeof cb === 'function') { process.nextTick(cb, null, value); return undefined; } return value; };
nodeCrypto.randomBytes = (n, cb) => done(cb, bytes(n));
nodeCrypto.randomInt = (min, max, cb) => {
  if (typeof max === 'undefined' || typeof max === 'function') { cb = max; max = min; min = 0; }
  return done(cb, min + (bytes(6).readUIntBE(0, 6) % (max - min)));
};
nodeCrypto.randomUUID = () => { const b = bytes(16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; const h = b.toString('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
Math.random = () => bytes(4).readUInt32BE(0) / 4294967296;
