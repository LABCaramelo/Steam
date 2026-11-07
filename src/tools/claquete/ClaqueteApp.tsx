import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Isotype } from "@caramelo/design-system";
import { supabase } from "../../supabase";

const CLOUD_URL = "https://claquete-phi.vercel.app";
const LOCAL_CANDIDATES = [
  "http://localhost:8787",
  "http://localhost:5173",
];

export function ClaqueteApp() {
  const [activeUrl, setActiveUrl] = useState<string>(CLOUD_URL);
  const [frameLoading, setFrameLoading] = useState(true);
  const [attempt] = useState(0);
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
              return;
            }
          } catch {
            // ignore
          }
        }
        if (alive) {
          setActiveUrl(CLOUD_URL);
        }
      };
      checkLocal();
    } else {
      setActiveUrl(CLOUD_URL);
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
