import { useEffect, useReducer } from 'react';
import { ME, seedMessages, servers as seedServers } from './data';
import type { Attachment, Channel, Message, Server, Status } from './types';

export type View = { kind: 'home'; dmId: string | null } | { kind: 'server'; serverId: string };

export interface VoiceConnection {
  serverId: string;
  channelId: string;
}

/** Quem é este visitante nas salas de voz: id estável por navegador, nome e cor escolhidos. */
export interface Profile {
  id: string;
  name: string;
  /** Cor do avatar; sem ela, a cor sai do id (ver colorFor). */
  color?: string;
}

export type Theme = 'escuro' | 'cinza' | 'onix' | 'claro';

export interface Settings {
  theme: Theme;
  compactMessages: boolean;
  reducedMotion: boolean;
  /** Saturação das cores da interface, de 0 a 100. */
  saturation: number;
  /** Dispositivos escolhidos; '' é o padrão do sistema. */
  inputDevice: string;
  outputDevice: string;
  videoDevice: string;
  /** Volume de quem está na chamada, de 0 a 100. */
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  /** Sons de entrar/sair da voz. */
  voiceSounds: boolean;
  /** Som de nova mensagem no chat da sala de voz. */
  messageSound: boolean;
}

export type SettingsSection = 'conta' | 'perfis' | 'notificacoes' | 'voz' | 'aparencia' | 'acessibilidade';

/** Janelas sobrepostas; não são salvas entre visitas. */
export type Modal =
  | { kind: 'settings'; section: SettingsSection }
  | { kind: 'addServer'; invite?: string }
  | { kind: 'invite'; serverId: string }
  | { kind: 'createChannel'; serverId: string; categoryId: string | null }
  | { kind: 'leaveServer'; serverId: string }
  | { kind: 'logout' };

export interface State {
  profile: Profile;
  servers: Server[];
  view: View;
  channelByServer: Record<string, string>;
  voice: VoiceConnection | null;
  messages: Record<string, Message[]>;
  collapsed: Record<string, boolean>;
  showMembers: boolean;
  showVoiceChat: boolean;
  muted: boolean;
  deafened: boolean;
  myStatus: Status;
  settings: Settings;
  modal: Modal | null;
}

export type Action =
  | { type: 'openHome'; dmId?: string | null }
  | { type: 'openServer'; serverId: string }
  | { type: 'openChannel'; serverId: string; channelId: string }
  | { type: 'navigateChannel'; serverId: string; channelId: string }
  | { type: 'joinVoice'; serverId: string; channelId: string }
  | { type: 'leaveVoice' }
  | { type: 'send'; conversationId: string; content: string; attachments?: Attachment[] }
  | { type: 'receive'; conversationId: string; messages: Message[] }
  | { type: 'delete'; conversationId: string; messageId: string }
  | { type: 'edit'; conversationId: string; messageId: string; content: string }
  | { type: 'togglePin'; conversationId: string; messageId: string }
  | { type: 'toggleCategory'; categoryId: string }
  | { type: 'toggleMembers' }
  | { type: 'toggleVoiceChat' }
  | { type: 'toggleMute' }
  | { type: 'toggleDeafen' }
  | { type: 'setStatus'; status: Status }
  | { type: 'setName'; name: string }
  | { type: 'updateProfile'; name?: string; color?: string | null }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'openModal'; modal: Modal }
  | { type: 'closeModal' }
  | { type: 'createServer'; server: Server }
  | { type: 'leaveServer'; serverId: string }
  | { type: 'createChannel'; serverId: string; categoryId: string | null; channel: Channel }
  | { type: 'logout' };

const STORAGE_KEY = 'discord-clone:v1';

export const defaultSettings: Settings = {
  theme: 'escuro',
  compactMessages: false,
  reducedMotion: false,
  saturation: 100,
  inputDevice: '',
  outputDevice: '',
  videoDevice: '',
  outputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  voiceSounds: true,
  messageSound: true,
};

