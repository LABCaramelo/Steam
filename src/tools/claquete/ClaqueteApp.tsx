import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Isotype } from "@caramelo/design-system";
import { useToolUser } from "../shared/kit";
import { supabase } from "../../supabase";

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
  const [session, setSession] = useState<Session | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 1. Monitora a sessão ativa do usuário no LAB para repassar via SSO
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Detecção de servidor local para desenvolvimento
  useEffect(() => {
    let alive = true;

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

  // 3. Comunicação cross-origin para enviar sessão Supabase ao iframe da Claquete
  const dispatchSession = useCallback(async (targetWindow?: Window | null) => {
    try {
      const win = targetWindow ?? iframeRef.current?.contentWindow;
      if (!win) return;
      const { data: { session: curSession } } = await supabase.auth.getSession();
      if (!curSession?.access_token) return;
      win.postMessage(
        {
          type: "LAB_AUTH_SESSION",
          session: {
            access_token: curSession.access_token,
            refresh_token: curSession.refresh_token,
            user: curSession.user,
          },
        },
        "*"
      );
    } catch (err) {
      console.error("[LAB] Erro ao sincronizar sessão com a Claquete:", err);
    }
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "LAB_AUTH_REQUEST") {
        dispatchSession(e.source as Window);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [dispatchSession]);

  useEffect(() => {
    if (session && iframeRef.current?.contentWindow) {
      dispatchSession();
    }
  }, [session, dispatchSession]);

  const authHash = session?.access_token
    ? `#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token || "")}&token_type=bearer`
    : "";

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
            href={`${activeUrl}/${authHash}`}
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
          ref={iframeRef}
          key={`${activeUrl}-${attempt}`}
          className="claquete-frame"
          src={`${activeUrl}/${authHash}`}
          title="Claquete — Estúdio de Cinema com IA"
          allow="clipboard-write; fullscreen; autoplay; picture-in-picture; camera; microphone"
          allowFullScreen
          onLoad={() => {
            setFrameLoading(false);
            dispatchSession();
            setTimeout(() => dispatchSession(), 350);
            setTimeout(() => dispatchSession(), 1000);
          }}
        />
      </main>
    </div>
  );
}
