export type ServiceType = "head_de_conteudo" | "estudio_criativo" | "estrategista" | "agencia_social_media" | "outro";

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  service_type: ServiceType;
  agency_level?: string;
  created_at: string;
  updated_at: string;
}

export type MemberRole = "owner" | "admin" | "collaborator" | "editor" | "client";

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id?: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: MemberRole;
  status: "active" | "pending" | "revoked";
  created_at: string;
}

export interface ClientCategory {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  category: "ativos" | "avulsos" | "ex_clientes" | string;
  segment: string;
  status: "active" | "lead" | "archived";
  monthly_fee_cents: number;
  currency: string;
  notes: string;
  color?: string;
  logo_url?: string;
  folder_drive_url?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  workspace_id: string;
  client_id: string;
  name: string;
  email: string;
  phone: string;
  role_title: string;
  is_primary: boolean;
  created_at: string;
}

export interface ClientLink {
  id: string;
  workspace_id: string;
  client_id: string;
  title: string;
  url: string;
  category: "drive" | "instagram" | "briefing" | "outro";
  created_at: string;
}

export interface BrandProfile {
  id: string;
  workspace_id: string;
  client_id: string;
  purpose: string;
  offer: string;
  target_personas: string;
  positioning: string;
  tone_of_voice: string;
  visual_guidelines: string;
  channels: string;
  differentiators: string;
  restrictions: string;
  reference_links: string[];
  is_validated: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "delayed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  workspace_id: string;
  client_id?: string;
  project_id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee_id?: string;
  assignee_name?: string;
  checklist: TaskChecklistItem[];
  is_archived?: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type DeliverableFormat = "carrossel" | "reels_roteiro" | "estatico" | "artigo" | "video_longo" | "stories" | "outro";
export type DeliverableChannel = "instagram" | "tiktok" | "facebook" | "linkedin" | "youtube" | "outro";
export type DeliverableStatus =
  | "idea"
  | "production"
  | "internal_review"
  | "client_review"
  | "adjustments"
  | "approved"
  | "ready_to_publish"
  | "scheduled"
  | "published"
  | "archived";

export interface DeliverableVersion {
  id: string;
  deliverable_id: string;
  version_number: number;
  title: string;
  copy_text: string;
  slide_content: Array<{ slide: number; headline: string; body: string; visual_note?: string }>;
  media_urls: string[];
  created_by?: string;
  created_at: string;
}

export interface DeliverableApproval {
  id: string;
  deliverable_id: string;
  version_id: string;
  decided_by_name: string;
  decided_by_email?: string;
  status: "approved" | "changes_requested";
  feedback_text: string;
  decided_at: string;
}

export interface DeliverableComment {
  id: string;
  deliverable_id: string;
  version_id?: string;
  author_id?: string;
  author_name: string;
  is_internal: boolean;
  comment_text: string;
  created_at: string;
}

export interface Deliverable {
  id: string;
  workspace_id: string;
  client_id: string;
  client_name?: string;
  title: string;
  format: DeliverableFormat;
  channel: DeliverableChannel;
  description: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: DeliverableStatus;
  cover_url?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  versions?: DeliverableVersion[];
  approvals?: DeliverableApproval[];
  comments?: DeliverableComment[];
}

export interface ClientShare {
  id: string;
  workspace_id: string;
  client_id: string;
  token: string;
  name: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface ContentReference {
  id: string;
  workspace_id: string;
  title: string;
  url?: string;
  image_url?: string;
  category: "copy" | "visual" | "video" | "audio" | "estrategia";
  tags: string[];
  notes: string;
  created_at: string;
}

export type OpportunityStage = "novo" | "qualificado" | "proposta" | "negociacao" | "ganho" | "perdido";

export interface Opportunity {
  id: string;
  workspace_id: string;
  client_id?: string;
  client_name?: string;
  title: string;
  stage: OpportunityStage;
  estimated_value_cents: number;
  monthly_value_cents?: number;
  next_action: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface BriefingSection {
  title: string;
  questions: Array<{ id: string; question: string; placeholder?: string }>;
}

export interface BriefingTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  sections: BriefingSection[];
  created_at: string;
}

export interface Briefing {
  id: string;
  workspace_id: string;
  client_id: string;
  template_id?: string;
  title: string;
  status: "draft" | "sent_to_client" | "answered" | "reviewed";
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface SocialIntegration {
  provider: "instagram" | "tiktok" | "facebook" | "drive";
  connected: boolean;
  account_name?: string;
  last_sync?: string;
  error?: string;
}

export type FinancialType = "revenue_expected" | "revenue_received" | "expense";

export interface FinancialEntry {
  id: string;
  workspace_id: string;
  client_id?: string;
  client_name?: string;
  type: FinancialType;
  amount_cents: number;
  currency: string;
  date: string;
  description: string;
  category: string;
  status: "pendente" | "pago" | "atrasado";
  created_at: string;
}
