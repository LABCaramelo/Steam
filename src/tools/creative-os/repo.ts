import { supabase } from "../../supabase";
import type {
  BrandProfile,
  Briefing,
  BriefingTemplate,
  Client,
  ClientContact,
  ClientShare,
  Deliverable,
  DeliverableComment,
  DeliverableVersion,
  FinancialEntry,
  Opportunity,
  OpportunityStage,
  Project,
  ProjectStatus,
  Task,
  Workspace,
} from "./types";

export interface CreativeOsRepository {
  // Workspaces
  getWorkspaces(): Promise<Workspace[]>;
  createWorkspace(data: { name: string; slug: string; service_type: string }): Promise<Workspace>;

  // Clients & Contacts
  getClients(workspaceId: string): Promise<Client[]>;
  createClient(data: Partial<Client> & { workspace_id: string; name: string }): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<void>;
  deleteClient(id: string): Promise<void>;
  getContacts(clientId: string): Promise<ClientContact[]>;
  createContact(data: Partial<ClientContact> & { workspace_id: string; client_id: string; name: string }): Promise<ClientContact>;
  deleteContact(id: string): Promise<void>;

  // CRM / Opportunities
  getOpportunities(workspaceId: string): Promise<Opportunity[]>;
  createOpportunity(data: Partial<Opportunity> & { workspace_id: string; title: string }): Promise<Opportunity>;
  updateOpportunityStage(id: string, stage: OpportunityStage): Promise<void>;
  deleteOpportunity(id: string): Promise<void>;

  // Brand Profiles
  getBrandProfile(clientId: string): Promise<BrandProfile | null>;
  saveBrandProfile(data: Partial<BrandProfile> & { workspace_id: string; client_id: string }): Promise<BrandProfile>;

  // Briefings
  getBriefingTemplates(workspaceId: string): Promise<BriefingTemplate[]>;
  createBriefingTemplate(data: Partial<BriefingTemplate> & { workspace_id: string; name: string }): Promise<BriefingTemplate>;
  getBriefings(clientId: string): Promise<Briefing[]>;
  saveBriefing(data: Partial<Briefing> & { workspace_id: string; client_id: string; title: string }): Promise<Briefing>;

  // Projects & Tasks
  getProjects(workspaceId: string): Promise<Project[]>;
  createProject(data: Partial<Project> & { workspace_id: string; client_id: string; name: string }): Promise<Project>;
  updateProjectStatus(id: string, status: ProjectStatus): Promise<void>;
  getTasks(projectId: string): Promise<Task[]>;
  createTask(data: Partial<Task> & { workspace_id: string; project_id: string; title: string }): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // Deliverables, Versions & Approvals
  getDeliverables(workspaceId: string, projectId?: string): Promise<Deliverable[]>;
  createDeliverable(data: Partial<Deliverable> & { workspace_id: string; project_id: string; client_id: string; title: string }): Promise<Deliverable>;
  updateDeliverableStatus(id: string, status: Deliverable["status"]): Promise<void>;
  createDeliverableVersion(deliverableId: string, data: { title: string; copy_text: string; slide_content?: any[]; media_urls?: string[] }): Promise<DeliverableVersion>;
  getComments(deliverableId: string): Promise<DeliverableComment[]>;
  createComment(data: { deliverable_id: string; version_id?: string; author_name: string; is_internal: boolean; comment_text: string }): Promise<DeliverableComment>;

  // Portal & Shares
  createClientShare(workspaceId: string, clientId: string, daysValid?: number): Promise<ClientShare>;
  getClientShares(clientId: string): Promise<ClientShare[]>;
  getPortalData(token: string): Promise<any>;
  submitClientDecision(token: string, deliverableId: string, versionId: string, status: "approved" | "changes_requested", feedback: string, name: string, email: string): Promise<any>;

  // Finance
  getFinancialEntries(workspaceId: string): Promise<FinancialEntry[]>;
  createFinancialEntry(data: Partial<FinancialEntry> & { workspace_id: string; amount_cents: number; description: string; type: FinancialEntry["type"] }): Promise<FinancialEntry>;
  deleteFinancialEntry(id: string): Promise<void>;
}

