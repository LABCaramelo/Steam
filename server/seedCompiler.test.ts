import test from "node:test";
import assert from "node:assert/strict";
import {
  compilePromptCopyPayload,
  stripProvenance,
  buildCanonicalProvenanceHtml,
} from "./seedCompiler.ts";

test("seedCompiler: builds canonical provenance HTML correctly", () => {
  const html = buildCanonicalProvenanceHtml({
    seed: "ucc_v1_test_seed_1234567890",
    slug: "my-cool-prompt",
  });
  assert.ok(html.includes('<!-- CARAMELO SEED v1 -->'));
  assert.ok(html.includes('<meta name="generator" content="Um Cara Caramelo">'));
  assert.ok(html.includes('<meta name="ucc:seed" content="ucc_v1_test_seed_1234567890">'));
  assert.ok(html.includes('<meta name="ucc:prompt" content="my-cool-prompt">'));
  assert.ok(html.includes('<meta name="ucc:source" content="https://www.umcaracaramelo.com.br/prompts/my-cool-prompt">'));
  assert.ok(html.includes('src="https://www.umcaracaramelo.com.br/seed/v1/caramelo.js"'));
  assert.ok(html.includes('data-seed="ucc_v1_test_seed_1234567890"'));
});

test("seedCompiler: compiles payload and strips idempotently", () => {
  const baseSource = "Crie uma landing page incrível com Three.js e animações suaves.";
  const compiled = compilePromptCopyPayload({
    promptSource: baseSource,
    seed: "ucc_v1_xyz98765432101234567890",
    slug: "threejs-hero",
  });

  assert.ok(compiled.promptCopyPayload.startsWith(baseSource));
  assert.ok(compiled.promptCopyPayload.includes("CARAMELO SEED v1: PROVENANCE METADATA"));
  assert.ok(compiled.promptCopyPayload.includes('ucc_v1_xyz98765432101234567890'));
  assert.equal(typeof compiled.compiledHash, "string");
  assert.equal(compiled.compiledHash.length, 64);

  // Stripping should recover the exact baseSource
  const stripped = stripProvenance(compiled.promptCopyPayload);
  assert.equal(stripped, baseSource);

  // Re-compiling should be idempotent
  const recompiled = compilePromptCopyPayload({
    promptSource: compiled.promptCopyPayload,
    seed: "ucc_v1_xyz98765432101234567890",
    slug: "threejs-hero",
  });
  assert.equal(recompiled.promptCopyPayload, compiled.promptCopyPayload);
  assert.equal(recompiled.compiledHash, compiled.compiledHash);
});
