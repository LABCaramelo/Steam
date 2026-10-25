import test from "node:test";
import assert from "node:assert/strict";
import { verifyHtmlContent } from "./verifier.ts";

test("verifier: detects canonical meta format correctly", () => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="generator" content="Um Cara Caramelo">
  <meta name="ucc:seed" content="ucc_v1_abcdef1234567890abcdef12">
  <meta name="ucc:prompt" content="vela-terms-hero">
  <meta name="ucc:source" content="https://www.umcaracaramelo.com.br/prompts/vela-terms-hero">
</head>
<body><h1>Hello World</h1></body>
</html>`;

  const result = verifyHtmlContent({
    html,
    expectedSeed: "ucc_v1_abcdef1234567890abcdef12",
    expectedSlug: "vela-terms-hero",
  });

  assert.equal(result.verified, true);
  assert.equal(result.marker_format, "canonical_meta_v1");
  assert.equal(result.seed_match, true);
  assert.equal(result.prompt_match, true);
  assert.equal(result.source_match, true);
  assert.equal(result.generator_match, true);
});

test("verifier: rejects mismatching seed", () => {
  const html = `
<meta name="generator" content="Um Cara Caramelo">
<meta name="ucc:seed" content="ucc_v1_different_seed">
<meta name="ucc:prompt" content="vela-terms-hero">
<meta name="ucc:source" content="https://www.umcaracaramelo.com.br/prompts/vela-terms-hero">`;

  const result = verifyHtmlContent({
    html,
    expectedSeed: "ucc_v1_expected_seed",
    expectedSlug: "vela-terms-hero",
  });

  assert.equal(result.verified, false);
  assert.equal(result.seed_match, false);
});
