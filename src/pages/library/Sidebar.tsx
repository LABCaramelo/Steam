import { useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useDownloads, useLibrary, useRun } from "../../api";
import { AppIcon } from "../../components/AppArt";
import { IconChevronDown, IconClock, IconFilter, IconGrid, IconHome, IconPlay, IconSearch } from "../../components/Icons";
import { Menu } from "../../components/Menu";
import { recencyBucket } from "../../format";
import { t } from "../../i18n";
import type { LibraryApp } from "../../types";
import { useUi } from "../../ui";
import type { ContextTarget } from "./GameContextMenu";
import { usePlayAction } from "./play";

type TypeFilter = "games" | "software" | "all";
const TYPE_LABEL: Record<TypeFilter, string> = { games: "Jogos", software: "Software", all: "Jogos e software" };

function matchesType(a: LibraryApp, f: TypeFilter) {
  if (f === "all") return true;
  const software = a.type === "application";
  return f === "software" ? software : !software;
}

interface Section {
  key: string;
  label: string;
  apps: LibraryApp[];
}

export function Sidebar({ onContext }: { onContext: (t: ContextTarget) => void }) {
  const { snapshot, collections } = useLibrary();
  const { installedAppIds } = useDownloads();
  const nav = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("games");
  const [recent, setRecent] = useState(false);
  const [readyOnly, setReadyOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hidden = new Set(collections.find((c) => c.id === "hidden")?.appids ?? []);
    return (snapshot?.apps ?? []).filter(
      (a) => matchesType(a, typeFilter) && (!readyOnly || a.installed || installedAppIds[a.appid]) && (q ? a.name.toLowerCase().includes(q) : !hidden.has(a.appid)),
    );
  }, [snapshot, collections, typeFilter, readyOnly, query, installedAppIds]);

  const sections = useMemo<Section[]>(() => {
    if (query.trim()) return [{ key: "search", label: t("GameList_SectionHeader_SearchResults"), apps: visible }];
    if (recent) {
      const byBucket = new Map<string, LibraryApp[]>();
      const sorted = [...visible].sort((a, b) => b.lastPlayed - a.lastPlayed);
      for (const a of sorted) {
        const k = a.lastPlayed ? recencyBucket(a.lastPlayed) : "Sem atividade registrada";
        byBucket.set(k, [...(byBucket.get(k) ?? []), a]);
      }
      return [...byBucket].map(([k, apps]) => ({ key: k, label: k, apps }));
    }
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
  }, [visible, recent, collections, query]);

  return (
    <aside className="sidebar">
      <div className="sidebar__home">
        <NavLink to="/library/home" className={({ isActive }) => `sidebar__home-btn ${isActive ? "is-active" : ""}`}>
          <IconHome size={16} /> {t("GameList_Home").toUpperCase()}
        </NavLink>
        <button className="sidebar__icon-btn" title={t("GameList_Category_YourCollections")} onClick={() => nav("/library/collections")}>
          <IconGrid size={16} />
        </button>
      </div>

      <div className="sidebar__filters">
        <Menu
          items={(Object.keys(TYPE_LABEL) as TypeFilter[]).map((k) => ({ label: TYPE_LABEL[k], checked: typeFilter === k, onSelect: () => setTypeFilter(k) }))}
          trigger={() => (
            <span className="sidebar__type">
              {TYPE_LABEL[typeFilter].toUpperCase()} <IconChevronDown size={12} />
            </span>
          )}
        />
        <div className="sidebar__toggles">
          <button className={`sidebar__icon-btn ${recent ? "is-on" : ""}`} title={t("GameList_View_Recent")} onClick={() => setRecent((r) => !r)}>
            <IconClock size={16} />
          </button>
          <button
            className={`sidebar__icon-btn ${readyOnly ? "is-on" : ""}`}
            title={t("GameList_View_ShowOnlyReadyToPlay")}
            onClick={() => setReadyOnly((r) => !r)}
          >
            <IconPlay size={14} />
          </button>
        </div>
      </div>

      <label className="sidebar__search">
        <IconSearch size={14} />
        <input placeholder={t("GameList_Search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <IconFilter size={14} className="sidebar__search-filter" />
      </label>

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
        {snapshot && sections.length === 0 && <div className="sidebar__loading">Nenhum jogo corresponde ao filtro.</div>}
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
      {run.kind === "running" && <span className="gamelist-entry__tag">Jogando</span>}
      {run.kind === "installing" && <span className="gamelist-entry__tag">{run.paused ? "Em pausa" : `${Math.round(run.progress * 100)}%`}</span>}
      {app.download?.state === "update_required" && <span className="gamelist-entry__tag">Atualização</span>}
    </div>
  );
}
