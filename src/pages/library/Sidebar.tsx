import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDownloads, useLibrary, useRun } from "../../api";
import { AppIcon } from "../../components/AppArt";
import { t } from "../../i18n";
import type { LibraryApp } from "../../types";
import { useUi } from "../../ui";
import type { ContextTarget } from "./GameContextMenu";
import { usePlayAction } from "./play";

interface Section {
  key: string;
  label: string;
  apps: LibraryApp[];
}

export function Sidebar({ onContext }: { onContext: (t: ContextTarget) => void }) {
  const { snapshot, collections } = useLibrary();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    const hidden = new Set(collections.find((c) => c.id === "hidden")?.appids ?? []);
    return (snapshot?.apps ?? []).filter((a) => !hidden.has(a.appid));
  }, [snapshot, collections]);

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    const inSome = new Set<number>();
    const ordered = [...collections].sort((a, b) => (a.id === "favorite" ? -1 : b.id === "favorite" ? 1 : a.name.localeCompare(b.name)));
    for (const c of ordered) {
      if (c.id === "hidden") continue;
      const apps = visible.filter((a) => c.appids.includes(a.appid));
      c.appids.forEach((id) => inSome.add(id));
      if (apps.length) out.push({ key: c.id, label: c.id === "favorite" ? t("GameList_Category_Favorites") : c.name, apps });
    }
    const rest = visible.filter((a) => !inSome.has(a.appid));
    if (rest.length) out.push({ key: "uncategorized", label: t("GameList_Category_Uncategorized"), apps: rest });
    return out;
  }, [visible, collections]);

  return (
    <aside className="sidebar">
      <div className="sidebar__list">
        {!snapshot && <div className="sidebar__loading">Carregando biblioteca…</div>}
        {sections.map((s) => (
          <section key={s.key} className="gamelist-section">
            <button className="gamelist-section__head" onClick={() => setCollapsed((c) => ({ ...c, [s.key]: !c[s.key] }))}>
              <span className="gamelist-section__toggle">{collapsed[s.key] ? "+" : "—"}</span>
              {s.label.toUpperCase()} <span className="gamelist-section__count">({s.apps.length})</span>
            </button>
            {!collapsed[s.key] && s.apps.map((a) => <GameListEntry key={a.appid} app={a} onContext={onContext} />)}
          </section>
        ))}
        {snapshot && sections.length === 0 && <div className="sidebar__loading">Nenhuma ferramenta encontrada.</div>}
      </div>
    </aside>
  );
}

function GameListEntry({ app, onContext }: { app: LibraryApp; onContext: (t: ContextTarget) => void }) {
  const { appid } = useParams();
  const nav = useNavigate();
  const ui = useUi();
  const [run] = useRun(app.appid);
  const downloads = useDownloads();
  const play = usePlayAction(app);
  const installed = app.installed || downloads.isInstalled(app.appid) || run.kind === "installed" || run.kind === "running";
  const cls = [
    "gamelist-entry",
    Number(appid) === app.appid ? "is-selected" : "",
    installed ? "is-installed" : "",
    run.kind === "running" ? "is-running" : "",
    app.download || run.kind === "installing" ? "is-updating" : "",
  ].join(" ");
  return (
    <div
      className={cls}
      role="button"
      tabIndex={0}
      onClick={() => nav(`/library/app/${app.appid}`)}
      onDoubleClick={play.onClick}
      onKeyDown={(e) => e.key === "Enter" && nav(`/library/app/${app.appid}`)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext({ app, x: e.clientX, y: e.clientY });
      }}
    >
      {ui.settings.showGameIconsInList && <AppIcon app={app} />}
      <span className="gamelist-entry__name">{app.name}</span>
      {app.tool?.stage === "beta" && <span className="gamelist-entry__tag gamelist-entry__tag--beta">Beta</span>}
      {run.kind === "running" && <span className="gamelist-entry__tag">Em uso</span>}
      {run.kind === "installing" && <span className="gamelist-entry__tag">{run.paused ? "Em pausa" : `${Math.round(run.progress * 100)}%`}</span>}
      {app.download?.state === "update_required" && <span className="gamelist-entry__tag">Atualização</span>}
    </div>
  );
}
