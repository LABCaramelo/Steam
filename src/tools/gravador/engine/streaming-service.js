/** WHIP browser publishing. Tokens are kept only in the active session. */
export function validateWhipEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Informe um endpoint WHIP HTTPS válido.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('O endpoint WHIP precisa usar HTTPS, sem credenciais na URL.');
  return url.href;
}

export class StreamingService {
  constructor(compositor, audioEngine) {
    this.compositor = compositor;
    this.audioEngine = audioEngine;
    this.isStreaming = false;
    this.isConnecting = false;
    this.elapsedTime = 0;
    this.bitrate = 0;
    this.droppedFrames = 0;
    this.onStateChange = null;
    this.onStatsUpdate = null;
    this.onError = null;
    this.session = null;
    this.destroyed = false;
  }

  async startStreaming(config = {}) {
    if (this.destroyed || this.session) return false;
    let session;
    try {
      const endpoint = validateWhipEndpoint(typeof config === 'string' ? config : config.endpoint);
      if (!globalThis.RTCPeerConnection) throw new Error('WebRTC não está disponível neste navegador.');
      session = { endpoint, token: typeof config.token === 'string' ? config.token.trim() : '', controller: new AbortController(), tracks: new Set(), pc: null, resource: null, timer: null, timeout: null, cancelled: false, starting: true, closed: false };
      this.session = session;
      this.isConnecting = true;
      session.timeout = setTimeout(() => session.controller.abort(), 20000);
      const pc = new RTCPeerConnection({ iceServers: config.iceServers || [] });
      session.pc = pc;
      const canvasStream = this.compositor.getStream();
      canvasStream?.getTracks().forEach(track => session.tracks.add(track));
      if (!canvasStream?.getVideoTracks().length) throw new Error('Não há vídeo disponível para transmitir.');
      const tracks = [...canvasStream.getVideoTracks()];
      this.audioEngine.getMixedAudioStream()?.getAudioTracks().forEach(track => {
        const clone = track.clone(); session.tracks.add(clone); tracks.push(clone);
      });
      const stream = new MediaStream(tracks);
      tracks.forEach(track => pc.addTransceiver(track, { direction: 'sendonly', streams: [stream] }));
      const offer = await pc.createOffer();
      if (session.cancelled) throw new DOMException('Transmissão cancelada.', 'AbortError');
      await pc.setLocalDescription(offer);
      await this._waitFor(pc, 'icegatheringstatechange', () => pc.iceGatheringState === 'complete', session.controller.signal);
      if (session.cancelled) throw new DOMException('Transmissão cancelada.', 'AbortError');
      const headers = { 'Content-Type': 'application/sdp', Accept: 'application/sdp' };
      if (session.token) headers.Authorization = 'Bearer ' + session.token;
      const response = await fetch(endpoint, { method: 'POST', headers, body: pc.localDescription.sdp, signal: session.controller.signal, credentials: 'omit', redirect: 'error' });
      const location = response.headers.get('Location');
      if (location) {
        const resource = new URL(location, endpoint);
        // Never forward bearer credentials to another server.
        if (resource.protocol === 'https:' && resource.origin === new URL(endpoint).origin && !resource.username && !resource.password && !resource.hash) session.resource = resource.href;
      }
      if (response.status !== 201) throw new Error('O servidor WHIP recusou a publicação (HTTP ' + response.status + ').');
      if (!session.resource) throw new Error('O servidor WHIP não retornou uma URL de sessão HTTPS válida.');
      const answer = await response.text();
      if (!answer.trim().startsWith('v=0')) throw new Error('O servidor WHIP retornou uma resposta SDP inválida.');
      if (session.cancelled) throw new Error('Transmissão cancelada.');
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      await this._waitFor(pc, 'connectionstatechange', () => pc.connectionState === 'connected', session.controller.signal, () => pc.connectionState === 'failed' || pc.connectionState === 'closed');
      if (this.session !== session || session.cancelled) throw new Error('Transmissão cancelada.');
      clearTimeout(session.timeout);
      session.starting = false;
      this.isConnecting = false;
      this.isStreaming = true;
      this.startTime = performance.now();
      this.elapsedTime = 0;
      pc.addEventListener('connectionstatechange', () => {
        if (this.session === session && pc.connectionState === 'failed') {
          void this.stopStreaming();
          this.onError?.(new Error('A conexão com o servidor de transmissão foi perdida.'));
        }
      });
      session.timer = setInterval(() => { void this._stats(session); }, 1000);
      this.onStateChange?.(true);
      return true;
    } catch (error) {
      if (session) { session.starting = false; await this._cleanup(session); }
      // A cancelled handshake may settle after the next publication has started.
      if (this.session === session || !session) {
        this.session = null;
        this.isConnecting = false;
        this.isStreaming = false;
        this.onStateChange?.(false);
      }
      if (!session?.cancelled && !this.destroyed) this.onError?.(error?.name === 'AbortError' ? new Error('O servidor WHIP demorou demais para responder.') : error);
      return false;
    }
  }

