import { useEffect, useState } from "react";
import { Isotype, MagneticButton } from "@caramelo/design-system";
import { useToolUser } from "../shared/kit";

const CANDIDATE_URLS = [
  "http://localhost:8787",
  "http://localhost:5173",
];

export function ClaqueteApp() {
  const user = useToolUser();
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setChecking(true);

    const checkServer = async () => {
      for (const base of CANDIDATE_URLS) {
        try {
          const res = await fetch(`${base}/api/health`, { method: "GET", mode: "cors" }).catch(() => null);
          if (res && res.ok && alive) {
            setActiveUrl(base);
            setChecking(false);
            return;
          }
        } catch {
          // ignore
        }
      }
      if (alive) {
        setActiveUrl(null);
        setChecking(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [attempt]);

  return (
    <div className="claquete-shell">
      <header className="claquete-topbar">
        <div className="claquete-brand">
          <Isotype size={24} decorative interactive />
          <span className="claquete-title">Claquete</span>
          <span className="claquete-badge">CINEMA & VÍDEO COM IA</span>
        </div>
        <div className="claquete-actions">
          {activeUrl ? (
            <>
              <a
                className="btn btn--ghost"
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, textDecoration: "none" }}
              >
                Abrir em nova aba ↗
              </a>
              <button
                className="btn btn--ghost"
                onClick={() => setAttempt((n) => n + 1)}
                title="Recarregar conexão"
                style={{ fontSize: 13 }}
              >
                Recarregar
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "rgb(var(--cm-fg-muted))" }}>
              Logado como {user.name}
            </span>
          )}
        </div>
      </header>

      <main className="claquete-viewport">
        {activeUrl ? (
          <iframe
            className="claquete-frame"
            src={`${activeUrl}/projects`}
            title="Claquete — Estúdio de Cinema com IA"
            allow="clipboard-write; fullscreen; autoplay; picture-in-picture; camera; microphone"
            allowFullScreen
          />
        ) : (
          <div className="claquete-offline">
            <div className="claquete-card cm-surface cm-surface--spotlight">
              <div className="claquete-card__header">
                <Isotype size={44} decorative interactive />
                <div>
                  <h1 className="claquete-card__title">Claquete · Cinema com IA</h1>
                  <p className="claquete-card__subtitle">
                    Canvas infinito, roteiro, set 3D e editor de vídeo.
                  </p>
                </div>
              </div>

              <div className="claquete-checklist">
                <div className="claquete-checkitem">
                  <span>Banco de Dados Supabase (Projetos & Roteiros)</span>
                  <span className="claquete-checkitem__status claquete-checkitem__status--ok">
                    ✓ fzhzpzxsttflgtassyex
                  </span>
                </div>
                <div className="claquete-checkitem">
                  <span>Hospedagem de Mídias Cloudflare R2</span>
                  <span className="claquete-checkitem__status claquete-checkitem__status--ok">
                    ✓ media.umcaracaramelo.com.br
                  </span>
                </div>
                <div className="claquete-checkitem">
                  <span>Identidade Visual & Design System</span>
                  <span className="claquete-checkitem__status claquete-checkitem__status--ok">
                    ✓ Caramelo Lumen V1 2026
                  </span>
                </div>
                <div className="claquete-checkitem">
                  <span>Servidor de Geração & IA (Higgsfield + OpenAI)</span>
                  <span className="claquete-checkitem__status claquete-checkitem__status--wait">
                    {checking ? "Verificando porta 8787…" : "Aguardando inicialização"}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "rgb(var(--cm-fg-muted))", margin: "16px 0 8px" }}>
                Para rodar o motor completo de inteligência artificial da Claquete com as APIs locais, inicie o servidor:
              </p>

              <div className="claquete-code">
                <span>cd "D:\meus documentos\flick" ; npm run dev</span>
              </div>

              <div className="claquete-footer">
                <MagneticButton
                  variant="accent"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  {checking ? "Conectando…" : "Verificar Conexão"}
                </MagneticButton>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
