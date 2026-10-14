import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDownloads, useLibrary } from "../../api";
import { AppArt } from "../../components/AppArt";
import { IconClose, IconDownload, IconPause, IconPlay } from "../../components/Icons";
import { selectDownloads, type DownloadEntry } from "../../downloads";
import { formatBytes, formatDate } from "../../format";
import { t } from "../../i18n";
import { useUi } from "../../ui";

/** REA reference: Steam downloads module 11698. Pause/resume and removal are distinct actions. */
export function DownloadsPage() {
  const { snapshot, error } = useLibrary();
  const downloads = useDownloads();
  const { active, queued, completed, transferring } = selectDownloads(snapshot?.apps ?? [], downloads.runs, downloads.completedInstalls);
  const simulatedActive = active.filter((entry) => entry.source === "simulation");
  const hasRunning = simulatedActive.some((entry) => entry.state === "downloading");
  const hasPaused = simulatedActive.some((entry) => entry.state === "paused");
  const simulatedTransfers = transferring.filter((entry) => entry.source === "simulation").length;
  return (
    <div className="downloads">
      <header className="downloads__toolbar">
        <div><h1>Downloads</h1><p className="muted small">Gerencie suas instalações simuladas e acompanhe os registros da Steam.</p></div>
        <div className="downloads__controls">
          <button className="downloads__control" disabled={!hasRunning} onClick={downloads.pauseAll}><IconPause size={14} /> {t("Downloads_Pause")}</button>
          <button className="downloads__control" disabled={!hasPaused} onClick={downloads.resumeAll}><IconPlay size={14} /> {t("Downloads_Resume")}</button>
        </div>
      </header>
      <NetworkGraph simulatedTransfers={simulatedTransfers} hasSteamTransfers={transferring.some((entry) => entry.source === "steam")} />
      {error && <p role="alert">Não foi possível atualizar os dados da biblioteca: {error}</p>}
      <section className="downloads__section" aria-labelledby="downloads-active">
        <h2 id="downloads-active" className="downloads__heading">Em andamento <span>({active.length})</span></h2>
        {active.length ? active.map((entry) => <DownloadRow key={entry.app.appid} entry={entry} />) : <EmptyState text="Nenhum download em andamento." />}
      </section>
      <section className="downloads__section" aria-labelledby="downloads-queued">
        <h2 id="downloads-queued" className="downloads__heading">Na fila <span>({queued.length})</span></h2>
        {queued.length ? queued.map((entry) => <DownloadRow key={entry.app.appid} entry={entry} />) : <EmptyState text="A fila está vazia." />}
      </section>
      <section className="downloads__section" aria-labelledby="downloads-completed">
        <div className="downloads__section-head">
          <h2 id="downloads-completed" className="downloads__heading">Concluídos <span>({completed.length})</span></h2>
          {Object.keys(downloads.completedInstalls).length > 0 && <button className="downloads__clear" onClick={downloads.clearCompleted}>Limpar simulações concluídas</button>}
        </div>
        {completed.length ? completed.map((entry) => <DownloadRow key={entry.app.appid} entry={entry} />) : <EmptyState text="Nenhuma instalação concluída." />}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="downloads__empty"><IconDownload size={20} /><span>{text}</span></div>;
}

function DownloadRow({ entry }: { entry: DownloadEntry }) {
  const { app, state, source, progress } = entry;
  const downloads = useDownloads();
  const ui = useUi();
  const nav = useNavigate();
  const simulated = source === "simulation";
  const pending = state !== "completed";
  const paused = state === "paused";
  const openSteam = () => {
    if (ui.settings.launchViaSteamProtocol) window.location.href = "steam://open/downloads";
    else ui.toast("Ative “Iniciar e instalar via steam://” nas configurações da biblioteca para abrir os downloads da Steam.");
  };
  const status = state === "downloading" ? "Baixando" : paused ? "Em pausa" : state === "queued" ? "Aguardando na fila" : state === "update_required" ? "Atualização necessária" : "Concluído";
  const controlLabel = `${paused ? t("Downloads_Resume_Tooltip") : t("Downloads_Pause_Tooltip")} de ${app.name}`;
  return (
    <article className={`dl-row ${state === "downloading" ? "dl-row--active" : ""} ${paused ? "dl-row--paused" : ""}`} aria-label={`${app.name}: ${status}`}>
      <button className="dl-row__art" aria-label={`Ver ${app.name} na biblioteca`} onClick={() => nav(`/library/app/${app.appid}`)}><AppArt app={app} kind="header" /></button>
      <div className="dl-row__info">
        <button className="dl-row__name" onClick={() => nav(`/library/app/${app.appid}`)}>{app.name}</button>
        <div className="dl-row__status"><span className={paused ? "dl-row__paused" : ""}>{status}</span><span className="dl-row__source">{simulated ? "Simulação local" : "Steam · registro local"}</span></div>
        {pending && (state === "downloading" || paused) && <div className="dl-row__bar" role="progressbar" aria-label={`Progresso de ${app.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>}
        <div className="dl-row__meta">
          {pending ? <span>{Math.round(progress * 100)}%{!simulated && app.download ? ` · ${formatBytes(app.download.bytesDownloaded)} de ${formatBytes(app.download.bytesToDownload)}` : ""}</span> : <span>{`${simulated ? "Instalado" : "Atualizado"} em ${formatDate(entry.completedAt === undefined ? app.lastUpdated : entry.completedAt / 1000)}`}</span>}
          {app.sizeOnDisk > 0 && <span>{formatBytes(app.sizeOnDisk)} no disco</span>}
        </div>
      </div>
      <div className="dl-row__actions">
        {simulated && pending ? <>
          <button title={controlLabel} aria-label={controlLabel} onClick={() => paused ? downloads.resume(app.appid) : downloads.pause(app.appid)}>{paused ? <IconPlay size={16} /> : <IconPause size={16} />}</button>
          <button title={t("Downloads_RemoveFromQueue_Tooltip")} aria-label={`Remover download de ${app.name}`} onClick={() => downloads.cancel(app.appid)}><IconClose size={16} /></button>
        </> : pending ? <button title="Gerenciar na Steam" aria-label={`Gerenciar download de ${app.name} na Steam`} onClick={openSteam}><IconDownload size={16} /></button> : <button title="Ir ao jogo" aria-label={`Ir ao jogo ${app.name}`} onClick={() => nav(`/library/app/${app.appid}`)}><IconPlay size={16} /></button>}
      </div>
    </article>
  );
}

/** Demonstration traffic only: cached manifests cannot measure live network throughput. */
function NetworkGraph({ simulatedTransfers, hasSteamTransfers }: { simulatedTransfers: number; hasSteamTransfers: boolean }) {
  const [samples, setSamples] = useState<number[]>(() => Array(90).fill(0));
  const count = useRef(simulatedTransfers);
  useEffect(() => { count.current = simulatedTransfers; }, [simulatedTransfers]);
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      const sample = count.current > 0 ? (24 + Math.sin(tick / 4) * 6) * count.current : 0;
      setSamples((previous) => [...previous.slice(1), sample]);
    }, 500);
    return () => clearInterval(id);
  }, []);
  const max = Math.max(60, ...samples);
  const pts = samples.map((v, i) => `${(i / (samples.length - 1)) * 100},${40 - (v / max) * 40}`).join(" ");
  const current = simulatedTransfers ? samples[samples.length - 1] : 0;
  return (
    <div className="netgraph">
      <div className="netgraph__plot">
        <div className="netgraph__legend"><span className="netgraph__dot" /> Rede {simulatedTransfers ? "· simulação" : ""}<span>Últimos 45 segundos</span></div>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="netgraph__svg" aria-hidden="true">
          {[10, 20, 30].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="netgraph__grid" />)}
          <polygon points={`0,40 ${pts} 100,40`} className="netgraph__area" /><polyline points={pts} className="netgraph__line" />
        </svg>
      </div>
      <div className="netgraph__stats">
        <div><span className="playbar__stat-label">Rede atual</span><b>{hasSteamTransfers && !simulatedTransfers ? "Indisponível" : `${current.toFixed(1)} MB/s`}</b></div>
        <div><span className="playbar__stat-label">Pico da simulação</span><b>{Math.max(...samples).toFixed(1)} MB/s</b></div>
        <div><span className="playbar__stat-label">Origem</span><b>{simulatedTransfers ? "Simulação local" : hasSteamTransfers ? "Steam · sem telemetria" : "Ocioso"}</b></div>
      </div>
    </div>
  );
}
