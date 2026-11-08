// Sincroniza a Biblioteca de Prompts com o Supabase e, havendo novos prompts, comita e sobe no git automaticamente.
// Uso: node scripts/sync-and-push-prompts.mjs

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, desc) {
  console.log(`\n▶ ${desc}...`);
  try {
    return execSync(cmd, { cwd: root, stdio: "inherit" });
  } catch (err) {
    console.error(`❌ Falha em: ${desc}`);
    throw err;
  }
}

function getOutput(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

console.log("==================================================================");
console.log("🐕 LAB CARAMELO · ROTINA DE SINCRONIZAÇÃO DA BIBLIOTECA DE PROMPTS");
console.log("==================================================================");

// 1. Compila seeds no Supabase
run("node scripts/compile-seeds.mjs", "1. Compilando e auditando Caramelo Seeds v1 no Supabase");

// 2. Importa novos prompts e notifica grupo se houver novidades
run("node scripts/import-prompts.mjs", "2. Sincronizando catálogo local com o Supabase");

// 3. Verifica se api/data/prompt-catalog.json foi modificado
const status = getOutput("git status --porcelain api/data/prompt-catalog.json");

if (!status) {
  console.log("\n✅ Nenhum novo prompt pendente. O repositório já está sincronizado.");
} else {
  console.log("\n📦 Novos prompts detectados! Fazendo commit e subindo no Git...");
  run("git add api/data/prompt-catalog.json scripts/sync-and-push-prompts.mjs", "3. Adicionando ao staging");
  
  const commitMsg = `feat(prompts): importar 6 novos prompts do Supabase e automacao semanal de sincronizacao`;
  
  run(`git commit -m "${commitMsg}"`, "4. Criando commit");
  run("git push origin main", "5. Enviando para origin main");
  run("git push origin main:dev", "6. Sincronizando com origin dev");
  console.log("\n🚀 Concluído com sucesso! Biblioteca atualizada e publicada no Git.");
}
