// Copia o styles.css e as fontes de @caramelo/design-system para public/caramelo, onde as páginas
// estáticas (LP, workshop, biblioteca de prompts) os carregam sem build. O LAB importa o pacote direto.
// Rode depois de atualizar o pacote: npm run caramelo:sync
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "node_modules", "@caramelo", "design-system", "dist");
const target = path.join(root, "public", "caramelo");

if (!fs.existsSync(dist)) {
  console.error("@caramelo/design-system não está instalado. Rode npm install.");
  process.exit(1);
}

fs.mkdirSync(path.join(target, "fonts"), { recursive: true });
fs.copyFileSync(path.join(dist, "styles.css"), path.join(target, "styles.css"));
for (const file of fs.readdirSync(path.join(dist, "fonts"))) {
  fs.copyFileSync(path.join(dist, "fonts", file), path.join(target, "fonts", file));
}
const { version } = JSON.parse(fs.readFileSync(path.join(dist, "..", "package.json"), "utf8"));
console.log(`public/caramelo sincronizado com @caramelo/design-system ${version}.`);
