// A stand-in for /lib/livekit-client.esm.mjs, used ONLY by tools/shots.mjs for the screens marked "call": true, so the
// space page can be drawn without a LiveKit server. It connects at once and never holds any media: nobody else is in the
// call, no microphone or camera is ever on. It is a test double for taking pictures of the page, not a model of LiveKit:
// the call itself (tiles, the call controls with real state, the popped-out window) is still only checked in a real call.
class Emitter {
  constructor() { this.h = new Map(); }
  on(e, f) { if (!this.h.has(e)) this.h.set(e, []); this.h.get(e).push(f); return this; }
  once(e, f) { return this.on(e, f); }
  off(e, f) { this.h.set(e, (this.h.get(e) || []).filter((x) => x !== f)); return this; }
  emit(e, ...a) { for (const f of this.h.get(e) || []) f(...a); return true; }
  removeAllListeners() { this.h.clear(); return this; }
}
export const RoomEvent = new Proxy({}, { get: (_, k) => String(k) });
export const ConnectionState = { Disconnected: 'disconnected', Connecting: 'connecting', Connected: 'connected', Reconnecting: 'reconnecting' };
export const Track = {
  Source: { Microphone: 'microphone', Camera: 'camera', ScreenShare: 'screen_share', ScreenShareAudio: 'screen_share_audio', Unknown: 'unknown' },
  Kind: { Audio: 'audio', Video: 'video', Unknown: 'unknown' },
};
export async function createLocalTracks() { return []; }
class Local extends Emitter {
  constructor() { super(); this.identity = ''; this.name = ''; this.attributes = {}; this.trackPublications = new Map(); this.isMicrophoneEnabled = false; this.isCameraEnabled = false; this.isScreenShareEnabled = false; }
  async setAttributes(a) { Object.assign(this.attributes, a); }
  async setName(n) { this.name = n; }
  async setMicrophoneEnabled() { return undefined; }
  async setCameraEnabled() { return undefined; }
  async setScreenShareEnabled() { return undefined; }
  async publishData() {}
  async publishTrack() { return undefined; }
  async unpublishTrack() {}
  async sendText() {}
  async sendChatMessage() {}
  async sendFile() {}
  getTrackPublication() { return undefined; }
}
export class Room extends Emitter {
  constructor() { super(); this.state = 'disconnected'; this.remoteParticipants = new Map(); this.localParticipant = new Local(); this.name = ''; this.numParticipants = 1; }
  async connect(_url, token) {
    let who = {};
    try { who = JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { /* a token the stub cannot read: anonymous */ }
    this.localParticipant.identity = who.sub || who.identity || 'someone';
    this.localParticipant.name = who.name || '';
    this.localParticipant.attributes = { ...(who.attributes || {}) };
    this.state = 'connected';
    this.emit('connected');
    // Others on the call, for a picture of the tiles: localStorage 'shots.call.people' (a number) adds that many, with no
    // media (each tile shows its placeholder). Unset, nobody else is in the call.
    const others = Number(globalThis.localStorage?.getItem('shots.call.people') || 0);
    for (let i = 1; i <= others; i++) {
      const p = new RemoteParticipant(`stand-in-${i}`, `Player ${i}`);
      this.remoteParticipants.set(p.identity, p);
      this.emit('ParticipantConnected', p);
    }
  }
  async disconnect() { if (this.state === 'disconnected') return; this.state = 'disconnected'; this.emit('disconnected'); }
  registerByteStreamHandler() {}
  registerTextStreamHandler() {}
  async startAudio() {}
  switchActiveDevice() { return Promise.resolve(true); }
}
export class RemoteParticipant extends Emitter {
  constructor(identity = '', name = '') { super(); this.identity = identity; this.name = name; this.attributes = {}; this.trackPublications = new Map(); this.isSpeaking = false; this.isMicrophoneEnabled = false; this.isCameraEnabled = false; this.isScreenShareEnabled = false; this.audioLevel = 0; }
  getTrackPublication() { return undefined; }
  setVolume() {}
}
export class LocalVideoTrack {}
export class LocalAudioTrack {}
export const VideoPresets = {};
export const ScreenSharePresets = {};
export default { Room, RoomEvent, Track };
