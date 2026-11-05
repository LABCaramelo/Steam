import type { ToolMetadata } from "./types";

export interface ToolAccessProfile {
  role: string;
  access_status: string;
}

export function isActiveAdmin(profile: ToolAccessProfile | null | undefined): boolean {
  return profile?.access_status === "active" && profile.role === "admin";
}

/** Eligibility is separate from acquisition; the database enforces both. */
export function canUseTool(tool: ToolMetadata, profile: ToolAccessProfile | null | undefined): boolean {
  if (!profile || profile.access_status !== "active") return false;
  if (isActiveAdmin(profile)) return true;
  return !tool.adminOnly && tool.available && (tool.stage !== "beta" || profile.role === "beta");
}

export function toolAccessMessage(tool: ToolMetadata, profile: ToolAccessProfile | null | undefined): string {
  if (!profile || profile.access_status !== "active") return "Seu acesso ao LAB precisa estar ativo para usar ferramentas.";
  if (tool.adminOnly && !isActiveAdmin(profile)) return "Esta ferramenta é exclusiva para administradores.";
  if (!tool.available && !isActiveAdmin(profile)) return "Esta ferramenta estará disponível em breve. A aquisição ainda não foi liberada.";
  if (tool.stage === "beta" && profile.role !== "beta" && !isActiveAdmin(profile)) return "Esta ferramenta está em beta e é exclusiva para usuários BETA.";
  return "";
}
