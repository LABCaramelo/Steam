/** A release only invalidates a tool; ownership is always checked again on the server. */
export interface ToolReleaseNotice {
  userId: string;
  slug: string;
  appid: number;
}

const RELEASE_EVENT = "lab:tool-release";
const RELEASE_STORAGE_KEY = "lab:tool-release:signal";
const RELEASE_CHANNEL = "lab:tool-release";
interface ReleaseEnvelope { id: string; notice: ToolReleaseNotice }

function validNotice(value: unknown): value is ToolReleaseNotice {
  if (!value || typeof value !== "object") return false;
  const notice = value as Partial<ToolReleaseNotice>;
  return typeof notice.userId === "string" && notice.userId.length > 0 && notice.userId.length <= 200
    && typeof notice.slug === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(notice.slug)
    && Number.isSafeInteger(notice.appid) && notice.appid! > 0;
}

function validEnvelope(value: unknown): value is ReleaseEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<ReleaseEnvelope>;
  return typeof envelope.id === "string" && envelope.id.length > 0 && envelope.id.length <= 160 && validNotice(envelope.notice);
}

/** New tool caches are account-scoped. Never fall back to unowned legacy browser caches. */
export function toolStorageKey(userId: string, slug: string, part = "state"): string {
  return `lab:tool:${encodeURIComponent(slug)}:${encodeURIComponent(userId)}:${encodeURIComponent(part)}`;
}

export function toolAttachmentDatabaseName(userId: string): string {
  return toolStorageKey(userId, "comunidade", "attachments");
}

/** Same window, sibling frames, and other tabs all receive the same deduplicated notice. */
export function publishToolRelease(notice: ToolReleaseNotice): void {
  if (!validNotice(notice) || typeof window === "undefined") return;
  const envelope: ReleaseEnvelope = { id: crypto.randomUUID(), notice: { ...notice } };
  window.dispatchEvent(new CustomEvent(RELEASE_EVENT, { detail: envelope }));
  try { localStorage.setItem(RELEASE_STORAGE_KEY, JSON.stringify(envelope)); } catch { /* BroadcastChannel still works when storage is blocked. */ }
  try {
    const channel = new BroadcastChannel(RELEASE_CHANNEL);
    channel.postMessage(envelope);
    channel.close();
  } catch { /* Older/restricted browsers still receive the local or storage event. */ }
}

export function subscribeToolReleases(listener: (notice: ToolReleaseNotice) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const seen = new Set<string>();
  const receive = (value: unknown) => {
    if (!validEnvelope(value) || seen.has(value.id)) return;
    seen.add(value.id);
    if (seen.size > 100) seen.delete(seen.values().next().value!);
    listener({ ...value.notice });
  };
  const onCustom = (event: Event) => receive((event as CustomEvent<unknown>).detail);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== RELEASE_STORAGE_KEY || !event.newValue) return;
    try { receive(JSON.parse(event.newValue)); } catch { /* Ignore malformed browser data. */ }
  };
  const onMessage = (event: MessageEvent<unknown>) => receive(event.data);
  window.addEventListener(RELEASE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  let channel: BroadcastChannel | undefined;
  try { channel = new BroadcastChannel(RELEASE_CHANNEL); channel.addEventListener("message", onMessage); } catch { /* Storage is the fallback. */ }
  return () => {
    window.removeEventListener(RELEASE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
    channel?.removeEventListener("message", onMessage);
    channel?.close();
  };
}

/** Clears attributable caches only. Legacy global keys may contain another person's data. */
export async function clearToolLocalData(notice: ToolReleaseNotice): Promise<void> {
  if (!validNotice(notice)) return;
  const prefix = toolStorageKey(notice.userId, notice.slug, "");
  for (const kind of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[kind];
      for (const key of Object.keys(storage)) if (key.startsWith(prefix)) storage.removeItem(key);
      if (notice.slug === "kanban") storage.removeItem(`lab:kanban:board:${notice.userId}`);
      if (notice.slug === "creative-os") storage.removeItem(`lab:creative-os:workspace:${notice.userId}`);
    } catch { /* Local restrictions must not undo a successful server-side release. */ }
  }
  if ((notice.slug === "comunidade" || notice.slug === "montagem") && typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve) => {
      try {
        const deletion = indexedDB.deleteDatabase(notice.slug === "montagem" ? toolStorageKey(notice.userId, "montagem", "projects") : toolAttachmentDatabaseName(notice.userId));
        deletion.onsuccess = () => resolve();
        deletion.onerror = () => resolve();
        // Other tabs close their scoped connections on versionchange. A blocked deletion
        // stays queued in the browser; do not prevent the successful server release.
        deletion.onblocked = () => resolve();
      } catch { resolve(); }
    });
  }
}
