import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Confirm, relativeTime, useToast } from "../shared/kit";
import { IconClose, IconCopy, IconDownload, IconRefresh, IconTrash, IconUpload } from "../shared/icons";
import { ColorSwatches } from "./CardModal";
import type { BoardsApi } from "./KanbanApp";
import { ROUTINE_KEY } from "./template";
import type { Board, BoardBackground, LabelColor } from "./types";
import type { BoardApi } from "./useBoard";
import { positionBetween } from "./model";

const BACKGROUNDS: { id: BoardBackground; name: string }[] = [
  { id: "stage", name: "Palco" },
  { id: "spectrum", name: "Espectro" },
  { id: "galaxy", name: "Galáxia" },
  { id: "cream", name: "Creme" },
];

export function BoardDrawer({
  api,
  board,
  boards,
  onClose,
  onExportJson,
  onExportCsv,
  onImport,
  onDuplicate,
  onResetTemplate,
}: {
  api: BoardApi;
  board: Board;
  boards: BoardsApi;
  onClose: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImport: () => void;
  onDuplicate: () => void;
  onResetTemplate: () => void;
}) {
  const toast = useToast();
  const [description, setDescription] = useState(board.description);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggedBoard, setDraggedBoard] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".tk-modal-backdrop")) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reorderBoard = (id: string, beforeId: string | null) => {
    if (boards.saving || id === beforeId) return;
    const others = boards.boards.filter((item) => item.id !== id);
    const at = beforeId ? others.findIndex((item) => item.id === beforeId) : others.length;
    if (at >= 0) void boards.update(id, { position: positionBetween(others[at - 1]?.position, others[at]?.position) });
  };

  return createPortal(
    <div className="kb-drawer-backdrop cm-overlay-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside ref={panel} className="kb-drawer cm-surface cm-surface--2 cm-sheet-in" role="dialog" aria-modal="true" aria-labelledby="kb-drawer-title" tabIndex={-1}>
        <header className="kb-drawer__head">
          <h2 id="kb-drawer-title">Menu do quadro</h2>
          <button className="tk-iconbtn" aria-label="Fechar menu" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        {boards.boards.length > 1 && <section className="kb-drawer__section">
          <span className="tk-label">Seus quadros · arraste para ordenar</span>
          <ul className="kb-board-order">
            {boards.boards.map((item, index) => <li key={item.id} onDragOver={(event) => {
              if (draggedBoard) event.preventDefault();
            }} onDrop={(event) => {
              event.preventDefault();
              if (!draggedBoard) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              reorderBoard(draggedBoard, event.clientY < bounds.top + bounds.height / 2 ? item.id : boards.boards[index + 1]?.id ?? null);
              setDraggedBoard(null);
            }}>
              <button className="cm-btn cm-btn--sm cm-btn--ghost kb-board-order__name" disabled={boards.saving} draggable={!boards.saving} title="Arraste para reordenar ou clique para abrir" onDragStart={(event) => {
                event.dataTransfer.setData("application/x-lab-kanban-board", item.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggedBoard(item.id);
              }} onDragEnd={() => setDraggedBoard(null)} onClick={() => { boards.open(item.id); onClose(); }}>{item.starred ? "★ " : ""}{item.name}</button>
              <button className="tk-iconbtn tk-iconbtn--sm" aria-label={`Mover ${item.name} para cima`} disabled={index === 0 || boards.saving} onClick={() => reorderBoard(item.id, boards.boards[index - 1]?.id ?? null)}>↑</button>
              <button className="tk-iconbtn tk-iconbtn--sm" aria-label={`Mover ${item.name} para baixo`} disabled={index === boards.boards.length - 1 || boards.saving} onClick={() => reorderBoard(item.id, boards.boards[index + 2]?.id ?? null)}>↓</button>
            </li>)}
          </ul>
        </section>}

        <section className="kb-drawer__section">
          <label className="tk-label" htmlFor="kb-board-desc">
            Sobre este quadro
          </label>
          <textarea
            id="kb-board-desc"
            className="tk-textarea"
            rows={3}
            value={description}
            maxLength={4000}
            disabled={boards.saving}
            placeholder="Para que serve este quadro?"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={async () => {
              if (description !== board.description && !await boards.update(board.id, { description: description.slice(0, 4000) })) setDescription(board.description);
            }}
          />
        </section>

        <section className="kb-drawer__section">
          <span className="tk-label">Fundo</span>
          <div className="kb-backgrounds" role="radiogroup" aria-label="Fundo do quadro">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                role="radio"
                aria-checked={board.background === bg.id}
                disabled={boards.saving}
                className={`kb-bg kb-bg--${bg.id} ${board.background === bg.id ? "is-on" : ""}`}
                onClick={() => boards.update(board.id, { background: bg.id })}
              >
                <span>{bg.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="kb-drawer__section">
          <span className="tk-label">Etiquetas</span>
          <ul className="kb-labels-edit">
            {api.labels.map((l) => (
              <LabelRow key={l.id} name={l.name} color={l.color} onSave={(name, color) => api.saveLabel({ id: l.id, name, color })} onDelete={() => api.deleteLabel(l.id)} />
            ))}
          </ul>
          <button className="cm-btn cm-btn--sm" onClick={() => api.saveLabel({ name: "Nova etiqueta", color: "sky" })}>
            Nova etiqueta
          </button>
        </section>

        <section className="kb-drawer__section">
          <span className="tk-label">Arquivo</span>
          <div className="kb-drawer__actions">
            <button className="cm-btn cm-btn--sm cm-btn--ghost" onClick={onExportJson}>
              <IconDownload size={16} /> Exportar JSON
            </button>
            <button className="cm-btn cm-btn--sm cm-btn--ghost" onClick={onExportCsv}>
              <IconDownload size={16} /> Exportar CSV
            </button>
            <button className="cm-btn cm-btn--sm cm-btn--ghost" onClick={onImport}>
              <IconUpload size={16} /> Importar JSON como quadro novo
            </button>
            <button className="cm-btn cm-btn--sm cm-btn--ghost" onClick={onDuplicate}>
              <IconCopy size={16} /> Duplicar este quadro
            </button>
            {board.template === ROUTINE_KEY && (
              <button className="cm-btn cm-btn--sm cm-btn--ghost" onClick={onResetTemplate}>
                <IconRefresh size={16} /> Restaurar o template original
              </button>
            )}
            <button className="cm-btn cm-btn--sm tk-btn--danger" onClick={() => setConfirmDelete(true)}>
              <IconTrash size={16} /> Excluir quadro
            </button>
          </div>
        </section>

        <section className="kb-drawer__section">
          <span className="tk-label">Atividade</span>
          <ul className="kb-activity">
            {api.activity.length === 0 && <li className="tk-dim">Nenhuma atividade registrada ainda.</li>}
            {api.activity.map((a) => (
              <li key={a.id}>
                <p>{a.text}</p>
                <time dateTime={a.created_at}>{relativeTime(a.created_at)}</time>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      {confirmDelete && (
        <Confirm
          title="Excluir o quadro?"
          text={
            <p>
              <b>{board.name}</b>, com todas as listas, cartões e comentários, será apagado do seu banco do Kanban. Exporte em JSON antes se quiser guardar uma cópia.
            </p>
          }
          confirmLabel="Excluir quadro"
          danger
          onConfirm={async () => {
            try {
              await api.snapshot();
              await boards.remove(board.id);
              toast("Quadro excluído.");
              onClose();
            } catch {
              toast("Não foi possível excluir o quadro.", "error");
            }
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>,
    document.body,
  );
}

function LabelRow({ name, color, onSave, onDelete }: { name: string; color: LabelColor; onSave: (name: string, color: LabelColor) => void; onDelete: () => void }) {
  const [value, setValue] = useState(name);
  useEffect(() => setValue(name), [name]);
  return (
    <li className="kb-labels-edit__row">
      <input
        className="tk-input"
        aria-label="Nome da etiqueta"
        value={value}
        maxLength={60}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== name && onSave(value.trim(), color)}
      />
      <ColorSwatches value={color} onChange={(c) => onSave(value.trim(), c)} />
      <button className="tk-iconbtn tk-iconbtn--sm" aria-label={`Excluir etiqueta ${name}`} onClick={onDelete}>
        <IconTrash size={14} />
      </button>
    </li>
  );
}
