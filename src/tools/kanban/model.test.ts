import assert from "node:assert/strict";
import test from "node:test";
import { cardTime, cardsCsv, formatTime, positionBetween } from "./model.ts";
import { contentFromFile, fileFromBoard, parseBoardFile, ROUTINE_TEMPLATE } from "./template.ts";
import type { BoardFile } from "./types.ts";

const file: BoardFile = {
  format: "lab-kanban", version: 1, name: "Minha semana", description: "Planejamento pessoal", background: "galaxy",
  labels: [{ key: "priority", name: "Prioridade", color: "caramel" }],
  lists: [{ name: "Segunda", banner: true, cards: [{ name: "09h30 - Reunião", description: "Briefing\ncom referências", labels: ["priority"], done: true, checklist: [{ text: "Enviar resumo", done: true }], comments: [{ body: "Combinado com a equipe.", created_at: "2026-10-21T13:00:00.000Z" }] }] }],
};

test("JSON round-trip preserves content, labels, checklists and comments with fresh database IDs", () => {
  const first = contentFromFile(crypto.randomUUID(), file);
  const exported = fileFromBoard(file, first);
  const imported = parseBoardFile(JSON.stringify(exported));
  const second = contentFromFile(crypto.randomUUID(), imported);
  assert.notEqual(first.cards[0].id, second.cards[0].id);
  assert.notEqual(first.cards[0].checklist[0].id, second.cards[0].checklist[0].id);
  assert.equal(second.cards[0].label_ids[0], second.labels[0].id);
  assert.equal(second.comments?.[0].card_id, second.cards[0].id);
  const comparable = (board: BoardFile) => board.lists.map((list) => ({ ...list, cards: list.cards.map((card) => ({ ...card, labels: card.labels.map((key) => board.labels.find((label) => label.key === key)?.name) })) }));
  assert.deepEqual(comparable(fileFromBoard(file, second)), comparable(imported));
  assert.equal(second.comments?.[0].body, file.lists[0].cards[0].comments?.[0].body);
  assert.equal(second.comments?.[0].created_at, "2026-10-21T13:00:00.000Z");
});

test("imports original Trello recreation data without losing checklist or comment text", () => {
  const imported = parseBoardFile(JSON.stringify({
    name: "Rotina", desc: "Meu quadro", labels: [{ id: "l1", name: "Trabalho", color: "blue" }],
    lists: [{ name: "Segunda", banner: "banner.png", cards: [{ name: "09h - Criar", desc: "Criar proposta", labels: [{ name: "Trabalho" }], dueComplete: true, checklists: [{ items: [{ text: "Revisar", done: true }] }], comments: [{ text: "Revisado", time: "12:00" }] }] }],
  }));
  assert.equal(imported.labels[0].color, "sky");
  assert.deepEqual(imported.lists[0].cards[0].labels, ["l1"]);
  assert.deepEqual(imported.lists[0].cards[0].checklist, [{ text: "Revisar", done: true }]);
  assert.equal(imported.lists[0].cards[0].comments?.[0].body, "Revisado");
  assert.equal(imported.lists[0].cards[0].done, true);
});

test("invalid or oversized imports fail explicitly instead of discarding user data", () => {
  for (const value of [null, {}, { lists: [null] }, { lists: [{ cards: [null] }] }, { format: "lab-kanban", version: 2, lists: [] }, { lists: [], name: "x".repeat(121) }, { labels: [{ key: "same" }, { key: "same" }], lists: [] }]) {
    assert.throws(() => parseBoardFile(JSON.stringify(value)));
  }
  assert.throws(() => parseBoardFile(JSON.stringify({ lists: Array.from({ length: 201 }, () => ({ name: "Lista" })) })));
});

test("native Trello exports keep flat cards, linked checklists and comment actions", () => {
  const imported = parseBoardFile(JSON.stringify({
    name: "Nativo", labels: [{ id: "green", name: "", color: "green" }, { id: "blue", name: "", color: "blue" }],
    lists: [{ id: "list", name: "Minha lista", pos: 1024 }],
    cards: [{ id: "card", idList: "list", name: "Tarefa", labels: [{ id: "green", name: "" }], idChecklists: ["checklist"], pos: 1024 }],
    checklists: [{ id: "checklist", checkItems: [{ name: "Item", state: "complete" }] }],
    actions: [{ type: "commentCard", data: { card: { id: "card" }, text: "Nota original" }, date: "2026-10-21T12:00:00Z" }],
  }));
  assert.equal(imported.lists[0].cards.length, 1);
  assert.deepEqual(imported.lists[0].cards[0].labels, ["green"]);
  assert.deepEqual(imported.lists[0].cards[0].checklist, [{ text: "Item", done: true }]);
  assert.equal(imported.lists[0].cards[0].comments?.[0].body, "Nota original");
});

test("routine template has every day and its cards reference defined labels", () => {
  assert.equal(ROUTINE_TEMPLATE.lists.length, 8);
  assert.equal(ROUTINE_TEMPLATE.labels.length, 7);
  const keys = new Set(ROUTINE_TEMPLATE.labels.map((label) => label.key));
  assert.equal(ROUTINE_TEMPLATE.lists.flatMap((list) => list.cards).length, 98);
  for (const card of ROUTINE_TEMPLATE.lists.flatMap((list) => list.cards)) assert.ok(card.labels.every((key) => keys.has(key)));
  const content = contentFromFile(crypto.randomUUID(), ROUTINE_TEMPLATE);
  assert.equal(new Set([...content.lists, ...content.labels, ...content.cards].map((row) => row.id)).size, content.lists.length + content.labels.length + content.cards.length);
});

test("agenda accepts original routine times and rejects malformed or out-of-range hours", () => {
  for (const [text, expected] of [["06h - Acordar", 360], ["9h30 Reunião", 570], ["18:30 - Caminhada", 1110], ["23h59 Dormir", 1439], ["00h - Começar", 0]] as const) {
    assert.equal(cardTime(text), expected);
    assert.match(formatTime(expected), /^\d{2}:\d{2}$/);
  }
  for (const text of ["Estudar", "24h - Dormir", "9:99 - Erro", "9h300 Erro", "9h3 Erro"]) assert.equal(cardTime(text), null);
});

test("fractional positions support beginning, middle and end moves without changing neighbours", () => {
  assert.equal(positionBetween(), 1024);
  assert.ok(positionBetween(undefined, 1024) < 1024);
  assert.ok(positionBetween(1024, 2048) > 1024 && positionBetween(1024, 2048) < 2048);
  assert.ok(positionBetween(2048) > 2048);
});

test("CSV preserves accents, quote/newline cells, board order and literal formula-like names", () => {
  const content = contentFromFile(crypto.randomUUID(), file);
  const card = { ...content.cards[0], name: '=HYPERLINK("https://example.invalid")', description: 'Linha 1\n"Linha 2"' };
  const csv = cardsCsv(content.lists, content.labels, [card]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.invalid"")"'));
  assert.ok(csv.includes('"Linha 1\n""Linha 2"""'));
  assert.ok(csv.includes('"Prioridade","Concluído","1/1"'));
});
