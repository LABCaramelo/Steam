import React, { useState } from "react";

interface Props {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenVideoTutorials: () => void;
  onOpenQuickNotes: () => void;
  onOpenSettings?: () => void;
}

export const GabineteTopbar: React.FC<Props> = ({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenVideoTutorials,
  onOpenQuickNotes,
  onOpenSettings,
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

      {/* Lado Direito: Ações & Perfil */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* 1. Engrenagem (Configurações) */}
        <button
          onClick={() => onOpenSettings ? onOpenSettings() : alert("Abrindo Configurações")}
          style={{ background: "none", border: "none", color: "rgba(255, 244, 232, 0.65)", cursor: "pointer", padding: 4 }}
          title="Configurações da Agência"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* 2. Câmera (Tutoriais em Vídeo) */}
        <button
          onClick={onOpenVideoTutorials}
          style={{ background: "none", border: "none", color: "rgba(255, 244, 232, 0.65)", cursor: "pointer", padding: 4 }}
          title="Tutoriais em Vídeo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 8-6 4 6 4V8Z" />
            <rect width="14" height="12" x="2" y="6" rx="2" />
          </svg>
        </button>

        {/* 3. Lupa (Busca) */}
        <button
          onClick={() => {
            const term = prompt("Buscar cliente, post ou demanda:");
            if (term) alert(`Buscando por: "${term}"`);
          }}
          style={{ background: "none", border: "none", color: "rgba(255, 244, 232, 0.65)", cursor: "pointer", padding: 4 }}
          title="Busca Rápida"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>

        {/* 4. Bloco de Notas */}
        <button
          onClick={onOpenQuickNotes}
          style={{ background: "none", border: "none", color: "rgba(255, 244, 232, 0.65)", cursor: "pointer", padding: 4 }}
          title="Bloco de Notas Rápido"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>

        {/* 5. Ponto de Interrogação (Ajuda) */}
        <button
          onClick={() => alert("Central de Ajuda do Gabinete:\n- Dúvidas sobre o Método HEAD\n- Formatos de carrossel\n- Gestão de clientes extras")}
          style={{ background: "none", border: "none", color: "rgba(255, 244, 232, 0.65)", cursor: "pointer", padding: 4 }}
          title="Central de Ajuda"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        {/* 6. Sino de Notificações com Badge "2" */}
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

        {/* 7. Avatar Verde-Limão com letra "L" e nome "Luiz" */}
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
