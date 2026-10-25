import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabase";
import { useToolUser } from "../shared/kit";
import documentSource from "./document.html?raw";
import { buildPromptDocument, isPromptRequest } from "./bridge";

/** Legacy presentation lives only inside the authenticated tool's lifetime. */
export function PromptLibraryApp() {
  const user = useToolUser();
  const frame = useRef<HTMLIFrameElement>(null);
  const [blocked, setBlocked] = useState(false);
  const document = useMemo(() => buildPromptDocument(documentSource, window.location.href, user.id), [user.id]);

  useEffect(() => {
    const pending = new Map<string, AbortController>();
    let alive = true;
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const request = event.data;
      if (isPromptRequest(request)) {
        if (pending.has(request.id) || pending.size >= 12) return;
        const controller = new AbortController();
        pending.set(request.id, controller);
        void (async () => {
          let status = 503;
          let body: unknown = { error: "Não foi possível carregar o acervo." };
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session?.access_token || data.session.user.id !== user.id) {
              status = 401;
            } else {
              const path = request.slug === null ? "/api/prompt-library" : `/api/prompt-library?slug=${encodeURIComponent(request.slug)}`;
              const timeout = window.setTimeout(() => controller.abort(), 30_000);
              try {
                const response = await fetch(path, { cache: "no-store", signal: controller.signal,
                  headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}` } });
                status = response.status;
                body = await response.json();
              } finally { window.clearTimeout(timeout); }
            }
          } catch { /* A failed request never grants access. */ }
          finally { pending.delete(request.id); }
          if (!alive || controller.signal.aborted) return;
          if (status === 401 || status === 403) { setBlocked(true); return; }
          frame.current?.contentWindow?.postMessage({ type: "lab:prompts:response", id: request.id, status, body }, window.location.origin);
        })();
      } else if (request && typeof request === "object" && "type" in request && request.type === "lab:prompts:select" && "slug" in request
        && (request.slug === null || (typeof request.slug === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/.test(request.slug)))) {
        const url = new URL(window.location.href);
        if (request.slug === null) url.searchParams.delete("prompt"); else url.searchParams.set("prompt", request.slug);
        window.history.replaceState(null, "", url);
      }
    };
    window.addEventListener("message", receive);
    return () => { alive = false; window.removeEventListener("message", receive); for (const controller of pending.values()) controller.abort(); };
  }, [user.id]);

  if (blocked) return <main className="tk-gate"><section className="tk-gate__card cm-surface"><h1 className="tk-gate__title">Acesso interrompido</h1><p className="tk-gate__text">Entre no LAB e confira a ferramenta na sua biblioteca.</p><a href="/library/home" target="_top">Voltar ao LAB</a></section></main>;
  return <iframe ref={frame} title="Biblioteca de prompts" srcDoc={document}
    onLoad={() => frame.current?.contentWindow?.postMessage({ type: "lab:prompts:ready" }, window.location.origin)}
    style={{ display: "block", border: 0, width: "100%", height: "100dvh" }} allow="clipboard-write" />;
}
