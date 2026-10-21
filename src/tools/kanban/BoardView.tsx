import { GlideMenu } from "@caramelo/design-system";
import { useRef, useState, type DragEvent } from "react";
import { Confirm, useToast } from "../shared/kit";
import { IconCheck, IconChecklist, IconClose, IconDots, IconPlus, IconText } from "../shared/icons";
import { matches, type Filters } from "./BoardScreen";
import type { Card, Label, List } from "./types";
import type { BoardApi } from "./useBoard";

const DRAG_TYPE = "application/x-lab-kanban-card";
const LIST_DRAG_TYPE = "application/x-lab-kanban-list";

interface DropTarget {
  listId: string;
  beforeId: string | null;
}

/** Columns with drag and drop. Keyboard and touch users move cards from the card window. */
export function BoardView({ api, filters, onOpenCard }: { api: BoardApi; filters: Filters; onOpenCard: (id: string) => void }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [draggingList, setDraggingList] = useState<string | null>(null);
  const [listTarget, setListTarget] = useState<string | null | undefined>(undefined);
  const [addingList, setAddingList] = useState(false);
  const labelsById = new Map(api.labels.map((l) => [l.id, l]));

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const listId = e.dataTransfer.getData(LIST_DRAG_TYPE) || draggingList;
    if (listId) {
      if (listTarget !== undefined) void api.reorderList(listId, listTarget);
      setDraggingList(null);
      setListTarget(undefined);
      return;
    }
    const id = e.dataTransfer.getData(DRAG_TYPE) || dragging;
    if (id && target) api.moveCard(id, target.listId, target.beforeId);
    setDragging(null);
    setTarget(null);
  };

  return (
    <div className="kb-board" onDragEnd={() => { setDragging(null); setTarget(null); setDraggingList(null); setListTarget(undefined); }} onDrop={onDrop} onDragOver={(e) => {
      if (draggingList && e.target === e.currentTarget) { e.preventDefault(); setListTarget(null); }
    }}>
      {api.lists.map((list, index) => (
        <ListColumn
          key={list.id}
          api={api}
          list={list}
          cards={api.cardsOf(list.id).filter((c) => matches(c, filters))}
          total={api.cardsOf(list.id).length}
          labelsById={labelsById}
          dragging={dragging}
          target={target?.listId === list.id ? target : null}
          onDragStart={setDragging}
          onTarget={setTarget}
          onDrop={onDrop}
          onOpenCard={onOpenCard}
          draggingList={draggingList}
          listTarget={listTarget === list.id}
          onListDragStart={(e) => {
            e.dataTransfer.setData(LIST_DRAG_TYPE, list.id);
            e.dataTransfer.effectAllowed = "move";
            setDraggingList(list.id);
          }}
          onListDragOver={(e) => {
            if (!draggingList) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            const box = e.currentTarget.getBoundingClientRect();
            setListTarget(e.clientX < box.left + box.width / 2 ? list.id : api.lists[index + 1]?.id ?? null);
          }}
        />
      ))}

      <div className="kb-list kb-list--add">
        {addingList ? (
          <Composer
            placeholder="Nome da lista"
            submitLabel="Adicionar lista"
            onSubmit={api.addList}
            onClose={() => setAddingList(false)}
            single
          />
        ) : (
          <button className="kb-add" onClick={() => setAddingList(true)}>
            <IconPlus size={16} /> Adicionar outra lista
          </button>
        )}
      </div>
    </div>
  );
}

