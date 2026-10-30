// The checks a library file gets once it is in (documentation/plans/plan-attachments-vault.md, section 1), run in a
// worker thread so the server's main thread never reads a file's bytes: a picture checked and cleaned, a PDF scanned
// (server/pdf-scan.js), an MP3, MP4, WebM or Markdown file's structure looked at (server/vault-types.js). Each check has
// a wall clock (VAULT_SCAN_SECONDS, 5) and a memory limit; one that runs out of either, or stops for any other reason,
// is killed and its file refused as "could not be checked safely". The main thread only waits for the answer. At most
// a few checks run at once (one fewer than the machine's processors, at least one, at most four); the rest wait their
// turn, and their clock starts when their turn does.
'use strict';

const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');

const WORKER = path.join(__dirname, 'vault-scan-worker.js');
const MEMORY_MB = 256;

// A scanner: scan({ file, type, keepPosition }) answers what the worker found (see vault-scan-worker.js), or
// { refuse: { code: 'unsafe' } } when it ran out of time or memory or stopped.
function createScanner({ seconds = 5, atOnce = Math.max(1, Math.min(4, (os.availableParallelism ? os.availableParallelism() : os.cpus().length) - 1)) } = {}) {
  const queue = [];
  let running = 0;
  const unsafe = { refuse: { code: 'unsafe' } };
  function runOne(job) {
    return new Promise((resolve) => {
      let done = false;
      let worker;
      const end = (r) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (worker) worker.terminate().catch(() => {});
        resolve(r);
      };
      const timer = setTimeout(() => end(unsafe), seconds * 1000);
      try {
        worker = new Worker(WORKER, { workerData: job, resourceLimits: { maxOldGenerationSizeMb: MEMORY_MB, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 } });
      } catch {
        return end(unsafe);
      }
      worker.once('message', (m) => end(m && typeof m === 'object' ? m : unsafe));
      worker.once('error', () => end(unsafe));
      worker.once('exit', () => end(unsafe));
    });
  }
  function pump() {
    while (running < atOnce && queue.length) {
      const { job, resolve } = queue.shift();
      running += 1;
      runOne(job).then((r) => { running -= 1; resolve(r); pump(); });
    }
  }
  return {
    scan(job) { return new Promise((resolve) => { queue.push({ job, resolve }); pump(); }); },
    get waiting() { return queue.length; },
    get running() { return running; },
  };
}

module.exports = { createScanner };
