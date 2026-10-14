import { useNavigate } from "react-router-dom";
import { useDownloads, useLibrary } from "../api";
import { selectDownloads } from "../downloads";
import { formatBytes } from "../format";
import { t } from "../i18n";
import { useUi } from "../ui";
import { IconDownload, IconPlus, IconUsers } from "./Icons";
import { Menu } from "./Menu";

/** Bottom strip: "Adicionar jogo", download status (center) and "Amigos e conversas". */
export function BottomBar() {
  const nav = useNavigate();
  const ui = useUi();
  const { snapshot } = useLibrary();
  const { runs, completedInstalls } = useDownloads();
  const downloads = selectDownloads(snapshot?.apps ?? [], runs, completedInstalls);
  const current = downloads.transferring[0] ?? downloads.active[0] ?? downloads.queued[0];
  let label = t("BottomBar_Manage");
  let progress: number | null = null;
  if (current) {
    const state = current.state === "paused" ? t("BottomBar_DownloadsPaused")
      : current.state === "queued" ? "Na fila"
      : current.state === "update_required" ? "Atualização necessária"
      : t("BottomBar_Downloading");
    const d = current.app.download;
    const detail = current.source === "simulation" ? `${Math.round(current.progress * 100)}% — simulação`
      : d ? `${formatBytes(d.bytesDownloaded)} de ${formatBytes(d.bytesToDownload)}` : "";
    progress = current.state === "queued" || current.state === "update_required" ? null : current.progress;
    label = `${state} — ${current.app.name}${detail ? ` (${detail})` : ""}`;
  }

  return (
    <footer className="bottombar">
      <Menu
        items={[
          { label: t("BottomBar_AddNonSteam"), onSelect: () => ui.toast("Jogos não Steam não fazem parte desta recriação.") },
          { label: t("BottomBar_ActivateProduct"), onSelect: () => ui.toast("Ativação de produtos não faz parte desta recriação.") },
          { label: t("BottomBar_BrowseStore"), onSelect: () => nav("/store") },
        ]}
        trigger={() => (
          <span className="bottombar__btn">
            <IconPlus size={16} /> {t("BottomBar_AddGame")}
          </span>
        )}
      />
      <button className={`bottombar__downloads ${progress !== null ? "is-active" : ""}`} onClick={() => nav("/library/downloads")}>
        <IconDownload size={16} />
        <span className="bottombar__downloads-text">
          <span>{label}</span>
          {progress !== null && (
            <span className="bottombar__progress">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          )}
        </span>
      </button>
      <button className="bottombar__btn bottombar__friends" onClick={() => ui.setFriendsOpen(!ui.friendsOpen)}>
        {t("BottomBar_FriendsAndChat")} <IconUsers size={18} />
      </button>
    </footer>
  );
}
