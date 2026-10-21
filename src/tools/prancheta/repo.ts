import { supabase } from "../../supabase";
import type { DocumentData } from "./editor/model/types";

export interface PranchetaFileInfo {
  id: string;
  name: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}
export interface PranchetaFile extends PranchetaFileInfo { document: DocumentData }
export interface PranchetaRepo {
  listFiles(): Promise<PranchetaFileInfo[]>;
  getFile(id: string): Promise<PranchetaFile>;
  createFile(document: DocumentData): Promise<PranchetaFile>;
  saveFile(id: string, document: DocumentData, expectedUpdatedAt: string): Promise<PranchetaFileInfo>;
  deleteFile(id: string, expectedUpdatedAt: string): Promise<void>;
}

export class PranchetaConflictError extends Error {
  constructor() {
    super("Este arquivo mudou em outra aba ou não está mais disponível. Reabra a versão salva ou salve seu trabalho como uma cópia.");
    this.name = "PranchetaConflictError";
  }
}

const META = "id, name, size_bytes, created_at, updated_at";
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export function documentPayload(document: DocumentData) {
  const name = document.name.trim();
  if (!name || name.length > 200) throw new Error("Use um nome de 1 a 200 caracteres.");
  const size_bytes = new TextEncoder().encode(JSON.stringify(document)).byteLength;
  if (size_bytes > MAX_DOCUMENT_BYTES) throw new Error("Este arquivo passou de 25 MB. Reduza as imagens antes de salvar.");
  return { name, document: { ...document, name }, size_bytes };
}

/** Every request filters the signed-in owner; the database also enforces ownership and has_tool. */
export function createSupabasePranchetaRepo(userId: string): PranchetaRepo {
  if (!userId) throw new Error("Entre no LAB para abrir seus arquivos.");
  return {
    async listFiles() {
      const files: PranchetaFileInfo[] = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.from("prancheta_files").select(META)
          .eq("user_id", userId).order("updated_at", { ascending: false }).order("id")
          .range(offset, offset + 99);
        if (error) throw new Error(error.message);
        files.push(...(data as PranchetaFileInfo[]));
        if (data.length < 100) return files;
      }
    },
    async getFile(id) {
      const { data, error } = await supabase.from("prancheta_files").select(`${META}, document`)
        .eq("user_id", userId).eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Arquivo não encontrado ou acesso indisponível.");
      return data as PranchetaFile;
    },
    async createFile(document) {
      const { data, error } = await supabase.from("prancheta_files")
        .insert({ ...documentPayload(document), user_id: userId })
        .select(`${META}, document`).single();
      if (error) throw new Error(error.message);
      return data as PranchetaFile;
    },
    async saveFile(id, document, expectedUpdatedAt) {
      const { data, error } = await supabase.from("prancheta_files").update(documentPayload(document))
        .eq("user_id", userId).eq("id", id).eq("updated_at", expectedUpdatedAt)
        .select(META).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new PranchetaConflictError();
      return data as PranchetaFileInfo;
    },
    async deleteFile(id, expectedUpdatedAt) {
      const { data, error } = await supabase.from("prancheta_files").delete()
        .eq("user_id", userId).eq("id", id).eq("updated_at", expectedUpdatedAt)
        .select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new PranchetaConflictError();
    },
  };
}
