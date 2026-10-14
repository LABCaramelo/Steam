// Extract inert reference bytes only. Never execute the Steam bundle.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parse } from "@babel/parser";

const sourcePath = "D:/Steam/steamui/sp.js";
const source = fs.readFileSync(sourcePath, "utf8");
const ast = parse(source, { sourceType: "unambiguous" });
const stack = [ast];
let moduleNode;
while (stack.length) {
  const node = stack.pop();
  if (!node || typeof node !== "object") continue;
  if (node.type === "ObjectProperty" && node.key?.value === 50165 && node.value?.type === "ArrowFunctionExpression") {
    moduleNode = node;
    break;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) stack.push(...value);
    else if (value && typeof value === "object" && value.type) stack.push(value);
  }
}
if (!moduleNode) throw new Error("Steam MediaManager module 50165 not found; review the new bundle.");
const output = path.resolve(".rea-reference/media");
fs.mkdirSync(output, { recursive: true });
const extracted = source.slice(moduleNode.value.start, moduleNode.value.end);
fs.writeFileSync(path.join(output, "media-module.js"), `export default ${extracted};\n`);
const labelsPath = "D:/Steam/steamui/localization/steamui_brazilian-json.js";
fs.copyFileSync(labelsPath, path.join(output, "steamui_brazilian-json.js"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const provenance = {
  sourcePath,
  moduleId: 50165,
  sourceSha256: sha256(fs.readFileSync(sourcePath)),
  range: { start: moduleNode.value.start, end: moduleNode.value.end, unit: "UTF-16 code units" },
  extractedSha256: sha256(extracted),
  wrapper: "export default <original arrow function>; no code execution",
  localization: { sourcePath: labelsPath, sha256: sha256(fs.readFileSync(labelsPath)) },
};
fs.writeFileSync(path.join(output, "provenance.json"), JSON.stringify(provenance, null, 2));
console.log(JSON.stringify({ output, ...provenance }));
