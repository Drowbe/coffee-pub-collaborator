'use strict';
// Writing to a server-sent stream (the live stream, notifications, a module's changes) without letting a reader that
// stopped reading fill the server's memory: a write that would put the stream more than `limitBytes` behind (what Node
// still holds for it, once the system's own socket buffer is full) drops the stream instead of queueing. Its page
// reconnects and catches up. A Buffer handed to many streams is shared, never copied per stream.

// sseWrite(res, ...chunks): writes the chunks (text or Buffers) to `res`, or destroys it when they would put it over the
// limit; true when written, false when dropped or already gone.
function streamWriter(limitBytes) {
  return function sseWrite(res, ...chunks) {
    if (res.destroyed || res.writableEnded) return false;
    let size = 0;
    for (const c of chunks) size += typeof c === 'string' ? Buffer.byteLength(c) : c.length;
    if (res.writableLength + size > limitBytes) {
      res.destroy();
      return false;
    }
    for (const c of chunks) res.write(c);
    return true;
  };
}

module.exports = { streamWriter };
