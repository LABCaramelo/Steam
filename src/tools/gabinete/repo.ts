import { supabase } from "../../supabase";
import type {
  BrandProfile,
  Briefing,
  BriefingTemplate,
  Client,
  ClientShare,
  ContentReference,
  Deliverable,
  DeliverableComment,
  DeliverableVersion,
  FinancialEntry,
  Opportunity,
  OpportunityStage,
  RoutineTask,
  SocialIntegration,
  Squad,
  Task,
  Workspace,
  WorkspaceMember,
} from "./types";

const STORAGE_KEY_PREFIX = "gabinete_";

const MOCK_IDS = new Set([
  "cli-1", "cli-2", "cli-3",
  "task-1", "task-2",
  "del-1", "del-2",
  "ref-1", "ref-2",
  "opp-1", "opp-2",
  "fin-1", "fin-2",
  "mem-2", "mem-3"
]);

function purgeLegacyMockData(): void {
  try {
    if (localStorage.getItem("gabinete_mock_purged_v2")) return;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((item: any) => !item?.id || !MOCK_IDS.has(item.id));
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        } catch {}
      }
    }
    localStorage.setItem("gabinete_mock_purged_v2", "true");
  } catch {}
}

purgeLegacyMockData();

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => !item?.id || !MOCK_IDS.has(item.id)) as unknown as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn("Gabinete local storage quota/error:", err);
  }
}

export interface GabineteRepository {
  // Workspaces & Membros
  getWorkspaces(): Promise<Workspace[]>;
  createWorkspace(data: { name: string; slug: string; service_type: string }): Promise<Workspace>;
  getMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  createMember(data: Partial<WorkspaceMember> & { workspace_id: string; name: string; email: string }): Promise<WorkspaceMember>;
  updateMember(id: string, data: Partial<WorkspaceMember>): Promise<void>;
  deleteMember(id: string): Promise<void>;

  // Rotina
  getRoutineTasks(workspaceId: string): Promise<RoutineTask[]>;
  addRoutineTask(data: { workspace_id: string; title: string }): Promise<RoutineTask>;
  updateRoutineTask(id: string, data: Partial<RoutineTask>): Promise<void>;
  deleteRoutineTask(id: string): Promise<void>;
  getRoutineNote(workspaceId: string): Promise<string>;
  saveRoutineNote(workspaceId: string, note: string): Promise<void>;
  getRoutineStories(workspaceId: string, month: number, year: number): Promise<number[]>;
  toggleRoutineStory(workspaceId: string, day: number, month: number, year: number): Promise<number[]>;

  // Squads
  getSquads(workspaceId: string): Promise<Squad[]>;
  createSquad(data: { workspace_id: string; name: string; description?: string }): Promise<Squad>;

  // Clientes
  getClients(workspaceId: string): Promise<Client[]>;
  createClient(data: Partial<Client> & { workspace_id: string; name: string }): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<void>;
  deleteClient(id: string, hard?: boolean): Promise<void>;
  restoreClient(id: string): Promise<void>;
  getBrandProfile(clientId: string): Promise<BrandProfile | null>;
  saveBrandProfile(data: Partial<BrandProfile> & { workspace_id: string; client_id: string }): Promise<BrandProfile>;

  // Demandas / Tarefas
  getTasks(workspaceId: string): Promise<Task[]>;
  createTask(data: Partial<Task> & { workspace_id: string; title: string }): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<void>;
  deleteTask(id: string, hard?: boolean): Promise<void>;
  restoreTask(id: string): Promise<void>;

  // Entregas Editoriais & Calendário
  getDeliverables(workspaceId: string): Promise<Deliverable[]>;
  createDeliverable(data: Partial<Deliverable> & { workspace_id: string; client_id: string; title: string }): Promise<Deliverable>;
  updateDeliverable(id: string, data: Partial<Deliverable>): Promise<void>;
  deleteDeliverable(id: string, hard?: boolean): Promise<void>;
  restoreDeliverable(id: string): Promise<void>;
  createDeliverableVersion(deliverableId: string, data: Partial<DeliverableVersion>): Promise<DeliverableVersion>;
  createComment(data: { deliverable_id: string; author_name: string; is_internal: boolean; comment_text: string }): Promise<DeliverableComment>;

