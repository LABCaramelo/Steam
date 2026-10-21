import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../shared/kit";
import { positionBetween, type KanbanRepo } from "./repo";
import type { Activity, BoardContent, Card, ChecklistItem, Label, LabelColor, List } from "./types";

const EMPTY: BoardContent = { labels: [], lists: [], cards: [] };
const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
// Keep in-flight requests across board navigation; reopening a board waits for its saves.
const boardWrites = new WeakMap<KanbanRepo, Map<string, Promise<boolean>>>();
function writeQueue(repo: KanbanRepo) {
  let queues = boardWrites.get(repo);
  if (!queues) { queues = new Map(); boardWrites.set(repo, queues); }
  return queues;
}

export type BoardApi = ReturnType<typeof useBoard>;

/**
 * Board state with optimistic updates: the screen changes at once and the row is written in the
 * background. If a write fails the board is reloaded from the database and a toast explains it.
 */
export function useBoard(repo: KanbanRepo, boardId: string) {
  const toast = useToast();
  const [content, setContent] = useState<BoardContent>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(0);
  const [activity, setActivity] = useState<Activity[]>([]);
  const contentRef = useRef(content);
  contentRef.current = content;
  const confirmed = useRef<BoardContent>(EMPTY);
  const pending = useRef<((value: BoardContent) => BoardContent)[]>([]);
  const writes = useRef<Promise<boolean>>(writeQueue(repo).get(boardId) ?? Promise.resolve(true));
  const alive = useRef(true);
  const loadVersion = useRef(0);

  const publish = useCallback(() => {
    contentRef.current = pending.current.reduce((value, change) => change(value), confirmed.current);
    if (alive.current) {
      setContent(contentRef.current);
      setSaving(pending.current.length);
    }
  }, []);

  const reload = useCallback(async () => {
    const version = ++loadVersion.current;
    await (writeQueue(repo).get(boardId) ?? writes.current);
    try {
      const [next, log] = await Promise.all([repo.loadBoard(boardId), repo.listActivity(boardId).catch(() => null)]);
      if (!alive.current || version !== loadVersion.current) return;
      confirmed.current = next;
      publish();
      if (log) setActivity(log);
      else toast("Não foi possível carregar o histórico de atividade.", "error");
      setError(null);
    } catch {
      if (alive.current && version === loadVersion.current) setError("Não foi possível carregar o quadro. Confira sua conexão e tente novamente.");
    } finally {
      if (alive.current && version === loadVersion.current) setLoading(false);
    }
  }, [repo, boardId, toast, publish]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    setContent(EMPTY);
    void reload();
    return () => { alive.current = false; ++loadVersion.current; };
  }, [reload]);

  useEffect(() => {
    if (!saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);

  /** Applies the change locally, then persists it; a failure restores the database state. */
  const commit = useCallback(
    (change: (c: BoardContent) => BoardContent, persist: () => Promise<unknown>) => {
      pending.current.push(change);
      publish();
      const job = writes.current.then(async () => {
        try {
          await persist();
          confirmed.current = change(confirmed.current);
          return true;
        } catch {
          if (alive.current) toast("Não foi possível salvar a alteração. Ela foi desfeita; confira sua conexão.", "error");
          try {
            confirmed.current = await repo.loadBoard(boardId);
          } catch {
            if (alive.current) setError("A alteração falhou e o banco não pôde ser consultado. Recarregue o quadro antes de continuar.");
          }
          return false;
        } finally {
          pending.current = pending.current.filter((item) => item !== change);
          publish();
        }
      });
      writes.current = job;
      writeQueue(repo).set(boardId, job);
      return job;
    },
    [repo, boardId, publish, toast],
  );

  const log = useCallback(
    (text: string) => {
      const job = writes.current.then(async (saved) => {
        if (!saved) return false;
        try {
          await repo.logActivity(boardId, text);
          if (alive.current) setActivity((list) => [{ id: Date.now(), board_id: boardId, text, created_at: new Date().toISOString() }, ...list].slice(0, 30));
        } catch {
          if (alive.current) toast("A alteração foi salva, mas o histórico não pôde ser atualizado.", "error");
        }
        return true;
      });
      writes.current = job;
      writeQueue(repo).set(boardId, job);
      return job;
    },
    [repo, boardId, toast],
  );

  const lists = useMemo(() => [...content.lists].sort(byPosition), [content.lists]);
  const labels = useMemo(() => [...content.labels].sort(byPosition), [content.labels]);
  const cardsOf = useCallback((listId: string) => contentRef.current.cards.filter((c) => c.list_id === listId).sort(byPosition), []);
  const card = useCallback((id: string) => contentRef.current.cards.find((c) => c.id === id), []);
  const listName = (id: string) => contentRef.current.lists.find((l) => l.id === id)?.name ?? "";

  // ---------- lists ----------

  const addList = (name: string) => {
    const last = lists[lists.length - 1];
    const list: List = { id: crypto.randomUUID(), board_id: boardId, name, banner: false, position: positionBetween(last?.position) };
    const saved = commit((c) => ({ ...c, lists: [...c.lists, list] }), () => repo.insertContent({ lists: [list] }));
    log(`Nova lista criada: "${name}"`);
    return saved;
  };

  const updateList = (id: string, patch: Partial<Pick<List, "name" | "banner">>) => {
    commit((c) => ({ ...c, lists: c.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) }), () => repo.updateList(id, patch));
    if (patch.name) log(`Lista renomeada para "${patch.name}"`);
  };

  const moveList = (id: string, dir: -1 | 1) => {
    const index = lists.findIndex((l) => l.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= lists.length) return;
    const others = lists.filter((l) => l.id !== id);
    const before = others[target - 1]?.position;
    const after = others[target]?.position;
    const position = positionBetween(before, after);
    commit((c) => ({ ...c, lists: c.lists.map((l) => (l.id === id ? { ...l, position } : l)) }), () => repo.updateList(id, { position }));
  };

  const reorderList = (id: string, beforeId: string | null) => {
    if (id === beforeId) return;
    const others = contentRef.current.lists.filter((list) => list.id !== id).sort(byPosition);
    const at = beforeId ? others.findIndex((list) => list.id === beforeId) : others.length;
    if (at < 0) return;
    const position = positionBetween(others[at - 1]?.position, others[at]?.position);
    return commit((c) => ({ ...c, lists: c.lists.map((list) => list.id === id ? { ...list, position } : list) }), () => repo.updateList(id, { position }));
  };

  const deleteList = (id: string) => {
    const name = listName(id);
    commit((c) => ({ ...c, lists: c.lists.filter((l) => l.id !== id), cards: c.cards.filter((card) => card.list_id !== id) }), () => repo.deleteList(id));
    log(`Lista "${name}" excluída`);
  };

  const setListDone = async (id: string) => {
    const ids = content.cards.filter((c) => c.list_id === id && !c.done).map((c) => c.id);
    const saved = await commit((c) => ({ ...c, cards: c.cards.map((card) => (ids.includes(card.id) ? { ...card, done: true } : card)) }), () => repo.updateCards(ids, { done: true }));
    if (!saved) return null;
    log(`Todos os cartões de ${listName(id)} marcados como concluídos`);
    return ids.length;
  };

  const clearDone = async (id: string) => {
    const ids = content.cards.filter((c) => c.list_id === id && c.done).map((c) => c.id);
    const saved = await commit((c) => ({ ...c, cards: c.cards.filter((card) => !ids.includes(card.id)) }), () => repo.deleteCards(ids));
    if (!saved) return null;
    log(`Cartões concluídos removidos de ${listName(id)}`);
    return ids.length;
  };

  // ---------- cards ----------

  const addCard = (listId: string, name: string) => {
    const last = cardsOf(listId).at(-1);
    const stamp = new Date().toISOString();
    const card: Card = {
      id: crypto.randomUUID(),
      board_id: boardId,
      list_id: listId,
      name,
      description: "",
      position: positionBetween(last?.position),
      label_ids: [],
      done: false,
      checklist: [],
      created_at: stamp,
      updated_at: stamp,
    };
    const saved = commit((c) => ({ ...c, cards: [...c.cards, card] }), () => repo.insertContent({ cards: [card] }));
    log(`Cartão "${name}" adicionado em ${listName(listId)}`);
    return saved;
  };

  const updateCard = (id: string, patch: Partial<Pick<Card, "name" | "description" | "label_ids" | "done" | "checklist">>) => {
    const stamp = new Date().toISOString();
    return commit((c) => ({ ...c, cards: c.cards.map((card) => (card.id === id ? { ...card, ...patch, updated_at: stamp } : card)) }), () => repo.updateCard(id, patch));
  };

  /** Moves a card to a list, before `beforeId` (or to the end). */
  const moveCard = (id: string, listId: string, beforeId: string | null) => {
    const moving = contentRef.current.cards.find((c) => c.id === id);
    if (!moving || id === beforeId) return false;
    const siblings = contentRef.current.cards.filter((c) => c.list_id === listId && c.id !== id).sort(byPosition);
    const index = beforeId ? siblings.findIndex((c) => c.id === beforeId) : siblings.length;
    const at = index < 0 ? siblings.length : index;
    const position = positionBetween(siblings[at - 1]?.position, siblings[at]?.position);
    if (moving.list_id === listId && Math.abs(moving.position - position) < 1e-9) return;
    const saved = commit(
      (c) => ({ ...c, cards: c.cards.map((card) => (card.id === id ? { ...card, list_id: listId, position } : card)) }),
      () => repo.updateCard(id, { list_id: listId, position }),
    );
    if (moving.list_id !== listId) log(`Cartão "${moving.name}" movido para ${listName(listId)}`);
    return saved;
  };

  const duplicateCard = async (id: string) => {
    const source = card(id);
    if (!source) return;
    const siblings = cardsOf(source.list_id);
    const next = siblings[siblings.findIndex((c) => c.id === id) + 1];
    const stamp = new Date().toISOString();
    const copy: Card = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (cópia)`.slice(0, 500),
      position: positionBetween(source.position, next?.position),
      checklist: source.checklist.map((item) => ({ ...item, id: crypto.randomUUID() })),
      created_at: stamp,
      updated_at: stamp,
    };
    const saved = await commit((c) => ({ ...c, cards: [...c.cards, copy] }), () => repo.insertContent({ cards: [copy] }));
    if (!saved) return null;
    log(`Cartão "${source.name}" duplicado`);
    return copy.id;
  };

  const deleteCard = (id: string) => {
    const name = card(id)?.name;
    commit((c) => ({ ...c, cards: c.cards.filter((card) => card.id !== id) }), () => repo.deleteCards([id]));
    log(`Cartão "${name}" excluído`);
  };

  const setChecklist = (id: string, checklist: ChecklistItem[]) => updateCard(id, { checklist });

  // ---------- labels ----------

  const saveLabel = async (label: Pick<Label, "name" | "color"> & { id?: string }) => {
    const existing = label.id ? content.labels.find((l) => l.id === label.id) : undefined;
    const row: Label = existing
      ? { ...existing, name: label.name, color: label.color }
      : { id: crypto.randomUUID(), board_id: boardId, name: label.name, color: label.color as LabelColor, position: positionBetween(labels.at(-1)?.position) };
    const saved = await commit((c) => ({ ...c, labels: existing ? c.labels.map((l) => (l.id === row.id ? row : l)) : [...c.labels, row] }), () => repo.upsertLabel(row));
    return saved ? row.id : null;
  };

  const deleteLabel = (id: string) => {
    const touched = content.cards.filter((c) => c.label_ids.includes(id));
    commit(
      (c) => ({
        ...c,
        labels: c.labels.filter((l) => l.id !== id),
        cards: c.cards.map((card) => (card.label_ids.includes(id) ? { ...card, label_ids: card.label_ids.filter((x) => x !== id) } : card)),
      }),
      async () => {
        await Promise.all(touched.map((card) => repo.updateCard(card.id, { label_ids: card.label_ids.filter((x) => x !== id) })));
        await repo.deleteLabel(id);
      },
    );
  };

  return {
    loading,
    error,
    saving,
    content,
    lists,
    labels,
    activity,
    cardsOf,
    card,
    listName,
    reload,
    snapshot: async () => { await writes.current; return confirmed.current; },
    log,
    addList,
    updateList,
    moveList,
    reorderList,
    deleteList,
    setListDone,
    clearDone,
    addCard,
    updateCard,
    moveCard,
    duplicateCard,
    deleteCard,
    setChecklist,
    saveLabel,
    deleteLabel,
  };
}

export { cardTime, formatTime } from "./model";
