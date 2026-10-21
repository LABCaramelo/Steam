import { useEffect, useState } from "react";
import { Isotype } from "@caramelo/design-system";
import { useToolUser } from "../shared/kit";

const CLOUD_URL = "https://claquete-phi.vercel.app";
const LOCAL_CANDIDATES = [
  "http://localhost:8787",
  "http://localhost:5173",
];

export function ClaqueteApp() {
  const user = useToolUser();
  const [activeUrl, setActiveUrl] = useState<string>(CLOUD_URL);
  const [isLocal, setIsLocal] = useState(false);
  const [frameLoading, setFrameLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;

    // Se estiver em ambiente local (localhost), tenta conectar com a porta local de desenvolvimento
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      const checkLocal = async () => {
        for (const base of LOCAL_CANDIDATES) {
          try {
            const res = await fetch(`${base}/api/health`, { method: "GET", mode: "cors" }).catch(() => null);
            if (res && res.ok && alive) {
              setActiveUrl(base);
              setIsLocal(true);
              return;
            }
          } catch {
            // ignore
          }
        }
        if (alive) {
          setActiveUrl(CLOUD_URL);
          setIsLocal(false);
        }
      };
      checkLocal();
    } else {
      setActiveUrl(CLOUD_URL);
      setIsLocal(false);
    }

    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <div className="claquete-shell">
      <header className="claquete-topbar">
        <div className="claquete-brand">
          <Isotype size={24} decorative interactive />
          <span className="claquete-title">Claquete</span>
          <span className="claquete-badge">CINEMA & VÍDEO COM IA</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.06)",
              color: isLocal ? "#FFD52A" : "#25BFFF",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isLocal ? "#FFD52A" : "#25BFFF",
                boxShadow: `0 0 6px ${isLocal ? "#FFD52A" : "#25BFFF"}`,
              }}
            />
            {isLocal ? "Servidor Local" : "Nuvem (Supabase & R2)"}
          </span>
        </div>

        <div className="claquete-actions">
          <a
            className="btn btn--ghost"
            href={`${activeUrl}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, textDecoration: "none" }}
          >
            Abrir em nova aba ↗
          </a>
          <button
            className="btn btn--ghost"
            onClick={() => {
              setFrameLoading(true);
              setAttempt((n) => n + 1);
            }}
            title="Recarregar"
            style={{ fontSize: 13 }}
          >
            Recarregar
          </button>
          <span style={{ fontSize: 12, color: "rgb(var(--cm-fg-muted))", marginLeft: 6 }}>
            Logado como {user.name}
          </span>
        </div>
      </header>

      <main className="claquete-viewport">
        {frameLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              background: "rgb(var(--cm-stage))",
              zIndex: 5,
            }}
          >
            <Isotype size={48} decorative interactive />
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--cm-fg-muted))" }}>
              Abrindo estúdio de cinema com IA…
            </span>
          </div>
        )}

        <iframe
          key={`${activeUrl}-${attempt}`}
          className="claquete-frame"
          src={`${activeUrl}/`}
          title="Claquete — Estúdio de Cinema com IA"
          allow="clipboard-write; fullscreen; autoplay; picture-in-picture; camera; microphone"
          allowFullScreen
          onLoad={() => setFrameLoading(false)}
        />
      </main>
    </div>
  );
}
