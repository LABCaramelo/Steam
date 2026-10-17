import { useNavigate } from "react-router-dom";
import { useLibrary } from "../api";
import { useAuth } from "../auth";
import { t } from "../i18n";
import { useUi } from "../ui";
import { Avatar } from "./Avatar";
import { IconBell, IconChevronDown, IconClose, IconMark, IconMaximize, IconMinimize } from "./Icons";
import { Menu } from "./Menu";

/** Top strip: client menus (LAB / Exibir / Amigos / Ferramentas / Ajuda), notifications, account and window controls. */
export function TitleBar() {
  const nav = useNavigate();
  const ui = useUi();
  const { logout } = useAuth();
  const { snapshot } = useLibrary();

  return (
    <header className="titlebar">
      <div className="titlebar__left">
        <div className="titlebar__mark-wrap" title="LAB • Laboratório de Interação">
          <IconMark className="titlebar__mark" />
        </div>
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
