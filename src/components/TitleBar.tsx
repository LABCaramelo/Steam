import { useNavigate } from "react-router-dom";
import { useLibrary } from "../api";
import { useAuth } from "../auth";
import { t } from "../i18n";
import { STATUS_LABEL, useUi, type PersonaStatus } from "../ui";
import { Avatar } from "./Avatar";
import { IconBell, IconChevronDown, IconClose, IconMark, IconMaximize, IconMinimize } from "./Icons";
import { Menu, type MenuItem } from "./Menu";

/** Top strip: client menus (LAB / Exibir / Amigos / Ferramentas / Ajuda), notifications, account and window controls. */
export function TitleBar() {
  const nav = useNavigate();
  const ui = useUi();
  const { logout } = useAuth();
  const { snapshot, refresh } = useLibrary();
  const soon = (what: string) => () => ui.toast(`${what} não faz parte desta recriação.`);

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: t("Menu_Steam"),
      items: [
        { label: t("Menu_ChangeAccount"), onSelect: () => logout() },
        { label: t("Menu_SignOut"), onSelect: () => logout() },
        { label: t("Menu_GoOffline"), onSelect: () => ui.setStatus("offline") },
        { kind: "separator" },
        { label: t("Menu_CheckForSteamUpdates"), onSelect: () => (refresh(), ui.toast("Dados da biblioteca recarregados do disco.")) },
        { label: t("Menu_BackupRestore"), onSelect: soon("Restaurar cópia de segurança") },
        { kind: "separator" },
        { label: t("Menu_Settings"), onSelect: () => nav("/settings/account") },
        { kind: "separator" },
        { label: t("Menu_Exit"), onSelect: soon("Sair") },
      ],
    },
    {
      label: t("Menu_View"),
      items: [
        { label: t("Menu_Store"), onSelect: () => nav("/store") },
        { label: t("Menu_Library"), onSelect: () => nav("/library/home") },
        { label: t("Menu_Collections"), onSelect: () => nav("/library/collections") },
        { label: t("Menu_Downloads"), onSelect: () => nav("/library/downloads") },
        { kind: "separator" },
        { label: t("Menu_HiddenGames"), onSelect: () => nav("/library/collection/hidden") },
        { kind: "separator" },
        { label: t("Menu_SmallMode"), checked: ui.smallMode, onSelect: () => ui.setSmallMode(true) },
        { label: t("Menu_LargeMode"), checked: !ui.smallMode, onSelect: () => ui.setSmallMode(false) },
        { label: t("Menu_BigPictureMode"), onSelect: soon("Modo Big Picture") },
      ],
    },
    {
      label: t("Menu_Friends"),
      items: [
        { label: t("Menu_ViewFriendsList", 0), onSelect: () => ui.setFriendsOpen(true) },
        { label: t("Menu_AddFriend"), onSelect: soon("Pedidos de amizade") },
        { label: t("Menu_EditProfile"), onSelect: () => nav("/profile") },
        { kind: "separator" },
        ...(["online", "away", "invisible", "offline"] as PersonaStatus[]).map((s) => ({
          label: STATUS_LABEL[s],
          checked: ui.status === s,
          onSelect: () => ui.setStatus(s),
        })),
      ],
    },
    {
      label: t("Menu_Games"),
      items: [
        { label: t("Menu_ViewLibrary"), onSelect: () => nav("/library/home") },
        { label: t("Menu_ActivateRetail"), onSelect: soon("Ativação de produtos") },
        { label: t("Menu_RedeemWallet"), onSelect: soon("Códigos da Carteira") },
        { label: t("Menu_ManageGifts"), onSelect: soon("Presentes") },
        { label: t("Menu_AddNonSteam"), onSelect: soon("Ferramentas não LAB") },
      ],
    },
    {
      label: t("Menu_Help"),
      items: [
        { label: t("Menu_Support"), onSelect: () => window.open("https://help.steampowered.com/", "_blank", "noopener") },
        { label: t("Menu_PrivacyPolicy"), onSelect: () => window.open("https://store.steampowered.com/privacy_agreement/", "_blank", "noopener") },
        { label: t("Menu_SSA"), onSelect: () => window.open("https://store.steampowered.com/subscriber_agreement/", "_blank", "noopener") },
        { kind: "separator" },
        { label: t("Menu_SystemInfo"), onSelect: () => ui.toast(`Navegador: ${navigator.userAgent.split(") ")[0]})`) },
        { label: "Sobre esta recriação", onSelect: () => ui.setAboutOpen(true) },
      ],
    },
  ];

  return (
    <header className="titlebar">
      <div className="titlebar__left">
        <div className="titlebar__mark-wrap" title="LAB • Laboratório de Interação">
          <IconMark className="titlebar__mark" />
        </div>
        {menus.map((m) => (
          <Menu key={m.label} items={m.items} trigger={(open) => <span className={`titlebar__menu ${open ? "is-open" : ""}`}>{m.label}</span>} />
        ))}
      </div>
      <div className="titlebar__drag" />
      <div className="titlebar__right">
        <button className="titlebar__btn" title="Notificações" onClick={() => ui.toast("Nenhuma notificação nova.")}>
          <IconBell size={15} />
        </button>
        <Menu
          align="right"
          items={[
            { label: t("Menu_ViewMyProfile"), onSelect: () => nav("/profile") },
            { label: `Detalhes da conta: ${snapshot?.user?.personaName ?? ""}`, onSelect: () => nav("/settings/account") },
            { label: t("Menu_StorePreferences"), onSelect: () => nav("/settings/store") },
            { kind: "separator" },
            { label: t("Menu_ChangeAccount"), onSelect: () => logout() },
            { label: t("Menu_SignOut"), onSelect: () => logout() },
          ]}
          trigger={(open) => (
            <span className={`titlebar__account ${open ? "is-open" : ""}`}>
              <Avatar size={20} />
              <span className="titlebar__persona">{snapshot?.user?.personaName ?? "…"}</span>
              <IconChevronDown size={12} />
            </span>
          )}
        />
        <div className="titlebar__window" aria-hidden title="Controles de janela (decorativos no navegador)">
          <span><IconMinimize size={14} /></span>
          <span><IconMaximize size={12} /></span>
          <span className="is-close"><IconClose size={14} /></span>
        </div>
      </div>
    </header>
  );
}
