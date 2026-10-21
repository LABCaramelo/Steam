import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { APPS, appInfo, type Step } from "./model";

export function ModuleMark({ app, small = false }: { app: Step["app"]; small?: boolean }) {
  const info = appInfo(app);
  return <span className={`au-module-mark ${small ? "au-module-mark--small" : ""}`} style={{ "--module-color": info.color } as React.CSSProperties} aria-hidden="true">{info.symbol}</span>;
}
interface Props { steps: Step[]; selected: string | null; statuses: Record<string, string>; onSelect: (id: string | null) => void; onMove: (id: string, position: Step["position"]) => void; onAdd: () => void; onOrganize: () => void }
export function Canvas({ steps, selected, statuses, onSelect, onMove, onAdd, onOrganize }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 40, y: 0, zoom: 1 });
  const viewRef = useRef(view); viewRef.current = view;
  const drag = useRef<{ startX: number; startY: number; x: number; y: number; id?: string; moved: boolean } | null>(null);
  const fit = useCallback(() => {
    const el = root.current; if (!el) return;
    const xMin = Math.min(0, ...steps.map((step) => step.position.x));
    const xMax = Math.max(400, ...steps.map((step) => step.position.x + 180));
    const yMin = Math.min(100, ...steps.map((step) => step.position.y));
    const yMax = Math.max(360, ...steps.map((step) => step.position.y + 140));
    const zoom = Math.max(.25, Math.min(1, (el.clientWidth - 120) / (xMax - xMin + 100), (el.clientHeight - 120) / (yMax - yMin + 40)));
    setView({ x: el.clientWidth / 2 - (xMin + xMax) / 2 * zoom, y: el.clientHeight / 2 - (yMin + yMax) / 2 * zoom, zoom });
  }, [steps]);
  const init = useRef(false);
  useEffect(() => { if (!init.current) { fit(); init.current = true; } }, [fit]);
  const zoom = useCallback((factor: number, point?: { x: number; y: number }) => {
    setView((current) => {
      const next = Math.min(2, Math.max(.2, current.zoom * factor));
      const x = point?.x ?? (root.current?.clientWidth || 600) / 2;
      const y = point?.y ?? (root.current?.clientHeight || 500) / 2;
      const ratio = next / current.zoom;
      return { zoom: next, x: x - (x - current.x) * ratio, y: y - (y - current.y) * ratio };
    });
  }, []);
  useEffect(() => {
    const el = root.current; if (!el) return;
    const wheel = (event: WheelEvent) => { if ((event.target as HTMLElement).closest(".au-canvas-controls")) return; event.preventDefault(); const bounds = el.getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }); };
    el.addEventListener("wheel", wheel, { passive: false }); return () => el.removeEventListener("wheel", wheel);
  }, [zoom]);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("button, input, select, textarea, .au-canvas-controls, .au-canvas-add")) return;
    const id = (event.target as Element).closest<HTMLElement>("[data-node-id]")?.dataset.nodeId;
    const step = steps.find((item) => item.id === id);
    drag.current = { startX: event.clientX, startY: event.clientY, x: step?.position.x ?? view.x, y: step?.position.y ?? view.y, id, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current; if (!current) return;
    const dx = event.clientX - current.startX, dy = event.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
    if (!current.moved) return;
    if (current.id) onMove(current.id, { x: Math.round(current.x + dx / viewRef.current.zoom), y: Math.round(current.y + dy / viewRef.current.zoom) });
    else setView((prev) => ({ ...prev, x: current.x + dx, y: current.y + dy }));
  };
  const up = () => { if (drag.current && !drag.current.moved) onSelect(drag.current.id || null); drag.current = null; };
  return <div ref={root} className="au-canvas" aria-label="Canvas do fluxo" style={{ backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}>
    <div className="au-canvas-controls"><button className="tk-iconbtn" onClick={() => zoom(1.2)} aria-label="Aproximar canvas">+</button><span>{Math.round(view.zoom * 100)}%</span><button className="tk-iconbtn" onClick={() => zoom(1 / 1.2)} aria-label="Afastar canvas">−</button><button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={fit}>Enquadrar</button><button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={onOrganize}>Organizar</button></div>
    <div className="au-canvas-scene" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
      <svg className="au-edges" width="1" height="1" aria-hidden="true"><defs><marker id="au-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="none" stroke="currentColor" strokeWidth="1.5"/></marker></defs>{steps.slice(1).map((step, index) => { const from = steps[index].position, to = step.position; const x1 = from.x + 130, y1 = from.y + 44, x2 = to.x + 45, y2 = to.y + 44; const curve = Math.max(50, Math.abs(x2 - x1) / 2); return <path key={step.id} d={`M${x1} ${y1}C${x1 + curve} ${y1},${x2 - curve} ${y2},${x2} ${y2}`} markerEnd="url(#au-arrow)"/>; })}</svg>
      {steps.map((step, index) => <div key={step.id} data-node-id={step.id} className={`au-node ${selected === step.id ? "is-selected" : ""} ${statuses[step.id] ? `is-${statuses[step.id]}` : ""}`} style={{ left: step.position.x, top: step.position.y }} role="button" tabIndex={0} aria-label={`Módulo ${index + 1}: ${APPS[step.app].title}, ${step.action}. Enter para configurar, setas para mover.`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(step.id); } const directions: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }; const d = directions[event.key]; if (d) { event.preventDefault(); onMove(step.id, { x: step.position.x + d[0], y: step.position.y + d[1] }); } }}>
        <span className="au-node-number">{String(index + 1).padStart(2, "0")}</span><ModuleMark app={step.app}/><strong>{APPS[step.app].title}</strong><span>{step.action}</span>{statuses[step.id] && <em>{statuses[step.id] === "running" ? "Testando…" : statuses[step.id] === "error" ? "Falha simulada" : "Teste concluído"}</em>}
      </div>)}
      <button className="au-canvas-add" style={{ left: (steps.at(-1)?.position.x ?? -160) + 260, top: steps.at(-1)?.position.y ?? 180 }} onClick={onAdd} aria-label="Adicionar módulo"><span>+</span><small>Adicionar módulo</small></button>
    </div>
    {!steps.length && <div className="au-canvas-empty"><h2>Um fluxo começa aqui.</h2><p>Adicione um gatilho e conecte as próximas ações.</p><button className="cm-btn cm-btn--accent" onClick={onAdd}>Adicionar primeiro módulo</button></div>}
    <p className="au-canvas-hint">Arraste o fundo para navegar · Role para aproximar · A ordem dos módulos define as conexões</p>
  </div>;
}
