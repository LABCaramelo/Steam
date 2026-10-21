import { GlideMenu, SpotlightTabs, ThemeToggle } from "@caramelo/design-system";
import { useEffect, useMemo, useRef, useState } from "react";
import { Confirm, downloadFile, isEmbedded, useToast } from "../shared/kit";
import {
  IconBoard,
  IconCalendar,
  IconChart,
  IconChevronDown,
  IconClose,
  IconFilter,
  IconMenu,
  IconSearch,
  IconStar,
  IconTable,
} from "../shared/icons";
import { BoardDrawer } from "./BoardDrawer";
import { BoardView } from "./BoardView";
import { CardModal } from "./CardModal";
import { blankBoard, type BoardsApi } from "./KanbanApp";
import type { KanbanRepo } from "./repo";
import { ROUTINE_KEY, ROUTINE_TEMPLATE, contentFromFile, fileFromBoard } from "./template";
import type { Board, Card } from "./types";
import { useBoard } from "./useBoard";
import { AgendaView, MetricsView, TableView, cardsCsv } from "./views";

export type View = "board" | "agenda" | "table" | "metrics";
export type StatusFilter = "all" | "pending" | "done";

export interface Filters {
  query: string;
  labels: string[];
  status: StatusFilter;
}

const NO_FILTERS: Filters = { query: "", labels: [], status: "all" };
const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function matches(card: Card, f: Filters) {
  if (f.status === "done" && !card.done) return false;
  if (f.status === "pending" && card.done) return false;
  if (f.labels.length && !card.label_ids.some((id) => f.labels.includes(id))) return false;
  if (f.query) {
    const q = fold(f.query);
    if (!fold(card.name).includes(q) && !fold(card.description).includes(q)) return false;
  }
  return true;
}

const VIEWS = [
  { id: "board", label: "Quadro", icon: <IconBoard /> },
  { id: "agenda", label: "Agenda semanal", icon: <IconCalendar /> },
  { id: "table", label: "Tabela", icon: <IconTable /> },
  { id: "metrics", label: "Métricas", icon: <IconChart /> },
];

