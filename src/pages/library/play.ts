import { useDownloads, useRun } from "../../api";
import type { LibraryApp } from "../../types";
import { useUi } from "../../ui";

export type PlayVariant = "play" | "install" | "update" | "running" | "busy";

export interface PlayAction {
  variant: PlayVariant;
  label: string;
  sub?: string;
  onClick: () => void;
}

/**
 * State machine behind the big play-bar button. By default everything is simulated; with
 * "Iniciar via steam://" enabled in Configurações > Biblioteca the real client receives the request.
 */
export function usePlayAction(app: LibraryApp): PlayAction {
  const [run, setRun] = useRun(app.appid);
  const downloads = useDownloads();
  const ui = useUi();
  const real = ui.settings.launchViaSteamProtocol;

  const settled = app.installed ? { kind: "idle" as const } : { kind: "installed" as const };

  if (run.kind === "installing") {
    return {
      variant: run.paused ? "update" : "busy",
      label: run.paused ? "Retomar" : `${Math.round(run.progress * 100)}%`,
      sub: run.paused ? "Em pausa (simulação) — clique para retomar" : "Baixando (simulação) — clique para pausar",
      onClick: () => run.paused ? downloads.resume(app.appid) : downloads.pause(app.appid),
    };
  }
  if (run.kind === "launching") return { variant: "busy", label: "Iniciando…", onClick: () => {} };
  if (run.kind === "running") return { variant: "running", label: "Parar", sub: "Jogando agora", onClick: () => setRun(settled) };

  const d = app.download;
  if (d && !downloads.isInstalled(app.appid)) {
    return {
      variant: "update",
      label: d.state === "update_required" ? "Atualizar" : d.state === "paused" ? "Retomar" : "Downloads",
      onClick: () => {
        if (real) window.location.href = "steam://open/downloads";
        else ui.toast("Abra o LAB de verdade para gerenciar esta atualização.");
      },
    };
  }

  if (app.installed || downloads.isInstalled(app.appid) || run.kind === "installed") {
    return {
      variant: "play",
      label: "Jogar",
      onClick: () => {
        if (real && app.installed) {
          window.location.href = `steam://rungameid/${app.appid}`;
          ui.toast(`Pedido enviado ao LAB: iniciar ${app.name}.`);
        } else setRun({ kind: "launching", since: Date.now() });
      },
    };
  }

  return {
    variant: "install",
    label: "Instalar",
    onClick: () => {
      if (real) {
        window.location.href = `steam://install/${app.appid}`;
        ui.toast(`Pedido enviado ao LAB: instalar ${app.name}.`);
      } else {
        ui.toast("Simulação: nada é baixado de verdade.");
        downloads.start(app.appid);
      }
    },
  };
}
