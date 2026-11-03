import React from "react";
import type { Client, Workspace } from "./types";
import type { GabineteRepository } from "./repo";

interface Props {
  workspace: Workspace;
  clients: Client[];
  repo: GabineteRepository;
}

export const FormulariosView: React.FC<Props> = ({ workspace, clients, repo: _repo }) => {

  return (
    <div className="mc-content">
      <div className="mc-view-header" style={{ padding: 0 }}>
        <div>
          <h2 className="mc-view-header__title">
            <span>📝</span> Formulários & Briefings de Onboarding
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--mc-text-muted)" }}>
            Modelos de questionários para os {clients.length} clientes do estúdio {workspace.name}.
          </p>
        </div>

        <button className="mc-btn mc-btn--primary" onClick={() => alert("Link de formulário copiado para o clipboard!")}>
          🔗 Copiar Link de Envio
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Card 1: Onboarding Canônico Head de Conteúdo */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-caramel)", letterSpacing: "0.06em" }}>
              MODELO CANÔNICO DO LAB
            </span>
            <h3 style={{ margin: "6px 0", fontSize: 18, fontWeight: 800 }}>
              Onboarding Estratégico — Cérebro Caramelo
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--mc-text-body)" }}>
              Perguntas para descobrir o contraste da marca, histórias reais, produtos de maior margem e limites inegociáveis.
            </p>
          </div>

          <div style={{ background: "var(--mc-ink)", padding: 14, borderRadius: 8, fontSize: 12.5, color: "var(--mc-text-muted)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div><strong>1. Transformação:</strong> O que o cliente sente antes e depois de te contratar?</div>
            <div><strong>2. História Real:</strong> Qual foi o caso mais marcante de cliente satisfeito?</div>
            <div><strong>3. Inimigo Comum:</strong> O que o seu mercado faz que você discorda totalmente?</div>
            <div><strong>4. Restrições:</strong> Quais palavras ou abordagens a sua marca NUNCA usaria?</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="mc-btn mc-btn--secondary" onClick={() => alert("Prévia aberta!")}>
              Visualizar Prévia
            </button>
            <button className="mc-btn mc-btn--acid" onClick={() => alert("Link gerado e copiado!")}>
              Enviar ao Cliente
            </button>
          </div>
        </div>

        {/* Card 2: Diagnóstico Rápido de Campanha */}
        <div
          style={{
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mc-sky)", letterSpacing: "0.06em" }}>
              CAMPANHAS & LANÇAMENTOS
            </span>
            <h3 style={{ margin: "6px 0", fontSize: 18, fontWeight: 800 }}>
              Briefing de Campanha ou Lançamento Específico
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--mc-text-body)" }}>
              Alinhamento de oferta, bônus, datas e gatilhos para campanhas pontuais no Instagram e TikTok.
            </p>
          </div>

          <div style={{ background: "var(--mc-ink)", padding: 14, borderRadius: 8, fontSize: 12.5, color: "var(--mc-text-muted)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div><strong>1. Mecanismo Único:</strong> Por que a oferta deste mês é imperdível?</div>
            <div><strong>2. Prazos:</strong> Data de início de aquecimento, abertura de carrinho e encerramento.</div>
            <div><strong>3. Meta de Faturamento:</strong> Quantas vagas ou produtos precisam ser vendidos?</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="mc-btn mc-btn--secondary" onClick={() => alert("Prévia aberta!")}>
              Visualizar Prévia
            </button>
            <button className="mc-btn mc-btn--acid" onClick={() => alert("Link gerado e copiado!")}>
              Enviar ao Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
