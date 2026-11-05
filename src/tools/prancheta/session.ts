import type { DocumentData } from "./editor/model/types";
import { compactDocument } from "./editor/io/persist";
import { renderDocumentThumbnail } from "./editor/io/export";
import { store } from "./editor/store/store";
import { PranchetaConflictError, type PranchetaFile, type PranchetaFileInfo, type PranchetaRepo } from "./repo";

export interface SaveState {
  kind: "saved" | "dirty" | "saving" | "error" | "conflict";
  message: string;
}

/** One writer per open document: immutable snapshots, ordered writes and optimistic concurrency. */
export class PranchetaSession {
  readonly instanceId = crypto.randomUUID();
  readonly id: string;
  info: PranchetaFileInfo;
  state: SaveState = { kind: "saved", message: "Salvo no LAB" };
  private listeners = new Set<() => void>();
  private saved: string;
  private observed: string;
  private queued: { document: DocumentData; fingerprint: string } | null = null;
  private writing: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private unsubscribe: (() => void) | null = null;

  constructor(private repo: PranchetaRepo, file: PranchetaFile) {
    this.id = file.id;
    this.info = file;
    this.saved = this.observed = JSON.stringify(compactDocument(file.document));
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = () => this.state;
  private publish(kind: SaveState["kind"], message: string) {
    if (this.disposed) return;
    this.state = { kind, message };
    this.listeners.forEach((listener) => listener());
  }
  private snapshot() {
    const document = structuredClone(compactDocument(store.state.doc));
    return { document, fingerprint: JSON.stringify(document) };
  }
  get dirty() { return this.snapshot().fingerprint !== this.saved; }

  start() {
    if (this.unsubscribe || this.disposed) return;
    this.unsubscribe = store.subscribe(() => {
      const fingerprint = JSON.stringify(compactDocument(store.state.doc));
      if (fingerprint === this.observed) return;
      this.observed = fingerprint;
      clearTimeout(this.timer);
      if (this.state.kind === "conflict") return;
      this.publish(this.writing ? "saving" : "dirty", this.writing ? "Salvando…" : "Alterações por salvar");
      this.timer = setTimeout(() => void this.save(), 700);
    });
    window.addEventListener("beforeunload", this.beforeUnload);
    document.addEventListener("visibilitychange", this.visibilityChange);
    window.addEventListener("online", this.retryOnline);
  }

  private beforeUnload = (event: BeforeUnloadEvent) => {
    if (!this.dirty) return;
    void this.save();
    event.preventDefault();
    event.returnValue = "";
  };
  private visibilityChange = () => { if (document.hidden && this.dirty) void this.save(); };
  private retryOnline = () => { if (this.state.kind === "error" && this.dirty) void this.save(); };

  async save(): Promise<boolean> {
    if (this.disposed) return false;
    clearTimeout(this.timer);
    const next = this.snapshot();
    if (!this.writing && next.fingerprint === this.saved) {
      this.publish("saved", "Salvo no LAB");
      return true;
    }
    this.queued = next;
    if (this.writing) return this.writing;
    this.writing = this.drain();
    try { return await this.writing; }
    finally { this.writing = null; }
  }

  private async drain(): Promise<boolean> {
    while (this.queued && !this.disposed) {
      const next = this.queued;
      this.queued = null;
      if (next.fingerprint === this.saved) continue;
      this.publish("saving", "Salvando…");
      try {
        const updated = await this.repo.saveFile(this.id, next.document, this.info.updated_at);
        if (this.disposed) return false;
        this.info = updated;
        this.saved = next.fingerprint;
        renderDocumentThumbnail(next.document).then(async (thumb) => {
          if (thumb && !this.disposed) {
            this.info = { ...this.info, thumbnail: thumb };
            const updatedInfo = await this.repo.saveThumbnail?.(this.id, thumb);
            if (updatedInfo && !this.disposed) {
              this.info = updatedInfo;
            }
          }
        }).catch(() => {});
      } catch (error) {
        this.queued = null;
        this.publish(error instanceof PranchetaConflictError ? "conflict" : "error",
          error instanceof Error ? error.message : "Não foi possível salvar. Seu trabalho continua aberto.");
        return false;
      }
    }
    if (this.disposed) return false;
    this.publish(this.dirty ? "dirty" : "saved", this.dirty ? "Alterações por salvar" : "Salvo no LAB");
    return true;
  }

  async forceSave(): Promise<boolean> {
    if (this.disposed) return false;
    this.publish("saving", "Salvando…");
    try {
      const latest = await this.repo.getFile(this.id);
      this.info = latest;
      const next = this.snapshot();
      const updated = await this.repo.saveFile(this.id, next.document, latest.updated_at);
      if (this.disposed) return false;
      this.info = updated;
      this.saved = next.fingerprint;
      this.publish("saved", "Salvo no LAB");
      return true;
    } catch (e) {
      this.publish("error", e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    }
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.queued = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    window.removeEventListener("beforeunload", this.beforeUnload);
    document.removeEventListener("visibilitychange", this.visibilityChange);
    window.removeEventListener("online", this.retryOnline);
    this.listeners.clear();
  }
}
