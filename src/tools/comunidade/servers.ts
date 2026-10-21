import { ME } from './data';
import { newId } from './store';
import type { Category, Channel, ChannelKind, Server } from './types';

/* ---------------------------------------------------------------- moldes */

/*
 * Os nomes dos moldes são os do modal "Criar seu servidor" do Discord. Os canais de cada um
 * vêm da API do Discord (não estão no app), então estes são uma escolha nossa.
 */
type ChannelSpec = [name: string, kind: ChannelKind];
type CategorySpec = [name: string, channels: ChannelSpec[]];

export interface Template {
  id: string;
  name: string;
  emoji: string;
  categories: CategorySpec[];
}

const info: CategorySpec = ['Informações', [['boas-vindas-e-regras', 'text'], ['anúncios', 'announcement']]];

export const TEMPLATES: Template[] = [
  {
    id: 'meu',
    name: 'Criar o meu',
    emoji: '🛠️',
    categories: [
      ['Canais de texto', [['geral', 'text']]],
      ['Canais de voz', [['Geral', 'voice']]],
    ],
  },
  {
    id: 'jogos',
    name: 'Jogos',
    emoji: '🎮',
    categories: [
      ['Canais de texto', [['geral', 'text'], ['clipes-e-destaques', 'text']]],
      ['Canais de voz', [['Lobby', 'voice'], ['Jogando', 'voice']]],
    ],
  },
  {
    id: 'amigos',
    name: 'Amigos',
    emoji: '💖',
    categories: [
      ['Canais de texto', [['geral', 'text'], ['jogos', 'text'], ['música', 'text']]],
      ['Canais de voz', [['Lounge', 'voice'], ['Sala de jogos', 'voice']]],
    ],
  },
  {
    id: 'estudos',
    name: 'Grupo de estudos',
    emoji: '🍎',
    categories: [
      info,
      ['Canais de texto', [['geral', 'text'], ['recursos', 'text'], ['dúvidas', 'text']]],
      ['Salas de estudo', [['Sala de estudos 1', 'voice'], ['Sala de estudos 2', 'voice']]],
    ],
  },
  {
    id: 'escola',
    name: 'Clube escolar',
    emoji: '📚',
    categories: [
      info,
      ['Canais de texto', [['geral', 'text'], ['reuniões', 'text'], ['eventos', 'text']]],
      ['Canais de voz', [['Sala de reunião', 'voice'], ['Lounge', 'voice']]],
    ],
  },
  {
    id: 'local',
    name: 'Comunidade Local',
    emoji: '🏠',
    categories: [
      info,
      ['Canais de texto', [['geral', 'text'], ['eventos', 'text'], ['ideias-e-sugestões', 'text']]],
      ['Canais de voz', [['Lounge', 'voice'], ['Sala de reunião', 'voice']]],
    ],
  },
  {
    id: 'criadores',
    name: 'Artistas e Criadores',
    emoji: '🎨',
    categories: [
      info,
      ['Canais de texto', [['geral', 'text'], ['mostre-seu-trabalho', 'text'], ['ideias-e-feedback', 'text']]],
      ['Canais de voz', [['Lounge', 'voice'], ['Ateliê', 'voice']]],
    ],
  },
];

const SERVER_COLORS = ['#5865f2', '#eb459e', '#23a55a', '#f0b232', '#00a8fc', '#9b59b6', '#e67e22'];

/** Iniciais para o ícone sem imagem: "Servidor de Luiz" → "SdL", como o Discord faz. */
export function acronymOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 4);
}

/** Canais de texto do Discord não têm espaços nem maiúsculas. */
export function textChannelName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 100);
}

export function makeChannel(name: string, kind: ChannelKind): Channel {
  return { id: newId('ch'), name: kind === 'voice' ? name.trim().slice(0, 100) : textChannelName(name), kind };
}

