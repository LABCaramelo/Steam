import { lazy, Suspense } from "react";
import { AUTOMATION_APP_ID } from "../../toolCatalog";
import { mountTool } from "../shared/mount";
import { TramaApp } from "../trama/main";

const LegacyPlanner = lazy(async () => {
  const [{ AutomationApp }, { supabaseAutomation }] = await Promise.all([import("./AutomationApp"), import("./repo"), import("./automation.css")]);
  return { default: () => <><a href="/tools/automation/index.html" style={{ display: "block", padding: "12px", color: "rgb(var(--cm-fg))" }}>← Voltar à Trama</a><AutomationApp repo={supabaseAutomation}/></> };
});
mountTool({ slug: "automation", appid: AUTOMATION_APP_ID, name: "Trama" }, new URLSearchParams(location.search).get("legacy") === "1" ? <Suspense fallback={<p role="status">Abrindo seus planejamentos anteriores…</p>}><LegacyPlanner/></Suspense> : <TramaApp/>);
