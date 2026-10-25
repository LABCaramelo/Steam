// Sincroniza o acervo da Biblioteca de Prompts (api/data/prompt-catalog.json) com novos prompts do Supabase.
// Execução: node scripts/import-prompts.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "api", "data", "prompt-catalog.json");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fzhzpzxsttflgtassyex.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6aHpwenhzdHRmbGd0YXNzeWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTU2NTIsImV4cCI6MjEwNDkzMTY1Mn0.rWO90rI-O8XVOWAlvuylkFWMNpjkocC0HRHBNbmrJj4";

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const existingSlugs = new Set(catalog.items.map((i) => i.slug));
const latestCreatedAt = catalog.items[0]?.created_at;

console.log(`Último prompt no catálogo local: ${catalog.items[0]?.slug} (${latestCreatedAt})`);
console.log("Buscando novos prompts no Supabase...");

const selectFields = "id,slug,title,category,type,tags,thumbnail,preview_url,free,has_full_prompt,created_at,author,active,enabled";
let url = `${SUPABASE_URL}/rest/v1/prompts?select=${selectFields}&active=eq.true&enabled=eq.true&order=created_at.desc`;
if (latestCreatedAt) {
  url += `&created_at=gt.${encodeURIComponent(latestCreatedAt)}`;
}

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

const newPrompts = await response.json();

if (!Array.isArray(newPrompts) || newPrompts.length === 0) {
  console.log("Nenhum novo prompt encontrado. O acervo local já está atualizado.");
} else {

console.log(`Encontrados ${newPrompts.length} novos prompts para importar:`);
const toAdd = [];
for (const p of newPrompts) {
  if (existingSlugs.has(p.slug)) {
    console.warn(`[Pular] Slug '${p.slug}' já existe no catálogo.`);
    continue;
  }

  toAdd.push({
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
    author: p.author || "MotionSites",
    animated_preview_url: p.preview_url,
    animated_preview_source: "catalog",
    verified_count: 0,
  });
  console.log(` + [${p.slug}] ${p.title} (${p.category} / ${p.type})`);
}

catalog.items.unshift(...toAdd);
catalog.syncedAt = new Date().toISOString();

fs.writeFileSync(catalogPath, JSON.stringify(catalog));
console.log(`\nImportação concluída com sucesso! Total no catálogo: ${catalog.items.length} prompts (+${toAdd.length}).`);
}
