import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { COMMUNITY_STORAGE_PREFIX, useAuth } from "./auth";
import { supabase } from "./supabase";
import { useUi } from "./ui";

/**
 * Comunidade do LAB (supabase/community.sql): quem está on-line agora, pela presença do canal
 * privado "lab:community", e conversas diretas que chegam na caixa "lab:inbox:<id>" de cada um.
 * Nada é gravado no banco: a conversa vive nesta aba (sessionStorage) e some quando a pessoa sai.
 */

export type MemberStatus = "online" | "away";

export interface CommunityMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: MemberStatus | null;
}

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  at: string;
}

export type CommunityStatus = "connecting" | "ready" | "unconfigured" | "error";

interface CommunityState {
  status: CommunityStatus;
  selfId: string | null;
  /** Outras pessoas on-line agora, em ordem alfabética. */
  online: CommunityMember[];
  /** Pessoas com conversa aberta nesta sessão que saíram do ar. */
  offline: CommunityMember[];
  member: (id: string) => CommunityMember;
  conversations: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
  totalUnread: number;
  activeChat: string | null;
  openChat: (id: string | null) => void;
  /** Rejeita com uma mensagem para a pessoa. */
  send: (to: string, body: string) => Promise<void>;
}

const COMMUNITY_TOPIC = "lab:community";
const MAX_MESSAGES = 200;
/** PostgREST responde assim quando community.sql ainda não rodou no projeto. */
const MISSING = new Set(["PGRST202", "42883"]);

export const COMMUNITY_UNCONFIGURED =
  "A Comunidade ainda não está ligada ao banco do LAB. Rode supabase/community.sql no Supabase.";

interface Profile {
  name: string;
  avatarUrl: string | null;
}

interface Stored {
  conversations: Record<string, ChatMessage[]>;
  profiles: Record<string, Profile>;
}

function loadStored(key: string): Stored {
  try {
    const raw = JSON.parse(sessionStorage.getItem(key) ?? "null") as Stored | null;
    if (raw && typeof raw === "object") return { conversations: raw.conversations ?? {}, profiles: raw.profiles ?? {} };
  } catch {
    // sessionStorage indisponível ou corrompido
  }
  return { conversations: {}, profiles: {} };
}

function isMessage(v: unknown): v is ChatMessage & { name?: string } {
  const m = v as Partial<ChatMessage> | null;
  return !!m && typeof m.id === "string" && typeof m.from === "string" && typeof m.to === "string" && typeof m.body === "string" && typeof m.at === "string";
}

