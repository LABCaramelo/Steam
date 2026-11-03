import React, { useState } from "react";
import type { SocialIntegration, Workspace } from "./types";
import type { GabineteRepository } from "./repo";
import { IconCamera, IconMusic, IconFolder } from "./Icons";

interface Props {
  workspace: Workspace;
  repo: GabineteRepository;
}

export const RedesSociaisView: React.FC<Props> = ({ workspace, repo }) => {
  const [integrations, setIntegrations] = useState<SocialIntegration[]>([
    { provider: "instagram", connected: true, account_name: "@umcaracaramelo", last_sync: "Hoje às 10:20" },
    { provider: "tiktok", connected: false },
    { provider: "drive", connected: true, account_name: "backup-estudio-caramelo" },
    { provider: "facebook", connected: true, account_name: "Laboratório de Interação" },
  ]);

  const toggleConnection = async (item: SocialIntegration) => {
    const nextState = !item.connected;
    await repo.saveIntegration(
      workspace.id,
      item.provider,
      nextState,
      nextState ? (item.provider === "tiktok" ? "@estudio.lab" : item.account_name || "@conta") : undefined
    );
    setIntegrations(
      integrations.map((i) =>
        i.provider === item.provider
          ? {
              ...i,
              connected: nextState,
              account_name: nextState ? i.account_name || "@conta" : undefined,
              last_sync: nextState ? "Conectado agora" : undefined,
            }
          : i
      )
    );
  };

  return (
    <div className="mc-content">
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            Redes Sociais & Conexões
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Publicação automática no Instagram, TikTok, integração com Meta for Agencies e backup no Google Drive.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {/* Instagram */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <IconCamera size={26} color="var(--mc-caramel)" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: integrations.find((i) => i.provider === "instagram")?.connected
                    ? "rgba(42, 213, 135, 0.15)"
                    : "rgba(255, 77, 77, 0.15)",
                  color: integrations.find((i) => i.provider === "instagram")?.connected
                    ? "var(--mc-mint)"
                    : "var(--mc-danger)",
                }}
              >
                {integrations.find((i) => i.provider === "instagram")?.connected ? "CONECTADO" : "DESCONECTADO"}
              </span>
            </div>
            <h3 style={{ margin: "12px 0 4px 0", fontSize: 18, fontWeight: 700 }}>Instagram Graph API</h3>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--mc-text-muted)" }}>
              Agendamento e publicação automática de Reels, Carrosséis e Stories nos perfis dos clientes.
            </p>
            {integrations.find((i) => i.provider === "instagram")?.connected && (
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "var(--mc-caramel)", fontWeight: 600 }}>
                Conta vinculada: @umcaracaramelo
              </p>
            )}
          </div>

          <button
            className={`mc-btn ${
              integrations.find((i) => i.provider === "instagram")?.connected ? "mc-btn--secondary" : "mc-btn--primary"
            }`}
            onClick={() => toggleConnection(integrations.find((i) => i.provider === "instagram")!)}
          >
            {integrations.find((i) => i.provider === "instagram")?.connected ? "Desconectar Conta" : "Conectar com Instagram"}
          </button>
        </div>

        {/* TikTok */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <IconMusic size={26} color="var(--mc-caramel)" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: integrations.find((i) => i.provider === "tiktok")?.connected
                    ? "rgba(42, 213, 135, 0.15)"
                    : "rgba(255, 77, 77, 0.15)",
                  color: integrations.find((i) => i.provider === "tiktok")?.connected
                    ? "var(--mc-mint)"
                    : "var(--mc-danger)",
                }}
              >
                {integrations.find((i) => i.provider === "tiktok")?.connected ? "CONECTADO" : "DESCONECTADO"}
              </span>
            </div>
            <h3 style={{ margin: "12px 0 4px 0", fontSize: 18, fontWeight: 700 }}>TikTok for Business</h3>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--mc-text-muted)" }}>
              Distribuição e postagem direta de vídeos verticais com sons em alta.
            </p>
          </div>

          <button
            className={`mc-btn ${
              integrations.find((i) => i.provider === "tiktok")?.connected ? "mc-btn--secondary" : "mc-btn--primary"
            }`}
            onClick={() => toggleConnection(integrations.find((i) => i.provider === "tiktok")!)}
          >
            {integrations.find((i) => i.provider === "tiktok")?.connected ? "Desconectar Conta" : "Conectar TikTok"}
          </button>
        </div>

        {/* Google Drive */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <IconFolder size={26} color="var(--mc-caramel)" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: integrations.find((i) => i.provider === "drive")?.connected
                    ? "rgba(42, 213, 135, 0.15)"
                    : "rgba(255, 77, 77, 0.15)",
                  color: integrations.find((i) => i.provider === "drive")?.connected
                    ? "var(--mc-mint)"
                    : "var(--mc-danger)",
                }}
              >
                {integrations.find((i) => i.provider === "drive")?.connected ? "CONECTADO" : "DESCONECTADO"}
              </span>
            </div>
            <h3 style={{ margin: "12px 0 4px 0", fontSize: 18, fontWeight: 700 }}>Backup no Google Drive</h3>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--mc-text-muted)" }}>
              Backup automático de todos os arquivos de arte, vídeos e capas em alta resolução.
            </p>
          </div>

          <button
            className={`mc-btn ${
              integrations.find((i) => i.provider === "drive")?.connected ? "mc-btn--secondary" : "mc-btn--primary"
            }`}
            onClick={() => toggleConnection(integrations.find((i) => i.provider === "drive")!)}
          >
            {integrations.find((i) => i.provider === "drive")?.connected ? "Desconectar Drive" : "Conectar Google Drive"}
          </button>
        </div>
      </div>
    </div>
  );
};
