import assert from "node:assert/strict";
import test from "node:test";
import { assertToolReleaseConfirmed, ToolReleaseError, toolReleaseFailure } from "../src/toolRelease.ts";

test("release confirms only a matching authoritative server result, including an idempotent removal", () => {
  assert.doesNotThrow(() => assertToolReleaseConfirmed({ slug: "gravador", removed: true }, "gravador"));
  assert.doesNotThrow(() => assertToolReleaseConfirmed({ slug: "gravador", removed: false }, "gravador"));
  for (const value of [null, undefined, true, [], {}, { slug: "gravador" }, { slug: "gravador", removed: "true" }, { slug: "kanban", removed: true }]) {
    assert.throws(() => assertToolReleaseConfirmed(value, "gravador"), (error: unknown) => error instanceof ToolReleaseError && error.kind === "unconfirmed");
  }
});

test("an outdated release catalog is actionable and does not expose backend details", () => {
  const error = toolReleaseFailure({ code: "P0002", message: "Ferramenta não encontrada. owner_user_id=private-value", details: "private sql" });
  assert.equal(error.kind, "catalog_outdated");
  assert.match(error.message, /catálogo precisa ser atualizada/);
  assert.match(error.message, /dados foram preservados/);
  assert.doesNotMatch(error.message, /private|owner_user_id|sql/);
  for (const code of ["PGRST202", "PGRST205", "42P01", "42883"]) {
    assert.equal(toolReleaseFailure({ code }).kind, "unconfigured");
  }
});

test("authorization and transient conflicts have distinct recovery messages", () => {
  assert.equal(toolReleaseFailure({ code: "42501" }).kind, "session");
  assert.match(toolReleaseFailure({ code: "28000" }).message, /Entre novamente/);
  for (const code of ["40001", "40P01", "55P03", "57014"]) {
    assert.equal(toolReleaseFailure({ code }).kind, "busy");
  }
});

test("unconfirmed network and unknown failures never claim the transaction was rolled back", () => {
  for (const cause of [new TypeError("Failed to fetch"), { code: "XX000", message: "private database failure" }, null]) {
    const error = toolReleaseFailure(cause);
    assert.equal(error.kind, "unconfirmed");
    assert.match(error.message, /conferir o estado/);
    assert.doesNotMatch(error.message, /preservados|private|rolled back/);
  }
});
