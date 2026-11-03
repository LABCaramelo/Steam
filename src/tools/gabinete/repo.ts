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
  SocialIntegration,
  Task,
  Workspace,
  WorkspaceMember,
} from "./types";

const STORAGE_KEY_PREFIX = "gabinete_";

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
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
    const list = getLocal<WorkspaceMember[]>(`members_${workspaceId}`, [
      {
        id: "mem-1",
        workspace_id: workspaceId,
        name: "Luiz (eu)",
        email: "luiz@caramelo.lab",
        role: "owner",
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "mem-2",
        workspace_id: workspaceId,
        name: "Copywriter Sênior",
        email: "copy@caramelo.lab",
        role: "collaborator",
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "mem-3",
        workspace_id: workspaceId,
        name: "Designer de Interação",
        email: "design@caramelo.lab",
        role: "collaborator",
        status: "active",
        created_at: new Date().toISOString(),
      },
    ]);
    return list;
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

    const local = getLocal<Client[]>(`clients_${workspaceId}`, [
      {
        id: "cli-1",
        workspace_id: workspaceId,
        name: "Graao — Café Especial",
        category: "ativos",
        segment: "Alimentação & Experiência",
        status: "active",
        monthly_fee_cents: 350000,
        currency: "BRL",
        color: "#FF701A",
        notes: "Planejamento mensal de carrosséis e reels de bastidores do café.",
        instagram_handle: "@graao.cafe",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cli-2",
        workspace_id: workspaceId,
        name: "Soci — Moda & Identidade",
        category: "ativos",
        segment: "Moda & Streetwear",
        status: "active",
        monthly_fee_cents: 480000,
        currency: "BRL",
        color: "#25BFFF",
        notes: "Narrativas visuais e ensaios com direção cinematográfica.",
        instagram_handle: "@soci.wear",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cli-3",
        workspace_id: workspaceId,
        name: "Carmelita — Confeitaria",
        category: "avulsos",
        segment: "Gastronomia Afetiva",
        status: "active",
        monthly_fee_cents: 120000,
        currency: "BRL",
        color: "#FF3D8D",
        notes: "Demanda avulsa para lançamento de Páscoa e datas comemorativas.",
        instagram_handle: "@carmelita.doces",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
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
    const list = getLocal<Task[]>(`tasks_${workspaceId}`, [
      {
        id: "task-1",
        workspace_id: workspaceId,
        client_id: "cli-1",
        title: "Revisar roteiro do Reel de lançamento do Grão Especial",
        description: "Alinhar gancho inicial de conflito e contraste antes de enviar ao cliente.",
        status: "todo",
        priority: "high",
        due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        assignee_name: "Luiz (eu)",
        checklist: [
          { id: "c1", text: "Aplicar fórmula do Método HEAD", completed: true },
          { id: "c2", text: "Definir CTA protagonista", completed: false },
        ],
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "task-2",
        workspace_id: workspaceId,
        client_id: "cli-2",
        title: "Montar grade editorial de novembro — Soci",
        description: "12 peças: 6 carrosséis de posicionamento + 6 Reels de produto.",
        status: "in_progress",
        priority: "urgent",
        due_date: new Date().toISOString().slice(0, 10), // Vence hoje
        assignee_name: "Luiz (eu)",
        checklist: [],
        position: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
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
    const list = getLocal<Deliverable[]>(`deliverables_${workspaceId}`, [
      {
        id: "del-1",
        workspace_id: workspaceId,
        client_id: "cli-1",
        client_name: "Graao — Café Especial",
        title: "Carrossel: Os 4 erros que estragam seu café em casa",
        format: "carrossel",
        channel: "instagram",
        description: "Carrossel educativo baseado no Método HEAD com 8 lâminas.",
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: "18:00",
        status: "client_review",
        cover_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        versions: [
          {
            id: "ver-1",
            deliverable_id: "del-1",
            version_number: 1,
            title: "Versão 1 — Gancho Direto",
            copy_text: "Se você ainda ferve a água até borbulhar antes de passar o café, pare agora mesmo...",
            slide_content: [
              { slide: 1, headline: "Você está queimando seu café (e nem percebe)", body: "O erro mais comum que transforma grãos nobres em amargor puro." },
              { slide: 2, headline: "Erro 1: Água fervendo a 100°C", body: "Espere 1 minuto após ferver para atingir os 92-94°C ideais." },
              { slide: 3, headline: "Erro 2: Moagem incorreta para o método", body: "Prensa francesa precisa de moagem grossa; coador v60 pede média." },
            ],
            media_urls: [],
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: "del-2",
        workspace_id: workspaceId,
        client_id: "cli-2",
        client_name: "Soci — Moda & Identidade",
        title: "Reels: Manifesto de Marca — Rua Mangabeiras",
        format: "reels_roteiro",
        channel: "instagram",
        description: "Direção cinematográfica de moda urbana em Belo Horizonte.",
        scheduled_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        scheduled_time: "12:30",
        status: "production",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
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
    const list = getLocal<ContentReference[]>(`references_${workspaceId}`, [
      {
        id: "ref-1",
        workspace_id: workspaceId,
        title: "Gancho de Contraste — Case Nike & Apple",
        category: "copy",
        tags: ["gancho", "método head", "contraste"],
        notes: "Começar com 'Todo mundo acha X, mas a verdade é Y'. Alta retenção.",
        created_at: new Date().toISOString(),
      },
      {
        id: "ref-2",
        workspace_id: workspaceId,
        title: "Paleta Urbana de Belo Horizonte — Luz Dourada & Sombra Fria",
        category: "visual",
        tags: ["direção de arte", "cor", "iluminação"],
        notes: "Sol quente a 45° contrastando com céu azul/ciano. Identidade Caramelo pura.",
        created_at: new Date().toISOString(),
      },
    ]);
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
    const list = getLocal<Opportunity[]>(`opps_${workspaceId}`, [
      {
        id: "opp-1",
        workspace_id: workspaceId,
        client_name: "Estúdio de Arquitetura Nó",
        title: "Contrato Mensal de Posicionamento & Reels",
        stage: "proposta",
        estimated_value_cents: 420000,
        monthly_value_cents: 420000,
        next_action: "Apresentar proposta de 8 Reels cinematográficos",
        notes: "Interessados em reforçar estética e materiais no Instagram.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "opp-2",
        workspace_id: workspaceId,
        client_name: "Clínica Dermatológica Derma",
        title: "Lançamento de Protocolo Estético",
        stage: "qualificado",
        estimated_value_cents: 350000,
        next_action: "Enviar briefing de diagnóstico de público",
        notes: "Querem autoridade médica sem parecer comercial genérico.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
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
    const list = getLocal<FinancialEntry[]>(`finance_${workspaceId}`, [
      {
        id: "fin-1",
        workspace_id: workspaceId,
        client_name: "Graao — Café Especial",
        type: "revenue_received",
        amount_cents: 350000,
        currency: "BRL",
        date: new Date().toISOString().slice(0, 10),
        description: "Mensalidade de Gestão de Conteúdo (Outubro/2026)",
        category: "mensalidade",
        status: "pago",
        created_at: new Date().toISOString(),
      },
      {
        id: "fin-2",
        workspace_id: workspaceId,
        client_name: "Soci — Moda & Identidade",
        type: "revenue_expected",
        amount_cents: 480000,
        currency: "BRL",
        date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
        description: "Mensalidade de Gestão & Direção de Arte (Novembro/2026)",
        category: "mensalidade",
        status: "pendente",
        created_at: new Date().toISOString(),
      },
    ]);
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
      { provider: "instagram", connected: true, account_name: "@umcaracaramelo", last_sync: "Hoje às 10:20" },
      { provider: "tiktok", connected: false },
      { provider: "drive", connected: true, account_name: "estudio-caramelo-backup" },
      { provider: "facebook", connected: true, account_name: "Laboratório de Interação" },
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
