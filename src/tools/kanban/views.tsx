import { useMemo, useState } from "react";
import { Confirm, EmptyState } from "../shared/kit";
import { IconDownload, IconTrash } from "../shared/icons";
import { LABEL_COLOR_NAME, type Card, type Label } from "./types";
import { cardTime, formatTime, type BoardApi } from "./useBoard";

// ---------------------------------------------------------------------------------------------
// Agenda semanal: the times in the card names become a grid, one column per list.
// ---------------------------------------------------------------------------------------------

export function AgendaView({ api, cards, onOpenCard }: { api: BoardApi; cards: Card[]; onOpenCard: (id: string) => void }) {
  const labelsById = new Map(api.labels.map((l) => [l.id, l]));
  const timed = cards.map((c) => ({ card: c, time: cardTime(c.name) })).filter((x): x is { card: Card; time: number } => x.time !== null);
  const columns = api.lists.filter((l) => timed.some((x) => x.card.list_id === l.id));
  const times = [...new Set(timed.map((x) => x.time))].sort((a, b) => a - b);
  const untimed = cards.filter((c) => cardTime(c.name) === null && columns.some((l) => l.id === c.list_id));

  if (columns.length === 0) {
    return (
      <EmptyState
        title="Nada na agenda ainda"
        text={
          <>
            A agenda usa o horário no começo do nome do cartão, como <b>06h - Acordar</b> ou <b>18:30 - Caminhada</b>.
          </>
        }
      />
    );
  }

  return (
    <div className="kb-agenda">
      <div className="kb-agenda__legend">
        {api.labels.map((l) => (
          <span key={l.id} className={`kb-label kb-label--${l.color}`}>
            {l.name || LABEL_COLOR_NAME[l.color]}
          </span>
        ))}
      </div>
      <div className="kb-agenda__scroll">
        <table className="kb-agenda__grid">
          <thead>
            <tr>
              <th scope="col" className="kb-agenda__time">
                Horário
              </th>
              {columns.map((l) => (
                <th key={l.id} scope="col">
                  {l.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <th scope="row" className="kb-agenda__time">
                  {formatTime(time)}
                </th>
                {columns.map((l) => (
                  <td key={l.id}>
                    {timed
                      .filter((x) => x.time === time && x.card.list_id === l.id)
                      .map(({ card }) => (
                        <AgendaSlot key={card.id} card={card} label={labelsById.get(card.label_ids[0])} onOpen={() => onOpenCard(card.id)} />
                      ))}
                  </td>
                ))}
              </tr>
            ))}
            {untimed.length > 0 && (
              <tr>
                <th scope="row" className="kb-agenda__time">
                  Sem horário
                </th>
                {columns.map((l) => (
                  <td key={l.id}>
                    {untimed
                      .filter((c) => c.list_id === l.id)
                      .map((card) => (
                        <AgendaSlot key={card.id} card={card} label={labelsById.get(card.label_ids[0])} onOpen={() => onOpenCard(card.id)} />
                      ))}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgendaSlot({ card, label, onOpen }: { card: Card; label?: Label; onOpen: () => void }) {
  return (
    <button className={`kb-slot-btn kb-tone--${label?.color ?? "neutral"} ${card.done ? "is-done" : ""}`} onClick={onOpen}>
      {card.name.replace(/^\s*\d{1,2}\s*(?:h\s*\d{0,2}|:\d{2})\s*[-–—]?\s*/i, "") || card.name}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Tabela
// ---------------------------------------------------------------------------------------------

type SortKey = "name" | "list" | "status";

export function TableView({ api, cards, onOpenCard, onExportCsv }: { api: BoardApi; cards: Card[]; onOpenCard: (id: string) => void; onExportCsv: () => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "list", dir: 1 });
  const [confirm, setConfirm] = useState<Card | null>(null);
  const labelsById = new Map(api.labels.map((l) => [l.id, l]));
  const listIndex = new Map(api.lists.map((l, i) => [l.id, i]));

  const rows = useMemo(() => {
    const value = (c: Card) =>
      sort.key === "name" ? c.name.toLowerCase() : sort.key === "status" ? Number(c.done) : (listIndex.get(c.list_id) ?? 0) * 1e6 + c.position;
    return [...cards].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [cards, sort, listIndex]);

  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="kb-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.dir === 1 ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className="kb-table">
      <div className="kb-table__bar">
        <span className="tk-dim">
          {rows.length} {rows.length === 1 ? "tarefa" : "tarefas"} de {api.content.cards.length}
        </span>
        <button className="cm-btn cm-btn--sm" onClick={onExportCsv}>
          <IconDownload size={16} /> Exportar CSV
        </button>
      </div>
      <div className="kb-table__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col" className="kb-table__check">
                <span className="tk-sr-only">Concluído</span>
              </th>
              {header("name", "Tarefa")}
              {header("list", "Lista")}
              <th scope="col">Etiquetas</th>
              {header("status", "Status")}
              <th scope="col" className="kb-table__actions">
                <span className="tk-sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((card) => (
              <tr key={card.id} className={card.done ? "is-done" : ""}>
                <td className="kb-table__check">
                  <input
                    type="checkbox"
                    checked={card.done}
                    aria-label={`${card.name}: concluído`}
                    onChange={() => api.updateCard(card.id, { done: !card.done })}
                  />
                </td>
                <td>
                  <button className="kb-table__name" onClick={() => onOpenCard(card.id)}>
                    {card.name}
                  </button>
                </td>
                <td>
                  <span className="tk-chip">{api.listName(card.list_id)}</span>
                </td>
                <td>
                  <div className="kb-table__labels">
                    {card.label_ids.map((id) => labelsById.get(id)).map((l) =>
                      l ? (
                        <span key={l.id} className={`kb-label kb-label--${l.color}`}>
                          {l.name}
                        </span>
                      ) : null,
                    )}
                  </div>
                </td>
                <td>{card.done ? <span className="tk-chip tk-chip--success">Concluído</span> : <span className="tk-chip">Pendente</span>}</td>
                <td className="kb-table__actions">
                  <button className="tk-iconbtn tk-iconbtn--sm" aria-label={`Excluir ${card.name}`} onClick={() => setConfirm(card)}>
                    <IconTrash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState title="Nenhuma tarefa" text="Nada corresponde à busca e aos filtros." />}
      </div>
      {confirm && (
        <Confirm
          title="Excluir a tarefa?"
          text={<p>{confirm.name}</p>}
          confirmLabel="Excluir"
          danger
          onConfirm={() => api.deleteCard(confirm.id)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export { cardsCsv } from "./model";

// ---------------------------------------------------------------------------------------------
// Métricas: balance of the routine by label and the load of each list.
// ---------------------------------------------------------------------------------------------

export function MetricsView({ api }: { api: BoardApi }) {
  const cards = api.content.cards;
  const total = cards.length;
  const done = cards.filter((c) => c.done).length;
  const timed = cards.filter((c) => cardTime(c.name) !== null).length;
  const byLabel = api.labels.map((l) => ({ label: l, count: cards.filter((c) => c.label_ids.includes(l.id)).length })).sort((a, b) => b.count - a.count);
  const unlabeled = cards.filter((c) => c.label_ids.length === 0).length;
  const byList = api.lists.map((l) => ({ list: l, count: cards.filter((c) => c.list_id === l.id).length, done: cards.filter((c) => c.list_id === l.id && c.done).length }));
  const maxList = Math.max(1, ...byList.map((x) => x.count));
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  if (total === 0) return <EmptyState title="Sem métricas ainda" text="Adicione cartões ao quadro para ver o equilíbrio da rotina." />;

  return (
    <div className="kb-metrics">
      <div className="kb-metrics__tiles">
        <Tile value={total} label="Blocos no quadro" />
        <Tile value={`${pct(done)}%`} label={`Concluídos (${done})`} tone="mint" />
        <Tile value={api.lists.length} label="Listas" tone="sky" />
        <Tile value={timed} label="Com horário na agenda" tone="violet" />
      </div>
      <div className="kb-metrics__grid">
        <section className="kb-panel cm-surface">
          <h3>Distribuição por etiqueta</h3>
          <ul className="kb-bars">
            {byLabel.map(({ label, count }) => (
              <li key={label.id}>
                <div className="kb-bars__label">
                  <span>{label.name || LABEL_COLOR_NAME[label.color]}</span>
                  <span>
                    {count} · {pct(count)}%
                  </span>
                </div>
                <div className="kb-bars__track">
                  <span className={`kb-tone--${label.color}`} style={{ width: `${pct(count)}%` }} />
                </div>
              </li>
            ))}
            {unlabeled > 0 && (
              <li>
                <div className="kb-bars__label">
                  <span>Sem etiqueta</span>
                  <span>
                    {unlabeled} · {pct(unlabeled)}%
                  </span>
                </div>
                <div className="kb-bars__track">
                  <span className="kb-tone--neutral" style={{ width: `${pct(unlabeled)}%` }} />
                </div>
              </li>
            )}
          </ul>
        </section>
        <section className="kb-panel cm-surface">
          <h3>Carga por lista</h3>
          <ul className="kb-bars kb-bars--lists">
            {byList.map(({ list, count, done: d }) => (
              <li key={list.id}>
                <div className="kb-bars__label">
                  <span>{list.name}</span>
                  <span>
                    {d}/{count}
                  </span>
                </div>
                <div className="kb-bars__track">
                  <span className="cm-brand-meter" style={{ width: `${(count / maxList) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Tile({ value, label, tone }: { value: number | string; label: string; tone?: string }) {
  return (
    <div className={`kb-tile cm-surface ${tone ? `kb-tile--${tone}` : ""}`}>
      <span className="kb-tile__value">{value}</span>
      <span className="kb-tile__label">{label}</span>
    </div>
  );
}
