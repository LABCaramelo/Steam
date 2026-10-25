export interface AdminStats {
  total_users: number;
  active_users: number;
  pending_users: number;
  blocked_users: number;
  admin_users: number;
  total_tools: number;
  published_tools: number;
  unreleased_tools: number;
  total_acquisitions: number;
  whatsapp_verified: number;
}

export type ToolBannerKind = "hero" | "header" | "capsule" | "icon" | "logo";

export interface ToolCustomAssets {
  hero?: string;
  header?: string;
  capsule?: string;
  icon?: string;
  logo?: string;
  [key: string]: string | undefined;
}

export interface AdminToolItem {
  slug: string;
  appid: number;
  name: string;
  price_cents: number;
  available: boolean;
  created_at: string;
  owners_count: number;
  custom_assets?: ToolCustomAssets;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "admin" | "member" | "student" | string;
  access_status: "active" | "pending" | "blocked" | string;
  blocked_reason: string | null;
  created_at: string;
  last_active_at: string | null;
  is_admin: boolean;
  tools_count: number;
  tools_owned: string[];
  whatsapp: string | null;
  whatsapp_verified: boolean;
}

export interface AdminAchievementItem {
  id: string;
  appid: number | null;
  tool_slug: string | null;
  tool_name: string;
  name: string;
  description: string;
  icon: string;
  hidden: boolean;
  unlocked_count: number;
  created_at: string;
}

export interface AdminUserAchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  tool_slug: string | null;
  appid: number | null;
  achieved: boolean;
  unlocked_at: string | null;
  granted_by: string | null;
}

export interface AdminUserActivityItem {
  tool_slug: string;
  tool_name: string;
  appid: number;
  last_played_at: string | null;
  last_played_unix: number;
  playtime_minutes: number;
}

export interface AdminSeedStats {
  total_seeds: number;
  verified_domains: number;
  verified_publications: number;
  observed_domains: number;
  observed_publications: number;
  all_current_publications: number;
  verification_rate: number;
  new_7d: number;
  new_verified_7d: number;
  new_30d: number;
  new_verified_30d: number;
  pending_scans: number;
  error_scans: number;
  failed_scans: number;
}

export interface AdminSeedPublication {
  id: string;
  prompt_id: string;
  normalized_domain: string;
  status: "verified" | "observed" | "not_confirmed" | "offline" | "removed" | string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  first_verified_at: string | null;
  last_verified_at: string | null;
  evidence_summary?: Record<string, any> | null;
  prompt_title?: string;
  prompt_slug?: string;
  prompt_seed?: string;
}

export interface AdminSeedPromptItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  type: string;
  seed: string;
  seed_version: number;
  canonical_url: string;
  compiled_hash: string | null;
  active: boolean;
  enabled: boolean;
  created_at: string;
}

export interface AdminSeedAnalytics {
  summary: AdminSeedStats;
  range: string;
  window_summary?: {
    range: string;
    new_adoptions: number;
    new_sites: number;
    confirmation_rate: number;
  };
  new_verified_series?: Array<{ date: string; count: number }>;
  first_seen_series?: Array<{ date: string; count: number }>;
  status_distribution?: Array<{ status: string; count: number }>;
  top_prompts?: Array<{
    prompt_id: string;
    title: string;
    slug: string;
    category: string;
    thumbnail: string;
    verified_domains: number;
    total_publications: number;
  }>;
  recent_activity?: Array<{
    id: string;
    prompt_id: string;
    prompt_title: string;
    prompt_slug: string;
    normalized_domain: string;
    status: string;
    first_seen_at: string;
    last_seen_at: string;
    first_verified_at: string | null;
    last_verified_at: string | null;
  }>;
}

export interface AdminSeedDetail {
  prompt: {
    id: string;
    title: string;
    slug: string;
    category: string;
    type: string;
    seed: string;
    thumbnail?: string;
    preview_url?: string;
    created_at: string;
  };
  summary: {
    verified_domains: number;
    total_publications: number;
    observed_publications: number;
    first_seen_at: string | null;
    last_seen_at: string | null;
    last_verified_at: string | null;
  };
  publications: Array<{
    id: string;
    normalized_domain: string;
    status: string;
    first_seen_at: string | null;
    last_seen_at: string | null;
    first_verified_at: string | null;
    last_verified_at: string | null;
    job_status?: string;
  }>;
  body_meta?: {
    canonical_runtime_tag: string;
    compiled_hash: string;
  };
}