  // Portal do Cliente
  createClientShare(workspaceId: string, clientId: string): Promise<ClientShare>;
  getClientShares(clientId: string): Promise<ClientShare[]>;
  getPortalData(token: string): Promise<any>;
  submitClientDecision(token: string, deliverableId: string, versionId: string, status: "approved" | "changes_requested", feedback: string, name: string): Promise<any>;

  // Biblioteca de Referências
  getReferences(workspaceId: string): Promise<ContentReference[]>;
  createReference(data: Partial<ContentReference> & { workspace_id: string; title: string }): Promise<ContentReference>;
  deleteReference(id: string): Promise<void>;

  // Vendas / Oportunidades
  getOpportunities(workspaceId: string): Promise<Opportunity[]>;
  createOpportunity(data: Partial<Opportunity> & { workspace_id: string; title: string }): Promise<Opportunity>;
  updateOpportunityStage(id: string, stage: OpportunityStage): Promise<void>;
  deleteOpportunity(id: string): Promise<void>;

  // Formulários & Briefings
  getBriefingTemplates(workspaceId: string): Promise<BriefingTemplate[]>;
  getBriefings(clientId: string): Promise<Briefing[]>;
  saveBriefing(data: Partial<Briefing> & { workspace_id: string; client_id: string; title: string }): Promise<Briefing>;

  // Financeiro
  getFinancialEntries(workspaceId: string): Promise<FinancialEntry[]>;
  createFinancialEntry(data: Partial<FinancialEntry> & { workspace_id: string; description: string; amount_cents: number }): Promise<FinancialEntry>;
  deleteFinancialEntry(id: string): Promise<void>;

  // Redes Sociais
  getIntegrations(workspaceId: string): Promise<SocialIntegration[]>;
  saveIntegration(workspaceId: string, provider: SocialIntegration["provider"], connected: boolean, accountName?: string): Promise<void>;
}

