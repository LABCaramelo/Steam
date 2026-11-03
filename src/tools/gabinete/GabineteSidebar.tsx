import React, { useState } from "react";
import { Isotype, ThemeToggle } from "@caramelo/design-system";
import type { Client, Workspace } from "./types";

interface Props {
  workspace: Workspace;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  clients: Client[];
  onOpenNewClientModal: () => void;
  onSelectClientCategory?: (category: string) => void;
  taskCount: number;
}

export const GabineteSidebar: React.FC<Props> = ({
  workspace,
  activeTab,
  onSelectTab,
  clients,
  onOpenNewClientModal,
  taskCount,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientsExpanded, setClientsExpanded] = useState(true);

  const avulsosCount = clients.filter((c) => c.category === "avulsos" && c.status === "active").length;
  const exClientesCount = clients.filter((c) => c.status === "archived").length;
  const activeClientsCount = clients.filter((c) => c.category !== "avulsos" && c.status === "active").length;

  return (
    <aside className="mc-sidebar" aria-label="Navegação do Gabinete">
      {/* Perfil & Nível de Agência */}
      <div className="mc-sidebar__header">
        <div className="mc-sidebar__profile">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Isotype size={28} variant="caramel" decorative interactive />
            <div>
              <h2 className="mc-sidebar__title">
                <span>GABINETE</span>
                <span style={{ fontSize: 13, color: "var(--mc-caramel)", opacity: 0.9 }}>✦</span>
              </h2>
              <p className="mc-sidebar__subtitle">Gestão de bastidor · {workspace.name || "Luiz"}</p>
            </div>
          </div>
          <div className="mc-sidebar__badge">
            <span>🛡️</span>
            <span>{workspace.agency_level || "Agência Bronze I"}</span>
          </div>
        </div>
      </div>

      {/* Menu Principal com Rolagem */}
      <div className="mc-sidebar__scroll">
        {/* Minhas Demandas */}
        <button
          className={`mc-nav-item ${activeTab === "minhas-tarefas" ? "is-active" : ""}`}
          onClick={() => onSelectTab("minhas-tarefas")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">📋</span>
            <span>Minhas demandas</span>
          </div>
          {taskCount > 0 && <span className="mc-nav-item__badge">{taskCount}</span>}
        </button>

        {/* Dashboard */}
        <button
          className={`mc-nav-item ${activeTab === "dashboard" ? "is-active" : ""}`}
          onClick={() => onSelectTab("dashboard")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">📊</span>
            <span>Dashboard</span>
          </div>
        </button>

        {/* Clientes com Subgrupo */}
        <div style={{ marginTop: 4 }}>
          <div
            className={`mc-nav-item ${activeTab === "clientes" ? "is-active" : ""}`}
            onClick={() => onSelectTab("clientes")}
          >
            <div className="mc-nav-item__left">
              <span className="mc-nav-item__icon">👥</span>
              <span>Clientes</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNewClientModal();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--mc-caramel)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "0 4px",
                }}
                title="Novo Cliente"
              >
                +
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setClientsExpanded(!clientsExpanded);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  opacity: 0.5,
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                {clientsExpanded ? "▾" : "▸"}
              </button>
            </div>
          </div>

          {clientsExpanded && (
            <div className="mc-sidebar__subgroup">
              {/* Campo de Busca Rápida */}
              <div style={{ padding: "4px 8px 6px 8px" }}>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 11.5,
                    color: "#fff4e8",
                    outline: "none",
                  }}
                />
              </div>

              <button className="mc-subitem" onClick={() => onSelectTab("clientes")}>
                <span>› ATIVOS</span>
                <span>{activeClientsCount}</span>
              </button>
              <button className="mc-subitem" onClick={() => onSelectTab("clientes")}>
                <span>› AVULSOS</span>
                <span>{avulsosCount}</span>
              </button>
              <button className="mc-subitem" onClick={() => onSelectTab("clientes")}>
                <span>› EX-CLIENTES</span>
                <span>{exClientesCount}</span>
              </button>
              <button
                className="mc-subitem"
                style={{ color: "var(--mc-caramel)", fontWeight: 600 }}
                onClick={onOpenNewClientModal}
              >
                <span>+ Nova categoria</span>
              </button>
            </div>
          )}
        </div>

        {/* Biblioteca */}
        <button
          className={`mc-nav-item ${activeTab === "biblioteca" ? "is-active" : ""}`}
          onClick={() => onSelectTab("biblioteca")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">📚</span>
            <span>Biblioteca</span>
          </div>
        </button>

        {/* Nativo (Estúdio IA) */}
        <button
          className={`mc-nav-item ${activeTab === "nativo" ? "is-active" : ""}`}
          onClick={() => onSelectTab("nativo")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">⚡</span>
            <span>Nativo</span>
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              background: "rgba(200, 212, 78, 0.2)",
              color: "#c8d44e",
              border: "1px solid rgba(200, 212, 78, 0.35)",
              padding: "1px 5px",
              borderRadius: 4,
            }}
          >
            NOVO
          </span>
        </button>

        {/* Calendário */}
        <button
          className={`mc-nav-item ${activeTab === "calendario" ? "is-active" : ""}`}
          onClick={() => onSelectTab("calendario")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">📅</span>
            <span>Calendário</span>
          </div>
        </button>

        {/* Redes Sociais */}
        <button
          className={`mc-nav-item ${activeTab === "redes-sociais" ? "is-active" : ""}`}
          onClick={() => onSelectTab("redes-sociais")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">🔗</span>
            <span>Redes sociais</span>
          </div>
        </button>

        {/* Vendas */}
        <button
          className={`mc-nav-item ${activeTab === "vendas" ? "is-active" : ""}`}
          onClick={() => onSelectTab("vendas")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">💼</span>
            <span>Vendas</span>
          </div>
        </button>

        {/* Formulários */}
        <button
          className={`mc-nav-item ${activeTab === "formularios" ? "is-active" : ""}`}
          onClick={() => onSelectTab("formularios")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">📝</span>
            <span>Formulários</span>
          </div>
        </button>

        {/* Lixeira */}
        <button
          className={`mc-nav-item ${activeTab === "lixeira" ? "is-active" : ""}`}
          onClick={() => onSelectTab("lixeira")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">🗑️</span>
            <span>Lixeira</span>
          </div>
        </button>

        {/* Relatórios */}
        <button
          className={`mc-nav-item ${activeTab === "relatorios" ? "is-active" : ""}`}
          onClick={() => onSelectTab("relatorios")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">📈</span>
            <span>Relatórios</span>
          </div>
        </button>

        {/* Financeiro */}
        <button
          className={`mc-nav-item ${activeTab === "financeiro" ? "is-active" : ""}`}
          onClick={() => onSelectTab("financeiro")}
        >
          <div className="mc-nav-item__left">
            <span className="mc-nav-item__icon">💳</span>
            <span>Financeiro</span>
          </div>
        </button>
      </div>

      {/* Rodapé da Sidebar */}
      <div className="mc-sidebar__footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,244,232,0.5)" }}>Tema</span>
          <ThemeToggle />
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--mc-caramel)",
            letterSpacing: "0.05em",
          }}
        >
          LAB 2026
        </span>
      </div>
    </aside>
  );
};

export const ModoCriadorSidebar = GabineteSidebar;

