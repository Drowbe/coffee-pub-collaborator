// A space's recent chat, kept on the server so someone who joins later (or from another browser) reads what was
// said. Messages still travel live over LiveKit's data channel; the sender also posts the text here. Only text is
// kept (not pictures), only for a real space (an aside is meant to be off the record), and only a rolling window:
// the last MAX_PER_SPACE messages, none older than MAX_AGE_MS. Persists to DATA_DIR/chat.json.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_PER_SPACE = 500;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TEXT = 1000;

class ChatHistory {
  constructor(dataDir) {
    this.file = path.join(dataDir, 'chat.json');
    this.spaces = {}; // spaceId -> [{ id, at, by, who, text }], oldest first
    this.cleared = {}; // spaceId -> ms when the chat was deleted for everyone
    this.timer = null;
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (raw && typeof raw.spaces === 'object') this.spaces = raw.spaces;
      if (raw && typeof raw.cleared === 'object') this.cleared = raw.cleared;
    } catch {
      // first run
    }
  }

  // Written soon after a change, not on every message, and once more when the server stops.
  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 2000);
    if (this.timer.unref) this.timer.unref();
  }

  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ spaces: this.spaces, cleared: this.cleared }));
      fs.renameSync(tmp, this.file);
    } catch {
      // the chat still works; it just is not kept this time
    }
  }

  prune(spaceId) {
    const cutoff = Date.now() - MAX_AGE_MS;
    const list = (this.spaces[spaceId] || []).filter((m) => m.at >= cutoff).slice(-MAX_PER_SPACE);
    if (list.length) this.spaces[spaceId] = list;
    else delete this.spaces[spaceId];
  }

  list(spaceId) {
    this.prune(spaceId);
    return (this.spaces[spaceId] || []).map((m) => ({ ...m }));
  }

  // `by` is the sender's user key ('guest' for a guest), `who` the name to show.
  add(spaceId, { by, who, text }) {
    const clean = String(text ?? '').replace(/\p{Cc}/gu, (c) => (c === '\n' || c === '\t' ? c : '')).trim().slice(0, MAX_TEXT);
    if (!clean) return null;
    const name = String(who || '').replace(/\p{Cc}/gu, ' ').trim().slice(0, 40) || 'someone';
    const message = { id: crypto.randomBytes(6).toString('hex'), at: Date.now(), by: String(by || 'guest').slice(0, 40), who: name, text: clean };
    if (!this.spaces[spaceId]) this.spaces[spaceId] = [];
    this.spaces[spaceId].push(message);
    this.prune(spaceId);
    this.save();
    return message;
  }

  clearedAt(spaceId) {
    const at = this.cleared[spaceId];
    return Number.isFinite(at) ? at : 0;
  }

  // null: no such message. false: it is someone else's.
  remove(spaceId, messageId, by) {
    const list = this.spaces[spaceId];
    if (!list) return null;
    const at = list.findIndex((m) => m.id === messageId);
    if (at < 0) return null;
    if (by != null && list[at].by !== by) return false;
    const [gone] = list.splice(at, 1);
    if (!list.length) delete this.spaces[spaceId];
    this.flush();
    return gone;
  }

  // Empties the space's chat for everyone. The time is kept so a browser that still has an old local copy does not
  // bring those messages back.
  clear(spaceId) {
    delete this.spaces[spaceId];
    this.cleared[spaceId] = Date.now();
    this.flush();
  }

  forgetSpace(spaceId) {
    const changed = Boolean(this.spaces[spaceId] || this.cleared[spaceId]);
    delete this.spaces[spaceId];
    delete this.cleared[spaceId];
    if (changed) this.save();
  }
}

module.exports = { ChatHistory, CHAT_LIMITS: { MAX_PER_SPACE, MAX_AGE_MS, MAX_TEXT } };
