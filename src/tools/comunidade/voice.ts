import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type AudioCaptureOptions, type Participant } from 'livekit-client';
import { blobToDataUrl, captureAttachmentSession, dataUrlToBlob, deleteBlobs, safeType, storeFiles } from './attachments';
import { ME, users } from './data';
import type { Profile, Settings, VoiceConnection } from './store';
import type { Attachment, Message, User } from './types';

/* ---------------------------------------------------------------- tipos */

export interface VoiceMember {
  identity: string;
  name: string;
  /** Cor escolhida no perfil de quem está na sala, se houver. */
  color?: string;
  isLocal: boolean;
  speaking: boolean;
  micMuted: boolean;
  camera: Track | null;
  screen: Track | null;
}

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface VoiceSession {
  status: VoiceStatus;
  /** Falha de conexão (a sala não funciona). */
  error: string | null;
  /** Problema com um dispositivo ou com um envio; a conexão continua. */
  deviceError: string | null;
  members: VoiceMember[];
  cameraOn: boolean;
  screenOn: boolean;
  /** O navegador bloqueou a reprodução de áudio até um clique. */
  audioBlocked: boolean;
  toggleCamera: () => void;
  toggleScreen: () => void;
  startAudio: () => void;
  retry: () => void;
  /** Envia uma mensagem (e arquivos) no chat de texto da sala. */
  sendChat: (content: string, files: File[]) => Promise<void>;
  /** Apaga uma mensagem sua do chat da sala, para todos. */
  deleteChat: (messageId: string) => void;
}

/**
 * Liga o chat da sala às mensagens guardadas no app: o histórico do canal atual,
 * para repassar a quem entrar depois, e onde gravar o que chega.
 */
export interface VoiceChatStore {
  history: Message[];
  receive: (channelId: string, messages: Message[]) => void;
  remove: (channelId: string, messageId: string) => void;
}

/** Quem está em cada canal de voz (chave: id do canal), segundo o servidor. */
export type Occupancy = Record<string, { identity: string; name: string; color?: string }[]>;

/* ---------------------------------------------------------------- utilidades */

export const PALETTE = ['#5865f2', '#eb459e', '#f0b232', '#23a55a', '#00a8fc', '#f23f43', '#9b59b6', '#e67e22'];
const COLOR = /^#[0-9a-f]{6}$/i;

