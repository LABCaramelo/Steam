export type Status = 'online' | 'idle' | 'dnd' | 'offline';

export interface User {
  id: string;
  name: string;
  color: string;
  status: Status;
  activity?: string;
  bot?: boolean;
  avatarUrl?: string;
  bio?: string;
  nickname?: string;
  roleName?: string;
  roleColor?: string;
  tools?: string[];
  achievements?: string[];
  joinedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  members: string[];
}

export type ChannelKind = 'text' | 'voice' | 'announcement';

export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  topic?: string;
}

export interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

export interface Server {
  id: string;
  name: string;
  acronym: string;
  color: string;
  categories: Category[];
  roles: Role[];
  /** Ícone enviado por quem criou o servidor (data URL pequena). */
  icon?: string;
}

export interface Message {
  id: string;
  authorId: string;
  /** Nome e cor de quem escreveu, para autores fora do diretório local (pessoas das salas de voz). */
  authorName?: string;
  authorColor?: string;
  content: string;
  timestamp: number;
  editedAt?: number;
  /** Fixação local nos canais de texto e mensagens diretas. */
  pinned?: boolean;
  attachments?: Attachment[];
}

/** Arquivo enviado numa mensagem; o conteúdo fica no IndexedDB (ver attachments.ts). */
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
}

export interface DirectMessage {
  id: string;
  userId: string;
}
