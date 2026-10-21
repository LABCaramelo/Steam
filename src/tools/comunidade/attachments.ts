import { useEffect, useState } from 'react';
import type { Attachment } from './types';
import { subscribeToolReleases, toolAttachmentDatabaseName } from '../../toolLifecycle';

/*
 * Os arquivos enviados no chat ficam no IndexedDB, porque o localStorage (onde o resto do
 * app é salvo) só comporta alguns MB. A mensagem guarda apenas os dados do arquivo.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;

/**
 * Tipos que o navegador pode exibir sem risco. Qualquer outro arquivo vira download
 * (application/octet-stream): um HTML ou SVG aberto pelo link rodaria com acesso ao app.
 */
const INLINE_TYPES = /^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm)|audio\/(mpeg|ogg|wav|webm|mp4))$/;

export function safeType(type: string) {
  return INLINE_TYPES.test(type) ? type : 'application/octet-stream';
}

export const isImage = (a: Pick<Attachment, 'type'>) => a.type.startsWith('image/');
export const isVideo = (a: Pick<Attachment, 'type'>) => a.type.startsWith('video/');

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ---------------------------------------------------------------- IndexedDB */

const STORE = 'anexos';
interface AttachmentScope {
  userId: string;
  active: boolean;
  memory: Map<string, Blob>;
  database: Promise<IDBDatabase | null> | null;
  transactions: Set<IDBTransaction>;
}
let owner: AttachmentScope | null = null;

function closeScope(scope: AttachmentScope | null) {
  if (!scope) return;
  scope.active = false;
  scope.memory.clear();
  for (const transaction of scope.transactions) { try { transaction.abort(); } catch { /* Already completed. */ } }
  scope.transactions.clear();
  void scope.database?.then((database) => database?.close());
  if (owner === scope) owner = null;
}

export function closeAttachmentOwner() { closeScope(owner); }

/** The mounted account owns every attachment request, including ones still in flight. */
export function activateAttachmentOwner(userId?: string): () => void {
  closeScope(owner);
  const scope: AttachmentScope | null = userId ? { userId, active: true, memory: new Map(), database: null, transactions: new Set() } : null;
  const stop = () => closeScope(scope);
  owner = scope;
  const unsubscribe = subscribeToolReleases((notice) => {
    if (notice.userId === userId && notice.slug === 'comunidade') stop();
  });
  return () => { unsubscribe(); stop(); };
}

function openDb(scope: AttachmentScope) {
  scope.database ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(toolAttachmentDatabaseName(scope.userId), 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        const database = req.result;
        database.onversionchange = () => database.close();
        if (!scope.active) { database.close(); resolve(null); }
        else resolve(database);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return scope.database;
}

function request<T>(scope: AttachmentScope | null, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  if (!scope?.active) return Promise.resolve(undefined);
  return openDb(scope).then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db || !scope.active) return resolve(undefined);
        try {
          const transaction = db.transaction(STORE, mode);
          scope.transactions.add(transaction);
          transaction.oncomplete = () => scope.transactions.delete(transaction);
          transaction.onabort = () => { scope.transactions.delete(transaction); resolve(undefined); };
          const req = run(transaction.objectStore(STORE));
          req.onsuccess = () => resolve(scope.active ? req.result : undefined);
          req.onerror = () => resolve(undefined);
        } catch { resolve(undefined); }
      }),
  );
}

/** Capture before asynchronous decoding so a later sign-in cannot receive old writes. */
export function captureAttachmentSession() {
  const scope = owner;
  return {
    async save(id: string, blob: Blob) {
      if (!scope?.active) return;
      scope.memory.set(id, blob);
      await request(scope, 'readwrite', (s) => s.put(blob, id));
    },
    async load(id: string): Promise<Blob | undefined> {
      if (!scope?.active) return undefined;
      return scope.memory.get(id) ?? (await request<Blob>(scope, 'readonly', (s) => s.get(id)));
    },
  };
}

export const saveBlob = (id: string, blob: Blob) => captureAttachmentSession().save(id, blob);
export const loadBlob = (id: string) => captureAttachmentSession().load(id);

export function deleteBlobs(attachments: Attachment[] = []) {
  const scope = owner;
  if (!scope?.active) return;
  for (const a of attachments) {
    scope.memory.delete(a.id);
    void request(scope, 'readwrite', (s) => s.delete(a.id));
  }
}

/** URL temporária para mostrar um anexo; undefined enquanto carrega, null se não existe. */
export function useAttachmentUrl(id: string) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void loadBlob(id).then((blob) => {
      if (cancelled) return;
      objectUrl = blob ? URL.createObjectURL(blob) : null;
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}

/* ---------------------------------------------------------------- envio */

/** Fotos grandes são reduzidas (como o celular faz ao compartilhar); GIFs ficam como estão. */
const RESIZABLE = /^image\/(png|jpeg|webp)$/;
const MAX_IMAGE_SIDE = 2560;
const RESIZE_ABOVE_BYTES = 1.5 * 1024 * 1024;

async function prepare(file: File): Promise<{ blob: Blob; width?: number; height?: number }> {
  const type = safeType(file.type);
  if (!type.startsWith('image/')) return { blob: new Blob([file], { type }) };
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
    if (!RESIZABLE.test(type) || (scale === 1 && file.size <= RESIZE_ABOVE_BYTES)) {
      bitmap.close();
      return { blob: new Blob([file], { type }), width, height };
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85));
    return blob && blob.size < file.size
      ? { blob, width: canvas.width, height: canvas.height }
      : { blob: new Blob([file], { type }), width, height };
  } catch {
    return { blob: new Blob([file], { type }) };
  }
}

/** Erro de validação a mostrar na caixa de mensagem, ou null se os arquivos podem ir. */
export function checkFiles(files: File[]) {
  if (files.length > MAX_FILES) return `Dá para enviar até ${MAX_FILES} arquivos por mensagem.`;
  const big = files.find((f) => f.size > MAX_FILE_BYTES);
  if (big) return `"${big.name}" passa de ${formatBytes(MAX_FILE_BYTES)}.`;
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_MESSAGE_BYTES) {
    return `Os arquivos juntos passam de ${formatBytes(MAX_MESSAGE_BYTES)}.`;
  }
  return null;
}

/** Guarda os arquivos e devolve os anexos para a mensagem. */
export async function storeFiles(files: File[]): Promise<Attachment[]> {
  const session = captureAttachmentSession();
  return Promise.all(
    files.map(async (file) => {
      const { blob, width, height } = await prepare(file);
      const id = crypto.randomUUID();
      await session.save(id, blob);
      return { id, name: file.name.slice(0, 128) || 'arquivo', type: blob.type, size: blob.size, width, height };
    }),
  );
}

/* ---------------------------------------------------------------- rede */

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string, type: string) {
  // Só data: URLs; um endereço http aqui faria o navegador buscar algo na rede.
  if (!/^data:[\w.+-]*\/?[\w.+-]*;base64,/.test(dataUrl)) throw new Error('anexo inválido');
  const blob = await (await fetch(dataUrl)).blob();
  return new Blob([blob], { type: safeType(type) });
}
