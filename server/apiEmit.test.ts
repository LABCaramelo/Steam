import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

/** Vercel emits traced .ts dependencies as .js; exercise that artifact, not a TS-aware dev loader. */
test("compiled API entry points use emitted JavaScript dependencies and preserve anonymous denial", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const converted = ts.convertCompilerOptionsFromJson(config.config.compilerOptions, root);
  assert.equal(converted.errors.length, 0);
  assert.equal(converted.options.rewriteRelativeImportExtensions, true, "Vercel compiles toolAccess.ts to toolAccess.js; imports must point at that emitted file");
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "lab-api-emit-"));
  try {
    fs.mkdirSync(path.join(target, "api/data"), { recursive: true });
    fs.mkdirSync(path.join(target, "server"), { recursive: true });
    fs.writeFileSync(path.join(target, "package.json"), JSON.stringify({ type: "module" }));
    const options = { ...converted.options, noEmit: false };
    for (const name of ["api/prompt-library.ts", "api/livekit.ts", "api/upload.ts", "server/toolAccess.ts"]) {
      const result = ts.transpileModule(fs.readFileSync(path.join(root, name), "utf8"), { fileName: name, compilerOptions: options });
      if (name.startsWith("api/")) {
        assert.match(result.outputText, /from ["']\.\.\/server\/toolAccess\.js["']/);
        assert.doesNotMatch(result.outputText, /from ["'][^"']+\.tsx?["']/);
      }
      fs.writeFileSync(path.join(target, name.replace(/\.ts$/, ".js")), result.outputText);
    }
    fs.copyFileSync(path.join(root, "api/data/prompt-catalog.json"), path.join(target, "api/data/prompt-catalog.json"));
    // Native Node loading has no TS path resolver or original .ts files to conceal a bad specifier.
    const { default: promptLibrary } = await import(pathToFileURL(path.join(target, "api/prompt-library.js")).href);
    let body: unknown;
    const headers = new Map<string, string>();
    const response = {
      statusCode: 0,
      setHeader(name: string, value: string) { headers.set(name, value); },
      end(value: string) { body = JSON.parse(value); },
    };
    await promptLibrary({ method: "GET", url: "/api/prompt-library", headers: {} }, response);
    assert.equal(response.statusCode, 401);
    assert.equal((body as { code?: string }).code, "AUTH_REQUIRED");
    assert.equal(headers.get("Cache-Control"), "private, no-store");
  } finally {
    // Only this mkdtemp output can be removed, never the checkout or another temporary directory.
    assert.equal(path.dirname(path.resolve(target)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith("lab-api-emit-"));
    fs.rmSync(target, { recursive: true, force: true });
  }
});
