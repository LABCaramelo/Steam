import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RecordingService, selectRecordingMime } from './recording-service.js';
import { StreamingService, validateWhipEndpoint } from './streaming-service.js';
import { AudioEngine } from './audio-engine.js';
import { SourceFactory } from '../sources/source-factory.js';
import { SourceItem } from '../sources/source-item.js';

const replacedGlobals = new WeakMap();
function replace(t, key, value) {
  let originals = replacedGlobals.get(t);
  if (!originals) { originals = new Map(); replacedGlobals.set(t, originals); }
  if (!originals.has(key)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    originals.set(key, descriptor);
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

class Track extends EventTarget {
  constructor(kind) { super(); this.kind = kind; this.stops = 0; this.clones = []; }
  stop() { this.stops++; }
  clone() { const track = new Track(this.kind); this.clones.push(track); return track; }
}

class Stream {
  constructor(tracks = []) { this.tracks = [...tracks]; }
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter(track => track.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter(track => track.kind === 'audio'); }
}

class Recorder {
  static fail = false;
  static isTypeSupported(type) { return type.startsWith('video/webm;codecs=vp8'); }
  constructor(stream, options) {
    if (Recorder.fail) throw new Error('codec initialization failed');
    this.stream = stream; this.mimeType = options.mimeType; this.state = 'inactive';
  }
  start() { this.state = 'recording'; }
  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['video'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

function recordingFixture(t) {
  let now = 0;
  replace(t, 'performance', { now: () => now });
  replace(t, 'MediaStream', Stream);
  replace(t, 'MediaRecorder', Recorder);
  replace(t, 'setInterval', () => 1);
  replace(t, 'clearInterval', () => {});
  replace(t, 'setTimeout', () => 1);
  const links = [];
  replace(t, 'document', { createElement: () => { const link = { click() {} }; links.push(link); return link; } });
  const video = new Track('video');
  const audio = new Track('audio');
  const service = new RecordingService({ getStream: () => new Stream([video]) }, { getMixedAudioStream: () => new Stream([audio]) });
  return { service, video, audio, links, now: value => { now = value; } };
}

test('recording chooses supported fallback and file extension matches actual MIME', t => {
  const { service, video, audio, links } = recordingFixture(t);
  let exported;
  service.onExport = value => { exported = value; };
  assert.equal(service.startRecording(), true);
  assert.match(service.currentMimeType, /^video\/webm/);
  service.stopRecording();
  assert.match(links[0].download, /\.webm$/);
  assert.equal(exported.mimeType, exported.blob.type);
  assert.match(exported.filename, /\.webm$/);
  assert.equal(video.stops, 1);
  assert.equal(audio.stops, 0, 'shared mixed audio remains available');
  assert.equal(audio.clones[0].stops, 1);
  service.destroy();
});

test('recording excludes paused duration and does not report success after codec failure', t => {
  const { service, video, audio, now } = recordingFixture(t);
  assert.equal(service.startRecording(), true);
  now(2500);
  assert.equal(service.pauseRecording(), true);
  now(8500);
  service._tick();
  assert.equal(service.elapsedTime, 2);
  assert.equal(service.pauseRecording(), true);
  now(10000);
  service._tick();
  assert.equal(service.elapsedTime, 4);
  service.destroy();
  assert.equal(video.stops, 1);
  assert.equal(audio.clones[0].stops, 1);
  const second = recordingFixture(t);
  Recorder.fail = true;
  t.after(() => { Recorder.fail = false; });
  let error;
  second.service.onError = value => { error = value; };
  assert.equal(second.service.startRecording(), false);
  assert.equal(second.service.isRecording, false);
  assert.ok(error);
  assert.equal(second.video.stops, 1);
  assert.equal(second.audio.clones[0].stops, 1);
});

test('recording finalizes an inactive recorder and remains reusable after a download failure', t => {
  const { service, video } = recordingFixture(t);
  service.startRecording();
  const recorder = service.mediaRecorder;
  recorder.ondataavailable({ data: new Blob(['partial']) });
  recorder.state = 'inactive';
  document.createElement = () => { throw new Error('download unavailable'); };
  let error;
  service.onError = value => { error = value; };
  assert.equal(service.pauseRecording(), false);
  assert.equal(service.stopRecording(), true);
  assert.match(error.message, /download/);
  assert.equal(service.finalizing, false);
  assert.equal(service.mediaRecorder, null);
  assert.equal(video.stops, 1);
  assert.equal(service.startRecording(), true);
  service.destroy();
});

test('no supported codec fails before capture resources are acquired', () => {
  assert.throws(() => selectRecordingMime('mp4', { isTypeSupported: () => false }), /codec/);
});

class Peer extends EventTarget {
  static instances = [];
  constructor() { super(); this.iceGatheringState = 'complete'; this.connectionState = 'new'; this.transceivers = []; this.closed = false; Peer.instances.push(this); }
  addTransceiver(track, options) { this.transceivers.push({ track, options }); }
  async createOffer() { return { type: 'offer', sdp: 'v=0\r\ns=offer\r\n' }; }
  async setLocalDescription(description) { this.localDescription = description; }
  async setRemoteDescription(description) { this.remoteDescription = description; this.connectionState = 'connected'; this.dispatchEvent(new Event('connectionstatechange')); }
  async getStats() { return new Map([['video', { type: 'outbound-rtp', bytesSent: 1000, framesDropped: 2 }]]); }
  close() { this.closed = true; this.connectionState = 'closed'; }
}

function whipFixture(t, responder) {
  let service;
  // Teardown must run before global fetch is restored, including when an assertion fails.
  t.after(() => service?.destroy());
  replace(t, 'MediaStream', Stream);
  replace(t, 'RTCPeerConnection', Peer);
  const requests = [];
  replace(t, 'fetch', async (url, options) => {
    requests.push({ url, ...options });
    return responder ? responder(url, options) : options.method === 'DELETE'
      ? new Response(null, { status: 204 })
      : new Response('v=0\r\ns=answer\r\n', { status: 201, headers: { Location: '/session/42', 'Content-Type': 'application/sdp' } });
  });
  const video = new Track('video');
  const audio = new Track('audio');
  service = new StreamingService({ getStream: () => new Stream([video]) }, { getMixedAudioStream: () => new Stream([audio]) });
  return { service, video, audio, requests };
}

test('WHIP negotiates SDP, publishes sendonly, reports actual stats and DELETEs its session', async t => {
  const { service, video, audio, requests } = whipFixture(t);
  assert.equal(await service.startStreaming({ endpoint: 'https://ingest.example/whip', token: 'session-token' }), true);
  assert.equal(service.isStreaming, true);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].headers['Content-Type'], 'application/sdp');
  assert.equal(requests[0].headers.Authorization, 'Bearer session-token');
  assert.match(requests[0].body, /^v=0/);
  const session = service.session;
  assert.equal(session.pc.transceivers.length, 2);
  assert.ok(session.pc.transceivers.every(value => value.options.direction === 'sendonly'));
  let stats;
  service.onStatsUpdate = value => { stats = value; };
  await service._stats(session);
  assert.equal(stats.droppedFrames, 2);
  await service.stopStreaming();
  assert.equal(requests[1].method, 'DELETE');
  assert.equal(requests[1].url, 'https://ingest.example/session/42');
  assert.equal(session.token, '');
  assert.equal(session.pc.closed, true);
  assert.equal(video.stops, 1);
  assert.equal(audio.stops, 0);
  assert.equal(audio.clones[0].stops, 1);
});

test('WHIP rejects HTTP, refuses external Location and cleans up failed sessions', async t => {
  assert.throws(() => validateWhipEndpoint('rtmp://ingest.example/live'), /HTTPS/);
  assert.throws(() => validateWhipEndpoint('https://user:secret@ingest.example/whip'), /HTTPS/);
  const { service, video, requests } = whipFixture(t, () => new Response('v=0\r\n', { status: 201, headers: { Location: 'https://other.example/session' } }));
  let error;
  service.onError = value => { error = value; };
  assert.equal(await service.startStreaming({ endpoint: 'https://ingest.example/whip', token: 'session-token' }), false);
  assert.equal(service.isStreaming, false);
  assert.match(error.message, /sessão/);
  assert.equal(requests.length, 1, 'never send a credential to a cross-origin Location');
  assert.equal(video.stops, 1);
});

test('WHIP cancellation aborts POST and releases all owned tracks', async t => {
  let begun;
  const ready = new Promise(resolve => { begun = resolve; });
  const { service, video, audio } = whipFixture(t, (_url, options) => new Promise((_resolve, reject) => {
    begun();
    options.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')));
  }));
  const starting = service.startStreaming({ endpoint: 'https://ingest.example/whip' });
  await ready;
  await service.stopStreaming();
  assert.equal(await starting, false);
  assert.equal(video.stops, 1);
  assert.equal(audio.clones[0].stops, 1);
  assert.equal(service.isStreaming, false);
});

test('a cancelled WHIP POST settling late deletes its resource without resetting the next publication', async t => {
  let respond;
  let begun;
  const ready = new Promise(resolve => { begun = resolve; });
  let posts = 0;
  const { service, requests } = whipFixture(t, (_url, options) => {
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    if (++posts === 1) {
      begun();
      // Emulate a response already received by the network when cancellation happens.
      return new Promise(resolve => { respond = resolve; });
    }
    return new Response('v=0\r\ns=answer\r\n', { status: 201, headers: { Location: '/session/new' } });
  });
  const previous = service.startStreaming({ endpoint: 'https://ingest.example/whip', token: 'old-token' });
  await ready;
  const old = service.session;
  await service.stopStreaming();
  assert.equal(await service.startStreaming({ endpoint: 'https://ingest.example/whip', token: 'new-token' }), true);
  const current = service.session;
  respond(new Response('v=0\r\ns=answer\r\n', { status: 201, headers: { Location: '/session/old' } }));
  assert.equal(await previous, false);
  assert.equal(service.session, current);
  assert.equal(service.isStreaming, true);
  const cleanup = requests.find(request => request.method === 'DELETE' && request.url.endsWith('/old'));
  assert.equal(cleanup.headers.Authorization, 'Bearer old-token');
  assert.equal(old.token, '');
});

test('cancellation during offer generation never publishes SDP', async t => {
  let resolveOffer;
  class SlowPeer extends Peer {
    createOffer() { return new Promise(resolve => { resolveOffer = resolve; }); }
  }
  const { service, requests } = whipFixture(t);
  replace(t, 'RTCPeerConnection', SlowPeer);
  const starting = service.startStreaming({ endpoint: 'https://ingest.example/whip' });
  await service.stopStreaming();
  resolveOffer({ type: 'offer', sdp: 'v=0\r\n' });
  assert.equal(await starting, false);
  assert.equal(requests.length, 0);
});

test('late stats from a stopped WHIP peer cannot overwrite a new publication', async t => {
  const { service } = whipFixture(t);
  await service.startStreaming({ endpoint: 'https://ingest.example/whip' });
  const previous = service.session;
  let respond;
  previous.pc.getStats = () => new Promise(resolve => { respond = resolve; });
  const stats = service._stats(previous);
  await service.stopStreaming();
  await service.startStreaming({ endpoint: 'https://ingest.example/whip' });
  service.bitrate = 5000;
  respond(new Map([['video', { type: 'outbound-rtp', bytesSent: 1000, framesDropped: 99 }]]));
  await stats;
  assert.equal(service.bitrate, 5000);
  assert.equal(service.droppedFrames, 0);
});

test('factory reports capture denial and stops a capture arriving after teardown', async t => {
  let resolveCapture;
  const capture = new Promise(resolve => { resolveCapture = resolve; });
  replace(t, 'navigator', { mediaDevices: { getUserMedia: () => capture } });
  const factory = new SourceFactory(null);
  const pending = factory.createAudioInput();
  factory.destroy();
  const track = new Track('audio');
  resolveCapture(new Stream([track]));
  await assert.rejects(pending, /cancelada/);
  assert.equal(track.stops, 1);
  const denied = new SourceFactory(null);
  let error;
  denied.onError = value => { error = value; };
  navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('permission denied', 'NotAllowedError'); };
  assert.equal(await denied.createSource('mic'), null);
  assert.equal(error.name, 'NotAllowedError');
  denied.destroy();
});

test('source teardown releases stream and URL exactly once', t => {
  const track = new Track('video');
  const stream = new Stream([track]);
  let revoked = 0;
  t.mock.method(URL, 'revokeObjectURL', () => { revoked++; });
  const source = new SourceItem({ type: 'video', props: { stream, objectUrl: 'blob:test', videoElement: { srcObject: stream, pause() {}, load() {}, removeAttribute() {} } } });
  source.destroy();
  source.destroy();
  assert.equal(track.stops, 1);
  assert.equal(revoked, 1);
});

function fileFixture(t, audioEngine = null) {
  const images = [], videos = [], revoked = [];
  let nextUrl = 0;
  class ImageMock {
    constructor() { images.push(this); this.naturalWidth = 1920; this.naturalHeight = 1080; }
    removeAttribute() { this.src = ''; }
  }
  replace(t, 'Image', ImageMock);
  replace(t, 'document', { createElement: () => {
    const video = { videoWidth: 1280, videoHeight: 720, plays: 0, pauses: 0, muted: false,
      play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; },
      removeAttribute() { this.src = ''; }, load() {},
    };
    videos.push(video);
    return video;
  } });
  t.mock.method(URL, 'createObjectURL', () => `blob:file-${++nextUrl}`);
  t.mock.method(URL, 'revokeObjectURL', url => { revoked.push(url); });
  const factory = new SourceFactory(audioEngine);
  t.after(() => factory.destroy());
  return { factory, images, videos, revoked };
}

