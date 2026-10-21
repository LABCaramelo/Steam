export type AppKey = keyof typeof APPS;
export interface ModuleInfo { title: string; symbol: string; color: string; trigger?: boolean; middleware?: boolean }
export const APPS = {
  webhook: { title: "Webhook", symbol: "↗", color: "#ff701a", trigger: true },
  scheduler: { title: "Agendador", symbol: "◷", color: "#ff701a", trigger: true },
  sheets: { title: "Google Sheets", symbol: "▤", color: "#42bd86" },
  chatgpt: { title: "ChatGPT", symbol: "✳", color: "#61bfaa" },
  whatsapp: { title: "WhatsApp", symbol: "◉", color: "#57cc87" },
  telegram: { title: "Telegram Bot", symbol: "➤", color: "#25bfff" },
  calendar: { title: "Google Calendar", symbol: "▦", color: "#709fff" },
  trello: { title: "Trello", symbol: "▥", color: "#6cabff" },
  wordpress: { title: "WordPress", symbol: "W", color: "#80b3d3" },
  facebook: { title: "Facebook Ads", symbol: "f", color: "#71a7ff" },
  database: { title: "Banco de dados", symbol: "▱", color: "#70d6a6" },
  requester: { title: "Requester", symbol: "↔", color: "#25bfff", middleware: true },
  filter: { title: "Filtro", symbol: "▽", color: "#c098ff", middleware: true },
  router: { title: "Roteador", symbol: "⑂", color: "#c098ff", middleware: true },
  code: { title: "JavaScript", symbol: "JS", color: "#ffd52a", middleware: true },
  delay: { title: "Delay", symbol: "⌛", color: "#c098ff", middleware: true },
  ai_agent: { title: "Agente IA", symbol: "✦", color: "#b09aff", middleware: true },
} satisfies Record<string, ModuleInfo>;
export const appInfo = (key: AppKey): ModuleInfo => APPS[key];
export type Config = Record<string, string | number>;
export interface Step { id: string; app: AppKey; action: string; config: Config; connection_id?: string; position: { x: number; y: number } }
export interface Flux { id: string; user_id: string; name: string; active: boolean; steps: Step[]; average_execution: number | null; activations: number; created_at: string; updated_at: string }
export interface Version { id: string; user_id: string; flux_id: string; name: string; active: boolean; steps: Step[]; created_at: string }
export interface Connection { id: string; user_id: string; name: string; app: AppKey; connection_config: string; credential_hint: string | null; verified: boolean; created_at: string }
export interface ExecutionStep { id: string; app: AppKey; action: string; ms: number; status: "success" | "error"; output: Record<string, unknown> }
export interface Execution { id: string; user_id: string; flux_id: string; started_at: string; duration_ms: number; status: "success" | "error"; origin: string; operations: number; steps: ExecutionStep[] }
export type FluxInput = Pick<Flux, "name" | "active" | "steps">;
export type ConnectionInput = Pick<Connection, "name" | "app" | "connection_config" | "credential_hint" | "verified">;
export type ExecutionInput = Omit<Execution, "id" | "user_id" | "flux_id">;
export const uid = () => crypto.randomUUID();
export const newStep = (app: AppKey, index: number): Step => ({ id: uid(), app, action: APPS[app].title, config: {}, position: { x: index * 260 + 100, y: 180 } });
export const CONNECTABLE: AppKey[] = ["sheets", "whatsapp", "chatgpt", "telegram", "calendar", "trello", "wordpress", "facebook", "database", "ai_agent"];

