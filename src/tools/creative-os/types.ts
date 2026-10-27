export type ServiceType = "head_de_conteudo" | "estudio_criativo" | "estrategista" | "outro";

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  service_type: ServiceType;
  created_at: string;
  updated_at: string;
}

export type MemberRole = "owner" | "admin" | "collaborator";

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id?: string;
  role: MemberRole;
  invited_email: string;
  status: "active" | "pending" | "revoked";
  created_at: string;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  segment: string;
  status: "active" | "lead" | "archived";
  monthly_fee_cents: number;
  currency: string;
  notes: string;
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

export type OpportunityStage = "novo" | "qualificado" | "proposta" | "ganho" | "perdido";

export interface Opportunity {
  id: string;
  workspace_id: string;
  client_id?: string;
  client_name?: string;
  title: string;
  stage: OpportunityStage;
  estimated_value_cents: number;
  next_action: string;
  notes: string;
  created_at: string;
  updated_at: string;
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

export interface Proposal {
  id: string;
  workspace_id: string;
  client_id: string;
  title: string;
  scope: string;
  deliverables_summary: string;
  price_cents: number;
  status: "draft" | "sent" | "accepted" | "declined";
  contract_url: string;
  created_at: string;
  updated_at: string;
}

export type ProjectTemplateType = "monthly_management" | "launch" | "landing_page" | "custom";
export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export interface Project {
  id: string;
  workspace_id: string;
  client_id: string;
  name: string;
  template_type: ProjectTemplateType;
  status: ProjectStatus;
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee_id?: string;
  checklist: TaskChecklistItem[];
  position: number;
  created_at: string;
  updated_at: string;
}

export type DeliverableFormat = "carrossel" | "reels_roteiro" | "estatico" | "artigo" | "video_longo" | "outro";
export type DeliverableChannel = "instagram" | "linkedin" | "youtube" | "tiktok" | "site" | "outro";
export type DeliverableStatus =
  | "idea"
  | "production"
  | "internal_review"
  | "client_review"
  | "adjustments"
  | "approved"
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
  project_id: string;
  client_id: string;
  title: string;
  format: DeliverableFormat;
  channel: DeliverableChannel;
  description: string;
  scheduled_date?: string;
  status: DeliverableStatus;
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

export type FinancialType = "revenue_expected" | "revenue_received" | "expense";

export interface FinancialEntry {
  id: string;
  workspace_id: string;
  project_id?: string;
  client_id?: string;
  type: FinancialType;
  amount_cents: number;
  currency: string;
  date: string;
  description: string;
  category: string;
  created_at: string;
}
