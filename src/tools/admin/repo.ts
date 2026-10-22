import { supabase } from "../../supabase";
import type {
  AdminAchievementItem,
  AdminStats,
  AdminToolItem,
  AdminUserAchievementItem,
  AdminUserActivityItem,
  AdminUserItem,
  ToolCustomAssets,
} from "./types";

export const adminRepo = {
  async getStats(): Promise<AdminStats> {
    const { data, error } = await supabase.rpc("admin_get_stats");
    if (error) throw new Error(error.message || "Não foi possível carregar métricas do LAB.");
    return data as AdminStats;
  },

  async getTools(): Promise<AdminToolItem[]> {
    // Tenta primeiro a versão v2 que inclui custom_assets
    const resV2 = await supabase.rpc("admin_get_tools_v2");
    const { data, error } = !resV2.error
      ? resV2
      : await supabase.rpc("admin_get_tools");

    if (error) throw new Error(error.message || "Não foi possível carregar ferramentas.");
    return (data ?? []).map((t: any) => ({
      ...t,
      owners_count: Number(t.owners_count ?? 0),
      custom_assets: (t.custom_assets && typeof t.custom_assets === "object") ? t.custom_assets : {},
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

  async updateToolAssets(slug: string, customAssets: ToolCustomAssets): Promise<void> {
    const { error } = await supabase.rpc("admin_update_tool_assets", {
      p_slug: slug,
      p_custom_assets: customAssets,
    });
    if (error) throw new Error(error.message || "Erro ao atualizar banners da ferramenta.");
  },

  async uploadBanner(toolSlug: string, kind: string, file: File): Promise<string> {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("A imagem não pode ultrapassar 8 MB.");
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const cleanSlug = toolSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const cleanKind = kind.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const filePath = `${cleanSlug}/${cleanKind}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("tool-banners")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Erro ao fazer upload do banner.");
    }

    const { data } = supabase.storage
      .from("tool-banners")
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Não foi possível gerar a URL pública da imagem.");
    }

    return data.publicUrl;
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