const CONFIG_KEYS = new Set(["method", "interval", "model", "system_prompt", "user_prompt", "phone", "message", "sheet", "tab", "row_values", "field", "operator", "value", "amount", "unit", "http_method", "url", "body", "code_snippet", "chat_id", "event", "board", "title", "table", "operation", "routes", "simulate_error"]);
/** Imported credentials are never copied into the LAB database or exported files. */
export function redactSecrets(text: string): string {
  return text.replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[segredo removido]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [segredo removido]")
    .replace(/((?:api[_-]?key|access[_-]?token|bot[_-]?token|client[_-]?secret|password|authorization|senha|token|secret)\s*["']?\s*[:=]\s*["']?)[^\s,"'}&]+/gi, "$1[segredo removido]")
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[credenciais removidas]@");
}
export function sanitizeSteps(value: unknown): Step[] {
  if (!Array.isArray(value) || value.length > 150) throw new Error("O arquivo deve conter até 150 módulos.");
  const ids = new Set<string>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error("Módulo inválido.");
    const input = raw as Record<string, unknown>;
    if (typeof input.app !== "string" || !Object.hasOwn(APPS, input.app)) throw new Error(`Módulo desconhecido: ${String(input.app)}.`);
    const app = input.app as AppKey;
    let id = typeof input.id === "string" && /^[\w-]{1,80}$/.test(input.id) ? input.id : uid();
    if (ids.has(id)) id = uid();
    ids.add(id);
    const result = newStep(app, index);
    result.id = id;
    result.action = redactSecrets(String(input.action || APPS[app].title)).slice(0, 160);
    if (input.config && typeof input.config === "object") {
      for (const [key, val] of Object.entries(input.config)) {
        if (CONFIG_KEYS.has(key) && (typeof val === "string" || typeof val === "number")) result.config[key] = typeof val === "string" ? redactSecrets(val).slice(0, 16000) : Number.isFinite(val) ? val : 0;
      }
    }
    const pos = input.position as { x?: unknown; y?: unknown } | undefined;
    if (pos && typeof pos.x === "number" && typeof pos.y === "number" && Number.isFinite(pos.x) && Number.isFinite(pos.y)) result.position = { x: Math.max(-10000, Math.min(30000, pos.x)), y: Math.max(-10000, Math.min(30000, pos.y)) };
    if (typeof input.connection_id === "string" && /^[0-9a-f-]{36}$/i.test(input.connection_id)) result.connection_id = input.connection_id;
    return result;
  });
}
export function cleanFlux(input: FluxInput): FluxInput {
  const name = redactSecrets(input.name.trim()).slice(0, 80);
  if (!name) throw new Error("Dê um nome à integração.");
  return { name, active: !!input.active, steps: sanitizeSteps(input.steps) };
}
export function importFlux(text: string): FluxInput {
  if (text.length > 3_000_000) throw new Error("O arquivo é grande demais (limite de 3 MB).");
  const data = JSON.parse(text) as Record<string, unknown>;
  if (!data || typeof data !== "object" || typeof data.name !== "string") throw new Error("JSON inválido: informe nome e módulos.");
  return cleanFlux({ name: data.name, active: false, steps: sanitizeSteps(data.steps) });
}
export const exportFlux = (flux: Pick<Flux, "name" | "steps">) => JSON.stringify({ format: "caramelo-automation", version: 1, name: redactSecrets(flux.name), steps: sanitizeSteps(flux.steps).map(({ connection_id: _connection, ...step }) => step) }, null, 2);

