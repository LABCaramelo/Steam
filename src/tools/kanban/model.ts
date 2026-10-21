import type { Card, Label, List } from "./types.ts";

/** Fractional ordering changes only the moved row. */
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 1024;
  if (before === undefined) return after! - 1024;
  if (after === undefined) return before + 1024;
  return (before + after) / 2;
}

export function cardTime(name: string): number | null {
  const match = name.match(/^\s*(\d{1,2})\s*(?:h\s*(\d{2})?|:(\d{2}))(?!\d)/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? match[3] ?? 0);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function cardsCsv(lists: List[], labels: Label[], cards: Card[]) {
  const listName = new Map(lists.map((list) => [list.id, list.name]));
  const order = new Map([...lists].sort((a, b) => a.position - b.position).map((list, index) => [list.id, index]));
  const labelName = new Map(labels.map((label) => [label.id, label.name]));
  const cell = (value: string) => {
    // Quoting a CSV cell does not stop spreadsheet apps from evaluating formulas.
    const literal = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
    return `"${literal.replace(/"/g, '""')}"`;
  };
  const lines = [["Tarefa", "Lista", "Etiquetas", "Status", "Checklist", "Descrição"].map(cell).join(",")];
  [...cards].sort((a, b) => (order.get(a.list_id) ?? 0) - (order.get(b.list_id) ?? 0) || a.position - b.position).forEach((card) => {
    const done = card.checklist.filter((item) => item.done).length;
    lines.push([card.name, listName.get(card.list_id) ?? "", card.label_ids.map((id) => labelName.get(id)).filter(Boolean).join("; "), card.done ? "Concluído" : "Pendente", card.checklist.length ? `${done}/${card.checklist.length}` : "", card.description].map(cell).join(","));
  });
  return `\uFEFF${lines.join("\n")}\n`;
}
