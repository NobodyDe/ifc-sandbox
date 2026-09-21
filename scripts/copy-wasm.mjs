import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/web-ifc", { recursive: true });

for (const file of ["web-ifc.wasm", "web-ifc-mt.wasm"]) {
  copyFileSync(`node_modules/web-ifc/${file}`, `public/web-ifc/${file}`);
}

console.log("web-ifc wasm copiado para public/web-ifc/");