/** Id curto e válido como nome de sala do LiveKit (minúsculas, números e hífen). */
export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/** Canal que abre ao entrar no servidor: #geral, senão o primeiro de texto, senão qualquer um. */
export function firstChannel(server: Server): string | undefined {
  const all = server.categories.flatMap((c) => c.channels);
  return (
    all.find((c) => c.kind !== 'voice' && c.name === 'geral') ?? all.find((c) => c.kind !== 'voice') ?? all[0]
  )?.id;
}

export function findServer(servers: Server[], serverId: string) {
  return servers.find((s) => s.id === serverId);
}

export function findChannel(servers: Server[], serverId: string, channelId: string) {
  return findServer(servers, serverId)
    ?.categories.flatMap((c) => c.channels)
    .find((c) => c.id === channelId);
}

function initialState(): State {
  const fallback: State = {
    profile: { id: crypto.randomUUID(), name: '' },
    servers: seedServers,
    view: { kind: 'server', serverId: seedServers[0].id },
    channelByServer: Object.fromEntries(seedServers.map((s) => [s.id, firstChannel(s)!])),
    voice: null,
    messages: seedMessages,
    collapsed: {},
    showMembers: true,
    showVoiceChat: true,
    muted: false,
    deafened: false,
    myStatus: 'online',
    settings: defaultSettings,
    modal: null,
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<State>;
      return {
        ...fallback,
        ...parsed,
        settings: { ...defaultSettings, ...parsed.settings },
        // A conexão de voz depende do microfone aberto, então nunca é restaurada.
        voice: null,
        modal: null,
      };
    }
  } catch {
    // armazenamento indisponível ou corrompido: usa os dados de exemplo
  }
  return fallback;
}

