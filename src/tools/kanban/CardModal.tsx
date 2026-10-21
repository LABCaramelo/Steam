import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Confirm, Modal, relativeTime, useToast } from "../shared/kit";
import { IconCheck, IconChecklist, IconComment, IconCopy, IconPlus, IconTag, IconText, IconTrash } from "../shared/icons";
import type { KanbanRepo } from "./repo";
import { LABEL_COLORS, LABEL_COLOR_NAME, type Card, type CardComment, type LabelColor } from "./types";
import type { BoardApi } from "./useBoard";

export function CardModal({ api, repo, card, onClose, onOpenCard }: { api: BoardApi; repo: KanbanRepo; card: Card; onClose: () => void; onOpenCard: (id: string) => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(card.name);
  const [description, setDescription] = useState(card.description);
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [pickingLabels, setPickingLabels] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [comments, setComments] = useState<CardComment[] | null>(null);
  const [commentError, setCommentError] = useState(false);
  const [commentAttempt, setCommentAttempt] = useState(0);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setTitle(card.name), [card.name]);
  useEffect(() => {
    if (!editingDescription) setDescription(card.description);
  }, [card.description, editingDescription]);

  useEffect(() => {
    let alive = true;
    setComments(null);
    setCommentError(false);
    repo
      .listComments(card.id)
      .then((list) => alive && setComments(list))
      .catch(() => { if (alive) setCommentError(true); });
    return () => {
      alive = false;
    };
  }, [repo, card.id, commentAttempt]);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  const labels = api.labels;
  const active = labels.filter((l) => card.label_ids.includes(l.id));
  const done = card.checklist.filter((i) => i.done).length;
  const percent = card.checklist.length ? Math.round((done / card.checklist.length) * 100) : 0;

  const commitTitle = () => {
    const next = title.trim();
    if (!next) return setTitle(card.name);
    if (next !== card.name) api.updateCard(card.id, { name: next.slice(0, 500) });
  };

  const toggleLabel = (id: string) => {
    const current = api.card(card.id);
    if (current) return api.updateCard(card.id, { label_ids: current.label_ids.includes(id) ? current.label_ids.filter((x) => x !== id) : [...current.label_ids, id] });
  };

  const addItem = async () => {
    const text = newItem.trim();
    if (!text || savingItem) return;
    setSavingItem(true);
    try {
      if (await api.setChecklist(card.id, [...card.checklist, { id: crypto.randomUUID(), text: text.slice(0, 500), done: false }])) setNewItem("");
    } finally { setSavingItem(false); }
  };

  const postComment = async () => {
    const body = comment.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      await api.snapshot();
      const saved = await repo.addComment(card.id, body.slice(0, 4000));
      setComments((list) => [saved, ...(list ?? [])]);
      setComment("");
    } catch {
      toast("Não foi possível salvar o comentário.", "error");
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (id: string) => {
    if (deletingComment) return;
    setDeletingComment(id);
    try {
      await repo.deleteComment(id);
      setComments((list) => list?.filter((comment) => comment.id !== id) ?? null);
    } catch { toast("Não foi possível excluir o comentário. Ele foi preservado.", "error"); }
    finally { setDeletingComment(null); }
  };

  return (
    <Modal onClose={onClose} width={860} labelledBy="kb-card-title">
      <div className="kb-cm">
        <div className="kb-cm__main">
          <div className="kb-cm__head">
            <textarea
              id="kb-card-title"
              ref={titleRef}
              className="kb-cm__title"
              rows={1}
              value={title}
              maxLength={500}
              aria-label="Título do cartão"
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
            <div className="kb-cm__where">
              <label htmlFor="kb-card-list">na lista</label>
              <select
                id="kb-card-list"
                className="tk-select kb-cm__list"
                value={card.list_id}
                onChange={async (e) => {
                  const id = e.target.value;
                  if (await api.moveCard(card.id, id, null)) toast(`Cartão movido para ${api.listName(id)}.`);
                }}
              >
                {api.lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {card.done && <span className="tk-chip tk-chip--success">Concluído</span>}
            </div>
          </div>

          <section className="kb-cm__section">
            <h3>
              <IconTag size={16} /> Etiquetas
            </h3>
            <div className="kb-cm__labels">
              {active.map((l) => (
                <span key={l.id} className={`kb-label kb-label--${l.color} kb-label--lg`}>
                  {l.name || LABEL_COLOR_NAME[l.color]}
                </span>
              ))}
              <button className="cm-btn cm-btn--sm cm-btn--ghost" aria-expanded={pickingLabels} onClick={() => setPickingLabels((o) => !o)}>
                <IconPlus size={14} /> {active.length ? "Editar" : "Adicionar"}
              </button>
            </div>
            {pickingLabels && <LabelPicker api={api} selected={card.label_ids} onToggle={toggleLabel} />}
          </section>

          <section className="kb-cm__section">
            <h3>
              <IconText size={16} /> Descrição
            </h3>
            {editingDescription ? (
              <>
                <textarea
                  className="tk-textarea"
                  autoFocus
                  rows={6}
                  value={description}
                  maxLength={20000}
                  disabled={savingDescription}
                  placeholder="Detalhes, links e combinados deste bloco…"
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="kb-cm__row">
                  <button
                    className="cm-btn cm-btn--sm cm-btn--accent"
                    disabled={savingDescription}
                    onClick={async () => {
                      setSavingDescription(true);
                      try {
                        if (await api.updateCard(card.id, { description: description.slice(0, 20000) })) setEditingDescription(false);
                      } finally { setSavingDescription(false); }
                    }}
                  >
                    {savingDescription ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    className="cm-btn cm-btn--sm cm-btn--ghost"
                    disabled={savingDescription}
                    onClick={() => {
                      setDescription(card.description);
                      setEditingDescription(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <button className={`kb-cm__desc ${card.description ? "" : "is-empty"}`} onClick={() => setEditingDescription(true)}>
                {card.description || "Adicione uma descrição mais detalhada…"}
              </button>
            )}
          </section>

          <section className="kb-cm__section">
            <h3>
              <IconChecklist size={16} /> Checklist
              {card.checklist.length > 0 && <span className="kb-cm__pct">{percent}%</span>}
            </h3>
            {card.checklist.length > 0 && (
              <div className="kb-meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do checklist">
                <span className={percent === 100 ? "is-full" : ""} style={{ width: `${percent}%` }} />
              </div>
            )}
            <ul className="kb-cm__checklist">
              {card.checklist.map((item) => (
                <li key={item.id} className={item.done ? "is-done" : ""}>
                  <label className="tk-check">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => api.setChecklist(card.id, card.checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
                    />
                    <span>{item.text}</span>
                  </label>
                  <button
                    className="tk-iconbtn tk-iconbtn--sm"
                    aria-label={`Excluir item ${item.text}`}
                    onClick={() => api.setChecklist(card.id, card.checklist.filter((i) => i.id !== item.id))}
                  >
                    <IconTrash size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="kb-cm__row"
              onSubmit={(e) => {
                e.preventDefault();
                addItem();
              }}
            >
              <input className="tk-input" placeholder="Adicionar um item" aria-label="Novo item do checklist" maxLength={500} disabled={savingItem} value={newItem} onChange={(e) => setNewItem(e.target.value)} />
              <button type="submit" className="cm-btn cm-btn--sm" disabled={!newItem.trim() || savingItem}>
                Adicionar
              </button>
            </form>
          </section>

          <section className="kb-cm__section">
            <h3>
              <IconComment size={16} /> Comentários e notas
            </h3>
            <textarea
              className="tk-textarea"
              rows={2}
              placeholder="Escreva um comentário ou uma nota de execução…"
              aria-label="Novo comentário"
              value={comment}
              maxLength={4000}
              disabled={posting}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void postComment();
              }}
            />
            <div className="kb-cm__row">
              <button className="cm-btn cm-btn--sm cm-btn--accent" disabled={!comment.trim() || posting} onClick={postComment}>
                {posting ? "Salvando…" : "Salvar comentário"}
              </button>
            </div>
            <ul className="kb-cm__comments">
              {commentError ? <li role="alert">Os comentários não carregaram. <button className="cm-btn cm-btn--sm" onClick={() => setCommentAttempt((attempt) => attempt + 1)}>Tentar novamente</button></li> : comments === null && <li className="tk-dim">Carregando…</li>}
              {comments?.length === 0 && <li className="tk-dim">Sem comentários ainda.</li>}
              {comments?.map((c) => (
                <li key={c.id}>
                  <div className="kb-cm__comment-head">
                    <time dateTime={c.created_at}>{relativeTime(c.created_at)}</time>
                    <button className="tk-iconbtn tk-iconbtn--sm" aria-label="Excluir comentário" disabled={!!deletingComment} onClick={() => removeComment(c.id)}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                  <p>{c.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="kb-cm__side">
          <span className="tk-label">Ações</span>
          <button className={`cm-btn cm-btn--block ${card.done ? "" : "cm-btn--accent"}`} onClick={() => api.updateCard(card.id, { done: !card.done })}>
            <IconCheck size={16} /> {card.done ? "Desmarcar concluído" : "Marcar como concluído"}
          </button>
          <button
            className="cm-btn cm-btn--block"
            onClick={async () => {
              const id = await api.duplicateCard(card.id);
              if (id) { toast("Cartão duplicado.", "success"); onOpenCard(id); }
            }}
          >
            <IconCopy size={16} /> Duplicar
          </button>
          <button className="cm-btn cm-btn--block tk-btn--danger" onClick={() => setConfirmDelete(true)}>
            <IconTrash size={16} /> Excluir
          </button>
          <p className="kb-cm__meta">
            Criado {relativeTime(card.created_at)}
            <br />
            Atualizado {relativeTime(card.updated_at)}
          </p>
        </aside>
      </div>

      {confirmDelete && (
        <Confirm
          title="Excluir o cartão?"
          text={
            <p>
              <b>{card.name}</b> e os comentários dele serão apagados.
            </p>
          }
          confirmLabel="Excluir cartão"
          danger
          onConfirm={() => {
            api.deleteCard(card.id);
            onClose();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}

function LabelPicker({ api, selected, onToggle }: { api: BoardApi; selected: string[]; onToggle: (id: string) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("caramel");
  const [saving, setSaving] = useState(false);
  return (
    <div className="kb-picker cm-surface cm-surface--2">
      <ul className="kb-picker__list">
        {api.labels.map((l) => (
          <li key={l.id}>
            <label className="tk-check">
              <input type="checkbox" checked={selected.includes(l.id)} onChange={() => onToggle(l.id)} />
              <span className={`kb-label kb-label--${l.color} kb-label--lg`}>{l.name || LABEL_COLOR_NAME[l.color]}</span>
            </label>
          </li>
        ))}
        {api.labels.length === 0 && <li className="tk-dim">Crie a primeira etiqueta do quadro.</li>}
      </ul>
      <form
        className="kb-picker__new"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving || !name.trim()) return;
          setSaving(true);
          try {
            const id = await api.saveLabel({ name: name.trim().slice(0, 60), color });
            if (id) { onToggle(id); setName(""); }
          } finally { setSaving(false); }
        }}
      >
        <input className="tk-input" placeholder="Nova etiqueta" aria-label="Nome da nova etiqueta" maxLength={60} disabled={saving} value={name} onChange={(e) => setName(e.target.value)} />
        <ColorSwatches value={color} onChange={setColor} />
        <button type="submit" className="cm-btn cm-btn--sm" disabled={!name.trim() || saving}>
          Criar
        </button>
      </form>
    </div>
  );
}

export function ColorSwatches({ value, onChange }: { value: LabelColor; onChange: (c: LabelColor) => void }) {
  return (
    <div className="kb-swatches" role="radiogroup" aria-label="Cor da etiqueta">
      {LABEL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={LABEL_COLOR_NAME[c]}
          title={LABEL_COLOR_NAME[c]}
          className={`kb-swatch kb-label--${c} ${value === c ? "is-on" : ""}`}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
