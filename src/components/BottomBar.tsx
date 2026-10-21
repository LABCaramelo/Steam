import { useNavigate } from "react-router-dom";
import { useCommunity } from "../community";
import { t } from "../i18n";
import { useUi } from "../ui";
import { IconPlus, IconUsers } from "./Icons";
import { Menu } from "./Menu";

/** Bottom strip: "Adicionar ferramenta" and "Comunidade". */
export function BottomBar() {
  const nav = useNavigate();
  const ui = useUi();
  const { totalUnread } = useCommunity();

  return (
    <footer className="bottombar">
      <Menu
        items={[
          { label: t("BottomBar_AddNonSteam"), onSelect: () => ui.toast("Ferramentas não LAB não fazem parte desta recriação.") },
          { label: t("BottomBar_ActivateProduct"), onSelect: () => ui.toast("Ativação de produtos não faz parte desta recriação.") },
          { label: t("BottomBar_BrowseStore"), onSelect: () => nav("/store") },
        ]}
        trigger={() => (
          <span className="bottombar__btn">
            <IconPlus size={16} /> {t("BottomBar_AddGame")}
          </span>
        )}
      />
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
