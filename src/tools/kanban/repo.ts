import { supabase } from "../../supabase";
import type { Activity, Board, BoardContent, Card, CardComment, Label, List } from "./types";

/**
 * Everything the Kanban reads and writes. Rows carry user_id = auth.uid() by default and RLS
 * only lets the owner (with the Kanban in their library) touch them.
 */
export interface KanbanRepo {
  listBoards(): Promise<Board[]>;
  createBoard(board: Pick<Board, "id" | "name" | "description" | "background" | "template" | "position">): Promise<Board>;
  updateBoard(id: string, patch: Partial<Pick<Board, "name" | "description" | "background" | "starred" | "position">>): Promise<void>;
  deleteBoard(id: string): Promise<void>;
  loadBoard(id: string): Promise<BoardContent>;
  /** Bulk insert used by templates, imports and duplicates (ids are created in the browser). */
  insertContent(content: Partial<BoardContent>): Promise<void>;
  upsertLabel(label: Label): Promise<void>;
  deleteLabel(id: string): Promise<void>;
  updateList(id: string, patch: Partial<Pick<List, "name" | "position" | "banner">>): Promise<void>;
  deleteList(id: string): Promise<void>;
  updateCard(id: string, patch: Partial<Pick<Card, "name" | "description" | "position" | "list_id" | "label_ids" | "done" | "checklist">>): Promise<void>;
  updateCards(ids: string[], patch: Partial<Pick<Card, "done">>): Promise<void>;
  deleteCards(ids: string[]): Promise<void>;
  listComments(cardId: string): Promise<CardComment[]>;
  addComment(cardId: string, body: string): Promise<CardComment>;
  deleteComment(id: string): Promise<void>;
  listActivity(boardId: string): Promise<Activity[]>;
  logActivity(boardId: string, text: string): Promise<void>;
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function checkRows(result: { data: { id: string }[] | null; error: { message: string } | null }, expected: number) {
  const rows = check(result);
  if (rows?.length !== expected) throw new Error("A alteração não foi confirmada pelo banco. Recarregue o quadro e tente novamente.");
}

const BOARD = "id, name, description, background, starred, template, position, created_at, updated_at";
const CARD = "id, board_id, list_id, name, description, position, label_ids, done, checklist, created_at, updated_at";

export const supabaseKanban: KanbanRepo = {
  async listBoards() {
    return check(await supabase.from("kanban_boards").select(BOARD).order("position").order("created_at")) as Board[];
  },
  async createBoard(board) {
    return check(await supabase.from("kanban_boards").insert(board).select(BOARD).single()) as Board;
  },
  async updateBoard(id, patch) {
    check(await supabase.from("kanban_boards").update(patch).eq("id", id).select("id").single());
  },
  async deleteBoard(id) {
    check(await supabase.from("kanban_boards").delete().eq("id", id).select("id").single());
  },
  async loadBoard(id) {
    const [labels, lists, cards] = await Promise.all([
      supabase.from("kanban_labels").select("id, board_id, name, color, position").eq("board_id", id).order("position"),
      supabase.from("kanban_lists").select("id, board_id, name, banner, position").eq("board_id", id).order("position"),
      (async () => {
        const rows: Card[] = [];
        for (let start = 0; ; start += 1000) {
          const page = check(await supabase.from("kanban_cards").select(CARD).eq("board_id", id).order("position").order("id").range(start, start + 999)) as Card[];
          rows.push(...page);
          if (page.length < 1000) return rows;
        }
      })(),
    ]);
    return { labels: check(labels) as Label[], lists: check(lists) as List[], cards };
  },
  async insertContent({ labels, lists, cards, comments }) {
    // Lists before cards: cards point to their list.
    if (labels?.length) checkRows(await supabase.from("kanban_labels").insert(labels).select("id"), labels.length);
    if (lists?.length) checkRows(await supabase.from("kanban_lists").insert(lists).select("id"), lists.length);
    for (let i = 0; cards && i < cards.length; i += 200) {
      const chunk = cards.slice(i, i + 200).map(({ created_at: _c, updated_at: _u, ...card }) => card);
      checkRows(await supabase.from("kanban_cards").insert(chunk).select("id"), chunk.length);
    }
    for (let i = 0; comments && i < comments.length; i += 200) {
      const chunk = comments.slice(i, i + 200);
      checkRows(await supabase.from("kanban_comments").insert(chunk).select("id"), chunk.length);
    }
  },
  async upsertLabel(label) {
    check(await supabase.from("kanban_labels").upsert(label).select("id").single());
  },
  async deleteLabel(id) {
    check(await supabase.from("kanban_labels").delete().eq("id", id).select("id").single());
  },
  async updateList(id, patch) {
    check(await supabase.from("kanban_lists").update(patch).eq("id", id).select("id").single());
  },
  async deleteList(id) {
    check(await supabase.from("kanban_lists").delete().eq("id", id).select("id").single());
  },
  async updateCard(id, patch) {
    check(await supabase.from("kanban_cards").update(patch).eq("id", id).select("id").single());
  },
  async updateCards(ids, patch) {
    const unique = [...new Set(ids)];
    for (let at = 0; at < unique.length; at += 200) {
      const chunk = unique.slice(at, at + 200);
      checkRows(await supabase.from("kanban_cards").update(patch).in("id", chunk).select("id"), chunk.length);
    }
  },
  async deleteCards(ids) {
    const unique = [...new Set(ids)];
    for (let at = 0; at < unique.length; at += 200) {
      const chunk = unique.slice(at, at + 200);
      checkRows(await supabase.from("kanban_cards").delete().in("id", chunk).select("id"), chunk.length);
    }
  },
  async listComments(cardId) {
    const rows: CardComment[] = [];
    for (let at = 0; ; at += 1000) {
      const page = check(await supabase.from("kanban_comments").select("id, card_id, body, created_at").eq("card_id", cardId).order("created_at", { ascending: false }).order("id").range(at, at + 999)) as CardComment[];
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  },
  async addComment(cardId, body) {
    return check(await supabase.from("kanban_comments").insert({ card_id: cardId, body }).select("id, card_id, body, created_at").single()) as CardComment;
  },
  async deleteComment(id) {
    check(await supabase.from("kanban_comments").delete().eq("id", id).select("id").single());
  },
  async listActivity(boardId) {
    return check(
      await supabase.from("kanban_activity").select("id, board_id, text, created_at").eq("board_id", boardId).order("created_at", { ascending: false }).limit(30),
    ) as Activity[];
  },
  async logActivity(boardId, text) {
    check(await supabase.from("kanban_activity").insert({ board_id: boardId, text: text.slice(0, 300) }));
  },
};

export { positionBetween } from "./model";
