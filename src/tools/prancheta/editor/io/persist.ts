import { pickFiles } from '../actions';
import { TYPE_LABELS, createEmptyDocument, createNode, createPage } from '../model/defaults';
import { imageIdsOf } from '../model/document';
import type { DocumentData, NodeType, SceneNode } from '../model/types';
import { store } from '../store/store';
import { downloadBlob, safeFileName } from './export';

const NODE_TYPES = Object.keys(TYPE_LABELS) as NodeType[];

export interface EditorPersistence {
  save(): Promise<boolean>;
  create(): void;
  import(document: DocumentData): Promise<void>;
}
let host: EditorPersistence | null = null;
export function bindPersistence(next: EditorPersistence): () => void {
  host = next;
  return () => { if (host === next) host = null; };
}
/**
 * Valida e completa um documento vindo de fora (arquivo ou banco). Campos
 * ausentes recebem os valores padrão; referências quebradas são removidas.
 */
export function normalizeDocument(raw: unknown): DocumentData {
  const r = raw as Partial<DocumentData> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.pages) || typeof r.nodes !== 'object' || !r.nodes)
    throw new Error('Arquivo inválido');
  const doc: DocumentData = createEmptyDocument(typeof r.name === 'string' ? r.name : 'Sem título');
  doc.images = r.images && typeof r.images === 'object' ? { ...r.images } : {};
  const nodes: Record<string, SceneNode> = {};
  for (const [id, n] of Object.entries(r.nodes as Record<string, Partial<SceneNode>>)) {
    if (!n || !NODE_TYPES.includes(n.type as NodeType)) continue;
    const node = createNode(n.type as NodeType, { ...n, id });
    for (const k of ['fills', 'strokes', 'effects'] as const) if (!Array.isArray(node[k])) node[k] = [];
    for (const k of ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'strokeWeight', 'cornerRadius'] as const)
      if (typeof node[k] !== 'number' || !isFinite(node[k])) node[k] = k === 'opacity' ? 1 : 0;
    nodes[id] = node;
  }
  doc.nodes = nodes;
  doc.pages = r.pages
    .filter((p) => p && typeof p.id === 'string')
    .map((p) => ({ ...createPage(String(p.name ?? 'Página')), id: p.id, children: [...(p.children ?? [])], background: p.background ?? null }));
  if (!doc.pages.length) doc.pages = [createPage('Página 1')];
  // reconstrói a hierarquia a partir das listas de filhos
  const seen = new Set<string>();
  const adopt = (ids: string[], parentId: string): string[] =>
    ids.filter((id) => {
      const n = nodes[id];
      if (!n || seen.has(id)) return false;
      seen.add(id);
      n.parentId = parentId;
      if (n.children) n.children = adopt(n.children, id);
      else if (['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'BOOLEAN_OPERATION'].includes(n.type)) n.children = [];
      return true;
    });
  for (const p of doc.pages) p.children = adopt(p.children, p.id);
  for (const id of Object.keys(nodes)) if (!seen.has(id)) delete nodes[id];
  for (const n of Object.values(nodes))
    for (const p of [...n.fills, ...n.strokes]) if (p.type === 'IMAGE' && !doc.images[p.imageId]) p.visible = false;
  return doc;
}

/** Cópia do documento só com as imagens realmente usadas. */
export function compactDocument(doc: DocumentData): DocumentData {
  const used = new Set(imageIdsOf(doc, Object.keys(doc.nodes)));
  const images: Record<string, string> = {};
  for (const id of used) if (doc.images[id]) images[id] = doc.images[id];
  return { version: 1, name: doc.name, pages: doc.pages, nodes: doc.nodes, images };
}

export async function saveNow() {
  return host ? host.save() : false;
}

export async function saveToBrowser() {
  if (await saveNow()) store.toast('Salvo no seu banco da Prancheta no LAB');
}

export function saveLocalCopy() {
  const doc = store.state.doc;
  const json = JSON.stringify(compactDocument(doc));
  downloadBlob(new Blob([json], { type: 'application/json' }), `${safeFileName(doc.name)}.prancheta.json`);
}

export async function openDocumentFile(file: File) {
  try {
    const doc = normalizeDocument(JSON.parse(await file.text()));
    if (doc.name === 'Sem título') doc.name = file.name.replace(/\.prancheta\.json$|\.json$/i, '') || doc.name;
    if (!host) throw new Error('Abra sua biblioteca antes de importar.');
    await host.import(doc);
  } catch (error) {
    store.toast(error instanceof Error ? error.message : 'Não foi possível importar este arquivo');
  }
}

export async function openFileDialog() {
  const [file] = await pickFiles('.json,application/json', false);
  if (file) await openDocumentFile(file);
}

export function newFile() {
  host?.create();
}
