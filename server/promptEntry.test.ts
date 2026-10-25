import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPromptDocument, isPromptRequest } from "../src/tools/prompt-library/bridge.ts";

test("prompt bridge accepts only a catalog or a valid prompt identifier", () => {
  assert.ok(isPromptRequest({ type: "lab:prompts:request", id: "a-1", slug: null }));
  assert.ok(isPromptRequest({ type: "lab:prompts:request", id: "a-1", slug: "motion-frame" }));
  for (const slug of ["../../private", "https://example.com", "foo?token=x", "", 1, undefined]) {
    assert.equal(isPromptRequest({ type: "lab:prompts:request", id: "a-1", slug }), false);
  }
  assert.equal(isPromptRequest({ type: "lab:prompts:request", id: "<script>", slug: null }), false);
});

test("prompt document escapes bootstrap values and keeps sharing on the protected page", () => {
  const result = buildPromptDocument('<head><script src="./assets/js/prompt-library.js"></script></head>', 'https://example.com/tools/prompt-library/index.html?embed=1&prompt=motion-frame', '"><script>bad</script>');
  assert.match(result, /<base href="https:\/\/example.com\/tools\/prompt-library\/">/);
  assert.match(result, /dataset.embedded='true'/);
  assert.match(result, /lab-auth-1/);
  assert.doesNotMatch(result, /<script>bad/);
  assert.doesNotMatch(result, /access_token|refresh_token|Bearer/);
});

test("every deployed tool entry uses mountTool and prompt page has no public static bypass", () => {
  const root = new URL("../", import.meta.url);
  assert.equal(fs.existsSync(new URL("public/tools/prompt-library/index.html", root)), false);
  for (const slug of fs.readdirSync(new URL("tools", root))) {
    const entry = new URL(`src/tools/${slug}/main.tsx`, root);
    if (!fs.existsSync(entry)) continue;
    assert.match(fs.readFileSync(entry, "utf8"), /mountTool\(/, slug);
    const page = fs.readFileSync(new URL(`tools/${slug}/index.html`, root), "utf8");
    assert.match(page, new RegExp(`/src/tools/${slug}/main\\.tsx`), slug);
  }
});
