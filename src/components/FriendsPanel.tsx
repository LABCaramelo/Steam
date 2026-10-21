import { FocusField } from "@caramelo/design-system";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLibrary } from "../api";
import { COMMUNITY_UNCONFIGURED, useCommunity, type CommunityMember } from "../community";
import { t } from "../i18n";
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
} from "../notifications";
import { STATUS_LABEL, useUi, type PersonaStatus } from "../ui";
import { Avatar, MemberAvatar, STATUS_COLOR } from "./Avatar";
import { IconBack, IconChevronDown, IconClose, IconSearch, IconSend } from "./Icons";
import { Menu } from "./Menu";

/**
 * Comunidade: membros do LAB on-line agora e conversas diretas entre eles (src/community.tsx).
 * As conversas não são salvas e terminam quando a pessoa sai do LAB.
 */
export function FriendsPanel() {
  const ui = useUi();
  const { activeChat } = useCommunity();
  if (!ui.friendsOpen) return null;

  return (
    <aside className="friends" aria-label={t("BottomBar_FriendsAndChat")}>
      <div className="friends__titlebar">
        <span>{t("tab_friends").toUpperCase()}</span>
        <button title="Fechar" onClick={() => ui.setFriendsOpen(false)}>
          <IconClose size={14} />
        </button>
      </div>
      {activeChat ? <ChatView key={activeChat} id={activeChat} /> : <MemberList />}
    </aside>
  );
}

const MEMBER_STATUS_LABEL = { online: STATUS_LABEL.online, away: STATUS_LABEL.away };

function MemberList() {
  const ui = useUi();
  const { snapshot } = useLibrary();
  const community = useCommunity();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState({ online: true, offline: true });
  const q = query.trim().toLowerCase();
  const filter = (list: CommunityMember[]) => (q ? list.filter((m) => m.name.toLowerCase().includes(q)) : list);
  const groups = [
    { key: "online" as const, label: t("FriendGroup_Online"), members: filter(community.online), empty: "Ninguém on-line agora." },
    { key: "offline" as const, label: t("FriendGroup_Offline"), members: filter(community.offline), empty: "" },
  ].filter((g) => g.key === "online" || g.members.length > 0);
  const hidden = ui.status === "invisible" || ui.status === "offline";
  const [notifPerm, setNotifPerm] = useState(() => getBrowserNotificationPermission());

  async function enableNotifications() {
    const p = await requestBrowserNotificationPermission();
    setNotifPerm(p);
    if (p === "granted") {
      ui.setSetting("browserNotifications", true);
      ui.toast("Notificações no navegador ativadas.");
    }
  }

  return (
    <>
      <div className="friends__me">
        <Avatar size={44} />
        <div className="friends__me-info">
          <div className="friends__me-name" style={{ color: STATUS_COLOR[ui.status] }}>
            {snapshot?.user?.personaName ?? "…"}
          </div>
          <Menu
            items={(["online", "away", "invisible"] as PersonaStatus[]).map((s) => ({
              label: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: STATUS_COLOR[s],
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {STATUS_LABEL[s]}
                </span>
              ),
              checked: ui.status === s,
              checkColor: s === "online" ? "var(--c-online)" : undefined,
              onSelect: () => ui.setStatus(s),
            }))}
            trigger={() => (
              <span className="friends__status">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: STATUS_COLOR[ui.status],
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {STATUS_LABEL[ui.status]} <IconChevronDown size={11} />
              </span>
            )}
          />
        </div>
      </div>
      {hidden && <p className="friends__notice">Ninguém vê você on-line agora, mas as mensagens continuam chegando.</p>}
      {isBrowserNotificationSupported() && notifPerm === "default" && (
        <div className="friends__notif-bar">
          <div className="friends__notif-text">
            <strong>Avisos no navegador</strong>
            <span>Receba notificações na área de trabalho quando chegar mensagem.</span>
          </div>
          <button type="button" className="cm-btn cm-btn--accent cm-btn--sm" onClick={enableNotifications}>
            Ativar
          </button>
        </div>
      )}
      <div className="friends__search">
        <IconSearch size={14} className="field-icon" aria-hidden="true" />
        <FocusField label={t("SearchFriends")} type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="friends__list">
        {community.status === "unconfigured" ? (
          <p className="friends__notice">{COMMUNITY_UNCONFIGURED}</p>
        ) : community.status === "error" ? (
          <p className="friends__notice">Não foi possível conectar à Comunidade agora. Tentando de novo…</p>
        ) : community.status === "connecting" ? (
          <p className="friends__empty">Conectando à Comunidade…</p>
        ) : (
          groups.map(({ key, label, members, empty }) => (
            <section key={key} className="friends__group">
              <button className="friends__group-head" onClick={() => setOpenGroups((g) => ({ ...g, [key]: !g[key] }))}>
                <IconChevronDown size={12} style={{ transform: openGroups[key] ? "none" : "rotate(-90deg)" }} />
                {label} <span className="friends__count">({members.length})</span>
              </button>
              {openGroups[key] &&
                (members.length === 0 ? (
                  <p className="friends__empty">{q ? "Ninguém com esse nome." : empty}</p>
                ) : (
                  <ul className="friends__members">
                    {members.map((m) => (
                      <li key={m.id}>
                        <MemberRow member={m} />
                      </li>
                    ))}
                  </ul>
                ))}
            </section>
          ))
        )}
        <p className="friends__note">
          Aqui aparecem os membros do LAB que estão on-line. As conversas não ficam salvas: terminam quando você sai do LAB.
        </p>
      </div>
    </>
  );
}

