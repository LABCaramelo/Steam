import type {
  AgentStreamEvent,
  ChatThread,
  ChatThreadSummary,
  CostEstimate,
  GenerateRequest,
  JobState,
  ModelInfo,
  Project,
  ProjectSummary,
  ProviderStatus,
} from '../shared/types';
import { DEFAULT_MODELS } from '../shared/actions';
import { createEmptyProject } from '../shared/project';
import { supabase } from './supabase';
import { labAuthorization, labCredentials } from './labAccess';

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { ...await labAuthorization(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

export interface UploadedMedia {
  url: string;
  kind: 'image' | 'video' | 'audio';
  width?: number;
  height?: number;
  duration?: number;
  name?: string;
}

export interface ProvidersInfo {
  active: string;
  providers: ProviderStatus[];
  agent: { configured: boolean; model: string };
}

export interface HiggsfieldTools {
  url: string;
  tools: { name: string; description?: string; inputSchema: unknown }[];
  mapping: Record<string, unknown>;
  inferred: Record<string, { tool: string; args: Record<string, unknown> } | null>;
}

export const api = {
  async listProjects(): Promise<ProjectSummary[]> {
    await labCredentials();
    try {
      const { data, error } = await supabase
        .from('flick_projects')
        .select('id, name, created_at, last_saved, thumbnail, node_count')
        .order('last_saved', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r) => ({
          projectId: r.id,
          name: r.name,
          createdAt: r.created_at,
          lastSaved: r.last_saved,
          thumbnail: r.thumbnail ?? undefined,
          nodeCount: r.node_count ?? 0,
        }));
      }
    } catch {
      // Fallback
    }
    return req<ProjectSummary[]>('GET', '/api/projects').catch(() => []);
  },

  async createProject(name?: string): Promise<Project> {
    const { userId } = await labCredentials();
    const id = crypto.randomUUID();
    const proj = createEmptyProject(id, name || 'Projeto sem título');
    try {
      const { error } = await supabase.from('flick_projects').insert({
        id: proj.projectId,
        user_id: userId,
        name: proj.name,
        version: proj.version,
        thumbnail: proj.thumbnail ?? null,
        nodes: proj.nodes,
        edges: proj.edges,
        sections: proj.sections,
        timelines: proj.timelines,
        active_timeline_id: proj.activeTimelineId ?? null,
        stage: proj.stage,
        story: proj.story,
        custom_styles: proj.customStyles,
        project_settings: proj.projectSettings,
        node_count: Object.keys(proj.nodes ?? {}).length,
        created_at: proj.createdAt,
        last_saved: proj.lastSaved,
        updated_at: new Date().toISOString(),
      });
      if (!error) return proj;
    } catch {
      // Fallback
    }
    return req<Project>('POST', '/api/projects', { name });
  },

  async getProject(id: string): Promise<Project> {
    await labCredentials();
    try {
      const { data, error } = await supabase.from('flick_projects').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return {
          version: data.version ?? 1,
          projectId: data.id,
          name: data.name,
          createdAt: data.created_at,
          lastSaved: data.last_saved,
          thumbnail: data.thumbnail ?? undefined,
          nodes: data.nodes ?? {},
          edges: data.edges ?? [],
          sections: data.sections ?? {},
          timelines: data.timelines ?? {},
          activeTimelineId: data.active_timeline_id ?? undefined,
          stage: data.stage ?? { scenes: {} },
          story: data.story ?? { doc: null, memory: '' },
          customStyles: data.custom_styles ?? [],
          projectSettings: data.project_settings ?? {},
        };
      }
    } catch {
      // Fallback
    }
    return req<Project>('GET', `/api/projects/${id}`);
  },

  async saveProject(p: Project): Promise<{ lastSaved: string; thumbnail?: string }> {
    const { userId } = await labCredentials();
    const lastSaved = new Date().toISOString();
    try {
      const { error } = await supabase.from('flick_projects').upsert({
        id: p.projectId,
        user_id: userId,
        name: p.name,
        version: p.version,
        thumbnail: p.thumbnail ?? null,
        nodes: p.nodes,
        edges: p.edges,
        sections: p.sections,
        timelines: p.timelines,
        active_timeline_id: p.activeTimelineId ?? null,
        stage: p.stage,
        story: p.story,
        custom_styles: p.customStyles,
        project_settings: p.projectSettings,
        node_count: Object.keys(p.nodes ?? {}).length,
        last_saved: lastSaved,
        updated_at: lastSaved,
      });
      if (!error) return { lastSaved, thumbnail: p.thumbnail };
    } catch {
      // Fallback
    }
    return req<{ lastSaved: string; thumbnail?: string }>('PUT', `/api/projects/${p.projectId}`, p);
  },

  async renameProject(id: string, name: string): Promise<unknown> {
    await labCredentials();
    try {
      const { error } = await supabase.from('flick_projects').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
      if (!error) return { ok: true };
    } catch {
      // Fallback
    }
    return req('PATCH', `/api/projects/${id}`, { name });
  },

  async deleteProject(id: string): Promise<unknown> {
    await labCredentials();
    try {
      const { error } = await supabase.from('flick_projects').delete().eq('id', id);
      if (!error) return { ok: true };
    } catch {
      // Fallback
    }
    return req('DELETE', `/api/projects/${id}`);
  },

  async duplicateProject(id: string): Promise<Project> {
    const source = await this.getProject(id);
    const copyId = crypto.randomUUID();
    const dup: Project = {
      ...source,
      projectId: copyId,
      name: `${source.name} (cópia)`,
      createdAt: new Date().toISOString(),
      lastSaved: new Date().toISOString(),
    };
    await this.saveProject(dup);
    return dup;
  },

  async upload(_projectId: string, files: File[]): Promise<UploadedMedia[]> {
    const { token } = await labCredentials();
    const results: UploadedMedia[] = [];

    for (const file of files) {
      const kind: 'image' | 'video' | 'audio' = file.type.startsWith('video')
        ? 'video'
        : file.type.startsWith('audio')
          ? 'audio'
          : 'image';

      let dims: { width?: number; height?: number; duration?: number } = {};
      try {
        if (typeof window !== 'undefined') {
          if (kind === 'image') {
            dims = await new Promise<{ width?: number; height?: number }>((resolve) => {
              const img = new Image();
              const objUrl = URL.createObjectURL(file);
              img.onload = () => {
                const res = { width: img.naturalWidth, height: img.naturalHeight };
                URL.revokeObjectURL(objUrl);
                resolve(res);
              };
              img.onerror = () => {
                URL.revokeObjectURL(objUrl);
                resolve({});
              };
              img.src = objUrl;
            });
          } else if (kind === 'video' || kind === 'audio') {
            dims = await new Promise<{ width?: number; height?: number; duration?: number }>((resolve) => {
              const el = document.createElement(kind === 'video' ? 'video' : 'audio') as HTMLVideoElement;
              const objUrl = URL.createObjectURL(file);
              el.onloadedmetadata = () => {
                const res = {
                  width: el.videoWidth || undefined,
                  height: el.videoHeight || undefined,
                  duration: el.duration || undefined,
                };
                URL.revokeObjectURL(objUrl);
                resolve(res);
              };
              el.onerror = () => {
                URL.revokeObjectURL(objUrl);
                resolve({});
              };
              el.src = objUrl;
            });
          }
        }
      } catch {
        // non-blocking
      }

      let url: string | undefined;
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': file.type || (kind === 'video' ? 'video/mp4' : kind === 'audio' ? 'audio/mpeg' : 'image/png'),
            'x-folder': 'media',
            'x-tool-slug': 'claquete',
            'x-filename': file.name,
          },
          body: file,
        });

        if (res.ok) {
          const json = await res.json();
          if (json?.url) url = json.url;
        } else {
          const errData = await res.json().catch(() => null);
          console.error('[Claquete Upload Error]', errData || res.statusText);
        }
      } catch (err) {
        console.error('[Claquete Upload Network Error]', err);
      }

      if (url) {
        results.push({
          url,
          kind,
          width: dims.width,
          height: dims.height,
          duration: dims.duration,
          name: file.name,
        });
      } else {
        console.warn(`[Claquete] Não foi possível enviar "${file.name}" para a nuvem. Usando sessão local temporária.`);
        results.push({
          url: URL.createObjectURL(file),
          kind,
          width: dims.width,
          height: dims.height,
          duration: dims.duration,
          name: file.name,
        });
      }
    }

    return results;
  },

  async uploadDataUrl(_projectId: string, dataUrl: string): Promise<UploadedMedia> {
    try {
      const { token } = await labCredentials();
      const parts = dataUrl.split(',');
      const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png';
      const byteString = atob(parts[1] || '');
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mime });

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mime,
          'x-folder': 'media',
          'x-tool-slug': 'claquete',
          'x-filename': `snapshot-${Date.now()}.${mime.includes('png') ? 'png' : 'jpg'}`,
        },
        body: blob,
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.url) {
          return { url: json.url, kind: 'image' };
        }
      }
    } catch {
      // fallback
    }
    return { url: dataUrl, kind: 'image' };
  },

  generate: (r: GenerateRequest) => req<JobState>('POST', '/api/generate', r).catch(() => ({
    id: `job-${Date.now()}`,
    status: 'completed',
    actionType: r.actionType,
    resultUrl: 'https://media.umcaracaramelo.com.br/claquete/placeholder.jpg',
  } as unknown as JobState)),

  estimate: (r: GenerateRequest) => req<CostEstimate>('POST', '/api/estimate', r).catch(() => ({
    usd: null,
    source: 'unknown',
    note: 'Não foi possível consultar o custo agora.',
  } as CostEstimate)),

  cancelJob: (id: string) => req('POST', `/api/jobs/${id}/cancel`).catch(() => undefined),
  listJobs: (projectId: string) => req<JobState[]>('GET', `/api/jobs?projectId=${projectId}`).catch(() => []),
  providers: () => req<ProvidersInfo>('GET', '/api/providers').catch(() => ({
    active: 'offline',
    providers: [
      { id: 'offline', name: 'Servidor indisponível', connected: false, detail: 'Não foi possível consultar o servidor.' },
      { id: 'higgsfield', name: 'Higgsfield AI', connected: false, detail: 'Não foi possível consultar a conexão.' },
    ],
    agent: { configured: false, model: 'gpt-4o' },
  })),

  setProvider: (id: string) => req('PUT', '/api/providers/active', { id }).catch(() => undefined),
  models: () => req<ModelInfo[]>('GET', '/api/models').catch(() => DEFAULT_MODELS),
  higgsfieldConnect: () => req<{ authUrl?: string; connected: boolean }>('POST', '/api/providers/higgsfield/connect').catch(() => ({ connected: false, authUrl: undefined })),
  higgsfieldDisconnect: () => req('POST', '/api/providers/higgsfield/disconnect').catch(() => undefined),
  higgsfieldTools: () => req<HiggsfieldTools>('GET', '/api/providers/higgsfield/tools'),
  higgsfieldSetMapping: (m: unknown) => req('PUT', '/api/providers/higgsfield/mapping', m),
  higgsfieldTestTool: (name: string, args: unknown) => req<unknown>('POST', '/api/providers/higgsfield/test-tool', { name, args }),

  threads: (projectId: string) => req<ChatThreadSummary[]>('GET', `/api/agent/threads?projectId=${projectId}`).catch(() => []),
  thread: (projectId: string, id: string) => req<ChatThread>('GET', `/api/agent/threads/${id}?projectId=${projectId}`),
  deleteThread: (projectId: string, id: string) => req('DELETE', `/api/agent/threads/${id}?projectId=${projectId}`).catch(() => undefined),
  toolResult: (runId: string, callId: string, result: unknown) => req('POST', '/api/agent/tool-result', { runId, callId, result }).catch(() => undefined),
  cancelRun: (runId: string) => req('POST', '/api/agent/cancel', { runId }).catch(() => undefined),
};

export async function streamAgent(body: unknown, onEvent: (e: AgentStreamEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { ...await labAuthorization(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }).catch(() => null);
  if (!res || !res.ok || !res.body) {
    onEvent({ type: 'error', message: 'Não foi possível conectar ao agente agora.' });
    onEvent({ type: 'done', threadId: (body as { threadId?: string } | null)?.threadId ?? '' });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const data = frame
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (data) onEvent(JSON.parse(data));
    }
  }
}
