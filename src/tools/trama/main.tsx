import { useEffect, useRef, useState } from "react";
import { mountTool } from "../shared/mount";
import { AUTOMATION_APP_ID } from "../../toolCatalog";
import { useToolUser } from "../shared/kit";

export function TramaApp() {
  const container = useRef<HTMLDivElement>(null);
  const user = useToolUser();
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    let dispose: (() => void) | undefined;
    import("./app/bootstrap.js").then(async ({ mountTrama }) => {
      if (!alive || !container.current) return;
      const stop = await mountTrama(container.current, user.id);
      if (alive) dispose = stop; else stop();
    }).catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : "Não foi possível abrir a Trama."); });
    return () => { alive = false; dispose?.(); };
  }, [user.id]);
  return error ? <div role="alert" className="tk-empty"><h1>A Trama não abriu</h1><p>{error}</p><button onClick={() => location.reload()}>Tentar novamente</button></div> : <div ref={container} className="trama-root"/>;
}

if (location.pathname.includes("/tools/trama")) mountTool({ slug: "automation", appid: AUTOMATION_APP_ID, name: "Trama" }, <TramaApp/>);