export const supabaseCreativeOs: CreativeOsRepository = {
  async getWorkspaces() {
    const { data, error } = await supabase
      .from("creative_os_workspaces")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Workspace[];
  },

  async createWorkspace(data) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Usuário não autenticado.");
    const { data: ws, error } = await supabase
      .from("creative_os_workspaces")
      .insert({
        owner_id: user.id,
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        service_type: data.service_type || "head_de_conteudo",
      })
      .select()
      .single();
    if (error) throw error;
    return ws as Workspace;
  },

  async getClients(workspaceId) {
    const { data, error } = await supabase
      .from("creative_os_clients")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Client[];
  },

  async createClient(data) {
    const { data: client, error } = await supabase
      .from("creative_os_clients")
      .insert({
        workspace_id: data.workspace_id,
        name: data.name.trim(),
        segment: data.segment?.trim() || "",
        status: data.status || "active",
        monthly_fee_cents: data.monthly_fee_cents || 0,
        currency: data.currency || "BRL",
        notes: data.notes?.trim() || "",
      })
      .select()
      .single();
    if (error) throw error;
    return client as Client;
  },

  async updateClient(id, data) {
    const { error } = await supabase
      .from("creative_os_clients")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteClient(id) {
    const { error } = await supabase
      .from("creative_os_clients")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getContacts(clientId) {
    const { data, error } = await supabase
      .from("creative_os_contacts")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ClientContact[];
  },

  async createContact(data) {
    const { data: contact, error } = await supabase
      .from("creative_os_contacts")
      .insert({
        workspace_id: data.workspace_id,
        client_id: data.client_id,
        name: data.name.trim(),
        email: data.email?.trim() || "",
        phone: data.phone?.trim() || "",
        role_title: data.role_title?.trim() || "",
        is_primary: !!data.is_primary,
      })
      .select()
      .single();
    if (error) throw error;
    return contact as ClientContact;
  },

  async deleteContact(id) {
    const { error } = await supabase
      .from("creative_os_contacts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getOpportunities(workspaceId) {
    const { data, error } = await supabase
      .from("creative_os_opportunities")
      .select("*, creative_os_clients(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((o: any) => ({
      ...o,
      client_name: o.creative_os_clients?.name,
    })) as Opportunity[];
  },

  async createOpportunity(data) {
    const { data: opp, error } = await supabase
      .from("creative_os_opportunities")
      .insert({
        workspace_id: data.workspace_id,
        client_id: data.client_id || null,
        title: data.title.trim(),
        stage: data.stage || "novo",
        estimated_value_cents: data.estimated_value_cents || 0,
        next_action: data.next_action?.trim() || "",
        notes: data.notes?.trim() || "",
      })
      .select()
      .single();
    if (error) throw error;
    return opp as Opportunity;
  },

  async updateOpportunityStage(id, stage) {
    const { error } = await supabase
      .from("creative_os_opportunities")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteOpportunity(id) {
    const { error } = await supabase
      .from("creative_os_opportunities")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getBrandProfile(clientId) {
    const { data, error } = await supabase
      .from("creative_os_brand_profiles")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    if (error) throw error;
    return data as BrandProfile | null;
  },

  async saveBrandProfile(data) {
    const { data: profile, error } = await supabase
      .from("creative_os_brand_profiles")
      .upsert(
        {
          workspace_id: data.workspace_id,
          client_id: data.client_id,
          purpose: data.purpose || "",
          offer: data.offer || "",
          target_personas: data.target_personas || "",
          positioning: data.positioning || "",
          tone_of_voice: data.tone_of_voice || "",
          visual_guidelines: data.visual_guidelines || "",
          channels: data.channels || "",
          differentiators: data.differentiators || "",
          restrictions: data.restrictions || "",
          reference_links: data.reference_links || [],
          is_validated: !!data.is_validated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return profile as BrandProfile;
  },

  async getBriefingTemplates(workspaceId) {
    const { data, error } = await supabase
      .from("creative_os_briefing_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as BriefingTemplate[];
  },

  async createBriefingTemplate(data) {
    const { data: tmpl, error } = await supabase
      .from("creative_os_briefing_templates")
      .insert({
        workspace_id: data.workspace_id,
        name: data.name.trim(),
        description: data.description?.trim() || "",
        sections: data.sections || [],
      })
      .select()
      .single();
    if (error) throw error;
    return tmpl as BriefingTemplate;
  },

  async getBriefings(clientId) {
    const { data, error } = await supabase
      .from("creative_os_briefings")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Briefing[];
  },

  async saveBriefing(data) {
    const { data: briefing, error } = await supabase
      .from("creative_os_briefings")
      .upsert({
        id: data.id || undefined,
        workspace_id: data.workspace_id,
        client_id: data.client_id,
        template_id: data.template_id || null,
        title: data.title.trim(),
        status: data.status || "draft",
        answers: data.answers || {},
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return briefing as Briefing;
  },

  async getProjects(workspaceId) {
    const { data, error } = await supabase
      .from("creative_os_projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Project[];
  },

  async createProject(data) {
    const { data: project, error } = await supabase
      .from("creative_os_projects")
      .insert({
        workspace_id: data.workspace_id,
        client_id: data.client_id,
        name: data.name.trim(),
        template_type: data.template_type || "custom",
        status: data.status || "active",
        start_date: data.start_date || null,
        due_date: data.due_date || null,
      })
      .select()
      .single();
    if (error) throw error;
    return project as Project;
  },

  async updateProjectStatus(id, status) {
    const { error } = await supabase
      .from("creative_os_projects")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async getTasks(projectId) {
    const { data, error } = await supabase
      .from("creative_os_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Task[];
  },

  async createTask(data) {
    const { data: task, error } = await supabase
      .from("creative_os_tasks")
      .insert({
        workspace_id: data.workspace_id,
        project_id: data.project_id,
        title: data.title.trim(),
        description: data.description?.trim() || "",
        status: data.status || "todo",
        priority: data.priority || "medium",
        due_date: data.due_date || null,
        assignee_id: data.assignee_id || null,
        checklist: data.checklist || [],
        position: data.position || 0,
      })
      .select()
      .single();
    if (error) throw error;
    return task as Task;
  },

  async updateTask(id, data) {
    const { error } = await supabase
      .from("creative_os_tasks")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteTask(id) {
    const { error } = await supabase
      .from("creative_os_tasks")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getDeliverables(workspaceId, projectId) {
    let q = supabase
      .from("creative_os_deliverables")
      .select(`
        *,
        versions:creative_os_deliverable_versions(*),
        approvals:creative_os_approvals(*),
        comments:creative_os_comments(*)
      `)
      .eq("workspace_id", workspaceId);
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Deliverable[];
  },

  async createDeliverable(data) {
    const { data: deliverable, error } = await supabase
      .from("creative_os_deliverables")
      .insert({
        workspace_id: data.workspace_id,
        project_id: data.project_id,
        client_id: data.client_id,
        title: data.title.trim(),
        format: data.format || "carrossel",
        channel: data.channel || "instagram",
        description: data.description?.trim() || "",
        scheduled_date: data.scheduled_date || null,
        status: data.status || "idea",
      })
      .select()
      .single();
    if (error) throw error;
    return deliverable as Deliverable;
  },

  async updateDeliverableStatus(id, status) {
    const { error } = await supabase
      .from("creative_os_deliverables")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async createDeliverableVersion(deliverableId, data) {
    // Busca a contagem atual de versões para definir o número sequencial
    const { count, error: countErr } = await supabase
      .from("creative_os_deliverable_versions")
      .select("*", { count: "exact", head: true })
      .eq("deliverable_id", deliverableId);
    if (countErr) throw countErr;

    const nextNumber = (count ?? 0) + 1;
    const user = (await supabase.auth.getUser()).data.user;

    const { data: version, error } = await supabase
      .from("creative_os_deliverable_versions")
      .insert({
        deliverable_id: deliverableId,
        version_number: nextNumber,
        title: data.title.trim() || `Versão ${nextNumber}`,
        copy_text: data.copy_text || "",
        slide_content: data.slide_content || [],
        media_urls: data.media_urls || [],
        created_by: user?.id || null,
      })
      .select()
      .single();
    if (error) throw error;

    // Se a peça já estava aprovada, nova versão exige nova rodada de revisão
    await supabase
      .from("creative_os_deliverables")
      .update({ status: "internal_review", updated_at: new Date().toISOString() })
      .eq("id", deliverableId);

    return version as DeliverableVersion;
  },

  async getComments(deliverableId) {
    const { data, error } = await supabase
      .from("creative_os_comments")
      .select("*")
      .eq("deliverable_id", deliverableId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as DeliverableComment[];
  },

  async createComment(data) {
    const user = (await supabase.auth.getUser()).data.user;
    const { data: comment, error } = await supabase
      .from("creative_os_comments")
      .insert({
        deliverable_id: data.deliverable_id,
        version_id: data.version_id || null,
        author_id: user?.id || null,
        author_name: data.author_name.trim(),
        is_internal: data.is_internal,
        comment_text: data.comment_text.trim(),
      })
      .select()
      .single();
    if (error) throw error;
    return comment as DeliverableComment;
  },

  async createClientShare(workspaceId, clientId, daysValid = 14) {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("creative_os_client_shares")
      .insert({
        workspace_id: workspaceId,
        client_id: clientId,
        token,
        name: "Portal de Revisão do Cliente",
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ClientShare;
  },

  async getClientShares(clientId) {
    const { data, error } = await supabase
      .from("creative_os_client_shares")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ClientShare[];
  },

  async getPortalData(token) {
    const { data, error } = await supabase.rpc("creative_os_get_portal_data", { p_token: token });
    if (error) throw error;
    return data;
  },

  async submitClientDecision(token, deliverableId, versionId, status, feedback, name, email) {
    const { data, error } = await supabase.rpc("creative_os_submit_client_decision", {
      p_token: token,
      p_deliverable_id: deliverableId,
      p_version_id: versionId,
      p_status: status,
      p_feedback: feedback,
      p_name: name,
      p_email: email,
    });
    if (error) throw error;
    return data;
  },

  async getFinancialEntries(workspaceId) {
    const { data, error } = await supabase
      .from("creative_os_financial_entries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as FinancialEntry[];
  },

  async createFinancialEntry(data) {
    const { data: entry, error } = await supabase
      .from("creative_os_financial_entries")
      .insert({
        workspace_id: data.workspace_id,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        type: data.type,
        amount_cents: data.amount_cents,
        currency: data.currency || "BRL",
        date: data.date || new Date().toISOString().slice(0, 10),
        description: data.description.trim(),
        category: data.category?.trim() || "servico",
      })
      .select()
      .single();
    if (error) throw error;
    return entry as FinancialEntry;
  },

  async deleteFinancialEntry(id) {
    const { error } = await supabase
      .from("creative_os_financial_entries")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
