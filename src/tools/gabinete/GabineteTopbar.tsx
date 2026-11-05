import React, { useState } from "react";

interface Props {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenVideoTutorials?: () => void;
  onOpenQuickNotes?: () => void;
  onOpenSettings?: () => void;
}

export const GabineteTopbar: React.FC<Props> = ({
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header
      style={{
        height: 52,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(12, 14, 20, 0.8)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 35,
        userSelect: "none",
      }}
    >
      {/* Lado Esquerdo: Botões de Colapsar Sidebar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 244, 232, 0.65)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 16,
            padding: 4,
            borderRadius: 6,
            transition: "all 0.15s ease",
          }}
          title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {/* Ícone de Livro/Painel */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>
            {sidebarCollapsed ? "»" : "«"}
          </span>
        </button>
      </div>

      {/* Lado Direito: Notificações & Perfil */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Sino de Notificações com Badge "2" */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            style={{ background: "none", border: "none", color: "rgba(255, 244, 232, 0.65)", cursor: "pointer", padding: 4 }}
            title="Notificações"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {/* Badge circular vermelho com "2" */}
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                background: "#ff4444",
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 800,
                width: 15,
                height: 15,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #0c0e14",
              }}
            >
              2
            </span>
          </button>
        </div>

        {/* Avatar Verde-Limão com letra "L" e nome "Luiz" */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "#c8d44e",
              color: "#101014",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            L
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff4e8" }}>Luiz</span>
        </div>
      </div>
    </header>
  );
};
