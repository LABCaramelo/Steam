import { useEffect, useRef, useState, type ReactNode } from "react";

export function Copy({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <span className="copy-control"><button className="button primary" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setStatus("Copiado!"); }
    catch { setStatus("Não foi possível copiar. Selecione e copie o texto manualmente."); }
    clearTimeout(timer.current); timer.current = setTimeout(() => setStatus(""), 5000);
  }}>{label} ↗</button><span role="status">{status}</span></span>;
}
export function Modal({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; const previous = document.activeElement as HTMLElement | null; dialog.showModal(); return () => { dialog.close(); previous?.focus(); }; }, []);
  return <dialog className={`modal ${wide ? "wide" : ""}`} ref={ref} onCancel={close} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) close(); } }} aria-labelledby="modal-title">
    <header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={close} aria-label="Fechar janela">×</button></header>{children}
  </dialog>;
}
export function Choices({ labels, selected, onChange }: { labels: string[]; selected: number; onChange: (n: number) => void }) {
  return <div className="choices">{labels.map((label, i) => <button key={label} aria-pressed={selected === i} className={selected === i ? "selected" : ""} onClick={() => onChange(i)}>{label}</button>)}</div>;
}
export function Hint({ children }: { children: ReactNode }) { return <p className="hint" role="status">{children}</p>; }
export function Range({ label, value, change, max = 100 }: { label: string; value: number; change: (n: number) => void; max?: number }) {
  return <label className="range-label">{label}<input type="range" min={0} max={max} value={value} onChange={e => change(Number(e.target.value))} /></label>;
}
