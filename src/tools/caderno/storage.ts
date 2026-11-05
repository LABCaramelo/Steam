import type { Block, CadernoPage, Workspace } from "./types";
import { createDefaultPages } from "./templates/defaultPages";

const STORAGE_KEY_PREFIX = "lab:caderno:workspace:";

export function getStorageKey(userId?: string | null): string {
  return `${STORAGE_KEY_PREFIX}${userId || "guest"}`;
}

export function loadWorkspace(userId?: string | null): Workspace {
  const key = getStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Workspace;
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Falha ao carregar workspace do Caderno:", err);
  }

  // Se vazio, inicializa com os templates padrão
  const defaultPages = createDefaultPages();
  const initialWorkspace: Workspace = {
    id: "ws-primary",
    name: "Meu Caderno LAB",
    pages: defaultPages,
    activePageId: defaultPages[0].id,
    trash: [],
    updatedAt: new Date().toISOString(),
  };

  saveWorkspace(initialWorkspace, userId);
  return initialWorkspace;
}

export function saveWorkspace(workspace: Workspace, userId?: string | null): void {
  const key = getStorageKey(userId);
  try {
    const updated = {
      ...workspace,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error("Falha ao salvar workspace do Caderno:", err);
  }
}

/** Converte uma página em Markdown limpo para exportação */
export function pageToMarkdown(page: CadernoPage): string {
  if (page.isDatabase && page.database) {
    const db = page.database;
    const lines: string[] = [];
    lines.push(`# ${page.icon ? page.icon + " " : ""}${page.title}\n`);
    lines.push(`*Base de dados do Caderno LAB*\n`);

    // Headers
    const headers = db.properties.map((p) => p.name);
    lines.push(`| ${headers.join(" | ")} |`);
    lines.push(`| ${headers.map(() => "---").join(" | ")} |`);

    // Rows
    for (const row of db.rows) {
      const cells = db.properties.map((p) => {
        const val = row.values[p.id];
        if (val === undefined || val === null) return "";
        if (p.type === "status" || p.type === "priority") {
          const opt = p.options?.find((o) => o.id === val);
          return opt ? opt.label : String(val);
        }
        if (p.type === "tags" && Array.isArray(val)) {
          return val
            .map((v) => p.options?.find((o) => o.id === v)?.label || v)
            .join(", ");
        }
        if (p.type === "checkbox") return val ? "[x]" : "[ ]";
        return String(val);
      });
      lines.push(`| ${cells.join(" | ")} |`);
    }
    return lines.join("\n");
  }

  const lines: string[] = [];
  lines.push(`# ${page.icon ? page.icon + " " : ""}${page.title}\n`);

  for (const block of page.blocks) {
    switch (block.type) {
      case "heading_1":
        lines.push(`\n# ${block.content}\n`);
        break;
      case "heading_2":
        lines.push(`\n## ${block.content}\n`);
        break;
      case "heading_3":
        lines.push(`\n### ${block.content}\n`);
        break;
      case "paragraph":
        lines.push(`\n${block.content}\n`);
        break;
      case "bulleted_list":
        lines.push(`- ${block.content}`);
        break;
      case "numbered_list":
        lines.push(`1. ${block.content}`);
        break;
      case "todo":
        lines.push(`- [${block.checked ? "x" : " "}] ${block.content}`);
        break;
      case "quote":
        lines.push(`> ${block.content}\n`);
        break;
      case "callout":
        lines.push(`> [!NOTE] ${block.calloutIcon || "💡"}\n> ${block.content}\n`);
        break;
      case "code":
        lines.push(`\`\`\`${block.language || ""}\n${block.content}\n\`\`\`\n`);
        break;
      case "divider":
        lines.push(`\n---\n`);
        break;
      case "toggle":
        lines.push(`<details>\n<summary>${block.content}</summary>\n`);
        if (block.childrenBlocks) {
          for (const child of block.childrenBlocks) {
            lines.push(`  ${child.content}\n`);
          }
        }
        lines.push(`</details>\n`);
        break;
      case "table":
        if (block.tableData) {
          lines.push(`| ${block.tableData.headers.join(" | ")} |`);
          lines.push(`| ${block.tableData.headers.map(() => "---").join(" | ")} |`);
          for (const row of block.tableData.rows) {
            lines.push(`| ${row.join(" | ")} |`);
          }
          lines.push("");
        }
        break;
      default:
        lines.push(block.content);
        break;
    }
  }

  return lines.join("\n");
}

/** Converte Markdown em uma página do Caderno */
export function markdownToPage(markdown: string, fallbackTitle = "Nova Página Importada"): CadernoPage {
  const lines = markdown.split(/\r?\n/);
  let title = fallbackTitle;
  const blocks: Block[] = [];
  let inCode = false;
  let codeLang = "";
  let codeContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({
          id: `b-code-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: "code",
          language: codeLang,
          content: codeContent.join("\n"),
        });
        inCode = false;
        codeContent = [];
        codeLang = "";
      } else {
        inCode = true;
        codeLang = line.replace(/^```/, "").trim();
      }
      continue;
    }

    if (inCode) {
      codeContent.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ")) {
      if (title === fallbackTitle && blocks.length === 0) {
        title = trimmed.replace(/^#\s+/, "");
      } else {
        blocks.push({
          id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: "heading_1",
          content: trimmed.replace(/^#\s+/, ""),
        });
      }
    } else if (trimmed.startsWith("## ")) {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "heading_2",
        content: trimmed.replace(/^##\s+/, ""),
      });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "heading_3",
        content: trimmed.replace(/^###\s+/, ""),
      });
    } else if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "todo",
        checked: trimmed.startsWith("- [x] "),
        content: trimmed.replace(/^- \[[ x]\]\s+/, ""),
      });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "bulleted_list",
        content: trimmed.replace(/^[-*]\s+/, ""),
      });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "numbered_list",
        content: trimmed.replace(/^\d+\.\s+/, ""),
      });
    } else if (trimmed.startsWith("> ")) {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "quote",
        content: trimmed.replace(/^>\s+/, ""),
      });
    } else if (trimmed === "---" || trimmed === "***") {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "divider",
        content: "",
      });
    } else {
      blocks.push({
        id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "paragraph",
        content: trimmed,
      });
    }
  }

  const now = new Date().toISOString();
  return {
    id: `page-${Date.now()}`,
    parentId: null,
    title,
    icon: "📄",
    isFavorite: false,
    isDatabase: false,
    blocks: blocks.length > 0 ? blocks : [{ id: `b-init-${Date.now()}`, type: "paragraph", content: "" }],
    createdAt: now,
    updatedAt: now,
  };
}
