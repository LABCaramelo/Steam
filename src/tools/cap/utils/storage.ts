import type { TakeRecord } from "../types";

const DB_NAME = "cap_lab_storage";
const DB_VERSION = 1;
const STORE_NAME = "takes";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTake(take: TakeRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    // Ensure we don't save ephemeral object URLs that expire on reload
    const copy = { ...take, videoUrl: "" };
    store.put(copy);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllTakes(): Promise<TakeRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const records: TakeRecord[] = request.result || [];
      // Re-hydrate videoUrl from Blob if present
      const hydrated = records.map((rec) => {
        if (rec.blob) {
          rec.videoUrl = URL.createObjectURL(rec.blob);
        }
        return rec;
      });
      // Sort newest first
      hydrated.sort((a, b) => b.createdAt - a.createdAt);
      resolve(hydrated);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTake(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateTake(id: string, patch: Partial<TakeRecord>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (!getReq.result) {
        resolve();
        return;
      }
      const updated = { ...getReq.result, ...patch, videoUrl: "" };
      store.put(updated);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