/** Cor estável por pessoa, igual em todos os navegadores. */
export function colorFor(identity: string) {
  let h = 0;
  for (const c of identity) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function memberUser(m: { identity: string; name: string; color?: string }): User {
  return { id: m.identity, name: m.name, color: m.color ?? colorFor(m.identity), status: 'online' };
}

/** Sons curtos, sintetizados para não depender de arquivos de áudio. */
export function playVoiceSound(kind: 'join' | 'leave' | 'message') {
  try {
    const ctx = new AudioContext();
    const notes = kind === 'join' ? [523.25, 783.99] : kind === 'leave' ? [783.99, 523.25] : [987.77];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.09;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === 'message' ? 0.08 : 0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // sem Web Audio: segue sem som
  }
}

/** Opções do microfone conforme as Configurações de voz. */
export function captureOptions(s: Settings): AudioCaptureOptions {
  return {
    deviceId: s.inputDevice || undefined,
    echoCancellation: s.echoCancellation,
    noiseSuppression: s.noiseSuppression,
    autoGainControl: s.autoGainControl,
  };
}

function errorMessage(status: number, code?: string) {
  if (status === 503 || code === 'not_configured') {
    return 'Servidor de voz não configurado: defina LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET.';
  }
  return `Não foi possível entrar na sala (erro ${status}).`;
}

function publishedTrack(p: Participant, source: Track.Source) {
  const pub = p.getTrackPublication(source);
  return pub && !pub.isMuted && pub.track ? pub.track : null;
}

function snapshot(room: Room): VoiceMember[] {
  const all: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
  return all.map((p) => {
    const color = p.attributes?.color;
    return {
      identity: p.identity,
      name: p.name || p.identity,
      color: color && COLOR.test(color) ? color : undefined,
      isLocal: p === room.localParticipant,
      speaking: p.isSpeaking,
      micMuted: !p.isMicrophoneEnabled,
      camera: publishedTrack(p, Track.Source.Camera),
      screen: publishedTrack(p, Track.Source.ScreenShare),
    };
  });
}

/* ---------------------------------------------------------------- chat da sala */

/*
 * O chat das salas de voz não tem servidor próprio: as mensagens vão pela sala do LiveKit
 * para quem está nela. Quem entra pede o histórico, e uma só pessoa da sala responde.
 * Localmente suas mensagens usam o autor ME, como nos canais de texto; na rede, o seu id.
 * Arquivos vão junto da mensagem, como data URL.
 */
const CHAT_TOPIC = 'chat';
const CHAT_HISTORY_LIMIT = 100;
const CHAT_MAX_LENGTH = 4000;
/** Quanto de arquivos o histórico carrega para quem chega (as mensagens mais novas primeiro). */
const HISTORY_FILE_BYTES = 15 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 15 * 1024 * 1024;

type WireAttachment = Attachment & { data?: string };
type WireMessage = Omit<Message, 'attachments'> & { attachments?: WireAttachment[] };

type ChatPacket =
  | { type: 'message'; message: WireMessage }
  | { type: 'delete'; id: string }
  | { type: 'history-request' }
  | { type: 'history'; messages: WireMessage[] };

function sendChatPacket(room: Room, packet: ChatPacket, to?: string[]) {
  return room.localParticipant.sendText(JSON.stringify(packet), { topic: CHAT_TOPIC, destinationIdentities: to });
}

const dimension = (v: unknown) => (typeof v === 'number' && v > 0 && v < 100_000 ? Math.round(v) : undefined);

function parseAttachment(raw: unknown): WireAttachment | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, name, type, size, width, height, data } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) return null;
  if (typeof name !== 'string' || typeof type !== 'string' || typeof size !== 'number') return null;
  return {
    id,
    name: name.slice(0, 128),
    type: safeType(type),
    size,
    width: dimension(width),
    height: dimension(height),
    data: typeof data === 'string' && data.length <= MAX_DATA_URL_LENGTH ? data : undefined,
  };
}

/** Valida uma mensagem vinda de outra pessoa. */
function parseChatMessage(raw: unknown, profileId: string): WireMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, authorId, authorName, authorColor, content, timestamp, attachments } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || typeof authorId !== 'string' || typeof content !== 'string') return null;
  if (typeof timestamp !== 'number') return null;
  // Ninguém se passa por alguém do diretório local nem por você. Suas mensagens já estão
  // guardadas aqui, e as que você apagou não voltam pelo histórico de outra pessoa.
  if (authorId in users || authorId === profileId) return null;
  const files = Array.isArray(attachments)
    ? attachments.slice(0, 10).map(parseAttachment).filter((a): a is WireAttachment => !!a)
    : [];
  if (!content.trim() && !files.length) return null;
  return {
    id: id.slice(0, 64),
    authorId,
    authorName: typeof authorName === 'string' ? authorName.slice(0, 32) : undefined,
    authorColor: typeof authorColor === 'string' && COLOR.test(authorColor) ? authorColor : undefined,
    content: content.slice(0, CHAT_MAX_LENGTH),
    // Um relógio adiantado não joga a mensagem para o fim da conversa.
    timestamp: Math.min(timestamp, Date.now()),
    attachments: files.length ? files : undefined,
  };
}

/** Guarda os arquivos que vieram junto e devolve a mensagem como o app a armazena. */
async function materialize(m: WireMessage): Promise<Message> {
  const session = captureAttachmentSession();
  const attachments = await Promise.all(
    (m.attachments ?? []).map(async ({ data, ...a }) => {
      // Nunca sobrescreve um arquivo que já existe aqui com o mesmo id.
      if (data && !(await session.load(a.id))) {
        await dataUrlToBlob(data, a.type)
          .then((blob) => session.save(a.id, blob))
          .catch(() => {});
      }
      return a;
    }),
  );
  return { ...m, attachments: attachments.length ? attachments : undefined };
}

