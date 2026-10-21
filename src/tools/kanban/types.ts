/** Rows of the Kanban tables (supabase/lab-tools.sql, section 2). */

export type LabelColor = "caramel" | "sky" | "pink" | "violet" | "yellow" | "mint" | "danger" | "neutral";
export type BoardBackground = "stage" | "galaxy" | "spectrum" | "cream";

export interface Board {
  id: string;
  name: string;
  description: string;
  background: BoardBackground;
  starred: boolean;
  template: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  board_id: string;
  name: string;
  color: LabelColor;
  position: number;
}

export interface List {
  id: string;
  board_id: string;
  name: string;
  banner: boolean;
  position: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Card {
  id: string;
  board_id: string;
  list_id: string;
  name: string;
  description: string;
  position: number;
  label_ids: string[];
  done: boolean;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface CardComment {
  id: string;
  card_id: string;
  body: string;
  created_at: string;
}

export interface Activity {
  id: number;
  board_id: string;
  text: string;
  created_at: string;
}

export interface BoardContent {
  labels: Label[];
  lists: List[];
  cards: Card[];
  /** Included in imports and exports; comments are otherwise loaded when opening a card. */
  comments?: CardComment[];
}

/** Portable board file (export/import), without database ids. */
export interface BoardFile {
  format: "lab-kanban";
  version: 1;
  name: string;
  description: string;
  background: BoardBackground;
  labels: { key: string; name: string; color: LabelColor }[];
  lists: { name: string; banner: boolean; cards: { name: string; description?: string; labels: string[]; done?: boolean; checklist?: { text: string; done: boolean }[]; comments?: { body: string; created_at?: string }[] }[] }[];
}

export const LABEL_COLORS: LabelColor[] = ["caramel", "sky", "pink", "violet", "yellow", "mint", "danger", "neutral"];

export const LABEL_COLOR_NAME: Record<LabelColor, string> = {
  caramel: "Caramel",
  sky: "Electric Sky",
  pink: "Hot Pink",
  violet: "Electric Violet",
  yellow: "Acid Yellow",
  mint: "Signal Mint",
  danger: "Alerta",
  neutral: "Neutro",
};