function MemberRow({ member }: { member: CommunityMember }) {
  const { conversations, unread, openChat, selfId } = useCommunity();
  const last = conversations[member.id]?.at(-1);
  const count = unread[member.id] ?? 0;
  return (
    <button className="friends__member" onClick={() => openChat(member.id)}>
      <MemberAvatar name={member.name} url={member.avatarUrl} status={member.status} size={32} />
      <span className="friends__member-info">
        <span className="friends__member-name" style={{ color: member.status ? STATUS_COLOR[member.status] : undefined }}>
          {member.name}
        </span>
        <span className="friends__member-sub">{last ? `${last.from === selfId ? "Você: " : ""}${last.body}` : member.status ? MEMBER_STATUS_LABEL[member.status] : STATUS_LABEL.offline}</span>
      </span>
      {count > 0 && (
        <span className="friends__badge" aria-label={`${count} mensagens novas`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function ChatView({ id }: { id: string }) {
  const community = useCommunity();
  const member = community.member(id);
  const messages = community.conversations[id] ?? [];
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const online = member.status !== null;
  const ui = useUi();
  const [notifPerm, setNotifPerm] = useState(() => getBrowserNotificationPermission());

  async function enableNotifications() {
    const p = await requestBrowserNotificationPermission();
    setNotifPerm(p);
    if (p === "granted") {
      ui.setSetting("browserNotifications", true);
      ui.toast("Notificações no navegador ativadas.");
    }
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending || !online) return;
    setSending(true);
    setError(null);
    try {
      await community.send(id, text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar agora.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape" && !draft) {
      community.openChat(null);
    }
  }

  return (
    <div className="friends__chat">
      <div className="friends__chat-head">
        <button className="friends__chat-back" title="Voltar para a Comunidade" onClick={() => community.openChat(null)}>
          <IconBack size={16} />
        </button>
        <MemberAvatar name={member.name} url={member.avatarUrl} status={member.status} size={32} />
        <span className="friends__member-info">
          <span className="friends__member-name" style={{ color: member.status ? STATUS_COLOR[member.status] : undefined }}>
            {member.name}
          </span>
          <span className="friends__member-sub">{member.status ? MEMBER_STATUS_LABEL[member.status] : STATUS_LABEL.offline}</span>
        </span>
        {isBrowserNotificationSupported() && notifPerm === "default" && (
          <button
            type="button"
            className="friends__notif-chip"
            title="Permitir que o navegador avise quando novas mensagens chegarem"
            onClick={enableNotifications}
          >
            🔔 Ativar avisos
          </button>
        )}
      </div>

      <div className="friends__chat-log" ref={logRef} role="log" aria-live="polite" aria-label={`Conversa com ${member.name}`}>
        <p className="friends__chat-hint">Esta conversa não é salva: ela some quando você sai do LAB.</p>
        {messages.map((m) => {
          const mine = m.from === community.selfId;
          return (
            <div key={m.id} className={`friends__msg${mine ? " friends__msg--mine" : ""}`}>
              <span className="friends__msg-body">{m.body}</span>
              <time className="friends__msg-time" dateTime={m.at}>
                {timeFormat.format(new Date(m.at))}
              </time>
            </div>
          );
        })}
        {!online && <p className="friends__chat-hint">{member.name} saiu do LAB. Dá para ler a conversa até você sair também.</p>}
      </div>

      <form className="friends__composer" onSubmit={submit}>
        <textarea
          ref={inputRef}
          rows={1}
          maxLength={2000}
          value={draft}
          disabled={!online}
          placeholder={online ? `Mensagem para ${member.name}` : "Esta pessoa está off-line"}
          aria-label={`Mensagem para ${member.name}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="friends__send" title="Enviar" disabled={!online || sending || !draft.trim()}>
          <IconSend size={16} />
        </button>
      </form>
      {error && (
        <p className="friends__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
