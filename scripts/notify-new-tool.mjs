// Dispara aviso de nova ferramenta publicada para o grupo oficial do LAB via WhatsApp/UAZAPI.
// Uso:
//   node scripts/notify-new-tool.mjs --list
//   node scripts/notify-new-tool.mjs --slug trama --dry-run
//   node --env-file=.env scripts/notify-new-tool.mjs --slug trama
//   node --env-file=.env scripts/notify-new-tool.mjs --slug gabinete --note "Atualizado com novos templates!"

import {
  getUazapiNotificationConfig,
  formatNewToolMessage,
  sendNewToolNotification,
  buildToolNotificationData,
  KNOWN_LAB_TOOLS,
} from "../server/toolNotification.ts";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // Ignora se .env não existir
  }
}

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isList = args.includes("--list");

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

if (isList) {
  console.log("==================================================================");
  console.log("🛠️ FERRAMENTAS DO LAB DISPONÍVEIS PARA NOTIFICAÇÃO");
  console.log("==================================================================\n");
  for (const [slug, t] of Object.entries(KNOWN_LAB_TOOLS)) {
    console.log(`• [${slug}] ${t.name} (${t.category}) — ${t.tagline || t.description}`);
  }
  console.log("\nPara disparar o aviso de uma ferramenta:");
  console.log("  node --env-file=.env scripts/notify-new-tool.mjs --slug trama");
  process.exit(0);
}

const slugArg = getArgValue("--slug");
const noteArg = getArgValue("--note");
const groupArg = getArgValue("--group");

if (!slugArg) {
  console.error("❌ Informe a ferramenta via --slug [slug] ou use --list para ver as ferramentas.");
  console.error("Exemplo: node --env-file=.env scripts/notify-new-tool.mjs --slug trama");
  process.exit(1);
}

const tool = buildToolNotificationData({
  slug: slugArg,
  customNote: noteArg || undefined,
});

console.log("==================================================================");
console.log(`🐕 AVISO DE FERRAMENTA NO LAB: ${tool.name.toUpperCase()} (${tool.slug})`);
console.log("==================================================================\n");

const formattedMessage = formatNewToolMessage(tool);

if (isDryRun) {
  console.log("--- [DRY-RUN] Mensagem que seria enviada ao WhatsApp: ---");
  console.log(formattedMessage);
  console.log("---------------------------------------------------------");
  console.log("Nenhuma mensagem foi enviada ao WhatsApp.");
  process.exit(0);
}

const config = getUazapiNotificationConfig();
if (groupArg) {
  config.groupJid = groupArg;
}

if (!config.uazapiUrl || !config.uazapiToken || !config.groupJid) {
  console.error("❌ Erro: Configuração da UAZAPI incompleta (UAZAPI_URL, UAZAPI_TOKEN ou UAZAPI_GROUP_JID ausentes no .env).");
  process.exit(1);
}

console.log(`Enviando notificação para o grupo ${config.groupJid} via ${config.uazapiUrl}...`);

try {
  const result = await sendNewToolNotification(config, tool);
  console.log(`\n✅ Sucesso! Notificação da ferramenta "${result.tool.name}" enviada para o grupo do LAB no WhatsApp.`);
} catch (err) {
  console.error(`\n❌ Falha no envio:`, err.message || err);
  process.exit(1);
}
