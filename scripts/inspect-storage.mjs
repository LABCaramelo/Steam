import fs from "node:fs";

const locPath = "D:/Steam/steamui/localization/steamui_brazilian-json.js";
const content = fs.readFileSync(locPath, "utf8");

const regex = /"(ContentManagement_[^"]*)":\s*"((?:[^"\\]|\\.)*)"/g;
const matches = [];
let m;
const unescapeJs = (str) => str.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
while ((m = regex.exec(content)) !== null) {
  matches.push({ key: m[1], val: unescapeJs(m[2]) });
}

console.log("Found ContentManagement keys:", matches.length);
console.log(JSON.stringify(matches, null, 2));
