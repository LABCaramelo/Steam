import { useState, useMemo } from "react";
import type { DatabaseData, DatabaseProperty, DatabaseViewType } from "../types";

interface DatabaseViewProps {
  database: DatabaseData;
  onUpdate: (updated: DatabaseData) => void;
}

export function DatabaseView({ database, onUpdate }: DatabaseViewProps) {
  const [currentView, setCurrentView] = useState<DatabaseViewType>(database.currentView || "board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Status property
  const statusProp = database.properties.find((p) => p.type === "status");
  const statusOptions = statusProp?.options || [
    { id: "opt-backlog", label: "Backlog", color: "#606070" },
    { id: "opt-prog", label: "Em Produção", color: "#FF701A" },
    { id: "opt-rev", label: "Em Revisão", color: "#25BFFF" },
    { id: "opt-done", label: "Concluído", color: "#2ECC71" },
  ];

  // Priority property
  const priorityProp = database.properties.find((p) => p.type === "priority");

  // Filtragem
  const filteredRows = useMemo(() => {
    return database.rows.filter((row) => {
      // Filtro de status
      if (filterStatus !== "all" && statusProp) {
        if (row.values[statusProp.id] !== filterStatus) return false;
      }
      // Filtro de busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = Object.values(row.values).some((v) =>
          String(v).toLowerCase().includes(query)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [database.rows, filterStatus, searchQuery, statusProp]);

  // Atualizar valor de célula
  const updateCellValue = (rowId: string, propId: string, value: any) => {
    const nextRows = database.rows.map((r) =>
      r.id === rowId ? { ...r, values: { ...r.values, [propId]: value } } : r
    );
    onUpdate({ ...database, rows: nextRows });
  };

  // Adicionar nova linha
  const addNewRow = (defaultStatus?: string) => {
    const titleProp = database.properties.find((p) => p.type === "title") || database.properties[0];
    const newId = `row-${Date.now()}`;
    const initialValues: Record<string, any> = {
      [titleProp.id]: "Nova tarefa",
    };
    if (statusProp && defaultStatus) {
      initialValues[statusProp.id] = defaultStatus;
    }
    onUpdate({
      ...database,
      rows: [...database.rows, { id: newId, values: initialValues }],
    });
  };

  // Excluir linha
  const deleteRow = (rowId: string) => {
    onUpdate({
      ...database,
      rows: database.rows.filter((r) => r.id !== rowId),
    });
  };

  // Adicionar nova coluna
  const addNewProperty = () => {
    const name = prompt("Nome da nova coluna:");
    if (!name?.trim()) return;
    const newPropId = `prop-${Date.now()}`;
    const newProp: DatabaseProperty = {
      id: newPropId,
      name: name.trim(),
      type: "text",
    };
    onUpdate({
      ...database,
      properties: [...database.properties, newProp],
    });
  };

  return (
    <div className="caderno-db-container">
      {/* Barra de Ferramentas da Base de Dados */}
      <div className="caderno-db-toolbar">
        <div className="caderno-db-views">
          <button
            type="button"
            className={`caderno-db-view-tab ${currentView === "table" ? "is-active" : ""}`}
            onClick={() => {
              setCurrentView("table");
              onUpdate({ ...database, currentView: "table" });
            }}
          >
            ▦ Tabela (Grid)
          </button>
          <button
            type="button"
            className={`caderno-db-view-tab ${currentView === "board" ? "is-active" : ""}`}
            onClick={() => {
              setCurrentView("board");
              onUpdate({ ...database, currentView: "board" });
            }}
          >
            ▤ Quadro (Kanban)
          </button>
          <button
            type="button"
            className={`caderno-db-view-tab ${currentView === "gallery" ? "is-active" : ""}`}
            onClick={() => {
              setCurrentView("gallery");
              onUpdate({ ...database, currentView: "gallery" });
            }}
          >
            ⊞ Galeria
          </button>
        </div>

        <div className="caderno-db-actions">
          {/* Busca na tabela */}
          <div className="caderno-db-search">
            <span className="caderno-db-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Filtrar base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="caderno-db-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por status */}
          {statusProp && (
            <select
              className="caderno-db-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              {statusOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="caderno-btn-primary"
            onClick={() => addNewRow()}
          >
            + Novo Registro
          </button>
        </div>
      </div>

      {/* Visualização: TABELA (GRID) */}
      {currentView === "table" && (
        <div className="caderno-db-table-scroll">
          <table className="caderno-db-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: "center" }}>#</th>
                {database.properties.map((prop) => (
                  <th key={prop.id}>
                    <div className="caderno-db-th-content">
                      <span>{prop.name}</span>
                      <span className="caderno-db-th-type">{prop.type}</span>
                    </div>
                  </th>
                ))}
                <th style={{ width: 48, textAlign: "center" }}>
                  <button
                    type="button"
                    className="caderno-btn-icon-subtle"
                    title="Adicionar Coluna"
                    onClick={addNewProperty}
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rIdx) => (
                <tr key={row.id}>
                  <td className="caderno-db-row-index">{rIdx + 1}</td>
                  {database.properties.map((prop) => {
                    const value = row.values[prop.id];

                    if (prop.type === "status") {
                      const curOpt = prop.options?.find((o) => o.id === value);
                      return (
                        <td key={prop.id}>
                          <select
                            className="caderno-db-status-badge"
                            style={{
                              backgroundColor: curOpt?.color ? `${curOpt.color}22` : "#252530",
                              color: curOpt?.color || "#FFF4E8",
                              borderColor: curOpt?.color || "#404050",
                            }}
                            value={value || ""}
                            onChange={(e) => updateCellValue(row.id, prop.id, e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {prop.options?.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    }

                    if (prop.type === "priority") {
                      const curOpt = prop.options?.find((o) => o.id === value);
                      return (
                        <td key={prop.id}>
                          <select
                            className="caderno-db-priority-badge"
                            style={{
                              color: curOpt?.color || "#FFF4E8",
                            }}
                            value={value || ""}
                            onChange={(e) => updateCellValue(row.id, prop.id, e.target.value)}
                          >
                            <option value="">Nenhuma</option>
                            {prop.options?.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    }

                    if (prop.type === "checkbox") {
                      return (
                        <td key={prop.id} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => updateCellValue(row.id, prop.id, e.target.checked)}
                          />
                        </td>
                      );
                    }

                    if (prop.type === "date") {
                      return (
                        <td key={prop.id}>
                          <input
                            type="date"
                            className="caderno-db-cell-input"
                            value={value || ""}
                            onChange={(e) => updateCellValue(row.id, prop.id, e.target.value)}
                          />
                        </td>
                      );
                    }

                    return (
                      <td key={prop.id}>
                        <input
                          type="text"
                          className="caderno-db-cell-input"
                          value={value || ""}
                          placeholder="..."
                          onChange={(e) => updateCellValue(row.id, prop.id, e.target.value)}
                        />
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="caderno-btn-icon-danger"
                      title="Excluir linha"
                      onClick={() => deleteRow(row.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="caderno-db-table-add-row"
            onClick={() => addNewRow()}
          >
            + Adicionar linha
          </button>
        </div>
      )}

      {/* Visualização: QUADRO (KANBAN) */}
      {currentView === "board" && (
        <div className="caderno-db-board">
          {statusOptions.map((status) => {
            const statusRows = filteredRows.filter((r) =>
              statusProp ? r.values[statusProp.id] === status.id : false
            );

            return (
              <div key={status.id} className="caderno-board-column">
                <div className="caderno-board-col-header">
                  <div className="caderno-board-col-title">
                    <span
                      className="caderno-board-col-dot"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="caderno-board-col-name">{status.label}</span>
                    <span className="caderno-board-col-count">{statusRows.length}</span>
                  </div>
                  <button
                    type="button"
                    className="caderno-btn-icon-subtle"
                    title={`Adicionar em ${status.label}`}
                    onClick={() => addNewRow(status.id)}
                  >
                    +
                  </button>
                </div>

                <div className="caderno-board-cards">
                  {statusRows.map((row) => {
                    const titleProp = database.properties.find((p) => p.type === "title") || database.properties[0];
                    const priorityVal = priorityProp ? row.values[priorityProp.id] : null;
                    const priorityOpt = priorityProp?.options?.find((o) => o.id === priorityVal);
                    const dueVal = row.values["prop-due"];
                    const assigneeVal = row.values["prop-assignee"];

                    return (
                      <div key={row.id} className="caderno-board-card cm-surface">
                        <div className="caderno-board-card-header">
                          <input
                            type="text"
                            className="caderno-board-card-title-input"
                            value={row.values[titleProp.id] || ""}
                            placeholder="Título da demanda..."
                            onChange={(e) => updateCellValue(row.id, titleProp.id, e.target.value)}
                          />
                          <button
                            type="button"
                            className="caderno-btn-card-del"
                            title="Excluir"
                            onClick={() => deleteRow(row.id)}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="caderno-board-card-meta">
                          {priorityOpt && (
                            <span
                              className="caderno-card-priority-pill"
                              style={{
                                color: priorityOpt.color,
                                borderColor: `${priorityOpt.color}44`,
                              }}
                            >
                              {priorityOpt.label}
                            </span>
                          )}
                          {dueVal && (
                            <span className="caderno-card-due-pill">
                              📅 {new Date(dueVal).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {assigneeVal && (
                            <span className="caderno-card-assignee-pill">
                              👤 {assigneeVal}
                            </span>
                          )}
                        </div>

                        {/* Mover status rapidamente */}
                        <div className="caderno-board-card-footer">
                          <select
                            className="caderno-card-move-select"
                            value={status.id}
                            onChange={(e) =>
                              statusProp && updateCellValue(row.id, statusProp.id, e.target.value)
                            }
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                Mover para: {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="caderno-board-add-card-btn"
                    onClick={() => addNewRow(status.id)}
                  >
                    + Novo Cartão
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visualização: GALERIA */}
      {currentView === "gallery" && (
        <div className="caderno-db-gallery">
          {filteredRows.map((row) => {
            const titleProp = database.properties.find((p) => p.type === "title") || database.properties[0];
            const curStatusId = statusProp ? row.values[statusProp.id] : null;
            const curStatusOpt = statusOptions.find((o) => o.id === curStatusId);
            const prioId = priorityProp ? row.values[priorityProp.id] : null;
            const prioOpt = priorityProp?.options?.find((o) => o.id === prioId);

            return (
              <div key={row.id} className="caderno-gallery-card cm-surface">
                <div className="caderno-gallery-card-banner">
                  <span className="caderno-gallery-banner-icon">📋</span>
                </div>
                <div className="caderno-gallery-card-body">
                  <input
                    type="text"
                    className="caderno-gallery-title-input"
                    value={row.values[titleProp.id] || ""}
                    placeholder="Sem título..."
                    onChange={(e) => updateCellValue(row.id, titleProp.id, e.target.value)}
                  />
                  <div className="caderno-gallery-badges">
                    {curStatusOpt && (
                      <span
                        className="caderno-gallery-badge"
                        style={{
                          backgroundColor: `${curStatusOpt.color}22`,
                          color: curStatusOpt.color,
                        }}
                      >
                        {curStatusOpt.label}
                      </span>
                    )}
                    {prioOpt && (
                      <span
                        className="caderno-gallery-badge"
                        style={{
                          backgroundColor: `${prioOpt.color}22`,
                          color: prioOpt.color,
                        }}
                      >
                        {prioOpt.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="caderno-gallery-add-card"
            onClick={() => addNewRow()}
          >
            + Novo Registro na Galeria
          </button>
        </div>
      )}
    </div>
  );
}