async function toWire(m: Message, profile: Profile, budget = { left: Infinity }): Promise<WireMessage> {
  const session = captureAttachmentSession();
  const base = m.authorId === ME ? { ...m, authorId: profile.id, authorName: profile.name, authorColor: profile.color } : m;
  if (!m.attachments?.length) return base;
  const attachments = await Promise.all(
    m.attachments.map(async (a): Promise<WireAttachment> => {
      const blob = a.size <= budget.left ? await session.load(a.id) : undefined;
      if (!blob) return a;
      budget.left -= blob.size;
      return { ...a, data: await blobToDataUrl(blob) };
    }),
  );
  return { ...base, attachments };
}

/* ---------------------------------------------------------------- sessão */

/**
 * Conecta na sala LiveKit do canal de voz atual e mantém o estado da chamada.
 * Trocar de canal desconecta da sala antiga e entra na nova.
 */
export function useVoiceSession(
  voice: VoiceConnection | null,
  profile: Profile,
  muted: boolean,
  deafened: boolean,
  settings: Settings,
  chat: VoiceChatStore,
): VoiceSession {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [members, setMembers] = useState<VoiceMember[]>([]);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const deafenedRef = useRef(deafened);
  deafenedRef.current = deafened;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const chatRef = useRef(chat);
  chatRef.current = chat;

  const channelId = voice?.channelId ?? null;

  useEffect(() => {
    if (!channelId) {
      setStatus('idle');
      setError(null);
      setDeviceError(null);
      setMembers([]);
      return;
    }

    let cancelled = false;
    const s = settingsRef.current;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: captureOptions(s),
      videoCaptureDefaults: { deviceId: s.videoDevice || undefined },
      audioOutput: s.outputDevice ? { deviceId: s.outputDevice } : undefined,
    });
    roomRef.current = room;
    setStatus('connecting');
    setError(null);
    setDeviceError(null);

    const refresh = () => {
      if (!cancelled) setMembers(snapshot(room));
    };
    const sound = (kind: 'join' | 'leave') => {
      if (!deafenedRef.current && settingsRef.current.voiceSounds) playVoiceSound(kind);
    };

    room
      .on(RoomEvent.ParticipantConnected, () => {
        sound('join');
        refresh();
      })
      .on(RoomEvent.ParticipantDisconnected, () => {
        sound('leave');
        refresh();
      })
      .on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.muted = deafenedRef.current;
          el.volume = settingsRef.current.outputVolume / 100;
          document.body.appendChild(el);
        }
        refresh();
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        refresh();
      })
      .on(RoomEvent.TrackMuted, refresh)
      .on(RoomEvent.TrackUnmuted, refresh)
      .on(RoomEvent.LocalTrackPublished, refresh)
      .on(RoomEvent.LocalTrackUnpublished, refresh)
      .on(RoomEvent.ActiveSpeakersChanged, refresh)
      .on(RoomEvent.ParticipantNameChanged, refresh)
      .on(RoomEvent.ParticipantAttributesChanged, refresh)
      .on(RoomEvent.Reconnecting, () => !cancelled && setStatus('reconnecting'))
      .on(RoomEvent.Reconnected, () => !cancelled && setStatus('connected'))
      .on(RoomEvent.AudioPlaybackStatusChanged, () => !cancelled && setAudioBlocked(!room.canPlaybackAudio))
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) {
          setStatus('error');
          setError('A conexão com a sala caiu.');
        }
      });

    const onChatPacket = async (packet: Record<string, unknown>, from: string) => {
      const store = chatRef.current;
      const profileId = profileRef.current.id;
      switch (packet.type) {
        case 'message': {
          const m = parseChatMessage(packet.message, profileId);
          // Mensagem nova só vale assinada por quem a enviou.
          if (!m || m.authorId !== from) break;
          const message = await materialize(m);
          if (cancelled) break;
          store.receive(channelId, [message]);
          if (settingsRef.current.messageSound && !deafenedRef.current) playVoiceSound('message');
          break;
        }
        case 'delete': {
          const target = store.history.find((m) => m.id === packet.id);
          if (!target || target.authorId !== from) break;
          store.remove(channelId, target.id);
          deleteBlobs(target.attachments);
          break;
        }
        case 'history-request': {
          // Responde só quem tem o menor id entre os que já estavam, para não repetir o envio.
          const me = room.localParticipant.identity;
          const ids = [me, ...[...room.remoteParticipants.values()].map((p) => p.identity)].filter((id) => id !== from);
          if (ids.sort()[0] !== me || !store.history.length) break;
          const recent = store.history.slice(-CHAT_HISTORY_LIMIT);
          const budget = { left: HISTORY_FILE_BYTES };
          const messages: WireMessage[] = [];
          for (let i = recent.length - 1; i >= 0; i--) messages[i] = await toWire(recent[i], profileRef.current, budget);
          await sendChatPacket(room, { type: 'history', messages }, [from]).catch(() => {});
          break;
        }
        case 'history': {
          if (!Array.isArray(packet.messages)) break;
          const parsed = packet.messages
            .slice(-CHAT_HISTORY_LIMIT)
            .map((m) => parseChatMessage(m, profileId))
            .filter((m): m is WireMessage => !!m);
          const messages = await Promise.all(parsed.map(materialize));
          if (messages.length && !cancelled) store.receive(channelId, messages);
          break;
        }
      }
    };

    room.registerTextStreamHandler(CHAT_TOPIC, (reader, { identity }) => {
      reader
        .readAll()
        .then((text) => {
          if (cancelled) return;
          const packet: unknown = JSON.parse(text);
          if (packet && typeof packet === 'object') return onChatPacket(packet as Record<string, unknown>, identity);
        })
        .catch((err) => console.warn('[voz] mensagem de chat inválida', err));
    });

    (async () => {
      try {
        const res = await fetch('/api/livekit?action=token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, identity: profile.id, name: profile.name, color: profile.color }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(errorMessage(res.status, data.error));
        if (cancelled) return;

        try {
          await room.connect(data.url, data.token);
        } catch (err) {
          console.error('[voz] falha ao conectar no LiveKit', err);
          throw new Error('Não foi possível conectar ao servidor de voz. Confira o LIVEKIT_URL e sua internet.');
        }
        if (cancelled) return;
        // O microfone é ligado pelo efeito de "silenciar" logo abaixo, ao ver o status mudar.
        setStatus('connected');
        setAudioBlocked(!room.canPlaybackAudio);
        refresh();
        if (room.remoteParticipants.size > 0) {
          void sendChatPacket(room, { type: 'history-request' }).catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Não foi possível entrar na sala.');
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      room.unregisterTextStreamHandler(CHAT_TOPIC);
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) pub.track?.detach().forEach((el) => el.remove());
      }
      void room.disconnect();
      roomRef.current = null;
      setMembers([]);
      setAudioBlocked(false);
    };
    // Nome e cor só valem para a próxima entrada: mudar o perfil não derruba a chamada.
  }, [channelId, profile.id, attempt]);

  // Silenciar = parar de publicar o microfone.
  useEffect(() => {
    const room = roomRef.current;
    if (!room || status !== 'connected') return;
    room.localParticipant
      .setMicrophoneEnabled(!muted, captureOptions(settingsRef.current))
      .then(() => setMembers(snapshot(room)))
      .catch(() => setDeviceError('Sem permissão para usar o microfone. Você só vai ouvir.'));
  }, [muted, status]);

  // Desativar o áudio = silenciar tudo o que chega dos outros.
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.audioTrackPublications.values()) {
        pub.track?.attachedElements.forEach((el) => (el.muted = deafened));
      }
    }
  }, [deafened, members]);

  // As escolhas das Configurações de voz valem também no meio da chamada.
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.audioTrackPublications.values()) {
        pub.track?.attachedElements.forEach((el) => (el.volume = settings.outputVolume / 100));
      }
    }
  }, [settings.outputVolume, members]);

  const devices: [MediaDeviceKind, string][] = [
    ['audioinput', settings.inputDevice],
    ['audiooutput', settings.outputDevice],
    ['videoinput', settings.videoDevice],
  ];
  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== 'connected') return;
    for (const [kind, id] of devices) {
      void room.switchActiveDevice(kind, id || 'default').catch(() => {});
    }
  }, [settings.inputDevice, settings.outputDevice, settings.videoDevice]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== 'connected') return;
    const mic = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack;
    mic?.restartTrack(captureOptions(settingsRef.current)).catch(() => {});
  }, [settings.noiseSuppression, settings.echoCancellation, settings.autoGainControl]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const lp = room.localParticipant;
    try {
      await lp.setCameraEnabled(!lp.isCameraEnabled, {
        deviceId: settingsRef.current.videoDevice || undefined,
        resolution: { width: 1280, height: 720 },
      });
      setDeviceError(null);
    } catch {
      setDeviceError('Sem permissão para usar a câmera.');
    }
    setMembers(snapshot(room));
  }, []);

  const toggleScreen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const lp = room.localParticipant;
    try {
      await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: true });
      setDeviceError(null);
    } catch {
      setDeviceError('Compartilhamento de tela cancelado ou bloqueado.');
    }
    setMembers(snapshot(room));
  }, []);

  const startAudio = useCallback(() => {
    void roomRef.current?.startAudio().then(() => setAudioBlocked(false));
  }, []);

  const sendChat = useCallback(
    async (content: string, files: File[]) => {
      const room = roomRef.current;
      const text = content.trim().slice(0, CHAT_MAX_LENGTH);
      if (!room || !channelId || (!text && !files.length)) return;
      const attachments = files.length ? await storeFiles(files) : undefined;
      const message: Message = { id: crypto.randomUUID(), authorId: ME, content: text, timestamp: Date.now(), attachments };
      chatRef.current.receive(channelId, [message]);
      try {
        await sendChatPacket(room, { type: 'message', message: await toWire(message, profileRef.current) });
      } catch {
        setDeviceError('Não foi possível enviar a mensagem para a sala.');
      }
    },
    [channelId],
  );

  const deleteChat = useCallback(
    (messageId: string) => {
      const room = roomRef.current;
      if (!room || !channelId) return;
      chatRef.current.remove(channelId, messageId);
      sendChatPacket(room, { type: 'delete', id: messageId }).catch(() =>
        setDeviceError('Não foi possível apagar a mensagem para todos.'),
      );
    },
    [channelId],
  );

  const local = members.find((m) => m.isLocal);
  return {
    status,
    error,
    deviceError,
    members,
    cameraOn: !!local?.camera,
    screenOn: !!local?.screen,
    audioBlocked,
    toggleCamera,
    toggleScreen,
    startAudio,
    retry: () => setAttempt((a) => a + 1),
    sendChat,
    deleteChat,
  };
}