// Repositório unificado com Supabase + LocalStorage Fallback Resiliente
export const supabaseGabinete: GabineteRepository = {
  async getWorkspaces() {
    try {
      const { data, error } = await supabase.from("creative_os_workspaces").select("*").order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        setLocal("workspaces", data);
        return data as Workspace[];
      }
    } catch (err) {
      console.warn("Supabase workspaces unavailable, using local cache:", err);
    }

    const local = getLocal<Workspace[]>("workspaces", []);
    if (local.length > 0) return local;

    // Workspace padrão inicial do Luiz
    const defaultWs: Workspace = {
      id: "ws-default-luiz",
      owner_id: "default-owner",
      name: "Luiz — Head de Conteúdo",
      slug: "luiz-head",
      service_type: "head_de_conteudo",
      agency_level: "Agência Bronze I",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocal("workspaces", [defaultWs]);
    return [defaultWs];
  },

  async createWorkspace(data) {
    const newWs: Workspace = {
      id: "ws-" + Math.random().toString(36).substring(2, 9),
      owner_id: "user-" + Math.random().toString(36).substring(2, 9),
      name: data.name,
      slug: data.slug,
      service_type: data.service_type as any,
      agency_level: "Agência Bronze I",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = getLocal<Workspace[]>("workspaces", []);
    list.push(newWs);
    setLocal("workspaces", list);
    return newWs;
  },

  async getMembers(workspaceId) {
    const defaultList: WorkspaceMember[] = [
      {
        id: "mem-1",
        workspace_id: workspaceId,
        name: "Luiz",
        email: "luiz@caramelo.lab",
        role: "owner",
        member_type: "adm_master",
        job_title: "Sem cargo definido",
        status: "active",
        created_at: new Date().toISOString(),
      },
    ];
    const list = getLocal<WorkspaceMember[]>(`members_${workspaceId}`, defaultList);
    return list;
  },

  async createMember(data) {
    const list = await this.getMembers(data.workspace_id);
    const newMember: WorkspaceMember = {
      id: "mem-" + Date.now(),
      workspace_id: data.workspace_id,
      name: data.name,
      email: data.email,
      role: data.role || "collaborator",
      member_type: data.member_type || "membro",
      job_title: data.job_title || "Sem cargo definido",
      status: "active",
      restricted_clients: data.restricted_clients || [],
      squad_id: data.squad_id,
      squad_name: data.squad_name,
      created_at: new Date().toISOString(),
    };
    list.push(newMember);
    setLocal(`members_${data.workspace_id}`, list);
    return newMember;
  },

  async updateMember(id, data) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX + "members_")) {
        const list = JSON.parse(localStorage.getItem(key) || "[]") as WorkspaceMember[];
        const idx = list.findIndex((m) => m.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...data };
          localStorage.setItem(key, JSON.stringify(list));
          return;
        }
      }
    }
  },

  async deleteMember(id) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX + "members_")) {
        const list = JSON.parse(localStorage.getItem(key) || "[]") as WorkspaceMember[];
        const filtered = list.filter((m) => m.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
        return;
      }
    }
  },

  // Rotina Semanal
  async getRoutineTasks(workspaceId) {
    return getLocal<RoutineTask[]>(`routine_tasks_${workspaceId}`, []);
  },

  async addRoutineTask(data) {
    const list = await this.getRoutineTasks(data.workspace_id);
    const newTask: RoutineTask = {
      id: "rt-" + Date.now(),
      workspace_id: data.workspace_id,
      title: data.title,
      days: { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false },
      created_at: new Date().toISOString(),
    };
    list.push(newTask);
    setLocal(`routine_tasks_${data.workspace_id}`, list);
    return newTask;
  },

  async updateRoutineTask(id, data) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX + "routine_tasks_")) {
        const list = JSON.parse(localStorage.getItem(key) || "[]") as RoutineTask[];
        const idx = list.findIndex((t) => t.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...data };
          localStorage.setItem(key, JSON.stringify(list));
          return;
        }
      }
    }
  },

  async deleteRoutineTask(id) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX + "routine_tasks_")) {
        const list = JSON.parse(localStorage.getItem(key) || "[]") as RoutineTask[];
        const filtered = list.filter((t) => t.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
        return;
      }
    }
  },

  async getRoutineNote(workspaceId) {
    return getLocal<string>(`routine_note_${workspaceId}`, "");
  },

  async saveRoutineNote(workspaceId, note) {
    setLocal(`routine_note_${workspaceId}`, note);
  },

  async getRoutineStories(workspaceId, month, year) {
    const key = `routine_stories_${workspaceId}_${year}_${month}`;
    // Default highlight day 3 like screenshot if empty
    return getLocal<number[]>(key, [3]);
  },

  async toggleRoutineStory(workspaceId, day, month, year) {
    const key = `routine_stories_${workspaceId}_${year}_${month}`;
    const list = await this.getRoutineStories(workspaceId, month, year);
    const exists = list.includes(day);
    const updated = exists ? list.filter((d) => d !== day) : [...list, day];
    setLocal(key, updated);
    return updated;
  },

  // Squads
  async getSquads(workspaceId) {
    const defaultSquads: Squad[] = [
      {
        id: "sq-1",
        workspace_id: workspaceId,
        name: "Squad Conteúdo & Copy",
        description: "Planejamento, roteiros de Reels e carrosséis",
        color: "#ffd52a",
        members_count: 1,
        clients_count: 0,
        leader_name: "Luiz",
        created_at: new Date().toISOString(),
      },
    ];
    return getLocal<Squad[]>(`squads_${workspaceId}`, defaultSquads);
  },

  async createSquad(data) {
    const list = await this.getSquads(data.workspace_id);
    const newSquad: Squad = {
      id: "sq-" + Date.now(),
      workspace_id: data.workspace_id,
      name: data.name,
      description: data.description,
      color: "#25bfff",
      members_count: 0,
      clients_count: 0,
      created_at: new Date().toISOString(),
    };
    list.push(newSquad);
    setLocal(`squads_${data.workspace_id}`, list);
    return newSquad;
  },

  async getClients(workspaceId) {
    try {
      const { data, error } = await supabase
        .from("creative_os_clients")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });
      if (!error && data) {
        setLocal(`clients_${workspaceId}`, data);
        return data as Client[];
      }
    } catch {}

    const local = getLocal<Client[]>(`clients_${workspaceId}`, []);
    return local;
  },

  async createClient(data) {
    const newClient: Client = {
      id: "cli-" + Math.random().toString(36).substring(2, 9),
      workspace_id: data.workspace_id,
      name: data.name,
      category: data.category || "ativos",
      segment: data.segment || "Geral",
      status: "active",
      monthly_fee_cents: data.monthly_fee_cents || 0,
      currency: "BRL",
      color: data.color || "#FF701A",
      notes: data.notes || "",
      instagram_handle: data.instagram_handle || "",
      tiktok_handle: data.tiktok_handle || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = getLocal<Client[]>(`clients_${data.workspace_id}`, []);
    list.push(newClient);
    setLocal(`clients_${data.workspace_id}`, list);
    return newClient;
  },

  async updateClient(id, data) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Client[]>(`clients_${ws.id}`, []);
      const idx = list.findIndex((c) => c.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        setLocal(`clients_${ws.id}`, list);
        break;
      }
    }
  },

  async deleteClient(id, hard = false) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Client[]>(`clients_${ws.id}`, []);
      const idx = list.findIndex((c) => c.id === id);
      if (idx !== -1) {
        if (hard) {
          list.splice(idx, 1);
        } else {
          list[idx].status = "archived";
        }
        setLocal(`clients_${ws.id}`, list);
        break;
      }
    }
  },

  async restoreClient(id) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Client[]>(`clients_${ws.id}`, []);
      const idx = list.findIndex((c) => c.id === id);
      if (idx !== -1) {
        list[idx].status = "active";
        setLocal(`clients_${ws.id}`, list);
        break;
      }
    }
  },

  async getBrandProfile(clientId) {
    const profile = getLocal<BrandProfile | null>(`brand_profile_${clientId}`, null);
    return profile;
  },

  async saveBrandProfile(data) {
    const profile: BrandProfile = {
      id: "bp-" + clientIdSub(data.client_id),
      workspace_id: data.workspace_id,
      client_id: data.client_id,
      purpose: data.purpose || "",
      offer: data.offer || "",
      target_personas: data.target_personas || "",
      positioning: data.positioning || "",
      tone_of_voice: data.tone_of_voice || "",
      visual_guidelines: data.visual_guidelines || "",
      channels: data.channels || "Instagram, TikTok",
      differentiators: data.differentiators || "",
      restrictions: data.restrictions || "",
      reference_links: data.reference_links || [],
      is_validated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocal(`brand_profile_${data.client_id}`, profile);
    return profile;
  },

  async getTasks(workspaceId) {
    const list = getLocal<Task[]>(`tasks_${workspaceId}`, []);
    return list;
  },

  async createTask(data) {
    const newTask: Task = {
      id: "task-" + Math.random().toString(36).substring(2, 9),
      workspace_id: data.workspace_id,
      client_id: data.client_id,
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      due_date: data.due_date || new Date().toISOString().slice(0, 10),
      assignee_name: data.assignee_name || "Luiz (eu)",
      checklist: data.checklist || [],
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = getLocal<Task[]>(`tasks_${data.workspace_id}`, []);
    list.unshift(newTask);
    setLocal(`tasks_${data.workspace_id}`, list);
    return newTask;
  },

  async updateTask(id, data) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Task[]>(`tasks_${ws.id}`, []);
      const idx = list.findIndex((t) => t.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        setLocal(`tasks_${ws.id}`, list);
        break;
      }
    }
  },

  async deleteTask(id, hard = false) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Task[]>(`tasks_${ws.id}`, []);
      const idx = list.findIndex((t) => t.id === id);
      if (idx !== -1) {
        if (hard) {
          list.splice(idx, 1);
        } else {
          list[idx].is_archived = true;
        }
        setLocal(`tasks_${ws.id}`, list);
        break;
      }
    }
  },

  async restoreTask(id) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Task[]>(`tasks_${ws.id}`, []);
      const idx = list.findIndex((t) => t.id === id);
      if (idx !== -1) {
        list[idx].is_archived = false;
        setLocal(`tasks_${ws.id}`, list);
        break;
      }
    }
  },

  async getDeliverables(workspaceId) {
    const list = getLocal<Deliverable[]>(`deliverables_${workspaceId}`, []);
    return list;
  },

  async createDeliverable(data) {
    const newDel: Deliverable = {
      id: "del-" + Math.random().toString(36).substring(2, 9),
      workspace_id: data.workspace_id,
      client_id: data.client_id,
      client_name: data.client_name,
      title: data.title,
      format: data.format || "carrossel",
      channel: data.channel || "instagram",
      description: data.description || "",
      scheduled_date: data.scheduled_date || new Date().toISOString().slice(0, 10),
      scheduled_time: data.scheduled_time || "18:00",
      status: data.status || "idea",
      cover_url: data.cover_url || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      versions: [],
    };
    const list = getLocal<Deliverable[]>(`deliverables_${data.workspace_id}`, []);
    list.unshift(newDel);
    setLocal(`deliverables_${data.workspace_id}`, list);
    return newDel;
  },

  async updateDeliverable(id, data) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Deliverable[]>(`deliverables_${ws.id}`, []);
      const idx = list.findIndex((d) => d.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        setLocal(`deliverables_${ws.id}`, list);
        break;
      }
    }
  },

  async deleteDeliverable(id, hard = false) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Deliverable[]>(`deliverables_${ws.id}`, []);
      const idx = list.findIndex((d) => d.id === id);
      if (idx !== -1) {
        if (hard) {
          list.splice(idx, 1);
        } else {
          list[idx].is_archived = true;
        }
        setLocal(`deliverables_${ws.id}`, list);
        break;
      }
    }
  },

  async restoreDeliverable(id) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Deliverable[]>(`deliverables_${ws.id}`, []);
      const idx = list.findIndex((d) => d.id === id);
      if (idx !== -1) {
        list[idx].is_archived = false;
        setLocal(`deliverables_${ws.id}`, list);
        break;
      }
    }
  },

  async createDeliverableVersion(deliverableId, data) {
    const version: DeliverableVersion = {
      id: "ver-" + Math.random().toString(36).substring(2, 9),
      deliverable_id: deliverableId,
      version_number: Date.now(),
      title: data.title || "Nova Versão",
      copy_text: data.copy_text || "",
      slide_content: data.slide_content || [],
      media_urls: data.media_urls || [],
      created_at: new Date().toISOString(),
    };
    return version;
  },

  async createComment(data) {
    const comment: DeliverableComment = {
      id: "com-" + Math.random().toString(36).substring(2, 9),
      deliverable_id: data.deliverable_id,
      author_name: data.author_name,
      is_internal: data.is_internal,
      comment_text: data.comment_text,
      created_at: new Date().toISOString(),
    };
    return comment;
  },

  async createClientShare(workspaceId, clientId) {
    const token = "portal_" + Math.random().toString(36).substring(2, 12);
    const share: ClientShare = {
      id: "sh-" + token,
      workspace_id: workspaceId,
      client_id: clientId,
      token,
      name: "Link Seguro de Aprovação",
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const list = getLocal<ClientShare[]>(`shares_${clientId}`, []);
    list.push(share);
    setLocal(`shares_${clientId}`, list);
    return share;
  },

  async getClientShares(clientId) {
    return getLocal<ClientShare[]>(`shares_${clientId}`, []);
  },

  async getPortalData(token) {
    // Busca dados pelo token localmente
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const clients = getLocal<Client[]>(`clients_${ws.id}`, []);
      for (const cl of clients) {
        const shares = getLocal<ClientShare[]>(`shares_${cl.id}`, []);
        const found = shares.find((s) => s.token === token && s.is_active);
        if (found) {
          const deliverables = getLocal<Deliverable[]>(`deliverables_${ws.id}`, []).filter(
            (d) => d.client_id === cl.id && !d.is_archived
          );
          return {
            client: cl,
            workspace: ws,
            deliverables,
          };
        }
      }
    }
    throw new Error("Link de aprovação não encontrado ou expirado.");
  },

  async submitClientDecision(_token, deliverableId, versionId, status, feedback, name) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Deliverable[]>(`deliverables_${ws.id}`, []);
      const d = list.find((item) => item.id === deliverableId);
      if (d) {
        d.status = status === "approved" ? "approved" : "adjustments";
        d.approvals = d.approvals || [];
        d.approvals.push({
          id: "app-" + Math.random().toString(36).substring(2, 9),
          deliverable_id: deliverableId,
          version_id: versionId,
          decided_by_name: name || "Cliente",
          status,
          feedback_text: feedback,
          decided_at: new Date().toISOString(),
        });
        setLocal(`deliverables_${ws.id}`, list);
        return { success: true };
      }
    }
    return { success: false };
  },

  async getReferences(workspaceId) {
    const list = getLocal<ContentReference[]>(`references_${workspaceId}`, []);
    return list;
  },

  async createReference(data) {
    const newRef: ContentReference = {
      id: "ref-" + Math.random().toString(36).substring(2, 9),
      workspace_id: data.workspace_id,
      title: data.title,
      category: data.category || "copy",
      url: data.url || "",
      image_url: data.image_url || "",
      tags: data.tags || [],
      notes: data.notes || "",
      created_at: new Date().toISOString(),
    };
    const list = getLocal<ContentReference[]>(`references_${data.workspace_id}`, []);
    list.unshift(newRef);
    setLocal(`references_${data.workspace_id}`, list);
    return newRef;
  },

  async deleteReference(id) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<ContentReference[]>(`references_${ws.id}`, []);
      const filtered = list.filter((r) => r.id !== id);
      setLocal(`references_${ws.id}`, filtered);
    }
  },

  async getOpportunities(workspaceId) {
    const list = getLocal<Opportunity[]>(`opps_${workspaceId}`, []);
    return list;
  },

  async createOpportunity(data) {
    const newOpp: Opportunity = {
      id: "opp-" + Math.random().toString(36).substring(2, 9),
      workspace_id: data.workspace_id,
      client_name: data.client_name || "Novo Prospect",
      title: data.title,
      stage: data.stage || "novo",
      estimated_value_cents: data.estimated_value_cents || 0,
      monthly_value_cents: data.monthly_value_cents || 0,
      next_action: data.next_action || "",
      notes: data.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = getLocal<Opportunity[]>(`opps_${data.workspace_id}`, []);
    list.unshift(newOpp);
    setLocal(`opps_${data.workspace_id}`, list);
    return newOpp;
  },

  async updateOpportunityStage(id, stage) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Opportunity[]>(`opps_${ws.id}`, []);
      const opp = list.find((o) => o.id === id);
      if (opp) {
        opp.stage = stage;
        opp.updated_at = new Date().toISOString();
        setLocal(`opps_${ws.id}`, list);
        break;
      }
    }
  },

  async deleteOpportunity(id) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<Opportunity[]>(`opps_${ws.id}`, []);
      const filtered = list.filter((o) => o.id !== id);
      setLocal(`opps_${ws.id}`, filtered);
    }
  },

  async getBriefingTemplates(workspaceId) {
    const list = getLocal<BriefingTemplate[]>(`briefing_templates_${workspaceId}`, [
      {
        id: "bt-1",
        workspace_id: workspaceId,
        name: "Onboarding de Novo Cliente — Head de Conteúdo",
        description: "Mapeamento completo de persona, proposta única de valor, produtos estrela e tom de voz.",
        sections: [
          {
            title: "Identidade & Negócio",
            questions: [
              { id: "q1", question: "Qual é a transformação central que seu produto ou serviço entrega?" },
              { id: "q2", question: "Quem é o cliente ideal que já ama comprar de você?" },
            ],
          },
          {
            title: "Diretrizes & Limites",
            questions: [
              { id: "q3", question: "O que a sua marca NUNCA diria ou faria nas redes sociais?" },
              { id: "q4", question: "Quais são as 3 marcas de outros nichos que você mais admira?" },
            ],
          },
        ],
        created_at: new Date().toISOString(),
      },
    ]);
    return list;
  },

  async getBriefings(clientId) {
    return getLocal<Briefing[]>(`briefings_${clientId}`, []);
  },

  async saveBriefing(data) {
    const newB: Briefing = {
      id: "br-" + Math.random().toString(36).substring(2, 9),
      workspace_id: data.workspace_id,
      client_id: data.client_id,
      template_id: data.template_id,
      title: data.title,
      status: data.status || "draft",
      answers: data.answers || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = getLocal<Briefing[]>(`briefings_${data.client_id}`, []);
    list.unshift(newB);
    setLocal(`briefings_${data.client_id}`, list);
    return newB;
  },

  async getFinancialEntries(workspaceId) {
    const list = getLocal<FinancialEntry[]>(`finance_${workspaceId}`, []);
    return list;
  },

  async createFinancialEntry(data) {
    const entry: FinancialEntry = {
      id: "fin-" + Math.random().toString(36).substring(2, 9),
      workspace_id: data.workspace_id,
      client_id: data.client_id,
      client_name: data.client_name,
      type: data.type || "revenue_received",
      amount_cents: data.amount_cents || 0,
      currency: "BRL",
      date: data.date || new Date().toISOString().slice(0, 10),
      description: data.description || "Lançamento",
      category: data.category || "servico",
      status: data.status || "pago",
      created_at: new Date().toISOString(),
    };
    const list = getLocal<FinancialEntry[]>(`finance_${data.workspace_id}`, []);
    list.unshift(entry);
    setLocal(`finance_${data.workspace_id}`, list);
    return entry;
  },

  async deleteFinancialEntry(id) {
    const allWs = getLocal<Workspace[]>("workspaces", []);
    for (const ws of allWs) {
      const list = getLocal<FinancialEntry[]>(`finance_${ws.id}`, []);
      const filtered = list.filter((f) => f.id !== id);
      setLocal(`finance_${ws.id}`, filtered);
    }
  },

  async getIntegrations(workspaceId) {
    const list = getLocal<SocialIntegration[]>(`integrations_${workspaceId}`, [
      { provider: "instagram", connected: false },
      { provider: "tiktok", connected: false },
      { provider: "drive", connected: false },
      { provider: "facebook", connected: false },
    ]);
    return list;
  },

  async saveIntegration(workspaceId, provider, connected, accountName) {
    const list = await this.getIntegrations(workspaceId);
    const item = list.find((i) => i.provider === provider);
    if (item) {
      item.connected = connected;
      item.account_name = accountName;
      item.last_sync = connected ? "Conectado agora" : undefined;
    } else {
      list.push({ provider, connected, account_name: accountName, last_sync: "Conectado agora" });
    }
    setLocal(`integrations_${workspaceId}`, list);
  },
};

function clientIdSub(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
}
