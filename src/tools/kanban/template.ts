import template from "./template.json" with { type: "json" };
import type { Board, BoardContent, BoardFile, Card, CardComment, Label, LabelColor, List } from "./types.ts";

/** "Rotina Superprodutiva", the template that came with the Kanban (lists, cards and labels). */
export const ROUTINE_TEMPLATE: BoardFile = {
  format: "lab-kanban",
  version: 1,
  name: template.name,
  description: template.description,
  background: "stage",
  labels: template.labels.map((l) => ({ ...l, color: l.color as LabelColor })),
  lists: template.lists,
};

export const ROUTINE_KEY = template.key;

const now = () => new Date().toISOString();

/** Fresh rows for a board built from a portable file. */
export function contentFromFile(boardId: string, file: BoardFile): BoardContent {
  const labelIds = new Map<string, string>();
  const labels: Label[] = file.labels.map((l, i) => {
    const id = crypto.randomUUID();
    labelIds.set(l.key, id);
    return { id, board_id: boardId, name: l.name, color: l.color, position: (i + 1) * 1024 };
  });
  const lists: List[] = [];
  const cards: Card[] = [];
  const comments: CardComment[] = [];
  file.lists.forEach((list, li) => {
    const listId = crypto.randomUUID();
    lists.push({ id: listId, board_id: boardId, name: list.name, banner: !!list.banner, position: (li + 1) * 1024 });
    list.cards.forEach((card, ci) => {
      const cardId = crypto.randomUUID();
      cards.push({
        id: cardId,
        board_id: boardId,
        list_id: listId,
        name: card.name,
        description: card.description ?? "",
        position: (ci + 1) * 1024,
        label_ids: card.labels.map((key) => labelIds.get(key)).filter((id): id is string => !!id),
        done: !!card.done,
        checklist: (card.checklist ?? []).map((item) => ({ id: crypto.randomUUID(), text: item.text, done: !!item.done })),
        created_at: now(),
        updated_at: now(),
      });
      card.comments?.forEach((comment) => comments.push({ id: crypto.randomUUID(), card_id: cardId, body: comment.body, created_at: comment.created_at ?? now() }));
    });
  });
  return { labels, lists, cards, comments };
}

/** Portable copy of a board, used by "Exportar JSON" and "Duplicar quadro". */
export function fileFromBoard(board: Pick<Board, "name" | "description" | "background">, content: BoardContent): BoardFile {
  const keyOf = new Map(content.labels.map((l) => [l.id, l.id]));
  return {
    format: "lab-kanban",
    version: 1,
    name: board.name,
    description: board.description,
    background: board.background,
    labels: content.labels.map((l) => ({ key: l.id, name: l.name, color: l.color })),
    lists: [...content.lists]
      .sort((a, b) => a.position - b.position)
      .map((list) => ({
        name: list.name,
        banner: list.banner,
        cards: content.cards
          .filter((c) => c.list_id === list.id)
          .sort((a, b) => a.position - b.position)
          .map((c) => ({
            name: c.name,
            description: c.description || undefined,
            labels: c.label_ids.filter((id) => keyOf.has(id)),
            done: c.done || undefined,
            checklist: c.checklist.length ? c.checklist.map(({ text, done }) => ({ text, done })) : undefined,
            comments: content.comments?.filter((comment) => comment.card_id === c.id).map(({ body, created_at }) => ({ body, created_at })),
          })),
      })),
  };
}

const COLORS = new Set<LabelColor>(["caramel", "sky", "pink", "violet", "yellow", "mint", "danger", "neutral"]);
const TRELLO_COLORS: Record<string, LabelColor> = { orange: "caramel", blue: "sky", pink: "pink", yellow: "yellow", purple: "violet", green: "mint", red: "danger" };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("O arquivo contém dados de quadro inválidos.");
  return value as Record<string, unknown>;
};
const str = (value: unknown, max: number, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || value.length > max) throw new Error("Um texto do arquivo ultrapassa o limite permitido.");
  return value;
};
const array = (value: unknown, max: number): unknown[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) throw new Error("O arquivo contém uma lista inválida ou grande demais.");
  return value;
};

/**
 * Reads an exported board: the LAB format, or the JSON of the original Trello recreation
 * ({ name, labels, lists: [{ name, cards }] }). Throws when the file is not a board.
 */
