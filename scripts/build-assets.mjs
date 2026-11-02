import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, relative, extname } from "node:path";
import { transform } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
let sourceBytes = 0;
let outputBytes = 0;
let files = 0;

for (const folder of ["assets/css", "assets/js"]) {
  for (const name of (await readdir(resolve(root, folder))).sort()) {
    if (!/\.(css|js)$/.test(name) || /\.min\.(css|js)$/.test(name)) continue;
    const sourceFile = resolve(root, folder, name);
    const source = await readFile(sourceFile, "utf8");
    if (!source.trim()) continue;
    const extension = extname(name);
    const { code } = await transform(source, {
      loader: extension === ".css" ? "css" : "js",
      // Keep classic-script globals available to inline handlers and other scripts.
      // No bundling or module wrapper: each file retains its original load order.
      minify: true,
      target: extension === ".css" ? ["chrome109", "firefox115", "safari16"] : "es2020",
      legalComments: "inline",
    });
    if (!code.trim()) continue;
    const outputFile = sourceFile.slice(0, -extension.length) + ".min" + extension;
    await writeFile(outputFile, code);
    sourceBytes += Buffer.byteLength(source);
    outputBytes += Buffer.byteLength(code);
    files++;
    console.log(`${relative(root, outputFile)}: ${Buffer.byteLength(code)} bytes`);
  }
}

console.log(`${files} assets: ${sourceBytes} → ${outputBytes} bytes (${Math.round((1 - outputBytes / sourceBytes) * 100)}% smaller)`);