const Ctx = createContext<CommunityState | null>(null);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const ui = useUi();
  const selfId = user?.id ?? null;
  const storageKey = selfId ? `${COMMUNITY_STORAGE_PREFIX}${selfId}` : null;

  const [status, setStatus] = useState<CommunityStatus>("connecting");
  const [presence, setPresence] = useState<Record<string, MemberStatus>>({});
  const [stored, setStored] = useState<Stored>(() => (storageKey ? loadStored(storageKey) : { conversations: {}, profiles: {} }));
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const communityRef = useRef<RealtimeChannel | null>(null);
  const [joined, setJoined] = useState(false);

  // O que os callbacks do Realtime precisam ler sem recriar os canais.
  const live = useRef({ activeChat, friendsOpen: ui.friendsOpen, toast: ui.toast, profiles: stored.profiles });
  live.current = { activeChat, friendsOpen: ui.friendsOpen, toast: ui.toast, profiles: stored.profiles };

  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      // sessionStorage indisponível
    }
  }, [storageKey, stored]);

  const rememberProfiles = useCallback((rows: { id: string; name: string; avatar_url: string | null }[]) => {
    if (rows.length === 0) return;
    setStored((s) => {
      const profiles = { ...s.profiles };
      for (const r of rows) profiles[r.id] = { name: r.name, avatarUrl: r.avatar_url };
      return { ...s, profiles };
    });
  }, []);

  const receive = useCallback(
    (raw: unknown) => {
      if (!selfId || !isMessage(raw)) return;
      const { name, ...msg } = raw;
      const other = msg.from === selfId ? msg.to : msg.from;
      if (other === selfId) return;
      setStored((s) => {
        const list = s.conversations[other] ?? [];
        if (list.some((m) => m.id === msg.id)) return s;
        const profiles = msg.from === other && name && !s.profiles[other] ? { ...s.profiles, [other]: { name, avatarUrl: null } } : s.profiles;
        return { profiles, conversations: { ...s.conversations, [other]: [...list, msg].slice(-MAX_MESSAGES) } };
      });
      if (msg.from === selfId) return;
      const { activeChat: open, friendsOpen, toast, profiles } = live.current;
      if (friendsOpen && open === other) return;
      setUnread((u) => ({ ...u, [other]: (u[other] ?? 0) + 1 }));
      if (!friendsOpen) toast(`Nova mensagem de ${profiles[other]?.name ?? name ?? "um membro do LAB"}`);
    },
    [selfId],
  );

  // Canais do Realtime. O setTimeout evita abrir e fechar os mesmos canais na montagem dupla do StrictMode.
  useEffect(() => {
    if (!selfId) return;
    let active = true;
    let community: RealtimeChannel | null = null;
    let inbox: RealtimeChannel | null = null;

    const start = setTimeout(async () => {
      const probe = await supabase.rpc("community_profiles", { p_ids: [selfId] });
      if (!active) return;
      if (probe.error) {
        setStatus(MISSING.has(probe.error.code) ? "unconfigured" : "error");
        return;
      }
      await supabase.realtime.setAuth();
      if (!active) return;

      community = supabase.channel(COMMUNITY_TOPIC, { config: { private: true, presence: { key: selfId } } });
      communityRef.current = community;
      community
        .on("presence", { event: "sync" }, () => {
          const state = community!.presenceState<{ status?: MemberStatus }>();
          const next: Record<string, MemberStatus> = {};
          for (const [id, metas] of Object.entries(state)) {
            if (id === selfId || metas.length === 0) continue;
            next[id] = metas.some((m) => m.status !== "away") ? "online" : "away";
          }
          setPresence(next);
        })
        .subscribe((s) => {
          if (!active) return;
          if (s === "SUBSCRIBED") {
            setJoined(true);
            setStatus("ready");
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
            setJoined(false);
            setStatus("error");
          } else if (s === "CLOSED") {
            setJoined(false);
          }
        });

      inbox = supabase.channel(`lab:inbox:${selfId}`, { config: { private: true } });
      inbox.on("broadcast", { event: "dm" }, ({ payload }) => receive(payload)).subscribe();
    }, 0);

    return () => {
      active = false;
      clearTimeout(start);
      communityRef.current = null;
      setJoined(false);
      setPresence({});
      if (community) void supabase.removeChannel(community);
      if (inbox) void supabase.removeChannel(inbox);
    };
  }, [selfId, receive]);

  // Disponível e Ausente aparecem na lista; Invisível e Off-line saem dela, mas continuam recebendo.
  useEffect(() => {
    const channel = communityRef.current;
    if (!joined || !channel) return;
    if (ui.status === "online" || ui.status === "away") {
      void channel.track({ status: ui.status, online_at: new Date().toISOString() });
    } else {
      void channel.untrack();
    }
  }, [joined, ui.status]);

  // Nome e foto de quem aparece na presença sem perfil conhecido.
  useEffect(() => {
    if (status !== "ready") return;
    const missing = Object.keys(presence).filter((id) => !stored.profiles[id]);
    if (missing.length === 0) return;
    let active = true;
    void supabase.rpc("community_profiles", { p_ids: missing }).then(({ data }) => {
      if (active && Array.isArray(data)) rememberProfiles(data);
    });
    return () => {
      active = false;
    };
  }, [status, presence, stored.profiles, rememberProfiles]);

  const member = useCallback(
    (id: string): CommunityMember => {
      const p = stored.profiles[id];
      return { id, name: p?.name ?? "Membro do LAB", avatarUrl: p?.avatarUrl ?? null, status: presence[id] ?? null };
    },
    [stored.profiles, presence],
  );

  const byName = (a: CommunityMember, b: CommunityMember) => a.name.localeCompare(b.name, "pt-BR");
  const online = useMemo(() => Object.keys(presence).map(member).sort(byName), [presence, member]);
  const offline = useMemo(
    () =>
      Object.keys(stored.conversations)
        .filter((id) => !presence[id] && stored.conversations[id].length > 0)
        .map(member)
        .sort(byName),
    [stored.conversations, presence, member],
  );

  const openChat = useCallback((id: string | null) => {
    setActiveChat(id);
    if (id) setUnread((u) => (u[id] ? { ...u, [id]: 0 } : u));
  }, []);

  // Mensagem que chega com a conversa já aberta e visível não conta como não lida.
  useEffect(() => {
    if (ui.friendsOpen && activeChat) setUnread((u) => (u[activeChat] ? { ...u, [activeChat]: 0 } : u));
  }, [ui.friendsOpen, activeChat]);

  const send = useCallback(
    async (to: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      const { data, error } = await supabase.rpc("community_send", { p_to: to, p_body: text });
      if (error) {
        throw new Error(MISSING.has(error.code) ? COMMUNITY_UNCONFIGURED : error.message || "Não foi possível enviar agora.");
      }
      receive(data);
    },
    [receive],
  );

  const totalUnread = useMemo(() => Object.values(unread).reduce((a, b) => a + b, 0), [unread]);

  return (
    <Ctx.Provider
      value={{
        status,
        selfId,
        online,
        offline,
        member,
        conversations: stored.conversations,
        unread,
        totalUnread,
        activeChat,
        openChat,
        send,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCommunity(): CommunityState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommunity fora do CommunityProvider");
  return v;
}
