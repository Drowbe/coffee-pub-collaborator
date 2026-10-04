#!/usr/bin/env node
/*
 * build-airports.mjs -- builds server/airports.json, the airport list the flight lookup reads (documentation/plans/
 * plan-flight-lookup.md, "The airport list"), from mwgg/Airports (github.com/mwgg/Airports, MIT license).
 *
 * The source is pinned to one commit and checked against its sha256, so a rebuild gives the same file until someone
 * moves the pin on purpose. Only airports with an IATA code are kept, keyed by it, each { icao, name, city, country, tz };
 * the source's state, elevation and position are dropped (about 9 MB down to under 1 MB). The source's MIT notice is
 * written beside it, as server/airports-LICENSE, with the commit it came from.
 *
 * To rebuild (an airport opened, a code changed): move SOURCE_COMMIT and SOURCE_SHA256 to the new commit, run this,
 * check `node tools/check-flight-lookup.mjs`, and commit both files.
 *
 *   node tools/build-airports.mjs                    download the pinned commit's airports.json and LICENSE
 *   node tools/build-airports.mjs --from <dir>       read airports.json and LICENSE from a folder instead (no network)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_REPOSITORY = 'https://github.com/mwgg/Airports';
const SOURCE_COMMIT = 'a89e4e0dda9d9878337e2da190ebe1ef1d6af705'; // master, 2026-10-01 (merge of pull request #238)
const SOURCE_SHA256 = 'a7754cbe722ea21f0f9ab1ef07f4f07ee1e85b9cc99191ebde0b49fabb3c149a'; // its airports.json
const RAW = `https://raw.githubusercontent.com/mwgg/Airports/${SOURCE_COMMIT}`;
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;

const oneLine = (s, n) => String(s == null ? '' : s).replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

async function fetchText(name) {
  const res = await fetch(`${RAW}/${name}`, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`${name}: the source answered ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_SOURCE_BYTES) throw new Error(`${name}: larger than expected`);
  return text;
}

async function readSource() {
  const i = process.argv.indexOf('--from');
  if (i > 0) {
    const dir = path.resolve(process.argv[i + 1] || '.');
    return { data: fs.readFileSync(path.join(dir, 'airports.json'), 'utf8'), license: fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8') };
  }
  return { data: await fetchText('airports.json'), license: await fetchText('LICENSE') };
}

const { data, license } = await readSource();
const sha = crypto.createHash('sha256').update(data).digest('hex');
if (sha !== SOURCE_SHA256) {
  console.error(`airports.json's sha256 is ${sha}, not the pinned ${SOURCE_SHA256}. Move the pin on purpose, or fetch the pinned commit.`);
  process.exit(1);
}
if (!/MIT License/.test(license)) {
  console.error('the source LICENSE is not the MIT notice expected');
  process.exit(1);
}

const source = JSON.parse(data);
const out = {};
let skipped = 0;
for (const icao of Object.keys(source).sort()) {
  const a = source[icao];
  const iata = a && typeof a.iata === 'string' ? a.iata.trim().toUpperCase() : '';
  if (!/^[A-Z]{3}$/.test(iata)) continue;
  const tz = oneLine(a.tz, 60);
  let zoneOk = false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); zoneOk = !!tz; } catch { zoneOk = false; }
  const name = oneLine(a.name, 120);
  if (!name || out[iata]) { skipped += 1; continue; }
  out[iata] = { icao: oneLine(a.icao || icao, 4).toUpperCase(), name, city: oneLine(a.city, 80), country: oneLine(a.country, 2).toUpperCase(), tz: zoneOk ? tz : '' };
}

// One airport a line, in code order, so a rebuild's change reads as a short diff.
const codes = Object.keys(out).sort();
const text = `{\n${codes.map((c) => `${JSON.stringify(c)}:${JSON.stringify(out[c])}`).join(',\n')}\n}\n`;
fs.writeFileSync(path.join(ROOT, 'server', 'airports.json'), text);
fs.writeFileSync(path.join(ROOT, 'server', 'airports-LICENSE'),
  `server/airports.json is built by tools/build-airports.mjs from mwgg/Airports\n(${SOURCE_REPOSITORY}, commit ${SOURCE_COMMIT}),\ncut to the airports with an IATA code. Its license:\n\n${license.trim()}\n`);
console.log(`server/airports.json: ${codes.length} airports, ${text.length} bytes${skipped ? `, ${skipped} skipped` : ''}`);
