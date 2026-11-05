import React, { useEffect, useState } from "react";
import { useOptionalToolUser } from "../shared/kit";
import { supabase } from "../../supabase";

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
  const toolUser = useOptionalToolUser();
  const [userProfile, setUserProfile] = useState<{ name: string; avatarUrl: string | null } | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadUser() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data: prof } = await supabase
          .from("profiles")
          .select("name, nickname, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!alive) return;
        const name =
          prof?.nickname?.trim() ||
          prof?.name?.trim() ||
          user.user_metadata?.nickname?.trim() ||
          user.user_metadata?.name?.trim() ||
          user.email?.split("@")[0] ||
          "Luiz";
        const avatarUrl =
          prof?.avatar_url ||
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        setUserProfile({ name, avatarUrl });
      } catch {
        // Fallback to toolUser
      }
    }

    loadUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      alive = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const displayName = userProfile?.name || toolUser?.nickname || toolUser?.name || "Luiz";
  const avatarUrl = userProfile?.avatarUrl !== undefined ? userProfile.avatarUrl : (toolUser?.avatarUrl || null);
  const initial = (displayName.charAt(0) || "L").toUpperCase();

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

      {/* Lado Direito: Notificações & Perfil Oficial do LAB */}
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

        {/* Foto e Nome do Usuário Oficial do LAB */}
        <a
          href="/profile"
          target="_top"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            cursor: "pointer",
            textDecoration: "none",
            color: "inherit",
            padding: "3px 10px 3px 4px",
            borderRadius: 9999,
            transition: "all 0.15s ease",
            background: "transparent",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.06)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          title={`Conectado como ${displayName} no LAB (ver perfil)`}
        >
          {avatarUrl && !imgFailed ? (
            <img
              src={avatarUrl}
              alt={displayName}
              onError={() => setImgFailed(true)}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1.5px solid rgba(255, 112, 26, 0.45)",
                display: "block",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.35)",
              }}
            />
          ) : (
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
                boxShadow: "0 2px 6px rgba(200, 212, 78, 0.25)",
              }}
            >
              {initial}
            </div>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff4e8", letterSpacing: "0.01em" }}>
            {displayName}
          </span>
        </a>
      </div>
    </header>
  );
};
