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