function openServer(state: State, server: Server): State {
  const channel = state.channelByServer[server.id] ?? firstChannel(server);
  return {
    ...state,
    view: { kind: 'server', serverId: server.id },
    channelByServer: channel ? { ...state.channelByServer, [server.id]: channel } : state.channelByServer,
    modal: null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'openHome':
      return {
        ...state,
        view: { kind: 'home', dmId: action.dmId === undefined ? (state.view.kind === 'home' ? state.view.dmId : null) : action.dmId },
      };
    case 'openServer': {
      const server = findServer(state.servers, action.serverId);
      return server ? openServer(state, server) : state;
    }
    case 'navigateChannel': {
      if (!findChannel(state.servers, action.serverId, action.channelId)) return state;
      return {
        ...state,
        view: { kind: 'server', serverId: action.serverId },
        channelByServer: { ...state.channelByServer, [action.serverId]: action.channelId },
        modal: null,
      };
    }
    case 'openChannel': {
      if (!findChannel(state.servers, action.serverId, action.channelId)) return state;
      // Como no Discord, clicar num canal de voz já conecta nele.
      const joins = findChannel(state.servers, action.serverId, action.channelId)?.kind === 'voice';
      return {
        ...state,
        view: { kind: 'server', serverId: action.serverId },
        channelByServer: { ...state.channelByServer, [action.serverId]: action.channelId },
        voice: joins ? { serverId: action.serverId, channelId: action.channelId } : state.voice,
      };
    }
    case 'joinVoice':
      return { ...state, voice: { serverId: action.serverId, channelId: action.channelId } };
    case 'leaveVoice':
      return { ...state, voice: null };
    case 'send': {
      const content = action.content.trim();
      const attachments = action.attachments?.length ? action.attachments : undefined;
      if (!content && !attachments) return state;
      const message: Message = { id: crypto.randomUUID(), authorId: ME, content, timestamp: Date.now(), attachments };
      const list = state.messages[action.conversationId] ?? [];
      return { ...state, messages: { ...state.messages, [action.conversationId]: [...list, message] } };
    }
    case 'receive': {
      // Mensagens que chegam de outras pessoas (ou um histórico inteiro): ignora as já conhecidas.
      const list = state.messages[action.conversationId] ?? [];
      const known = new Set(list.map((m) => m.id));
      const fresh = action.messages.filter((m) => !known.has(m.id) && known.add(m.id));
      if (!fresh.length) return state;
      const merged = [...list, ...fresh].sort((a, b) => a.timestamp - b.timestamp);
      return { ...state, messages: { ...state.messages, [action.conversationId]: merged } };
    }
    case 'delete': {
      const list = state.messages[action.conversationId] ?? [];
      return {
        ...state,
        messages: { ...state.messages, [action.conversationId]: list.filter((m) => m.id !== action.messageId) },
      };
    }
    case 'edit': {
      const list = state.messages[action.conversationId] ?? [];
      const message = list.find((m) => m.id === action.messageId);
      const content = action.content.trim();
      if (!message || message.authorId !== ME || (!content && !message.attachments?.length) || content === message.content) return state;
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.conversationId]: list.map((m) => m.id === message.id ? { ...m, content, editedAt: Date.now() } : m),
        },
      };
    }
    case 'togglePin': {
      const list = state.messages[action.conversationId] ?? [];
      if (!list.some((m) => m.id === action.messageId)) return state;
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.conversationId]: list.map((m) => m.id === action.messageId ? { ...m, pinned: !m.pinned } : m),
        },
      };
    }
    case 'toggleCategory':
      return { ...state, collapsed: { ...state.collapsed, [action.categoryId]: !state.collapsed[action.categoryId] } };
    case 'toggleMembers':
      return { ...state, showMembers: !state.showMembers };
    case 'toggleVoiceChat':
      return { ...state, showVoiceChat: !state.showVoiceChat };
    case 'toggleMute':
      // Reativar o microfone também reativa o áudio, como no Discord.
      return { ...state, muted: !state.muted, deafened: state.muted ? false : state.deafened };
    case 'toggleDeafen':
      return { ...state, deafened: !state.deafened, muted: !state.deafened };
    case 'setStatus':
      return { ...state, myStatus: action.status };
    case 'setName': {
      const name = action.name.trim().slice(0, 32);
      return name ? { ...state, profile: { ...state.profile, name } } : state;
    }
    case 'updateProfile': {
      const name = action.name?.trim().slice(0, 32);
      const profile = { ...state.profile };
      if (name) profile.name = name;
      if (action.color === null) delete profile.color;
      else if (action.color) profile.color = action.color;
      return { ...state, profile };
    }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'openModal':
      return { ...state, modal: action.modal };
    case 'closeModal':
      return { ...state, modal: null };
    case 'createServer': {
      // Entrar de novo pelo mesmo convite só abre o servidor que você já tem.
      const existing = findServer(state.servers, action.server.id);
      if (existing) return openServer(state, existing);
      return openServer({ ...state, servers: [...state.servers, action.server] }, action.server);
    }
    case 'leaveServer': {
      const { [action.serverId]: _, ...channelByServer } = state.channelByServer;
      const viewing = state.view.kind === 'server' && state.view.serverId === action.serverId;
      return {
        ...state,
        servers: state.servers.filter((s) => s.id !== action.serverId),
        channelByServer,
        view: viewing ? { kind: 'home', dmId: null } : state.view,
        voice: state.voice?.serverId === action.serverId ? null : state.voice,
        modal: null,
      };
    }
    case 'createChannel': {
      const servers = state.servers.map((s) => {
        if (s.id !== action.serverId) return s;
        const categories = s.categories.length ? s.categories : [{ id: newId('cat'), name: 'Canais', channels: [] }];
        const target = categories.find((c) => c.id === action.categoryId) ?? categories[0];
        return {
          ...s,
          categories: categories.map((c) => (c === target ? { ...c, channels: [...c.channels, action.channel] } : c)),
        };
      });
      // O novo canal de texto já abre; o de voz só aparece na lista (entra quem clicar).
      const opens = action.channel.kind !== 'voice';
      return {
        ...state,
        servers,
        view: opens ? { kind: 'server', serverId: action.serverId } : state.view,
        channelByServer: opens ? { ...state.channelByServer, [action.serverId]: action.channel.id } : state.channelByServer,
        modal: null,
      };
    }
    case 'logout':
      // Sair troca a identidade: na próxima entrada o app pergunta o nome de novo.
      return { ...state, profile: { id: crypto.randomUUID(), name: '' }, voice: null, modal: null };
  }
}

export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    try {
      const { modal: _, ...saved } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // sem persistência neste navegador
    }
  }, [state]);

  return [state, dispatch] as const;
}
