// Lista os grupos da instância uazapi (nome, JID e membros) para preencher UAZAPI_GROUP_JID.
// Uso: node --env-file=.env scripts/uazapi-grupos.mjs [busca]
const url = (process.env.UAZAPI_URL || "").replace(/\/+$/, "");
const token = process.env.UAZAPI_TOKEN;
if (!url || !token) {
  console.error("Preencha UAZAPI_URL e UAZAPI_TOKEN no .env (token da instância, não o admin token).");
  process.exit(1);
}

const response = await fetch(`${url}/group/list`, {
  method: "POST",
  headers: { token, "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ search: process.argv[2] || "", limit: 1000, offset: 0, noParticipants: true }),
});
if (!response.ok) {
  console.error(`uazapi respondeu ${response.status}: ${await response.text()}`);
  process.exit(1);
}
const { groups = [] } = await response.json();
if (!groups.length) console.log("Nenhum grupo encontrado. O número conectado à instância está no grupo?");
for (const group of groups) {
  const kind = group.IsParent ? "comunidade" : group.LinkedParentJID ? "grupo de comunidade" : "grupo";
  console.log(`${group.Name}  →  ${group.JID}  (${kind}, ${group.ParticipantCount ?? "?"} membros)`);
}
