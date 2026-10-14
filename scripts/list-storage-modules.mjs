import fs from "node:fs";
import { parse } from "@babel/parser";

const sourcePath = "D:/Steam/steamui/sp.js";
const source = fs.readFileSync(sourcePath, "utf8");
const ast = parse(source, { sourceType: "unambiguous" });

const start = 13920395;
const end = 13995730;

const stack = [ast];
const modules = [];

while (stack.length) {
  const node = stack.pop();
  if (!node || typeof node !== "object") continue;
  if (
    node.type === "ObjectProperty" &&
    typeof node.key?.value === "number" &&
    node.value?.start >= start &&
    node.value?.end <= end
  ) {
    modules.push({
      id: node.key.value,
      start: node.value.start,
      end: node.value.end,
      len: node.value.end - node.value.start
    });
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) stack.push(...value);
    else if (value && typeof value === "object" && value.type) stack.push(value);
  }
}

modules.sort((a, b) => a.start - b.start);
console.log("Modules in range:", modules.length);
console.log(JSON.stringify(modules, null, 2));
