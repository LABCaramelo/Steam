import { supabase } from "../../supabase";
import { cleanFlux, redactSecrets, sanitizeSteps, type Connection, type ConnectionInput, type Execution, type ExecutionInput, type Flux, type FluxInput, type Version } from "./model";

export interface AutomationRepo {
  load(userId: string): Promise<{ fluxes: Flux[]; connections: Connection[] }>;
  createFlux(userId: string, input: FluxInput): Promise<Flux>;
  saveFlux(userId: string, id: string, input: FluxInput): Promise<Flux>;
  deleteFlux(userId: string, id: string): Promise<void>;
  versions(userId: string, fluxId: string): Promise<Version[]>;
  saveVersion(userId: string, flux: Flux, name: string): Promise<Version>;
  renameVersion(userId: string, id: string, name: string): Promise<void>;
  deleteVersion(userId: string, id: string): Promise<void>;
  executions(userId: string, fluxId: string): Promise<Execution[]>;
  addExecution(userId: string, fluxId: string, execution: ExecutionInput): Promise<Execution>;
  createConnection(userId: string, input: ConnectionInput): Promise<Connection>;
  updateConnection(userId: string, id: string, input: ConnectionInput): Promise<Connection>;
  deleteConnection(userId: string, id: string): Promise<void>;
}
function fail(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (["42P01", "PGRST205"].includes(error.code || "")) throw new Error("O banco da Automation ainda não foi configurado no LAB. Tente novamente após a configuração.");
  throw new Error("Não foi possível salvar ou carregar seus dados. Verifique a conexão e tente de novo.");
}
const normalize = (row: Flux): Flux => ({ ...row, steps: sanitizeSteps(row.steps) });
function connectionData(input: ConnectionInput): ConnectionInput {
  const name = redactSecrets(input.name.trim()).slice(0, 80);
  if (!name) throw new Error("Dê um nome à conexão.");
  // Only a short non-secret label is accepted; no token, key, credentials object or OAuth session.
  return { name, app: input.app, connection_config: input.connection_config.slice(0, 40), credential_hint: input.credential_hint ? redactSecrets(input.credential_hint).slice(0, 40) : null, verified: false };
}
export const supabaseAutomation: AutomationRepo = {
  async load(userId) {
    const [fluxes, connections] = await Promise.all([supabase.from("automation_fluxes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }), supabase.from("automation_connections").select("*").eq("user_id", userId).order("created_at", { ascending: false })]);
    fail(fluxes.error); fail(connections.error);
    return { fluxes: ((fluxes.data || []) as Flux[]).map(normalize), connections: (connections.data || []) as Connection[] };
  },
  async createFlux(userId, input) {
    const { data, error } = await supabase.from("automation_fluxes").insert({ user_id: userId, ...cleanFlux(input) }).select().single(); fail(error); return normalize(data as Flux);
  },
  async saveFlux(userId, id, input) {
    const { data, error } = await supabase.from("automation_fluxes").update(cleanFlux(input)).eq("user_id", userId).eq("id", id).select().single(); fail(error); return normalize(data as Flux);
  },
  async deleteFlux(userId, id) { const { error } = await supabase.from("automation_fluxes").delete().eq("user_id", userId).eq("id", id); fail(error); },
  async versions(userId, fluxId) { const { data, error } = await supabase.from("automation_flux_versions").select("*").eq("user_id", userId).eq("flux_id", fluxId).order("created_at", { ascending: false }); fail(error); return ((data || []) as Version[]).map((row) => ({ ...row, steps: sanitizeSteps(row.steps) })); },
  async saveVersion(userId, flux, name) {
    const { data, error } = await supabase.from("automation_flux_versions").insert({ user_id: userId, flux_id: flux.id, name: redactSecrets(name.trim()).slice(0, 60) || "Versão", steps: sanitizeSteps(flux.steps), active: false }).select().single(); fail(error); return data as Version;
  },
  async renameVersion(userId, id, name) { const { error } = await supabase.from("automation_flux_versions").update({ name: redactSecrets(name.trim()).slice(0, 60) || "Versão" }).eq("user_id", userId).eq("id", id); fail(error); },
  async deleteVersion(userId, id) { const { error } = await supabase.from("automation_flux_versions").delete().eq("user_id", userId).eq("id", id); fail(error); },
  async executions(userId, fluxId) { const { data, error } = await supabase.from("automation_executions").select("*").eq("user_id", userId).eq("flux_id", fluxId).order("started_at", { ascending: false }).limit(200); fail(error); return (data || []) as Execution[]; },
  async addExecution(userId, fluxId, execution) {
    const { data, error } = await supabase.from("automation_executions").insert({ user_id: userId, flux_id: fluxId, ...execution }).select().single(); fail(error); return data as Execution;
  },
  async createConnection(userId, input) { const { data, error } = await supabase.from("automation_connections").insert({ user_id: userId, ...connectionData(input) }).select().single(); fail(error); return data as Connection; },
  async updateConnection(userId, id, input) { const { data, error } = await supabase.from("automation_connections").update(connectionData(input)).eq("user_id", userId).eq("id", id).select().single(); fail(error); return data as Connection; },
  async deleteConnection(userId, id) { const { error } = await supabase.from("automation_connections").delete().eq("user_id", userId).eq("id", id); fail(error); },
};