  _waitFor(target, event, done, signal, failed = () => false) {
    return new Promise((resolve, reject) => {
      const cleanup = () => { target.removeEventListener(event, check); signal.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(new DOMException('Operação cancelada', 'AbortError')); };
      const check = () => {
        if (signal.aborted) return abort();
        if (failed()) { cleanup(); reject(new Error('Não foi possível estabelecer a conexão WebRTC.')); }
        else if (done()) { cleanup(); resolve(); }
      };
      target.addEventListener(event, check);
      signal.addEventListener('abort', abort, { once: true });
      check();
    });
  }

  async _stats(session) {
    if (this.session !== session || !this.isStreaming) return;
    this.elapsedTime = Math.floor((performance.now() - this.startTime) / 1000);
    try {
      const reports = await session.pc.getStats();
      if (this.session !== session || !this.isStreaming) return;
      let bytes = 0, dropped = 0;
      reports.forEach(report => {
        if (report.type === 'outbound-rtp' && !report.isRemote) { bytes += report.bytesSent || 0; dropped += report.framesDropped || 0; }
      });
      const now = performance.now();
      this.bitrate = session.lastStats ? Math.max(0, Math.round((bytes - session.lastStats.bytes) * 8 / (now - session.lastStats.at))) : 0;
      session.lastStats = { bytes, at: now };
      this.droppedFrames = dropped;
      if (this.session === session) this.onStatsUpdate?.({ time: this.getFormattedTime(), bitrate: this.bitrate, droppedFrames: dropped });
    } catch { /* A closing peer connection has no further stats. */ }
  }

  async _cleanup(session) {
    session.controller.abort();
    clearTimeout(session.timeout);
    clearInterval(session.timer);
    if (!session.closed) { session.closed = true; session.pc?.close(); }
    session.tracks.forEach(track => track.stop());
    session.tracks.clear();
    const resource = session.resource;
    session.resource = null;
    if (resource) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const headers = session.token ? { Authorization: 'Bearer ' + session.token } : {};
        await fetch(resource, { method: 'DELETE', headers, signal: controller.signal, credentials: 'omit', redirect: 'error', keepalive: true });
      } catch { /* The server also expires abandoned resources. */ }
      finally { clearTimeout(timeout); }
    }
    // Keep credentials until an in-flight POST settles so a late resource can be deleted.
    if (!session.starting) session.token = '';
  }

  async stopStreaming() {
    const session = this.session;
    this.session = null;
    this.isConnecting = false;
    this.isStreaming = false;
    this.bitrate = 0;
    this.onStateChange?.(false);
    if (session) { session.cancelled = true; await this._cleanup(session); }
  }

  getFormattedTime() {
    const seconds = this.elapsedTime;
    return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
  }

  async destroy() {
    this.destroyed = true;
    await this.stopStreaming();
    this.onStateChange = null; this.onStatsUpdate = null; this.onError = null;
  }
}