function ListColumn({
  api,
  list,
  cards,
  total,
  labelsById,
  dragging,
  target,
  onDragStart,
  onTarget,
  onDrop,
  onOpenCard,
  draggingList,
  listTarget,
  onListDragStart,
  onListDragOver,
}: {
  api: BoardApi;
  list: List;
  cards: Card[];
  total: number;
  labelsById: Map<string, Label>;
  dragging: string | null;
  target: DropTarget | null;
  onDragStart: (id: string) => void;
  onTarget: (t: DropTarget) => void;
  onDrop: (e: DragEvent) => void;
  onOpenCard: (id: string) => void;
  draggingList: string | null;
  listTarget: boolean;
  onListDragStart: (e: DragEvent) => void;
  onListDragOver: (e: DragEvent) => void;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const cancelName = useRef(false);
  const index = api.lists.findIndex((l) => l.id === list.id);

  // Insertion point from the pointer: before the first card whose middle is below it.
  const onDragOver = (e: DragEvent) => {
    if (!dragging && !e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const items = [...(cardsRef.current?.querySelectorAll<HTMLElement>("[data-card-id]") ?? [])].filter((el) => el.dataset.cardId !== dragging);
    const before = items.find((el) => {
      const box = el.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    const beforeId = before?.dataset.cardId ?? null;
    if (target?.beforeId !== beforeId || target?.listId !== list.id) onTarget({ listId: list.id, beforeId });
  };

  const commitName = () => {
    setEditing(false);
    if (cancelName.current) { cancelName.current = false; setName(list.name); return; }
    const next = name.trim();
    if (next && next !== list.name) api.updateList(list.id, { name: next.slice(0, 120) });
    else setName(list.name);
  };

  const menu = [
    { id: "rename", label: "Renomear lista", onSelect: () => setEditing(true) },
    { id: "banner", label: list.banner ? "Tirar o cartaz do topo" : "Mostrar cartaz no topo", onSelect: () => api.updateList(list.id, { banner: !list.banner }) },
    { id: "left", label: "Mover para a esquerda", disabled: index <= 0, onSelect: () => api.moveList(list.id, -1) },
    { id: "right", label: "Mover para a direita", disabled: index >= api.lists.length - 1, onSelect: () => api.moveList(list.id, 1) },
    {
      id: "done",
      label: "Marcar todos como concluídos",
      separator: true,
      onSelect: async () => {
        const n = await api.setListDone(list.id);
        if (n !== null) toast(n ? `${n} ${n === 1 ? "cartão concluído" : "cartões concluídos"} em ${list.name}.` : "Todos os cartões já estavam concluídos.");
      },
    },
    {
      id: "clear",
      label: "Remover os concluídos",
      onSelect: async () => {
        const n = await api.clearDone(list.id);
        if (n !== null) toast(n ? `${n} ${n === 1 ? "cartão removido" : "cartões removidos"} de ${list.name}.` : "Nenhum cartão concluído nesta lista.");
      },
    },
    { id: "delete", label: "Excluir lista", tone: "danger" as const, separator: true, onSelect: () => setConfirmDelete(true) },
  ];

  return (
    <section className={`kb-list ${target ? "is-target" : ""} ${draggingList === list.id ? "is-dragging" : ""} ${listTarget ? "is-list-target" : ""}`} aria-label={list.name} onDragOver={(e) => draggingList ? onListDragOver(e) : onDragOver(e)} onDrop={onDrop}>
      {list.banner && !editing && (
        <h2 className="kb-poster" onDoubleClick={() => setEditing(true)} title="Clique duas vezes para renomear">
          <span>{list.name}</span>
        </h2>
      )}
      <header className={`kb-list__head ${list.banner && !editing ? "kb-list__head--poster" : ""}`}>
        <span className="kb-list__grip" draggable onDragStart={onListDragStart} role="img" aria-label={`Arrastar lista ${list.name}`} title="Arraste para reordenar; o menu também permite mover a lista">⠿</span>
        {list.banner && !editing ? (
          <span className="kb-list__cards-label">{total === 1 ? "cartão" : "cartões"}</span>
        ) : editing ? (
          <input
            className="tk-input kb-list__name-input"
            autoFocus
            value={name}
            aria-label="Nome da lista"
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
        ) : (
          <h2 className="kb-list__name" onDoubleClick={() => setEditing(true)} title="Clique duas vezes para renomear">
            {list.name}
          </h2>
        )}
        <span className="kb-list__count" title={`${total} cartões`}>
          {total}
        </span>
        <GlideMenu label={`Opções de ${list.name}`} trigger={<IconDots />} triggerClassName="tk-menu-trigger" align="end" items={menu} />
      </header>

      <div className="kb-list__cards" ref={cardsRef}>
        {cards.map((card) => (
          <div key={card.id} className="kb-slot">
            {target?.beforeId === card.id && <div className="kb-drop" aria-hidden="true" />}
            <CardTile
              card={card}
              labelsById={labelsById}
              dragging={dragging === card.id}
              onOpen={() => onOpenCard(card.id)}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, card.id);
                e.dataTransfer.setData("text/plain", card.name);
                e.dataTransfer.effectAllowed = "move";
                onDragStart(card.id);
              }}
              onToggleDone={() => api.updateCard(card.id, { done: !card.done })}
            />
          </div>
        ))}
        {target && target.beforeId === null && <div className="kb-drop" aria-hidden="true" />}
        {cards.length === 0 && total > 0 && <p className="kb-list__hint">Nenhum cartão corresponde aos filtros.</p>}
      </div>

      <footer className="kb-list__foot">
        {adding ? (
          <Composer placeholder="Título do cartão" submitLabel="Adicionar cartão" onSubmit={(text) => api.addCard(list.id, text)} onClose={() => setAdding(false)} />
        ) : (
          <button className="kb-add" onClick={() => setAdding(true)}>
            <IconPlus size={16} /> Adicionar um cartão
          </button>
        )}
      </footer>

      {confirmDelete && (
        <Confirm
          title="Excluir a lista?"
          text={
            <p>
              A lista <b>{list.name}</b> e os {total} {total === 1 ? "cartão" : "cartões"} dela serão apagados.
            </p>
          }
          confirmLabel="Excluir lista"
          danger
          onConfirm={() => api.deleteList(list.id)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </section>
  );
}

export function CardTile({
  card,
  labelsById,
  dragging,
  onOpen,
  onDragStart,
  onToggleDone,
}: {
  card: Card;
  labelsById: Map<string, Label>;
  dragging?: boolean;
  onOpen: () => void;
  onDragStart?: (e: DragEvent) => void;
  onToggleDone?: () => void;
}) {
  const labels = card.label_ids.map((id) => labelsById.get(id)).filter((l): l is Label => !!l);
  const doneItems = card.checklist.filter((i) => i.done).length;
  return (
    <article
      data-card-id={card.id}
      className={`kb-card ${card.done ? "is-done" : ""} ${dragging ? "is-dragging" : ""}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      tabIndex={0}
      role="button"
      aria-label={`${card.name}${card.done ? ", concluído" : ""}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {labels.length > 0 && (
        <div className="kb-card__labels">
          {labels.map((l) => (
            <span key={l.id} className={`kb-label kb-label--${l.color}`}>
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div className="kb-card__row">
        {onToggleDone && (
          <button
            className={`kb-done ${card.done ? "is-on" : ""}`}
            aria-label={card.done ? "Marcar como pendente" : "Marcar como concluído"}
            aria-pressed={card.done}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone();
            }}
          >
            <IconCheck size={12} />
          </button>
        )}
        <span className="kb-card__title">{card.name}</span>
      </div>
      {(card.description || card.checklist.length > 0 || card.done) && (
        <div className="kb-card__badges">
          {card.done && <span className="kb-badge kb-badge--done">Concluído</span>}
          {card.description && (
            <span className="kb-badge" title="Tem descrição">
              <IconText size={13} />
            </span>
          )}
          {card.checklist.length > 0 && (
            <span className={`kb-badge ${doneItems === card.checklist.length ? "kb-badge--done" : ""}`} title="Itens do checklist">
              <IconChecklist size={13} /> {doneItems}/{card.checklist.length}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function Composer({ placeholder, submitLabel, onSubmit, onClose, single }: { placeholder: string; submitLabel: string; onSubmit: (text: string) => Promise<boolean>; onClose: () => void; single?: boolean }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (saving) return;
    const value = text.trim();
    if (!value) return onClose();
    setSaving(true);
    try { if (await onSubmit(value.slice(0, single ? 120 : 500))) setText(""); }
    finally { setSaving(false); }
  };
  return (
    <form
      className="kb-composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        className="tk-textarea"
        autoFocus
        rows={single ? 1 : 2}
        placeholder={placeholder}
        aria-label={placeholder}
        value={text}
        disabled={saving}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="kb-composer__actions">
        <button type="submit" className="cm-btn cm-btn--sm cm-btn--accent" disabled={saving}>
          {saving ? "Salvando…" : submitLabel}
        </button>
        <button type="button" className="tk-iconbtn" aria-label="Cancelar" onClick={onClose}>
          <IconClose />
        </button>
      </div>
    </form>
  );
}
