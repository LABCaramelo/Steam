import fs from "node:fs";

const sourcePath = "D:/Steam/steamui/sp.js";
const source = fs.readFileSync(sourcePath, "utf8");
const code = source.slice(13920395, 13954778);

// Find JSX elements or class names
const classMatches = [...code.matchAll(/([a-zA-Z0-9_]+)\(\)\.([A-Za-z0-9_]+)/g)];
const classNames = [...new Set(classMatches.map(m => m[2]))];
console.log("CSS Module class names in 66572:", classNames);

// Find all loc keys in 66572
const locKeys = [...new Set([...code.matchAll(/#([A-Za-z0-9_]+)/g)].map(x => x[1]))];
console.log("Loc keys in 66572:", locKeys);
