import { supabase } from "../../supabase";
import type {
  AdminAchievementItem,
  AdminStats,
  AdminToolItem,
  AdminUserAchievementItem,
  AdminUserActivityItem,
  AdminUserItem,
} from "./types";

export const adminRepo = {
  async getStats(): Promise<AdminStats> {
    const { data, error } = await supabase.rpc("admin_get_stats");
    if (error) throw new Error(error.message || "Não foi possível carregar métricas do LAB.");
    return data as AdminStats;
  },

  async getTools(): Promise<AdminToolItem[]> {
    const { data, error } = await supabase.rpc("admin_get_tools");
    if (error) throw new Error(error.message || "Não foi possível carregar ferramentas.");
    return (data ?? []).map((t: any) => ({
      ...t,
      owners_count: Number(t.owners_count ?? 0),
    })) as AdminToolItem[];
  },

  async setToolAvailability(slug: string, available: boolean): Promise<void> {
    const { error } = await supabase.rpc("admin_set_tool_availability", {
      p_slug: slug,
      p_available: available,
    });
    if (error) throw new Error(error.message || "Erro ao alterar disponibilidade da ferramenta.");
  },

  async updateTool(
    slug: string,
    params: { name?: string; price_cents?: number; available?: boolean }
  ): Promise<void> {
    const { error } = await supabase.rpc("admin_update_tool", {
      p_slug: slug,
      p_name: params.name ?? "",
      p_price_cents: params.price_cents ?? 0,
      p_available: params.available ?? false,
    });
    if (error) throw new Error(error.message || "Erro ao atualizar dados da ferramenta.");
  },

  async getUsers(search = "", role = "", status = ""): Promise<AdminUserItem[]> {
    const { data, error } = await supabase.rpc("admin_get_users", {
      p_search: search.trim() || null,
      p_role: role || null,
      p_status: status || null,
    });
    if (error) throw new Error(error.message || "Erro ao carregar lista de usuários.");
    return (data ?? []).map((u: any) => ({
      ...u,
      tools_count: Number(u.tools_count ?? 0),
      tools_owned: Array.isArray(u.tools_owned) ? u.tools_owned : [],
    })) as AdminUserItem[];
  },

  async setUserRole(userId: string, role: string): Promise<void> {
    const { error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: userId,
      p_role: role,
    });
    if (error) throw new Error(error.message || "Erro ao alterar cargo do usuário.");
  },

  async setUserStatus(userId: string, status: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc("admin_set_user_status", {
      p_user_id: userId,
      p_status: status,
      p_reason: reason || null,
    });
    if (error) throw new Error(error.message || "Erro ao alterar status do usuário.");
  },

  // ---------------------------------------------------------------------------
  // Conquistas
  // ---------------------------------------------------------------------------
  async getAllAchievements(): Promise<AdminAchievementItem[]> {
    const { data, error } = await supabase.rpc("admin_get_all_achievements");
    if (error) throw new Error(error.message || "Erro ao carregar conquistas.");
    return (data ?? []).map((a: any) => ({
      ...a,
      unlocked_count: Number(a.unlocked_count ?? 0),
    })) as AdminAchievementItem[];
  },

  async getUserAchievements(userId: string): Promise<AdminUserAchievementItem[]> {
    const { data, error } = await supabase.rpc("admin_get_user_achievements", {
      p_user_id: userId,
    });
    if (error) throw new Error(error.message || "Erro ao carregar conquistas do usuário.");
    return (data ?? []).map((a: any) => ({
      ...a,
      achieved: Boolean(a.achieved),
    })) as AdminUserAchievementItem[];
  },

  async grantAchievement(userId: string, achievementId: string): Promise<void> {
    const { error } = await supabase.rpc("admin_grant_achievement", {
      p_user_id: userId,
      p_achievement_id: achievementId,
    });
    if (error) throw new Error(error.message || "Erro ao conceder conquista.");
  },

  async revokeAchievement(userId: string, achievementId: string): Promise<void> {
    const { error } = await supabase.rpc("admin_revoke_achievement", {
      p_user_id: userId,
      p_achievement_id: achievementId,
    });
    if (error) throw new Error(error.message || "Erro ao revogar conquista.");
  },

  async createAchievement(params: {
    id: string;
    tool_slug?: string;
    name: string;
    description: string;
    icon?: string;
    hidden?: boolean;
  }): Promise<void> {
    const { error } = await supabase.rpc("admin_create_achievement", {
      p_id: params.id,
      p_tool_slug: params.tool_slug || null,
      p_name: params.name,
      p_description: params.description,
      p_icon: params.icon || "🏆",
      p_hidden: params.hidden ?? false,
    });
    if (error) throw new Error(error.message || "Erro ao criar conquista.");
  },

  // ---------------------------------------------------------------------------
  // Atividades Recentes e Horas de Uso
  // ---------------------------------------------------------------------------
  async getUserActivities(userId: string): Promise<AdminUserActivityItem[]> {
    const { data, error } = await supabase.rpc("admin_get_user_activities", {
      p_user_id: userId,
    });
    if (error) throw new Error(error.message || "Erro ao carregar atividades do usuário.");
    return (data ?? []).map((a: any) => ({
      tool_slug: a.tool_slug,
      tool_name: a.tool_name,
      appid: Number(a.appid ?? 0),
      last_played_at: a.last_played_at || null,
      last_played_unix: Number(a.last_played_unix ?? 0),
      playtime_minutes: Number(a.playtime_minutes ?? 0),
    })) as AdminUserActivityItem[];
  },

  async updateUserToolActivity(params: {
    userId: string;
    toolSlug: string;
    playtimeMinutes: number;
    lastPlayedAt?: string;
  }): Promise<void> {
    const { error } = await supabase.rpc("admin_update_tool_activity", {
      p_user_id: params.userId,
      p_slug: params.toolSlug,
      p_playtime_minutes: params.playtimeMinutes,
      p_last_played_at: params.lastPlayedAt || new Date().toISOString(),
    });
    if (error) throw new Error(error.message || "Erro ao atualizar atividade da ferramenta.");
  },
};