export function createServer(template: Template, name: string, icon: string | undefined, community: boolean): Server {
  const specs = community && !template.categories.includes(info) ? [info, ...template.categories] : template.categories;
  const categories: Category[] = specs.map(([catName, channels]) => ({
    id: newId('cat'),
    name: catName,
    channels: channels.map(([n, kind]) => makeChannel(n, kind)),
  }));
  const trimmed = name.trim().slice(0, 100);
  return {
    id: newId('s'),
    name: trimmed,
    acronym: acronymOf(trimmed),
    color: SERVER_COLORS[Math.floor(Math.random() * SERVER_COLORS.length)],
    icon,
    categories,
    roles: [{ id: 'r-membros', name: 'Membros', color: '#b5bac1', members: [ME] }],
  };
}

/** Reduz a imagem escolhida para o ícone (128×128, recortada no centro). */
export async function iconFromFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  canvas.getContext('2d')!.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    128,
    128,
  );
  bitmap.close();
  return canvas.toDataURL('image/webp', 0.85);
}

/* ---------------------------------------------------------------- convites */

/*
 * Sem banco de dados, o convite carrega o próprio servidor: nome, ícone e canais vão
 * codificados no link. Quem abre ganha uma cópia com os mesmos ids, então as salas de voz
 * (e o chat delas) são as mesmas para todos; os canais de texto continuam locais.
 */
const ID = /^[a-z0-9-]{1,64}$/;
const ICON = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const KINDS: ChannelKind[] = ['text', 'voice', 'announcement'];

function toBase64Url(text: string) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string) {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function inviteLink(server: Server) {
  const payload = {
    v: 1,
    id: server.id,
    name: server.name,
    color: server.color,
    icon: server.icon,
    categories: server.categories.map((c) => ({
      id: c.id,
      name: c.name,
      channels: c.channels.map(({ id, name, kind, topic }) => ({ id, name, kind, topic })),
    })),
  };
  return `${location.origin}/?convite=${toBase64Url(JSON.stringify(payload))}`;
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Aceita o link inteiro ou só o código; devolve null se não for um convite válido. */
export function parseInvite(input: string): Server | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let code = trimmed;
  try {
    code = new URL(trimmed).searchParams.get('convite') ?? trimmed;
  } catch {
    // não é URL: é o próprio código
  }
  try {
    const raw = JSON.parse(fromBase64Url(code)) as Record<string, unknown>;
    const name = text(raw.name, 100);
    if (raw.v !== 1 || typeof raw.id !== 'string' || !ID.test(raw.id) || !name) return null;
    if (!Array.isArray(raw.categories) || raw.categories.length > 50) return null;
    const categories: Category[] = [];
    for (const c of raw.categories as Record<string, unknown>[]) {
      const catName = text(c?.name, 100);
      if (typeof c?.id !== 'string' || !ID.test(c.id) || !catName || !Array.isArray(c.channels)) return null;
      const channels: Channel[] = [];
      for (const ch of (c.channels as Record<string, unknown>[]).slice(0, 100)) {
        const chName = text(ch?.name, 100);
        if (typeof ch?.id !== 'string' || !ID.test(ch.id) || !chName || !KINDS.includes(ch.kind as ChannelKind)) return null;
        channels.push({ id: ch.id, name: chName, kind: ch.kind as ChannelKind, topic: text(ch.topic, 1024) ?? undefined });
      }
      categories.push({ id: c.id, name: catName, channels });
    }
    const color = typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : SERVER_COLORS[0];
    const icon = typeof raw.icon === 'string' && raw.icon.length < 200_000 && ICON.test(raw.icon) ? raw.icon : undefined;
    return {
      id: raw.id,
      name,
      acronym: acronymOf(name),
      color,
      icon,
      categories,
      roles: [{ id: 'r-membros', name: 'Membros', color: '#b5bac1', members: [ME] }],
    };
  } catch {
    return null;
  }
}
