import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useLibrary } from "../api";
import {
  IconCamera,
  IconCopy,
  IconGrid,
  IconList,
  IconPlay,
  IconSearch,
  IconShare,
  IconTrash,
  IconVideo,
} from "../components/Icons";
import { ModalWindow } from "../components/Modal";
import { formatBytes, formatDate } from "../format";
import { t } from "../i18n";
import {
  filterMedia,
  formatMediaDuration,
  generateInitialMedia,
  groupMediaBySession,
} from "../media";
import type { MediaFilter, MediaItem, MediaType } from "../types";
import { useUi } from "../ui";

const STORAGE_KEY = "steam-recriada:media-items";

function loadSavedMedia(): MediaItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MediaItem[]) : null;
  } catch {
    return null;
  }
}

function persistMedia(items: MediaItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage quota or unavailable
  }
}

export function MediaPage() {
  const { snapshot } = useLibrary();
  const ui = useUi();
  const nav = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // Initialize media from local storage or generated from user's installed library
  const [items, setItems] = useState<MediaItem[]>(() => {
    const saved = loadSavedMedia();
    if (saved && saved.length > 0) return saved;
    return generateInitialMedia(snapshot?.apps ?? []);
  });

  // Keep synced if user library loads later and we have no items
  useEffect(() => {
    if (items.length === 0 && snapshot?.apps && snapshot.apps.length > 0) {
      const init = generateInitialMedia(snapshot.apps);
      setItems(init);
      persistMedia(init);
    }
  }, [items.length, snapshot?.apps]);

  // View mode: grid vs list based on route or state
  const isListView = location.pathname.includes("/list");
  const setViewMode = (mode: "grid" | "list") => {
    const search = location.search;
    nav(`/media/${mode}${search}`, { replace: true });
  };

  // Filter state
  const appParam = params.get("app");
  const typeParam = params.get("type") as "all" | MediaType | null;
  const initialAppId = appParam ? Number(appParam) : undefined;

  const [filter, setFilter] = useState<MediaFilter>({
    mediaType: typeParam ?? "all",
    listSource: initialAppId ? { type: "app", gameid: initialAppId } : { type: "recents" },
    query: "",
  });

  // Sync route params with filter
  useEffect(() => {
    if (appParam) {
      setFilter((f) => ({ ...f, listSource: { type: "app", gameid: Number(appParam) } }));
    }
    if (typeParam) {
      setFilter((f) => ({ ...f, mediaType: typeParam }));
    }
  }, [appParam, typeParam]);

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Active item in lightbox viewer
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);

  // Filtered items
  const filteredItems = useMemo(() => filterMedia(items, filter), [items, filter]);
  const sessionGroups = useMemo(() => groupMediaBySession(filteredItems), [filteredItems]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    const next = items.filter((i) => !selectedIds.has(i.id));
    setItems(next);
    persistMedia(next);
    ui.toast(`${selectedIds.size} item(ns) excluído(s).`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const copyToClipboard = () => {
    if (selectedIds.size === 0) return;
    navigator.clipboard?.writeText?.(
      filteredItems
        .filter((i) => selectedIds.has(i.id))
        .map((i) => `${i.appName}: ${i.caption ?? i.type} (${i.mediaUrl ?? ""})`)
        .join("\n"),
    );
    ui.toast("Links copiados para a área de transferência!");
  };

  const exportSelected = () => {
    ui.toast(`Exportando ${selectedIds.size} item(ns) de mídia...`);
  };

  // Simulates capturing a screenshot (F12) or saving a clip (F11)
  const simulateCapture = (type: MediaType = "screenshot") => {
    const apps = snapshot?.apps ?? [];
    const source = filter.listSource;
    const app =
      source.type === "app"
        ? apps.find((a) => a.appid === source.gameid) ?? apps[0]
        : apps[Math.floor(Math.random() * Math.min(4, Math.max(1, apps.length)))] ?? {
            appid: 400,
            name: "Portal: First Slice",
            art: { hero: true },
          };

    const newItem: MediaItem = {
      id: `${type}-${Date.now()}`,
      appid: app.appid,
      appName: app.name,
      type,
      timestamp: Date.now(),
      fileSizeBytes: type === "screenshot" ? 2_600_000 : 38_000_000,
      durationMs: type === "clip" ? 28_000 : type === "recording" ? 300_000 : undefined,
      thumbnailUrl: `/api/art/${app.appid}/hero`,
      mediaUrl: `/api/art/${app.appid}/hero`,
      caption: type === "screenshot" ? `Captura rápida (F12)` : `Novo clipe gravado`,
      width: 1920,
      height: 1080,
    };

    const next = [newItem, ...items];
    setItems(next);
    persistMedia(next);
    ui.toast(
      type === "screenshot"
        ? `Captura de tela salva para ${app.name}!`
        : `Clipe salvo para ${app.name}!`,
    );
  };

  // Keyboard shortcut for F12 screenshot simulation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        simulateCapture("screenshot");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [snapshot?.apps, filter.listSource]);

  return (
    <div className="media-page">
      {/* Top Header */}
      <div className="media-page__header">
        <div className="media-page__title-area">
          <h1 className="media-page__title">{t("MediaManager_Dialog_Header")}</h1>
          <div className="media-page__actions">
            <button
              className="btn btn--sm"
              title="Capturar tela rápida (F12)"
              onClick={() => simulateCapture("screenshot")}
            >
              <IconCamera size={14} /> Capturar tela (F12)
            </button>
            <button
              className="btn btn--sm"
              title="Criar novo clipe"
              onClick={() => simulateCapture("clip")}
            >
              <IconVideo size={14} /> Novo clipe
            </button>
          </div>
        </div>

        {/* Action / Filter Bar */}
        <div className="media-page__toolbar">
          <div className="media-page__toolbar-left">
            {/* View Mode Buttons */}
            <div className="media-page__view-toggle">
              <button
                className={`media-page__toggle-btn ${!isListView ? "is-active" : ""}`}
                title={t("MediaManager_GridView_Tooltip")}
                onClick={() => setViewMode("grid")}
              >
                <IconGrid size={16} />
              </button>
              <button
                className={`media-page__toggle-btn ${isListView ? "is-active" : ""}`}
                title={t("MediaManager_ListView_Tooltip")}
                onClick={() => setViewMode("list")}
              >
                <IconList size={16} />
              </button>
            </div>

            {/* App Filter Dropdown */}
            <select
              className="media-page__select"
              value={filter.listSource.type === "app" ? filter.listSource.gameid : "recents"}
              onChange={(e) => {
                const val = e.target.value;
                const newSource =
                  val === "recents"
                    ? ({ type: "recents" } as const)
                    : ({ type: "app", gameid: Number(val) } as const);
                setFilter((f) => ({ ...f, listSource: newSource }));
                if (val === "recents") {
                  params.delete("app");
                  setParams(params);
                } else {
                  setParams({ ...Object.fromEntries(params), app: val });
                }
              }}
            >
              <option value="recents">{t("MediaManager_AllApps_Dropdown")}</option>
              {(snapshot?.apps ?? []).map((a) => (
                <option key={a.appid} value={a.appid}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Media Type Dropdown */}
            <select
              className="media-page__select"
              value={filter.mediaType}
              onChange={(e) => {
                const val = e.target.value as "all" | MediaType;
                setFilter((f) => ({ ...f, mediaType: val }));
              }}
            >
              <option value="all">{t("MediaManager_MediaType_All")}</option>
              <option value="clip">{t("MediaManager_MediaType_Clip")}</option>
              <option value="screenshot">{t("MediaManager_MediaType_Screenshot")}</option>
              <option value="recording">{t("MediaManager_MediaType_Recording")}</option>
            </select>

            {/* Text Search */}
            <label className="media-page__search">
              <IconSearch size={14} />
              <input
                placeholder={t("ClipMananger_Search_Placeholder")}
                value={filter.query ?? ""}
                onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
              />
            </label>
          </div>

          <div className="media-page__toolbar-right">
            {selectMode && (
              <>
                <button
                  className="btn btn--sm"
                  onClick={selectedIds.size === filteredItems.length ? deselectAll : selectAll}
                >
                  {selectedIds.size > 0
                    ? t("ScreenshotUploader_DeselectAll")
                    : t("ScreenshotUploader_SelectAll")}
                </button>
                <button
                  className="btn btn--sm"
                  disabled={selectedIds.size === 0}
                  onClick={copyToClipboard}
                  title={t("MediaManager_MultiSelect_CopyToClipboard")}
                >
                  <IconCopy size={14} /> Copiar
                </button>
                <button
                  className="btn btn--sm"
                  disabled={selectedIds.size === 0}
                  onClick={exportSelected}
                  title={t("MediaManager_MultiSelect_Save")}
                >
                  <IconShare size={14} /> Exportar
                </button>
                <button
                  className="btn btn--sm btn--danger"
                  disabled={selectedIds.size === 0}
                  onClick={deleteSelected}
                  title={t("MediaManager_Delete")}
                >
                  <IconTrash size={14} /> Excluir ({selectedIds.size})
                </button>
              </>
            )}

            <button
              className={`btn btn--sm ${selectMode ? "btn--accent" : ""}`}
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedIds(new Set());
              }}
            >
              {selectMode ? "Concluído" : t("MediaManager_EnterSelectMode")}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="media-page__content">
        {filteredItems.length === 0 ? (
          <div className="media-page__empty">
            <p className="muted">{t("AppDetails_NoScreenshots")}</p>
            <p className="small muted">
              Pressione <kbd>F12</kbd> ou use o botão acima para salvar novas capturas e clipes.
            </p>
          </div>
        ) : isListView ? (
          /* Session List View */
          <div className="media-sessions">
            {sessionGroups.map((g) => (
              <section key={g.sessionKey} className="media-session">
                <div className="media-session__header">
                  <h3 className="media-session__title">{g.sessionTitle}</h3>
                  <span className="media-session__count muted small">
                    {g.items.length} item(ns)
                  </span>
                </div>
                <div className="media-grid">
                  {g.items.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      selectMode={selectMode}
                      selected={selectedIds.has(item.id)}
                      onToggleSelect={() => toggleSelect(item.id)}
                      onOpen={() => setActiveItem(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Grid View */
          <div className="media-grid">
            {filteredItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                selectMode={selectMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onOpen={() => setActiveItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Video Player Modal */}
      {activeItem && (
        <MediaViewerModal item={activeItem} onClose={() => setActiveItem(null)} />
      )}
    </div>
  );
}

function MediaCard({
  item,
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
}: {
  item: MediaItem;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={`media-card ${selected ? "is-selected" : ""}`}
      onClick={() => {
        if (selectMode) onToggleSelect();
        else onOpen();
      }}
    >
      <div className="media-card__thumb-container">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.caption ?? item.appName}
            className="media-card__thumb"
            loading="lazy"
          />
        ) : (
          <div className="media-card__placeholder">
            {item.type === "screenshot" ? <IconCamera size={28} /> : <IconVideo size={28} />}
          </div>
        )}

        {/* Type & Duration Badge */}
        <div className="media-card__badges">
          {item.type !== "screenshot" && (
            <span className="media-card__badge media-card__badge--video">
              <IconPlay size={10} /> {formatMediaDuration(item.durationMs ?? 0)}
            </span>
          )}
          {item.type === "recording" && (
            <span className="media-card__badge media-card__badge--rec">REC</span>
          )}
        </div>

        {/* Selection Checkbox */}
        {selectMode && (
          <div className={`media-card__checkbox ${selected ? "is-checked" : ""}`}>
            {selected && "✓"}
          </div>
        )}
      </div>

      <div className="media-card__info">
        <div className="media-card__name" title={item.caption || item.appName}>
          {item.caption || item.appName}
        </div>
        <div className="media-card__meta muted small">
          <span>{item.appName}</span> • <span>{formatDate(item.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

function MediaViewerModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const ui = useUi();
  const [isPlaying, setIsPlaying] = useState(item.type !== "screenshot");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const duration = item.durationMs ?? 30_000;

  // Fake timeline playback
  useEffect(() => {
    if (!isPlaying || item.type === "screenshot") return;
    const interval = setInterval(() => {
      setCurrentTimeMs((t) => (t + 500 >= duration ? 0 : t + 500));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, item.type, duration]);

  const copyLink = () => {
    navigator.clipboard?.writeText?.(item.mediaUrl ?? "");
    ui.toast("Link da imagem copiado!");
  };

  return (
    <ModalWindow
      title={`${item.appName} — ${item.type === "screenshot" ? "Captura de tela" : "Gravação"}`}
      onClose={onClose}
    >
      <div className="media-viewer">
        <div className="media-viewer__media">
          {item.mediaUrl ? (
            <img src={item.mediaUrl} alt={item.caption ?? ""} className="media-viewer__img" />
          ) : (
            <div className="media-viewer__placeholder">Mídia não disponível</div>
          )}

          {item.type !== "screenshot" && (
            <button
              className="media-viewer__play-overlay"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <IconPlay size={36} />
            </button>
          )}
        </div>

        {/* Video Timeline with Markers */}
        {item.type !== "screenshot" && (
          <div className="media-timeline">
            <div className="media-timeline__controls">
              <button className="btn btn--sm" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? "Pausar" : "Reproduzir"}
              </button>
              <span className="mono small">
                {formatMediaDuration(currentTimeMs)} / {formatMediaDuration(duration)}
              </span>
            </div>

            <div
              className="media-timeline__bar"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                setCurrentTimeMs(Math.floor(pct * duration));
              }}
            >
              <div
                className="media-timeline__progress"
                style={{ width: `${(currentTimeMs / duration) * 100}%` }}
              />

              {/* Event Markers on timeline */}
              {(item.timelineEvents ?? []).map((ev, i) => (
                <div
                  key={i}
                  className={`media-timeline__marker media-timeline__marker--${ev.kind}`}
                  style={{ left: `${(ev.timeMs / duration) * 100}%` }}
                  title={`${ev.label} (${formatMediaDuration(ev.timeMs)})`}
                />
              ))}
            </div>

            {/* Marker List */}
            {item.timelineEvents && item.timelineEvents.length > 0 && (
              <div className="media-timeline__events">
                {item.timelineEvents.map((ev, i) => (
                  <button
                    key={i}
                    className="media-timeline__event-chip"
                    onClick={() => setCurrentTimeMs(ev.timeMs)}
                  >
                    <span className="dot" /> {ev.label} ({formatMediaDuration(ev.timeMs)})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="media-viewer__details">
          <dl className="info-grid info-grid--compact">
            <dt>Ferramenta</dt>
            <dd>{item.appName}</dd>
            <dt>Data</dt>
            <dd>{formatDate(item.timestamp)}</dd>
            <dt>Dimensões</dt>
            <dd>
              {item.width ?? 1920} × {item.height ?? 1080}
            </dd>
            <dt>Tamanho</dt>
            <dd>{formatBytes(item.fileSizeBytes)}</dd>
          </dl>

          <div className="btn-row">
            <button className="btn" onClick={copyLink}>
              <IconCopy size={14} /> Copiar link
            </button>
            <button className="btn" onClick={() => ui.toast("Mídia exportada com sucesso!")}>
              <IconShare size={14} /> Exportar arquivo
            </button>
            <button className="btn btn--ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </ModalWindow>
  );
}
