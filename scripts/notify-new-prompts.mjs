// Dispara aviso de prompts atualizados para o grupo oficial do LAB via WhatsApp/UAZAPI.
// Uso:
//   node scripts/notify-new-prompts.mjs --dry-run
//   node scripts/notify-new-prompts.mjs --recent 5
//   node scripts/notify-new-prompts.mjs --slugs "offline-footer,wild-pill-hero"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getUazapiNotificationConfig,
  formatNewPromptsMessage,
  sendNewPromptsNotification,
} from "../server/promptNotification.ts";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // Ignora se .env não existir
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "api", "data", "prompt-catalog.json");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

const recentArg = getArgValue("--recent");
const slugsArg = getArgValue("--slugs");
const groupArg = getArgValue("--group");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const items = Array.isArray(catalog.items) ? catalog.items : [];

let selectedPrompts = [];

if (slugsArg) {
  const targetSlugs = slugsArg.split(",").map((s) => s.trim().toLowerCase());
  const slugMap = new Map(items.map((i) => [i.slug.toLowerCase(), i]));
  selectedPrompts = targetSlugs.map((s) => slugMap.get(s)).filter(Boolean);
  if (selectedPrompts.length === 0) {
    console.error(`Nenhum prompt encontrado para os slugs informados: ${slugsArg}`);
    process.exit(1);
  }
} else {
  const count = recentArg ? Math.max(1, parseInt(recentArg, 10) || 5) : 5;
  // Ordena por created_at decrescente
  const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  selectedPrompts = sorted.slice(0, count);
}

console.log(`Prompts selecionados para notificação (${selectedPrompts.length}):`);
for (const p of selectedPrompts) {
  console.log(`  • [${p.slug}] ${p.title} (${p.category || "Geral"})`);
}

const formattedMessage = formatNewPromptsMessage(selectedPrompts);

if (isDryRun) {
  console.log("\n--- [DRY-RUN] Mensagem formatada que seria enviada: ---");
  console.log(formattedMessage);
  console.log("-------------------------------------------------------");
  console.log("Nenhuma mensagem foi enviada ao WhatsApp.");
  process.exit(0);
}

const config = getUazapiNotificationConfig();
if (groupArg) {
  config.groupJid = groupArg;
}

if (!config.uazapiUrl || !config.uazapiToken || !config.groupJid) {
  console.error("\n❌ Erro: Configuração da UAZAPI incompleta (UAZAPI_URL, UAZAPI_TOKEN ou UAZAPI_GROUP_JID ausentes no .env).");
  process.exit(1);
}

console.log(`\nEnviando notificação para o grupo ${config.groupJid} via ${config.uazapiUrl}...`);

try {
  const result = await sendNewPromptsNotification(config, selectedPrompts);
  console.log(`\n✅ Sucesso! Notificação enviada para o grupo do LAB no WhatsApp (${result.count} prompts).`);
} catch (err) {
  console.error(`\n❌ Falha no envio:`, err.message || err);
  process.exit(1);
}
