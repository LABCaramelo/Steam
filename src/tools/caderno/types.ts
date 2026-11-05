export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list"
  | "numbered_list"
  | "todo"
  | "toggle"
  | "quote"
  | "callout"
  | "code"
  | "divider"
  | "table"
  | "database"
  | "bookmark";

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  expanded?: boolean;
  calloutIcon?: string;
  calloutType?: "idea" | "warning" | "note" | "focus" | "coffee" | "insight";
  language?: string;
  tableData?: TableData;
  databaseId?: string;
  url?: string;
  bookmarkDesc?: string;
  childrenBlocks?: Block[];
}

export type PropertyType =
  | "title"
  | "status"
  | "priority"
  | "tags"
  | "date"
  | "checkbox"
  | "url"
  | "text"
  | "person";

export interface PropertyOption {
  id: string;
  label: string;
  color: string;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  options?: PropertyOption[];
}

export interface DatabaseRow {
  id: string;
  values: Record<string, any>;
}

export type DatabaseViewType = "table" | "board" | "gallery";

export interface DatabaseData {
  id: string;
  title: string;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  currentView: DatabaseViewType;
  filterStatus?: string;
  filterPriority?: string;
  searchQuery?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CadernoPage {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  cover?: string;
  isFavorite: boolean;
  isDatabase: boolean;
  database?: DatabaseData;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  pages: CadernoPage[];
  activePageId: string;
  trash: CadernoPage[];
  updatedAt: string;
}

export interface SlashCommandItem {
  id: BlockType | "template";
  title: string;
  description: string;
  icon: string;
  category: "Básico" | "Mídia & Dados" | "Avançado";
}
