// The worker behind server/vault-scan.js: one check of one library file, then it ends. workerData is
// { file, type, keepPosition }. It answers (postMessage) one of:
//   { ok: true }                                         nothing stops the file
//   { ok: true, size, sha256, taken, camera }            a picture, checked and cleaned into <file>.clean
//   { refuse: { code } }                                 'picture-damaged', 'picture-large', 'kind', 'damaged',
//                                                        'pdf-damaged', 'pdf-unchecked'
//   { refuse: { code: 'pdf-active', name, what } }       what a PDF holds
// A throw, or running out of time or memory, is the caller's 'unsafe'.
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { parentPort, workerData } = require('worker_threads');
const vaultTypes = require('./vault-types');
const { cleanImage } = require('./image-clean');
const { pdfScan } = require('./pdf-scan');

function check({ file, type, keepPosition }) {
  const group = vaultTypes.TYPES[type] && vaultTypes.TYPES[type].group;
  if (group === 'image') {
    const bytes = fs.readFileSync(file);
    const pixels = vaultTypes.picturePixels(bytes, type);
    if (pixels === null) return { refuse: { code: 'picture-damaged' } };
    if (pixels > vaultTypes.MAX_PIXELS) return { refuse: { code: 'picture-large' } };
    let clean;
    try {
      clean = cleanImage(bytes, [type], keepPosition);
    } catch {
      return { refuse: { code: 'picture-damaged' } };
    }
    fs.writeFileSync(`${file}.clean`, clean.bytes, { mode: 0o600 });
    return { ok: true, size: clean.bytes.length, sha256: crypto.createHash('sha256').update(clean.bytes).digest('hex'), taken: clean.taken, camera: clean.camera };
  }
  if (type === 'application/pdf') {
    const r = pdfScan(fs.readFileSync(file));
    if (!r) return { ok: true };
    if (r.refuse) return { refuse: { code: r.refuse === 'damaged' ? 'pdf-damaged' : 'pdf-unchecked' } };
    return { refuse: { code: 'pdf-active', name: r.name, what: r.what } };
  }
  const code = vaultTypes.structureRefusal(file, type);
  return code ? { refuse: { code } } : { ok: true };
}

parentPort.postMessage(check(workerData));
