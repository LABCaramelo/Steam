import fs from "node:fs";

const sourcePath = "D:/Steam/steamui/sp.js";
const source = fs.readFileSync(sourcePath, "utf8");

const mod66572 = source.slice(13920395, 13954778);
const mod21845 = source.slice(13990223, 13995730);

console.log("mod 66572 start:", mod66572.slice(0, 300));
console.log("mod 66572 end:", mod66572.slice(-300));

console.log("---");
console.log("mod 21845 start:", mod21845.slice(0, 300));
console.log("mod 21845 end:", mod21845.slice(-300));
