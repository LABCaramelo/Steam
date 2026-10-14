import fs from "node:fs";

const sourcePath = "D:/Steam/steamui/sp.js";
const source = fs.readFileSync(sourcePath, "utf8");

const modules = [
  { id: 66572, start: 13920395, end: 13954778 },
  { id: 79373, start: 13954787, end: 13955818 },
  { id: 93166, start: 13955827, end: 13959498 },
  { id: 92114, start: 13959507, end: 13959825 },
  { id: 17079, start: 13959834, end: 13963833 },
  { id: 37220, start: 13963842, end: 13984286 },
  { id: 69242, start: 13984295, end: 13985312 },
  { id: 75841, start: 13985321, end: 13990214 },
  { id: 21845, start: 13990223, end: 13995730 }
];

for (const m of modules) {
  const code = source.slice(m.start, m.end);
  const expMatch = code.match(/t\.d\(te,\s*\{([^}]+)\}\)/);
  const exports = expMatch ? expMatch[1].replace(/\s+/g, " ") : "no t.d";
  
  // Find localization keys used in this module
  const locKeys = [...new Set([...code.matchAll(/#([A-Za-z0-9_]+)/g)].map(x => x[1]))];
  console.log(`=== Module ${m.id} (${m.end - m.start} bytes) ===`);
  console.log(`Exports: ${exports}`);
  console.log(`Loc keys (${locKeys.length}): ${locKeys.slice(0, 10).join(", ")}`);
}
