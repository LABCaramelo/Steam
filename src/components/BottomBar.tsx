import { useCommunity } from "../community";
import { t } from "../i18n";
import { useUi } from "../ui";
import { IconUsers } from "./Icons";

/** Faixa inferior: atalho para o painel de Comunidade (amigos e conversas). */
export function BottomBar() {
  const ui = useUi();
  const { totalUnread } = useCommunity();

  return (
    <footer className="bottombar">
      <button className="bottombar__btn bottombar__friends" onClick={() => ui.setFriendsOpen(!ui.friendsOpen)}>
        {t("BottomBar_FriendsAndChat")}
        {totalUnread > 0 && (
          <span className="friends__badge" aria-label={`${totalUnread} mensagens novas`}>
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
        <IconUsers size={18} />
      </button>
    </footer>
  );
}