const KEYWORDS: [RegExp, AppKey, string][] = [
  [/whats|zap|mensagem/i, "whatsapp", "Enviar mensagem"], [/planilha|sheets|excel/i, "sheets", "Adicionar linha"],
  [/gpt|\bia\b|intelig|resum|respond/i, "chatgpt", "Gerar resposta"], [/agenda|calend|reuni/i, "calendar", "Criar evento"],
  [/telegram/i, "telegram", "Enviar mensagem"], [/trello|tarefa|card/i, "trello", "Criar card"], [/wordpress|blog|post/i, "wordpress", "Publicar post"],
  [/anúncio|anuncio|facebook|meta ads/i, "facebook", "Buscar lead"], [/banco|registro|crm|cadastr/i, "database", "Criar registro"],
];
/** The original builder is deterministic. This function does not call a language model. */
export function buildDraft(prompt: string): FluxInput {
  const clean = redactSecrets(prompt.trim());
  if (!clean) throw new Error("Descreva o fluxo que você quer montar.");
  const trigger: AppKey = /todo dia|diari|hora|agend|semana/i.test(clean) ? "scheduler" : "webhook";
  const steps = [newStep(trigger, 0)];
  if (/\bse\b|quando|filtr|apenas|somente/i.test(clean)) steps.push(newStep("filter", steps.length));
  for (const [re, app, action] of KEYWORDS) if (re.test(clean)) steps.push({ ...newStep(app, steps.length), action });
  if (steps.length === 1) steps.push(newStep("requester", 1));
  return { name: clean.replace(/\s+/g, " ").slice(0, 60), active: false, steps };
}
export interface FlowTemplate { id: string; name: string; description: string; apps: AppKey[] }
export const TEMPLATES: FlowTemplate[] = [
  { id: "leads", name: "Formulário → Planilha", description: "Receba um lead, filtre os dados e planeje o registro em uma planilha.", apps: ["webhook", "filter", "sheets"] },
  { id: "atendente", name: "Atendente para clínica", description: "Desenhe atendimento, classificação e agendamento em um fluxo.", apps: ["webhook", "ai_agent", "whatsapp", "calendar", "database"] },
  { id: "gatilhos", name: "Gatilhos no WhatsApp", description: "Organize palavras-chave, filtros e respostas por rota.", apps: ["webhook", "filter", "router", "whatsapp"] },
  { id: "audio", name: "Transcrição de áudio", description: "Rascunho de recebimento de áudio, processamento e registro.", apps: ["webhook", "requester", "chatgpt", "sheets"] },
  { id: "validacao", name: "Validação de CPF e CNPJ", description: "Planeje validações com filtro, código e roteamento.", apps: ["webhook", "filter", "code", "router"] },
  { id: "multicanal", name: "Chatbot multicanal", description: "Organize interpretação, roteamento e resposta com um agente.", apps: ["webhook", "ai_agent", "chatgpt", "filter", "router", "whatsapp"] },
  { id: "lembretes", name: "Mensagens e lembretes", description: "Planeje consultas à agenda e envio de lembretes.", apps: ["scheduler", "calendar", "whatsapp", "delay"] },
  { id: "financas", name: "Finanças no WhatsApp", description: "Estruture recebimento, categorização e registro de despesas.", apps: ["webhook", "chatgpt", "filter", "sheets", "whatsapp"] },
  { id: "conteudo", name: "Gerador de conteúdo", description: "Esboce o caminho de uma pauta da planilha ao Trello.", apps: ["scheduler", "sheets", "chatgpt", "trello"] },
  { id: "prompt", name: "Melhoria de prompts", description: "Organize entrada de texto, revisão de prompt e formatação.", apps: ["webhook", "chatgpt", "code"] },
  { id: "envio", name: "Envio em lote", description: "Modele uma sequência de contatos com intervalo entre ações.", apps: ["scheduler", "sheets", "whatsapp", "delay"] },
  { id: "ads", name: "Leads de anúncios", description: "Planeje coleta de lead, filtro e cadastro no seu CRM.", apps: ["scheduler", "facebook", "filter", "database"] },
  { id: "blog", name: "Posts de blog", description: "Desenhe revisão e publicação de conteúdo.", apps: ["scheduler", "chatgpt", "filter", "trello", "wordpress"] },
];
export const templateFlux = (template: FlowTemplate): FluxInput => ({ name: template.name, active: false, steps: template.apps.map(newStep) });
export function simulateStep(step: Step, input?: Record<string, unknown>): ExecutionStep {
  const cfg = step.config;
  const failed = cfg.simulate_error === "yes";
  let output: Record<string, unknown> = { simulated: true, ok: true, module: APPS[step.app].title };
  if (failed) output = { simulated: true, error: "Falha de teste configurada neste módulo." };
  else if (input) output = { ...input, simulated: true };
  else switch (step.app) {
    case "webhook": output = { simulated: true, lead_name: "Lucas Silva", lead_email: "lucas@exemplo.test", telefone: "+5511999990000", valor: 1500, origem: "Entrada de teste" }; break;
    case "scheduler": output = { simulated: true, schedule: cfg.interval || "09:00", timezone: "America/Sao_Paulo" }; break;
    case "chatgpt": case "ai_agent": output = { simulated: true, model: cfg.model || "Modelo de exemplo", response: "Resposta de exemplo: recebemos sua solicitação.", tokens_used: 128 }; break;
    case "whatsapp": output = { simulated: true, recipient: cfg.phone || "+5511999990000", status: "envio simulado", message: cfg.message || "Mensagem de exemplo" }; break;
    case "sheets": output = { simulated: true, spreadsheet: cfg.sheet || "Planilha de Leads", row_id: 2, status: "linha simulada" }; break;
    case "filter": output = { simulated: true, matched: true, field: cfg.field || "valor", operator: cfg.operator || "gte", value: cfg.value ?? 1000 }; break;
    case "requester": output = { simulated: true, status_code: 200, url: cfg.url || "https://exemplo.test", data: { example: true } }; break;
    case "delay": output = { simulated: true, amount: cfg.amount || 5, unit: cfg.unit || "seconds", waited: false }; break;
    case "code": output = { simulated: true, code_executed: false, note: "Código guardado como rascunho; não é executado." }; break;
    case "telegram": output = { simulated: true, ok: true, chat_id: cfg.chat_id || "exemplo", message: cfg.message || "Mensagem de exemplo" }; break;
    case "calendar": output = { simulated: true, event: cfg.event || "Reunião de exemplo", status: "evento simulado" }; break;
    case "database": output = { simulated: true, id: 1, operation: cfg.operation || "upsert", table: cfg.table || "leads" }; break;
  }
  return { id: step.id, app: step.app, action: step.action, ms: 80 + step.app.length * 17, status: failed ? "error" : "success", output };
}
export function simulateFlux(steps: Step[], origin = "Terminal de testes · simulação", input?: Record<string, unknown>): ExecutionInput {
  if (!steps.length) throw new Error("Adicione pelo menos um módulo para testar.");
  const logs: ExecutionStep[] = [];
  for (const [index, step] of sanitizeSteps(steps).entries()) { const result = simulateStep(step, index === 0 ? input : undefined); logs.push(result); if (result.status === "error") break; }
  return { started_at: new Date().toISOString(), duration_ms: logs.reduce((sum, step) => sum + step.ms, 0), status: logs.some((step) => step.status === "error") ? "error" : "success", origin, operations: logs.filter((step) => !appInfo(step.app).trigger && !appInfo(step.app).middleware).length, steps: logs };
}
export const dateLabel = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