test('local image replacement preserves the previous image on errors and cleans up on successful replacement', async t => {
  const { factory, images, revoked } = fileFixture(t);
  const source = factory.createImageSource('Imagem');
  const first = factory.loadMediaFile(source, { type: 'image/png' });
  images[0].onload();
  assert.equal(await first, source);
  assert.equal(source.props.objectUrl, 'blob:file-1');
  assert.equal(source.width, 1920);
  const invalid = factory.loadMediaFile(source, { type: 'image/png' });
  const failure = assert.rejects(invalid, /imagem/);
  images[1].onerror();
  await failure;
  assert.equal(source.props.imageElement, images[0]);
  assert.equal(source.props.objectUrl, 'blob:file-1');
  assert.deepEqual(revoked, ['blob:file-2']);
  const replacement = factory.loadMediaFile(source, { type: 'image/jpeg' });
  images[2].naturalWidth = 9000;
  images[2].onload();
  await replacement;
  assert.equal(source.props.imageElement, images[2]);
  assert.equal(source.width, 8192);
  assert.deepEqual(revoked, ['blob:file-2', 'blob:file-1']);
  source.destroy();
  assert.deepEqual(revoked, ['blob:file-2', 'blob:file-1', 'blob:file-3']);
  assert.equal(factory.sources.has(source), false);
});

