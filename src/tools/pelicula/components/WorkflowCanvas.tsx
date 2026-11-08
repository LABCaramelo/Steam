import React, { useState } from "react";
import { WorkflowNode, WorkflowEdge } from "../types";
import { Cpu, Play, Plus, ArrowRight, Sparkles, Film, Image as ImageIcon, Music, CheckCircle2, RotateCcw } from "lucide-react";

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onUpdateWorkflow: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onExecutePipeline: (nodes: WorkflowNode[]) => Promise<void>;
  isExecuting: boolean;
  executingStep: number;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onUpdateWorkflow,
  onExecutePipeline,
  isExecuting,
  executingStep,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleApplyTemplate = (type: "action" | "carousel" | "reels") => {
    if (type === "action") {
      const newNodes: WorkflowNode[] = [
        { id: "n1", title: "Prompt Mestre", type: "prompt", x: 40, y: 100, data: { text: "Cena de perseguição de ação urbana em Belo Horizonte" } },
        { id: "n2", title: "Flux Dev (Keyframe)", type: "image", x: 300, y: 80, data: { model: "flux-dev", steps: 28 } },
        { id: "n3", title: "Veo 3 (Take de Ação)", type: "video", x: 580, y: 80, data: { model: "veo-3", duration: 5 } },
        { id: "n4", title: "Trilha Sonora (ACE-Step)", type: "audio", x: 580, y: 260, data: { style: "Cinematic Action Beats" } },
        { id: "n5", title: "Montagem NLE", type: "export", x: 860, y: 160, data: { dest: "montagem" } },
      ];
      const newEdges: WorkflowEdge[] = [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
        { id: "e3", from: "n1", to: "n4" },
        { id: "e4", from: "n3", to: "n5" },
        { id: "e5", from: "n4", to: "n5" },
      ];
      onUpdateWorkflow(newNodes, newEdges);
    } else if (type === "carousel") {
      const newNodes: WorkflowNode[] = [
        { id: "n1", title: "Capa do Carrossel HEAD", type: "prompt", x: 40, y: 120, data: { text: "Retrato autoral do Luiz para capa de carrossel no feed" } },
        { id: "n2", title: "Flux Schnell (Matriz)", type: "image", x: 320, y: 120, data: { model: "flux-schnell", ratio: "4:5" } },
        { id: "n3", title: "Amplia (Upscale 8K)", type: "upscale", x: 600, y: 120, data: { scale: 4, model: "realesrgan" } },
        { id: "n4", title: "Prancheta (Design)", type: "export", x: 880, y: 120, data: { dest: "prancheta" } },
      ];
      const newEdges: WorkflowEdge[] = [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
        { id: "e3", from: "n3", to: "n4" },
      ];
      onUpdateWorkflow(newNodes, newEdges);
    } else if (type === "reels") {
      const newNodes: WorkflowNode[] = [
        { id: "n1", title: "Roteiro de 30s", type: "prompt", x: 40, y: 140, data: { text: "Narrativa com confissão patética e virada estratégica" } },
        { id: "n2", title: "Wan 2.1 (Take Vertical)", type: "video", x: 320, y: 80, data: { model: "wan-2.1-local", ratio: "9:16" } },
        { id: "n3", title: "Voice Studio (Locução)", type: "audio", x: 320, y: 260, data: { voice: "Luiz Caramelo" } },
        { id: "n4", title: "Montagem (Cortes e Legendas)", type: "export", x: 640, y: 160, data: { dest: "montagem" } },
      ];
      const newEdges: WorkflowEdge[] = [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n1", to: "n3" },
        { id: "e3", from: "n2", to: "n4" },
        { id: "e4", from: "n3", to: "n4" },
      ];
      onUpdateWorkflow(newNodes, newEdges);
    }
  };

  const handleAddNode = () => {
    const id = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id,
      title: "Novo Nó do Pipeline",
      type: "image",
      x: 150 + Math.random() * 200,
      y: 120 + Math.random() * 150,
      data: { model: "flux-dev" },
    };
    onUpdateWorkflow([...nodes, newNode], edges);
  };

  const getNodeIcon = (type: WorkflowNode["type"]) => {
    switch (type) {
      case "prompt": return <Sparkles size={14} className="node-icon prompt" />;
      case "image": return <ImageIcon size={14} className="node-icon image" />;
      case "video": return <Film size={14} className="node-icon video" />;
      case "audio": return <Music size={14} className="node-icon audio" />;
      case "upscale": return <Cpu size={14} className="node-icon upscale" />;
      case "export": return <ArrowRight size={14} className="node-icon export" />;
    }
  };

  return (
    <div className="workflow-container">
      {/* Barra de Ferramentas Superior do Workflow */}
      <div className="workflow-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-label">Templates Canônicos:</span>
          <button
            type="button"
            className="btn-wf-template"
            onClick={() => handleApplyTemplate("action")}
          >
            🎬 Cena de Ação 9:16
          </button>
          <button
            type="button"
            className="btn-wf-template"
            onClick={() => handleApplyTemplate("carousel")}
          >
            📸 Capa HEAD + 8K
          </button>
          <button
            type="button"
            className="btn-wf-template"
            onClick={() => handleApplyTemplate("reels")}
          >
            🎙️ Reels + Voz Autoral
          </button>
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className="btn-wf-action secondary"
            onClick={handleAddNode}
          >
            <Plus size={14} />
            <span>Adicionar Nó</span>
          </button>

          <button
            type="button"
            className="btn-wf-action primary"
            onClick={() => onExecutePipeline(nodes)}
            disabled={isExecuting || nodes.length === 0}
          >
            {isExecuting ? (
              <>
                <RotateCcw size={14} className="animate-spin" />
                <span>Executando Passo {executingStep}/{nodes.length}...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Executar Pipeline Completo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área do Canvas de Nós */}
      <div className="workflow-canvas-stage">
        {/* Conexões SVG dos Nós */}
        <svg className="workflow-svg-lines">
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const x1 = fromNode.x + 200;
            const y1 = fromNode.y + 45;
            const x2 = toNode.x;
            const y2 = toNode.y + 45;
            const dx = Math.abs(x2 - x1) * 0.5;

            return (
              <path
                key={edge.id}
                d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#FF701A"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                className="connector-line"
              />
            );
          })}
        </svg>

        {/* Nós Renderizados */}
        {nodes.map((node, idx) => {
          const isNodeActive = isExecuting && executingStep === idx + 1;
          const isCompleted = isExecuting && executingStep > idx + 1;

          return (
            <div
              key={node.id}
              className={`wf-node-card ${node.type} ${selectedNodeId === node.id ? "selected" : ""} ${isNodeActive ? "active-step" : ""} ${isCompleted ? "completed-step" : ""}`}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              onClick={() => setSelectedNodeId(node.id)}
            >
              <div className="wf-node-header">
                <div className="node-title-group">
                  {getNodeIcon(node.type)}
                  <span className="node-title-text">{node.title}</span>
                </div>
                {isCompleted && <CheckCircle2 size={13} className="text-emerald-400" />}
              </div>

              <div className="wf-node-body">
                {node.type === "prompt" && (
                  <p className="node-preview-text">"{node.data.text || "Prompt inicial"}"</p>
                )}
                {node.type === "image" && (
                  <div className="node-meta-pills">
                    <span>{node.data.model}</span>
                    <span>{node.data.steps || 28} Steps</span>
                  </div>
                )}
                {node.type === "video" && (
                  <div className="node-meta-pills">
                    <span>{node.data.model}</span>
                    <span>{node.data.duration || 5}s</span>
                  </div>
                )}
                {node.type === "audio" && (
                  <div className="node-meta-pills">
                    <span>{node.data.style || "Trilha LAB"}</span>
                  </div>
                )}
                {node.type === "upscale" && (
                  <div className="node-meta-pills">
                    <span>AMPLIA 8K</span>
                    <span>Real-ESRGAN</span>
                  </div>
                )}
                {node.type === "export" && (
                  <div className="node-meta-pills">
                    <span>➔ {node.data.dest?.toUpperCase() || "MONTAGEM"}</span>
                  </div>
                )}
              </div>

              <div className="node-ports">
                <span className="port input" />
                <span className="port output" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
