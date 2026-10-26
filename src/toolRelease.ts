/** Public messages for release_tool failures; backend messages can contain private details. */
export type ToolReleaseErrorKind = "unconfigured" | "catalog_outdated" | "session" | "busy" | "unconfirmed";

export class ToolReleaseError extends Error {
  readonly kind: ToolReleaseErrorKind;

  constructor(kind: ToolReleaseErrorKind, message: string) {
    super(message);
    this.name = "ToolReleaseError";
    this.kind = kind;
  }
}

export function toolReleaseFailure(cause: unknown): ToolReleaseError {
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  if (["PGRST202", "PGRST205", "42P01", "42883"].includes(code)) {
    return new ToolReleaseError("unconfigured", "A remoção de ferramentas precisa ser atualizada no LAB. Seus dados foram preservados. Tente novamente após a atualização.");
  }
  if (code === "P0002") {
    return new ToolReleaseError("catalog_outdated", "O LAB ainda não reconhece esta ferramenta na remoção. Seus dados foram preservados. A configuração do catálogo precisa ser atualizada.");
  }
  if (["28000", "28P01", "42501", "PGRST301", "PGRST302", "PGRST303"].includes(code)) {
    return new ToolReleaseError("session", "Não foi possível autorizar a remoção. Entre novamente no LAB e tente de novo.");
  }
  if (["40001", "40P01", "55P03", "57014"].includes(code)) {
    return new ToolReleaseError("busy", "A ferramenta está sendo atualizada em outra solicitação. Aguarde um momento e tente remover novamente.");
  }
  // A lost response can follow a committed transaction. Do not promise that data still exists.
  return new ToolReleaseError("unconfirmed", "O LAB não confirmou a remoção. Atualize a biblioteca para conferir o estado da ferramenta antes de tentar novamente.");
}

/** Both outcomes are authoritative: removed:false means it was already absent. */
export function assertToolReleaseConfirmed(value: unknown, expectedSlug: string): void {
  if (!value || typeof value !== "object" || !("slug" in value) || !("removed" in value)
    || value.slug !== expectedSlug || typeof value.removed !== "boolean") {
    throw new ToolReleaseError("unconfirmed", "O LAB não confirmou a remoção. Atualize a biblioteca para conferir o estado da ferramenta antes de tentar novamente.");
  }
}