export function parseBoardFile(text: string): BoardFile {
  if (text.length > 10_000_000) throw new Error("O arquivo ultrapassa o limite de 10 MB.");
  const raw = object(JSON.parse(text));
  if (!Array.isArray(raw.lists)) throw new Error("O arquivo não é um quadro.");
  if (raw.format !== undefined && (raw.format !== "lab-kanban" || raw.version !== 1)) throw new Error("Versão de arquivo não suportada.");
  const labels = array(raw.labels, 500).map((value, i) => {
    const l = object(value);
    const color = String(l.color ?? "");
    return {
      key: String(l.key ?? l.id ?? `label-${i}`),
      name: str(l.name, 60),
      color: COLORS.has(color as LabelColor) ? (color as LabelColor) : TRELLO_COLORS[color] ?? "neutral",
    };
  });
  if (new Set(labels.map((l) => l.key)).size !== labels.length) throw new Error("As etiquetas do arquivo têm identificadores repetidos.");
  const byName = new Map(labels.map((l) => [l.name, l.key]));
  const sourceLists = array(raw.lists, 200).map(object);
  if (raw.cards !== undefined && sourceLists.every((list) => list.cards === undefined)) {
    // Native Trello exports keep cards and checklists at the root instead of inside lists.
    const cards = array(raw.cards, 5000).map(object);
    const checklists = array(raw.checklists, 5000).map(object);
    const actions = array(raw.actions, 10000).map(object);
    if (cards.some((card) => !sourceLists.some((list) => list.id === card.idList))) throw new Error("Há cartões sem lista válida no arquivo.");
    sourceLists.sort((a, b) => Number(a.pos ?? 0) - Number(b.pos ?? 0));
    for (const list of sourceLists) {
      list.cards = cards.filter((card) => card.idList === list.id).sort((a, b) => Number(a.pos ?? 0) - Number(b.pos ?? 0)).map((card) => ({
        ...card,
        checklists: checklists.filter((checklist) => array(card.idChecklists, 100).includes(checklist.id)),
        comments: actions.filter((action) => action.type === "commentCard" && object(object(action.data).card).id === card.id).map((action) => ({ body: object(action.data).text, created_at: action.date })),
      }));
      if ((list.cards as Record<string, unknown>[]).some((card) => card.name === ".")) list.banner = true;
    }
  }
  let totalCards = 0;
  const lists = sourceLists.map((list) => {
    return {
    name: str(list.name, 120).trim() || "Lista",
    banner: list.banner === true || typeof list.banner === "string",
    cards: array(list.cards, 5000)
      .map(object)
      .filter((c) => c.name !== ".")
      .map((c) => {
        if (++totalCards > 5000) throw new Error("O quadro ultrapassa o limite de 5.000 cartões.");
        const cardLabels = array(c.labels, 500);
        const checklists = c.checklist !== undefined
          ? array(c.checklist, 1000).map(object)
          : array(c.checklists, 100).flatMap((value) => {
              const checklist = object(value);
              return array(checklist.items ?? checklist.checkItems, 1000).map(object);
            });
        return {
          name: str(c.name, 500).trim() || "Cartão",
          description: str(c.description ?? c.desc, 20000) || undefined,
          labels: cardLabels
            .map((value) => {
              if (typeof value === "string") return value;
              const label = object(value);
              const id = String(label.id ?? "");
              return labels.some((item) => item.key === id) ? id : byName.get(String(label.name ?? "")) ?? "";
            })
            .filter((key) => labels.some((x) => x.key === key)),
          done: c.done === true || c.dueComplete === true,
          checklist: checklists.map((item) => ({ text: str(item.text ?? item.name, 500), done: item.done === true || item.state === "complete" })).filter((item) => item.text),
          comments: array(c.comments, 1000).map((value) => {
            const comment = object(value);
            const timestamp = typeof comment.created_at === "string" ? new Date(comment.created_at) : null;
            return { body: str(comment.body ?? comment.text, 4000), created_at: timestamp && Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : undefined };
          }).filter((comment) => comment.body.trim()),
        };
      }),
  }; });
  const background = String(raw.background ?? "stage");
  return {
    format: "lab-kanban",
    version: 1,
    name: str(raw.name, 120).trim() || "Quadro importado",
    description: str(raw.description ?? raw.desc, 4000),
    background: (["stage", "galaxy", "spectrum", "cream"].includes(background) ? background : "stage") as BoardFile["background"],
    labels,
    lists,
  };
}
