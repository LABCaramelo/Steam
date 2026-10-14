import fs from "node:fs";
import { parse } from "@babel/parser";

const sourcePath = "D:/Steam/steamui/sp.js";
const source = fs.readFileSync(sourcePath, "utf8");

const ast = parse(source, { sourceType: "unambiguous" });
const targetPos = 13995002;

const stack = [ast];
let foundModule = null;
while (stack.length) {
  const node = stack.pop();
  if (!node || typeof node !== "object") continue;
  if (
    node.type === "ObjectProperty" &&
    typeof node.key?.value === "number" &&
    node.value?.start <= targetPos &&
    node.value?.end >= targetPos
  ) {
    foundModule = node;
    break;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) stack.push(...value);
    else if (value && typeof value === "object" && value.type) stack.push(value);
  }
}

if (foundModule) {
  console.log("Found module ID at 13995002:", foundModule.key.value);
  console.log("Range:", foundModule.value.start, foundModule.value.end);
  console.log("Length:", foundModule.value.end - foundModule.value.start);
}