/**
 * Quantas mensagens chegaram no chat da sala `key` enquanto ele não estava à vista.
 * Fica no App, para a barra lateral avisar mesmo com você em outro canal durante a chamada.
 */
export function useUnread(key: string | null, count: number, open: boolean) {
  const [seen, setSeen] = useState({ key, count });
  // Ao entrar numa sala, o que já estava guardado aqui conta como lido.
  const base = seen.key === key ? seen.count : count;
  useEffect(() => {
    if (open || seen.key !== key) setSeen({ key, count });
  }, [open, key, count, seen.key]);
  return open || !key ? 0 : Math.max(0, count - base);
}

/* ---------------------------------------------------------------- presença */

const OCCUPANCY_POLL_MS = 10_000;

/**
 * Consulta periodicamente quem está em cada canal de voz, para a barra lateral
 * mostrar as pessoas mesmo antes de você entrar. Só consulta com a aba visível.
 */
export function useVoiceOccupancy(refreshKey: string | null): Occupancy {
  const [occupancy, setOccupancy] = useState<Occupancy>({});

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/livekit?action=rooms');
        if (res.status === 503) {
          stopped = true; // sem LiveKit configurado: não adianta insistir
          return;
        }
        if (res.ok) setOccupancy((await res.json()).occupancy ?? {});
      } catch {
        // rede instável: tenta de novo no próximo ciclo
      }
    };
    void load();
    const id = setInterval(() => !stopped && void load(), OCCUPANCY_POLL_MS);
    const onVisible = () => !stopped && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshKey]);

  return occupancy;
}
