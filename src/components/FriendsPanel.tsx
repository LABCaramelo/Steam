import { useState } from "react";
import { useLibrary } from "../api";
import { t } from "../i18n";
import { STATUS_LABEL, useUi, type PersonaStatus } from "../ui";
import { Avatar, STATUS_COLOR } from "./Avatar";
import { IconChevronDown, IconClose, IconSearch } from "./Icons";
import { Menu } from "./Menu";

/**
 * Floating "Amigos e conversas" window. The real friends list lives on Steam's servers and is not
 * cached on disk, so this recreation shows the local persona and an empty list.
 */
export function FriendsPanel() {
  const ui = useUi();
  const { snapshot } = useLibrary();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState({ online: true, offline: true });
  if (!ui.friendsOpen) return null;

  return (
    <aside className="friends" aria-label={t("BottomBar_FriendsAndChat")}>
      <div className="friends__titlebar">
        <span>{t("tab_friends").toUpperCase()}</span>
        <button title="Fechar" onClick={() => ui.setFriendsOpen(false)}>
          <IconClose size={14} />
        </button>
      </div>
      <div className="friends__me">
        <Avatar size={44} />
        <div className="friends__me-info">
          <div className="friends__me-name" style={{ color: STATUS_COLOR[ui.status] }}>
            {snapshot?.user?.personaName ?? "…"}
          </div>
          <Menu
            items={(["online", "away", "invisible", "offline"] as PersonaStatus[]).map((s) => ({
              label: STATUS_LABEL[s],
              checked: ui.status === s,
              onSelect: () => ui.setStatus(s),
            }))}
            trigger={() => (
              <span className="friends__status">
                {STATUS_LABEL[ui.status]} <IconChevronDown size={11} />
              </span>
            )}
          />
        </div>
      </div>
      <label className="friends__search">
        <IconSearch size={14} />
        <input placeholder={t("SearchFriends")} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="friends__list">
        {(
          [
            ["online", t("FriendGroup_Online")],
            ["offline", t("FriendGroup_Offline")],
          ] as const
        ).map(([key, label]) => (
          <section key={key} className="friends__group">
            <button className="friends__group-head" onClick={() => setOpenGroups((g) => ({ ...g, [key]: !g[key] }))}>
              <IconChevronDown size={12} style={{ transform: openGroups[key] ? "none" : "rotate(-90deg)" }} />
              {label} <span className="friends__count">(0)</span>
            </button>
            {openGroups[key] && <p className="friends__empty">Ninguém por aqui.</p>}
          </section>
        ))}
        <p className="friends__note">
          A lista de amigos fica nos servidores do LAB e não é salva no disco, por isso esta recriação não consegue exibi-la.
        </p>
      </div>
    </aside>
  );
}
