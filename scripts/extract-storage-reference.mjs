// Extract inert reference bytes only. Never execute the Steam bundle.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parse } from "@babel/parser";

const sourcePath = "D:/Steam/steamui/sp.js";
const source = fs.readFileSync(sourcePath, "utf8");
const ast = parse(source, { sourceType: "unambiguous" });
const stack = [ast];
const moduleNodes = {};

while (stack.length) {
  const node = stack.pop();
  if (!node || typeof node !== "object") continue;
  if (
    node.type === "ObjectProperty" &&
    (node.key?.value === 66572 || node.key?.value === 21845 || node.key?.value === 69242) &&
    (node.value?.type === "ArrowFunctionExpression" || node.value?.type === "FunctionExpression")
  ) {
    moduleNodes[node.key.value] = node;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) stack.push(...value);
    else if (value && typeof value === "object" && value.type) stack.push(value);
  }
}

if (!moduleNodes[66572]) throw new Error("Storage Manager module 66572 not found");
if (!moduleNodes[21845]) throw new Error("Move content module 21845 not found");

const output = path.resolve(".rea-reference/storage");
fs.mkdirSync(output, { recursive: true });

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const extracted66572 = source.slice(moduleNodes[66572].value.start, moduleNodes[66572].value.end);
fs.writeFileSync(path.join(output, "storage-manager-module.js"), `export default ${extracted66572};\n`);

const extracted21845 = source.slice(moduleNodes[21845].value.start, moduleNodes[21845].value.end);
fs.writeFileSync(path.join(output, "move-apps-module.js"), `export default ${extracted21845};\n`);

if (moduleNodes[69242]) {
  const extracted69242 = source.slice(moduleNodes[69242].value.start, moduleNodes[69242].value.end);
  fs.writeFileSync(path.join(output, "drive-types-module.js"), `export default ${extracted69242};\n`);
}

const labelsPath = "D:/Steam/steamui/localization/steamui_brazilian-json.js";
fs.copyFileSync(labelsPath, path.join(output, "steamui_brazilian-json.js"));

const provenance = {
  sourcePath,
  sourceSha256: sha256(fs.readFileSync(sourcePath)),
  modules: {
    66572: {
      name: "storage-manager-module.js",
      description: "ContentManagement / Storage Manager main UI and statistics",
      range: { start: moduleNodes[66572].value.start, end: moduleNodes[66572].value.end, unit: "UTF-16 code units" },
      sha256: sha256(extracted66572)
    },
    21845: {
      name: "move-apps-module.js",
      description: "ContentManagement Move Apps modal dialog",
      range: { start: moduleNodes[21845].value.start, end: moduleNodes[21845].value.end, unit: "UTF-16 code units" },
      sha256: sha256(extracted21845)
    },
    ...(moduleNodes[69242] ? {
      69242: {
        name: "drive-types-module.js",
        description: "Drive type descriptors (Fixed, Removable, MicroSD, Internal)",
        range: { start: moduleNodes[69242].value.start, end: moduleNodes[69242].value.end, unit: "UTF-16 code units" },
        sha256: sha256(source.slice(moduleNodes[69242].value.start, moduleNodes[69242].value.end))
      }
    } : {})
  },
  wrapper: "export default <original arrow function>; no code execution",
  localization: {
    sourcePath: labelsPath,
    sha256: sha256(fs.readFileSync(labelsPath))
  }
};

fs.writeFileSync(path.join(output, "provenance.json"), JSON.stringify(provenance, null, 2));
console.log(JSON.stringify({ output, ...provenance }, null, 2));