export function BoardScreen({ repo, board, boards, onImport, creating }: { repo: KanbanRepo; board: Board; boards: BoardsApi; onImport: () => void; creating: boolean }) {
  const toast = useToast();
  const api = useBoard(repo, board.id);
  const [view, setView] = useState<View>("board");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [name, setName] = useState(board.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const cancelName = useRef(false);

  useEffect(() => setName(board.name), [board.name]);
  useEffect(() => {
    document.title = `${board.name} · Kanban — LAB`;
  }, [board.name]);

  const activeFilters = (filters.query ? 1 : 0) + filters.labels.length + (filters.status !== "all" ? 1 : 0);
  const visibleCards = useMemo(() => api.content.cards.filter((c) => matches(c, filters)), [api.content.cards, filters]);

  const commitName = async () => {
    if (cancelName.current) { cancelName.current = false; setName(board.name); return; }
    const next = name.trim();
    if (!next) return setName(board.name);
    if (next !== board.name) {
      if (await boards.update(board.id, { name: next.slice(0, 120) })) void api.log(`Nome do quadro alterado para "${next}"`);
      else setName(board.name);
    }
  };

  const portableBoard = async () => {
    const content = await api.snapshot();
    const comments = [];
    // Fetch in small batches, including notes that were not opened in this session.
    for (let at = 0; at < content.cards.length; at += 16) {
      comments.push(...(await Promise.all(content.cards.slice(at, at + 16).map((card) => repo.listComments(card.id)))).flat());
    }
    return fileFromBoard(board, { ...content, comments });
  };

  const exportJson = async () => {
    try {
      downloadFile(`${slug(board.name)}.kanban.json`, JSON.stringify(await portableBoard(), null, 2));
      toast("Quadro e comentários exportados em JSON.", "success");
    } catch { toast("Não foi possível exportar o quadro completo. Confira sua conexão e tente novamente.", "error"); }
  };

  const exportCsv = async () => {
    const content = await api.snapshot();
    downloadFile(`${slug(board.name)}.csv`, cardsCsv([...content.lists].sort((a, b) => a.position - b.position), content.labels, content.cards), "text/csv;charset=utf-8");
    toast("Tarefas exportadas em CSV.", "success");
  };

  const duplicate = async () => {
    try {
      const copy = await boards.create({ ...await portableBoard(), name: `${board.name} (cópia)` }, board.template);
      if (copy) toast(`"${copy.name}" criado.`, "success");
    } catch { toast("Não foi possível copiar o quadro completo. Tente novamente.", "error"); }
  };

  const resetTemplate = async () => {
    setResetting(true);
    try {
      const previous = await api.snapshot();
      // Insert the replacement before deleting the current routine, so an insertion failure
      // cannot erase the user's existing lists and comments.
      await repo.insertContent(contentFromFile(board.id, ROUTINE_TEMPLATE));
      const listDeletes = await Promise.allSettled(previous.lists.map((list) => repo.deleteList(list.id)));
      if (listDeletes.some((result) => result.status === "rejected")) throw new Error("Listas não removidas");
      const labelDeletes = await Promise.allSettled(previous.labels.map((label) => repo.deleteLabel(label.id)));
      if (labelDeletes.some((result) => result.status === "rejected")) throw new Error("Etiquetas não removidas");
      api.log("Template original restaurado");
      await api.reload();
      toast("Template original restaurado.", "success");
    } catch {
      toast("A restauração não foi concluída. Confira o quadro recarregado antes de tentar novamente.", "error");
      await api.reload();
    } finally {
      setResetting(false);
    }
  };

  const switchItems = [
    ...boards.boards.map((b) => ({
      id: b.id,
      label: `${b.starred ? "★ " : ""}${b.name}`,
      icon: <IconBoard />,
      disabled: b.id === board.id,
      onSelect: () => boards.open(b.id),
    })),
    { id: "new-template", label: "Novo quadro do template", separator: true, disabled: creating, onSelect: () => void boards.create(ROUTINE_TEMPLATE, ROUTINE_KEY) },
    { id: "new-blank", label: "Novo quadro em branco", disabled: creating, onSelect: () => void boards.create(blankBoard()) },
    { id: "import", label: "Importar JSON…", onSelect: onImport },
  ];

  const selected = openCard ? api.card(openCard) : undefined;

  return (
    <div
      className={`kb kb--bg-${board.background}`}
      data-embedded={isEmbedded() || undefined}
      // Fundo Creme: o quadro inteiro usa o tema editorial Warm Cream do design system.
      data-caramelo-theme={board.background === "cream" ? "light" : undefined}
    >
      <header className="kb-head">
        <div className="kb-head__left">
          <GlideMenu
            label="Seus quadros"
            trigger={
              <span className="kb-switch">
                <IconBoard /> Quadros <IconChevronDown size={14} />
              </span>
            }
            triggerClassName="kb-switch__trigger"
            items={switchItems}
          />
          <input
            className="kb-title"
            aria-label="Nome do quadro"
            value={name}
            maxLength={120}
            disabled={boards.saving || resetting}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelName.current = true;
                e.currentTarget.blur();
              }
            }}
          />
          <button
            className={`tk-iconbtn ${board.starred ? "is-on" : ""}`}
            aria-pressed={board.starred}
            disabled={boards.saving || resetting}
            title={board.starred ? "Remover dos favoritos" : "Favoritar quadro"}
            onClick={async () => {
              if (await boards.update(board.id, { starred: !board.starred })) toast(board.starred ? "Quadro removido dos favoritos." : "Quadro favoritado.");
            }}
          >
            <IconStar fill={board.starred ? "currentColor" : "none"} />
          </button>
        </div>

        <SpotlightTabs ariaLabel="Visualização do quadro" className="kb-views" items={VIEWS} value={view} onValueChange={(id) => setView(id as View)} />

        <div className="kb-head__right">
          <label className="tk-search kb-search">
            <IconSearch />
            <span className="tk-sr-only">Buscar no quadro</span>
            <input
              className="tk-input"
              type="search"
              placeholder="Buscar no quadro"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            />
          </label>
          <button className={`cm-btn cm-btn--sm ${filterOpen ? "" : "cm-btn--ghost"}`} aria-expanded={filterOpen} onClick={() => setFilterOpen((o) => !o)}>
            <IconFilter size={16} /> Filtros {activeFilters > 0 && <span className="kb-count">{activeFilters}</span>}
          </button>
          <ThemeToggle className="kb-theme" />
          <span className="tk-dim kb-save-status" role="status">{api.saving ? "Salvando…" : api.error ? "Falha na conexão" : ""}</span>
          <button className="tk-iconbtn" aria-label="Menu do quadro" title="Menu do quadro" disabled={api.loading || !!api.error || resetting} onClick={() => setDrawerOpen(true)}>
            <IconMenu />
          </button>
        </div>
      </header>

      {filterOpen && (
        <div className="kb-filters">
          <div className="kb-filters__group">
            <span className="tk-label">Etiquetas</span>
            <div className="kb-filters__chips">
              {api.labels.map((label) => {
                const on = filters.labels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    className={`kb-label kb-label--${label.color} kb-label--chip ${on ? "is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => setFilters((f) => ({ ...f, labels: on ? f.labels.filter((id) => id !== label.id) : [...f.labels, label.id] }))}
                  >
                    {label.name || "Sem nome"}
                  </button>
                );
              })}
              {api.labels.length === 0 && <span className="tk-dim">Nenhuma etiqueta neste quadro.</span>}
            </div>
          </div>
          <div className="kb-filters__group">
            <span className="tk-label">Status</span>
            <div className="kb-seg" role="group" aria-label="Status">
              {(["all", "pending", "done"] as StatusFilter[]).map((s) => (
                <button key={s} className={filters.status === s ? "is-on" : ""} aria-pressed={filters.status === s} onClick={() => setFilters((f) => ({ ...f, status: s }))}>
                  {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : "Concluídos"}
                </button>
              ))}
            </div>
          </div>
          <button className="cm-btn cm-btn--sm cm-btn--ghost" disabled={activeFilters === 0} onClick={() => setFilters(NO_FILTERS)}>
            <IconClose size={16} /> Limpar filtros
          </button>
        </div>
      )}

      <main className="kb-main">
        {api.loading || resetting ? (
          <div className="tk-loading" role="status">
            <span className="tk-spinner" style={{ width: 18, height: 18 }} /> {resetting ? "Restaurando o template…" : "Abrindo o quadro…"}
          </div>
        ) : api.error ? (
          <div className="tk-empty" role="alert"><h2>O quadro não está disponível</h2><p>{api.error}</p><button className="cm-btn cm-btn--accent" onClick={() => void api.reload()}>Tentar novamente</button></div>
        ) : view === "board" ? (
          <BoardView api={api} filters={filters} onOpenCard={setOpenCard} />
        ) : view === "agenda" ? (
          <AgendaView api={api} cards={visibleCards} onOpenCard={setOpenCard} />
        ) : view === "table" ? (
          <TableView api={api} cards={visibleCards} onOpenCard={setOpenCard} onExportCsv={exportCsv} />
        ) : (
          <MetricsView api={api} />
        )}
      </main>

      {selected && <CardModal key={selected.id} api={api} repo={repo} card={selected} onClose={() => setOpenCard(null)} onOpenCard={setOpenCard} />}

      {drawerOpen && (
        <BoardDrawer
          api={api}
          board={board}
          boards={boards}
          onClose={() => setDrawerOpen(false)}
          onExportJson={exportJson}
          onExportCsv={exportCsv}
          onImport={onImport}
          onDuplicate={duplicate}
          onResetTemplate={() => { setDrawerOpen(false); setConfirmReset(true); }}
        />
      )}

      {confirmReset && (
        <Confirm
          title="Restaurar o template?"
          text={
            <p>
              As listas, os cartões e as etiquetas de <b>{board.name}</b> voltam a ser os da Rotina Superprodutiva. Tudo o que você mudou neste quadro será apagado.
            </p>
          }
          confirmLabel="Restaurar template"
          danger
          onConfirm={resetTemplate}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

export const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "quadro";