test('new local-file requests and teardown cancel pending decodes without retaining blob URLs', async t => {
  const { factory, images, revoked } = fileFixture(t);
  const source = factory.createImageSource();
  const pending = assert.rejects(factory.loadMediaFile(source, { type: 'image/png' }), { name: 'AbortError' });
  const staleLoad = images[0].onload;
  const next = assert.rejects(factory.loadMediaFile(source, { type: 'image/png' }), { name: 'AbortError' });
  await pending;
  staleLoad();
  assert.equal(source.props.imageElement, null);
  factory.destroy();
  await next;
  assert.deepEqual(revoked, ['blob:file-1', 'blob:file-2']);
  assert.equal(factory.sources.size, 0);
});

test('video replacement releases old mixer and element only after the new file can play', async t => {
  const calls = [];
  const audio = {
    ensureContext() {},
    removeSourceAudio(id) { calls.push(['remove', id]); },
    attachMediaElement(source, element) { calls.push(['attach', source.id, element]); source.hasAudio = true; element.muted = false; return true; },
  };
  const { factory, videos, revoked } = fileFixture(t, audio);
  const source = factory.createMediaSource();
  assert.equal(source.hasAudio, false);
  const first = factory.loadMediaFile(source, { type: 'video/webm' });
  videos[0].onloadedmetadata();
  await first;
  const previous = videos[0];
  const second = factory.loadMediaFile(source, { type: 'video/mp4' });
  assert.equal(previous.pauses, 0);
  assert.equal(source.props.videoElement, previous);
  assert.equal(videos[1].muted, true, 'staged videos cannot reach the speakers');
  videos[1].onloadedmetadata();
  await second;
  assert.equal(previous.pauses, 1);
  assert.equal(previous.src, '');
  assert.equal(source.props.videoElement, videos[1]);
  assert.equal(source.hasAudio, true);
  assert.deepEqual(revoked, ['blob:file-1']);
  assert.equal(calls.filter(call => call[0] === 'attach').length, 2);
});

