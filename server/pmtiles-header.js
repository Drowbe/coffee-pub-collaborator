// Reads just the fixed 127-byte header of a PMTiles archive (https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md)
// to learn its own zoom range, without touching the rest of the file, which can be gigabytes. The same header shape
// modules/maps/src/maps-lib-b-pmtiles.js reads in the browser (its own bytesToHeader) -- kept in step with it, so an
// admin's "Map files" table can say how detailed each file is (street-level or not) for any .pmtiles file there,
// whether it was cut by "Add a region" or dropped in by hand.
'use strict';

const fs = require('fs');

const HEADER_BYTES = 127;

// { minZoom, maxZoom }, or null if this isn't readable as a PMTiles file (wrong magic or a spec version newer than
// this reads, too short, or the file could not be opened).
function pmtilesZoomRange(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(HEADER_BYTES);
    if (fs.readSync(fd, buf, 0, HEADER_BYTES, 0) < HEADER_BYTES) return null;
    if (buf.readUInt16LE(0) !== 19792) return null; // "PM", the same fast check the JS reader uses
    if (buf.readUInt8(7) > 3) return null; // a spec version newer than this header shape
    const minZoom = buf.readUInt8(100);
    const maxZoom = buf.readUInt8(101);
    if (maxZoom < minZoom) return null;
    return { minZoom, maxZoom };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* already gone */ } }
  }
}

const TILE_TYPES = ['unknown', 'mvt', 'png', 'jpeg', 'webp', 'avif'];

// Everything the header says that the server needs: the zoom range, the tile type (byte 99: 0 unknown, 1 mvt = map
// data, 2 png, 3 jpeg, 4 webp, 5 avif = a picture), the bounds in degrees (bytes 102 to 117, int32 x 1e7: min lon,
// min lat, max lon, max lat), and where the root directory sits (to tell a file cut short). `kind` is 'vector' for
// map data, 'picture' for raster tiles, 'unknown' for type 0 or a number this does not know. Null on anything that
// pmtilesZoomRange() answers null for.
function pmtilesInfo(filePath) {
  const range = pmtilesZoomRange(filePath);
  if (!range) return null;
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(HEADER_BYTES);
    if (fs.readSync(fd, buf, 0, HEADER_BYTES, 0) < HEADER_BYTES) return null;
    const tileTypeNumber = buf.readUInt8(99);
    const tileType = TILE_TYPES[tileTypeNumber] || 'unknown';
    const deg = (at) => buf.readInt32LE(at) / 1e7;
    return {
      ...range,
      tileType,
      tileTypeNumber,
      kind: tileType === 'mvt' ? 'vector' : tileType === 'unknown' ? 'unknown' : 'picture',
      bounds: { minLon: deg(102), minLat: deg(106), maxLon: deg(110), maxLat: deg(114) },
      rootDirEnd: Number(buf.readBigUInt64LE(8) + buf.readBigUInt64LE(16)),
      size: fs.fstatSync(fd).size,
    };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* already gone */ } }
  }
}

module.exports = { pmtilesZoomRange, pmtilesInfo, HEADER_BYTES, TILE_TYPES };
