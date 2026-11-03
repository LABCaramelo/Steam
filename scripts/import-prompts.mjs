// Sincroniza o acervo da Biblioteca de Prompts (api/data/prompt-catalog.json) com todos os prompts do Supabase.
// Execução: node scripts/import-prompts.mjs [--no-notify] [--dry-run]

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

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const skipNotify = args.includes("--no-notify") || args.includes("--skip-notify");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "api", "data", "prompt-catalog.json");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTU2NTIsImV4cCI6MjEwNDkzMTY1Mn0.rWO90rI-O8XVOWAlvuylkFWMNpjkocC0HRHBNbmrJj4";

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const existingSlugs = new Set(catalog.items.map((i) => i.slug));

console.log(`Catálogo local atual: ${catalog.items.length} itens (${existingSlugs.size} slugs únicos).`);
console.log("Buscando todos os prompts ativos no Supabase...");

const selectFields = "id,slug,title,category,type,tags,thumbnail,preview_url,free,has_full_prompt,created_at,author,active,enabled";
const url = `${SUPABASE_URL}/rest/v1/prompts?select=${selectFields}&active=eq.true&enabled=eq.true&order=created_at.desc&limit=2000`;

const response = await fetch(url, {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: "application/json",
  },
});

if (!response.ok) {
  console.error(`Erro ao consultar Supabase: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const allPrompts = await response.json();

if (!Array.isArray(allPrompts) || allPrompts.length === 0) {
  console.log("Nenhum prompt encontrado no Supabase.");
} else {
  console.log(`Total de prompts ativos no Supabase: ${allPrompts.length}`);

  const toAdd = [];
  for (const p of allPrompts) {
    if (existingSlugs.has(p.slug)) {
      continue;
    }

    const item = {
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category || "Outros",
      type: p.type || "hero",
      tags: Array.isArray(p.tags) ? p.tags : [],
      thumbnail: p.thumbnail,
      preview_url: p.preview_url,
      free: Boolean(p.free),
      has_full_prompt: Boolean(p.has_full_prompt),
      created_at: typeof p.created_at === "string" ? (p.created_at.includes("T") ? p.created_at : p.created_at.replace(" ", "T") + "+00:00") : p.created_at,
      author: p.author || "Um Cara Caramelo",
      animated_preview_url: p.preview_url,
      animated_preview_source: "catalog",
      verified_count: 0,
    };

    toAdd.push(item);
    existingSlugs.add(p.slug);
    console.log(` + [${p.slug}] ${p.title} (${p.author} / ${p.category})`);
  }

  if (toAdd.length === 0) {
    console.log("\nNenhum novo prompt pendente. O catálogo local já está 100% sincronizado com o Supabase!");
  } else {
    if (isDryRun) {
      console.log(`\n[DRY-RUN] ${toAdd.length} novos prompts seriam adicionados.`);
      console.log("\n--- Prévia da Notificação no WhatsApp ---");
      console.log(formatNewPromptsMessage(toAdd));
      console.log("-----------------------------------------");
      process.exit(0);
    }

    catalog.items.push(...toAdd);
    function getPriorityTier(item) {
      if (!item) return 99;
      const type = item.type || "";
      const id = item.id || "";
      if (type === "motion" || id.startsWith("cui-") || id.startsWith("amix-")) return 2;
      return 1;
    }

    catalog.items.sort((a, b) => {
      const tierA = getPriorityTier(a);
      const tierB = getPriorityTier(b);
      if (tierA !== tierB) return tierA - tierB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    catalog.syncedAt = new Date().toISOString();

    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
    console.log(`\nImportação concluída com sucesso! Total no catálogo: ${catalog.items.length} prompts (+${toAdd.length} adicionados).`);

    if (skipNotify) {
      console.log("ℹ️  Notificação no grupo desativada via flag (--no-notify).");
    } else {
      const config = getUazapiNotificationConfig();
      if (!config.uazapiUrl || !config.uazapiToken || !config.groupJid) {
        console.warn("⚠️  Aviso de WhatsApp não enviado: variáveis UAZAPI_URL / UAZAPI_TOKEN / UAZAPI_GROUP_JID ausentes no .env.");
      } else {
        try {
          console.log(`\nDisparando notificação no grupo do WhatsApp (${config.groupJid})...`);
          const result = await sendNewPromptsNotification(config, toAdd);
          console.log(`📢 Aviso enviado com sucesso para o grupo do WhatsApp do LAB! (${result.count} prompts notificados)`);
        } catch (err) {
          console.error(`⚠️  Falha ao enviar notificação no WhatsApp:`, err?.message || err);
        }
      }
    }
  }
}
