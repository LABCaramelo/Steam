import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { JobState } from '../shared/types';
import { api } from '../lib/api';
import { labAuthorization, labCredentials } from '../lib/labAccess';
import type { MediaNode } from '../shared/types';
import { subscribeProjectEvents } from '../lib/projectEvents';
import { applyJob } from '../lib/generation';
import { useProject, type View } from '../store/project';
import { TopBar } from '../components/TopBar';
import { Canvas } from '../components/canvas/Canvas';
import { ChatPanel } from '../components/chat/ChatPanel';
import { FullscreenViewer } from '../components/canvas/FullscreenViewer';

const StoryView = lazy(() => import('../components/story/StoryView').then((m) => ({ default: m.StoryView })));
const StageView = lazy(() => import('../components/stage/StageView').then((m) => ({ default: m.StageView })));
const EditorView = lazy(() => import('../components/editor/EditorView').then((m) => ({ default: m.EditorView })));

const VIEWS: View[] = ['canvas', 'story', 'stage', 'editor'];

async function healProjectBlobUrls(p: import('../shared/types').Project) {
  if (!p?.nodes) return;
  const nodes = { ...p.nodes };
  let modified = false;

  for (const [_id, node] of Object.entries(nodes)) {
    if (node.type === 'image' || node.type === 'video' || node.type === 'audio') {
      const mediaNode = node as MediaNode;
      const url = mediaNode.data?.url;
      if (url && url.startsWith('blob:')) {
        try {
          const res = await fetch(url).catch(() => null);
          if (res && res.ok) {
            const blob = await res.blob();
            const { token } = await labCredentials();
            const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': blob.type || 'image/png',
                'x-folder': 'media',
                'x-tool-slug': 'claquete',
                'x-filename': `${mediaNode.data.user_input_title || 'recovered-image'}.${ext}`,
              },
              body: blob,
            });

            if (uploadRes.ok) {
              const json = await uploadRes.json();
              if (json?.url) {
                mediaNode.data.url = json.url;
                if (Array.isArray(mediaNode.data.versions)) {
                  mediaNode.data.versions.forEach((v) => {
                    if (v.url?.startsWith('blob:')) v.url = json.url;
                  });
                }
                modified = true;
              }
            }
          }
        } catch {
          // ignora se blob não puder ser lido nesta sessão
        }
      }
    }
  }

  if (modified) {
    useProject.getState().update((d) => {
      d.nodes = nodes;
    });
    const current = useProject.getState().project;
    if (current) {
      await api.saveProject(current).catch(() => undefined);
    }
  }
}

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const view = (VIEWS.includes(params.get('view') as View) ? params.get('view') : 'canvas') as View;
  const loaded = useProject((s) => s.project?.projectId === projectId);
  const [error, setError] = useState<string | null>(null);

  // ---------- load ----------
  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .getProject(projectId)
      .then((p) => {
        if (!alive) return;
        useProject.getState().setProject(p);
        document.title = `${p.name} — Claquete`;
        void healProjectBlobUrls(p);
      })
      .catch((e) => alive && setError(String(e.message)));
    return () => {
      alive = false;
      useProject.getState().setProject(null);
      document.title = 'Claquete — cinema com IA';
    };
  }, [projectId]);

  // ---------- autosave ----------
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saving = useRef(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      const st = useProject.getState();
      if (!st.project) return;
      if (saving.current) {
        pending.current = true;
        return;
      }
      saving.current = true;
      st.setSaveState('saving');
      try {
        await api.saveProject(st.project);
        useProject.getState().setSaveState('saved');
      } catch {
        useProject.getState().setSaveState('error');
      } finally {
        saving.current = false;
        if (pending.current) {
          pending.current = false;
          save();
        }
      }
    };
    const unsub = useProject.subscribe((s, prev) => {
      if (s.revision !== prev.revision && s.project) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveTimer.current = undefined;
          save();
        }, 700);
      }
    });
    // best effort: a pending debounced save is sent with keepalive (body limit ~64KB)
    const flush = () => {
      const p = useProject.getState().project;
      if (!p || !saveTimer.current) return;
      const body = JSON.stringify(p);
      if (body.length < 60_000) void labAuthorization().then((auth) => fetch(`/api/projects/${p.projectId}`, { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body, keepalive: true })).catch(() => {});
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      unsub();
      window.removeEventListener('beforeunload', flush);
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        save();
      }
    };
  }, [loaded]);

  // ---------- server events ----------
  useEffect(() => {
    if (!loaded) return;
    const close = subscribeProjectEvents(projectId, (event, data) => {
      if (event === 'job') applyJob(data as JobState);
      // Reconcile after (re)connect so no finished job is missed.
      if (event === 'hello') void api.listJobs(projectId).then((jobs) => jobs.forEach(applyJob)).catch(() => undefined);
    });
    return close;
  }, [loaded, projectId]);

  if (error)
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div>
          <p>Não foi possível abrir o projeto: {error}</p>
          <button className="btn" onClick={() => nav('/projects')}>
            Voltar aos projetos
          </button>
        </div>
      </div>
    );

  if (!loaded)
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <span className="spinner" />
      </div>
    );

  return (
    <div className="app-shell">
      <TopBar view={view} />
      <div className="workspace">
        <div className="main-view">
          {view === 'canvas' && <Canvas />}
          <Suspense fallback={<div className="empty-state" style={{ height: '100%' }}><span className="spinner" /></div>}>
            {view === 'story' && <StoryView />}
            {view === 'stage' && <StageView />}
            {view === 'editor' && <EditorView />}
          </Suspense>
        </div>
        <ChatPanel view={view} />
      </div>
      <FullscreenViewer />
    </div>
  );
}
