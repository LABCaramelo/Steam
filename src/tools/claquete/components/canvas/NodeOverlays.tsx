import { useEffect, useState } from 'react';
import {
  AudioLines,
  Copy,
  Download,
  Frame,
  Image as ImageIcon,
  Maximize2,
  MessageSquarePlus,
  Palette,
  Star,
  Trash2,
  Video,
} from 'lucide-react';
import { nodeSize, nodeTitle, uid } from '../../shared/project';
import type { MediaNode } from '../../shared/types';
import { useProject } from '../../store/project';
import { toast, useUi } from '../../store/ui';
import { createDownstream, createSection, deleteNodes, duplicateNodes } from '../../lib/canvasOps';
import { GeneratorPanel } from './GeneratorPanel';

/** Screen-space UI attached to the current selection. */
export function NodeOverlays() {
  const selection = useProject((s) => s.selection);
  const viewport = useProject((s) => s.viewport);
  const node = useProject((s) => (s.selection.length === 1 ? s.project?.nodes[s.selection[0]] : undefined));
  const aspect = useProject((s) => s.project?.projectSettings.aspectRatio ?? '16:9');
  const editingText = useProject((s) => s.editingTextId);
  
  if (selection.length > 1) return <MultiToolbar ids={selection} />;
  if (!node || editingText === node.id) return null;

  const size = nodeSize(node, aspect);
  const left = node.position.x * viewport.zoom + viewport.x;
  const top = node.position.y * viewport.zoom + viewport.y;
  const w = size.width * viewport.zoom;
  const h = size.height * viewport.zoom;
  const isMedia = node.type === 'image' || node.type === 'video' || node.type === 'audio';
  const media = isMedia ? (node as MediaNode) : undefined;
  const hasUrl = !!media?.data.url;
  const isGenerator = !!media?.data.generationSettings;

  // flip the side menu to the left of the node when it would leave the canvas
  const rootW = (document.querySelector('.canvas-root') as HTMLElement | null)?.clientWidth ?? window.innerWidth;
  const sideX = left + w + 10 + 180 > rootW ? left - 190 : left + w + 10;

  return (
    <>
      <NodeToolbar nodeId={node.id} x={left + w / 2} y={top - 26} />
      {(hasUrl || node.type === 'text') && <SideMenu nodeId={node.id} x={sideX} y={top}  />}
      {isGenerator && <GeneratorPanel nodeId={node.id} x={left + w / 2} y={top + h + 12} />}
    </>
  );
}

function NodeToolbar({ nodeId, x, y }: { nodeId: string; x: number; y: number }) {
  const node = useProject((s) => s.project?.nodes[nodeId]);
  const update = useProject((s) => s.update);
  const [title, setTitle] = useState(node ? nodeTitle(node) : '');
  useEffect(() => setTitle(node ? nodeTitle(node) : ''), [nodeId, node && nodeTitle(node)]);
  if (!node) return null;
  const media = node.type === 'image' || node.type === 'video' || node.type === 'audio' ? (node as MediaNode) : undefined;

  const commitTitle = () => {
    if (title !== nodeTitle(node))
      update((d) => {
        (d.nodes[nodeId].data as { user_input_title?: string }).user_input_title = title;
      });
  };

  return (
    <div className="node-toolbar" style={{ left: x, top: y }} onPointerDown={(e) => e.stopPropagation()}>
      
          </div>
  );
}

function MultiToolbar({ ids }: { ids: string[] }) {
  const project = useProject((s) => s.project);
  const viewport = useProject((s) => s.viewport);
  if (!project) return null;
  const nodes = ids.map((id) => project.nodes[id]).filter(Boolean);
  if (!nodes.length) return null;
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const right = Math.max(...nodes.map((n) => n.position.x + nodeSize(n, project.projectSettings.aspectRatio).width));
  const x = ((Math.min(...xs) + right) / 2) * viewport.zoom + viewport.x;
  const y = Math.min(...ys) * viewport.zoom + viewport.y - 26;
  return (
    <div className="node-toolbar" style={{ left: x, top: y }} onPointerDown={(e) => e.stopPropagation()}>
      <span className="muted" style={{ fontSize: 12, padding: '0 8px' }}>
        {ids.length} selecionados
      </span>
      <button className="icon-btn" title="Agrupar em seção (S)" onClick={() => createSection(undefined, ids)}>
        <Frame size={13} />
      </button>
            <button className="icon-btn" title="Anexar ao chat" onClick={() => attachToChat(ids)}>
        <MessageSquarePlus size={13} />
      </button>
      <button className="icon-btn" title="Duplicar" onClick={() => duplicateNodes(ids)}>
        <Copy size={13} />
      </button>
      <button className="icon-btn" title="Excluir" onClick={() => deleteNodes(ids)}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}
