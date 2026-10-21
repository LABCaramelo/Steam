import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, exportFlux, importFlux, newStep, sanitizeSteps, simulateFlux } from "./model.ts";

test("import preserves configuration and layout while discarding credential containers", () => {
  const imported = importFlux(JSON.stringify({ name: "CRM", active: true, credentials: { apiKey: "never-save" }, steps: [{ id: "first", app: "requester", action: "Enviar", position: { x: 125, y: -30 }, credentials: { token: "never-save" }, config: { http_method: "POST", url: "https://exemplo.test", body: '{"api_key":"sensitive-value","nome":"Lucas"}', apiKey: "never-save", token: "never-save" } }] }));
  assert.equal(imported.active, false);
  assert.deepEqual(imported.steps[0].position, { x: 125, y: -30 });
  assert.equal(imported.steps[0].config.http_method, "POST");
  assert.equal(imported.steps[0].config.apiKey, undefined);
  assert.equal(imported.steps[0].config.token, undefined);
  assert.ok(!JSON.stringify(imported).includes("sensitive-value"));
  assert.ok(!JSON.stringify(imported).includes("never-save"));
});

test("export strips account linkage and can be imported without losing modules", () => {
  const step = newStep("sheets", 0); step.connection_id = "7a4b85b3-5e7a-470f-923a-29c15bbbeefb"; step.config.sheet = "Leads";
  const text = exportFlux({ name: "Planilha", steps: [step] });
  assert.ok(!text.includes("connection_id"));
  const result = importFlux(text);
  assert.equal(result.steps[0].config.sheet, "Leads");
});

test("malformed and unsupported flow files are rejected", () => {
  assert.throws(() => importFlux('{"name":"X","steps":[{"app":"unknown"}]}'), /desconhecido/);
  assert.throws(() => importFlux('{"name":"X","steps":{}}'), /módulos/);
  assert.throws(() => sanitizeSteps(Array.from({ length: 151 }, () => ({ app: "webhook" }))), /150/);
});

test("Portuguese builder uses explicit deterministic keywords", () => {
  const draft = buildDraft("Todo dia consultar a planilha e enviar mensagem no WhatsApp");
  assert.deepEqual(draft.steps.map((step) => step.app), ["scheduler", "whatsapp", "sheets"]);
  assert.equal(draft.active, false);
});

test("failure simulation stops following modules and records honest example outputs", () => {
  const steps = [newStep("webhook", 0), newStep("requester", 1), newStep("whatsapp", 2)];
  steps[1].config.simulate_error = "yes";
  const run = simulateFlux(steps);
  assert.equal(run.status, "error"); assert.equal(run.steps.length, 2);
  assert.ok(run.steps.every((step) => step.output.simulated === true));
  assert.equal(run.operations, 0);
});

test("code module stores a draft without evaluating it", () => {
  const code = newStep("code", 0); code.config.code_snippet = "throw new Error('executed')";
  const run = simulateFlux([code]);
  assert.equal(run.steps[0].output.code_executed, false);
  assert.equal(run.status, "success");
});