test('source text draws separate centered lines that fit within its dimensions', () => {
  const draws = [];
  const ctx = { font: '', measureText(text) { return { width: text.length * parseFloat(this.font) * 0.6 }; }, fillText(...args) { draws.push(args); } };
  const source = new SourceItem({ type: 'text', width: 300, height: 160, props: { text: 'JÁ VAI\nCOMEÇAR.', fontSize: 96, font: 'sans-serif' } });
  source._renderText(ctx, 0);
  assert.equal(draws.length, 2);
  assert.equal(draws[0][0], 'JÁ VAI');
  assert.equal(draws[1][0], 'COMEÇAR.');
  assert.ok(draws.every(([_text, x, y]) => x >= 0 && y > 0 && y < source.height));
  assert.ok(parseFloat(ctx.font) < 96);
});

function param(value = 0) { return { value, setTargetAtTime(next) { this.value = next; } }; }
function node() {
  return { connections: [], gain: param(1), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), delayTime: param(),
    connect(target) { this.connections.push(target); }, disconnect() { this.disconnected = true; },
    getFloatTimeDomainData(array) { array.fill(this.sample || 0); }, frequencyBinCount: 256 };
}
class AudioContextMock {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = node(); this.output = new Track('audio'); this.closed = false; }
  createGain() { return node(); }
  createBiquadFilter() { return node(); }
  createDynamicsCompressor() { return node(); }
  createDelay() { return node(); }
  createAnalyser() { return node(); }
  createMediaStreamSource() { return node(); }
  createMediaElementSource() { return node(); }
  createMediaStreamDestination() { return { ...node(), stream: new Stream([this.output]) }; }
  async close() { this.closed = true; }
}

