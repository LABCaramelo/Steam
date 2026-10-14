import fs from "node:fs";

const sourcePath = "D:/Steam/steamui/sp.js";
const content = fs.readFileSync(sourcePath, "utf8");

const regex = /ContentManagement_OtherToolTip|ContentManagement_MoveApps_Button/g;
let match;
const positions = [];
while ((match = regex.exec(content)) !== null) {
  positions.push(match.index);
}

console.log("Found matches at positions:", positions);

for (const pos of positions) {
  const prevChunk = content.slice(Math.max(0, pos - 15000), pos);
  const modMatches = [...prevChunk.matchAll(/(\d{4,6}):\s*(?:\([a-zA-Z0-9_$,\s]*\)\s*=>|function\s*\()/g)];
  if (modMatches.length) {
    const last = modMatches[modMatches.length - 1];
    console.log(`Near pos ${pos}, last module ID found: ${last[1]} at offset ${pos - (prevChunk.length - last.index)}`);
  }
}