test('audio has no speaker monitoring by default, scopes scene audio, reopens gate and tears down', t => {
  replace(t, 'window', { AudioContext: AudioContextMock });
  const audio = new AudioEngine();
  t.after(() => audio.destroy());
  const source = new SourceItem({ id: 'mic', type: 'mic', audioFilters: [{ type: 'noiseGate', enabled: true, closeThreshold: -38, openThreshold: -32 }] });
  assert.equal(audio.attachSourceAudio(source, new Stream([new Track('audio')])), true);
  const ctx = audio.ctx;
  assert.equal(audio.masterGain.connections.includes(ctx.destination), false);
  audio.syncActiveSources([]);
  assert.equal(audio.channels.get('mic').faderGainNode.gain.value, 0);
  const previewSource = new SourceItem({ id: 'preview-mic', type: 'mic' });
  audio.attachSourceAudio(previewSource, new Stream([new Track('audio')]));
  assert.equal(audio.channels.get(previewSource.id).faderGainNode.gain.value, 0, 'preview-only inputs begin muted before their graph connects');
  audio.syncActiveSources([source]);
  assert.equal(audio.channels.get('mic').faderGainNode.gain.value, 1);
  audio.getAudioLevels('mic');
  assert.equal(audio.channels.get('mic').gateIsOpen, false);
  audio.channels.get('mic').gateAnalyserNode.sample = 0.5;
  audio.getAudioLevels('mic');
  assert.equal(audio.channels.get('mic').gateIsOpen, true, 'gate uses signal before the gate, so it can reopen');
  assert.deepEqual(audio.getAudioLevels('missing'), { rmsDb: -60, peakDb: -60, linear: 0 });
  audio.destroy();
  assert.equal(ctx.closed, true);
  assert.equal(ctx.output.stops, 1);
  assert.equal(audio.channels.size, 0);
});

test('file playback stays muted when Web Audio cannot attach it', t => {
  replace(t, 'window', {});
  const audio = new AudioEngine();
  const element = { muted: false };
  assert.equal(audio.attachMediaElement(new SourceItem({ type: 'video' }), element), false);
  assert.equal(element.muted, true);
  audio.destroy();
});
