import { useState, type ReactNode } from "react";
import { NavLink, useParams } from "react-router-dom";
import { useLibrary } from "../api";
import { ModalWindow, Select, Toggle } from "../components/Modal";
import { formatBytes } from "../format";
import { t, type LocKey } from "../i18n";
import { useUi } from "../ui";

// Page slugs follow the client's route table (sp.js module 80344: Settings.* -> /settings/<slug>).
const PAGES: { slug: string; key: LocKey }[] = [
  { slug: "account", key: "Settings_Page_Account" },
  { slug: "family", key: "Settings_Page_Family" },
  { slug: "security", key: "Settings_Page_Security" },
  { slug: "notifications", key: "Settings_Page_Notifications" },
  { slug: "interface", key: "Settings_Page_Interface" },
  { slug: "library", key: "Settings_Page_Library" },
  { slug: "downloads", key: "Settings_Page_Downloads" },
  { slug: "storage", key: "Settings_Page_Storage" },
  { slug: "cloud", key: "Settings_Page_Cloud" },
  { slug: "ingame", key: "Settings_Page_InGame" },
  { slug: "gamerecording", key: "Settings_Page_GameRecording" },
  { slug: "friends", key: "Settings_Page_Friends" },
  { slug: "controller", key: "Settings_Page_Controller" },
  { slug: "voice", key: "Settings_Page_Voice" },
  { slug: "remoteplay", key: "Settings_Page_RemotePlay" },
  { slug: "broadcast", key: "Settings_Page_Broadcast" },
  { slug: "music", key: "Settings_Page_Music" },
  { slug: "compatibility", key: "Settings_Page_Compatibility" },
  { slug: "accessibility", key: "Settings_Page_Accessibility" },
  { slug: "store", key: "Settings_Page_Store" },
];

/** Generic per-page switches persisted in localStorage, for pages whose real options live in the client. */
function useLocalFlags(page: string) {
  const key = `steam-recriada:flags:${page}`;
  const [flags, setFlags] = useState<Record<string, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {
      return {};
    }
  });
  const set = (k: string, v: any) =>
    setFlags((f) => {
      const n = { ...f, [k]: v };
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {
        // storage unavailable
      }
      return n;
    });
  return [flags, set] as const;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { page = "account" } = useParams();
  return (
    <ModalWindow
      title={`${t("Menu_Steam")} — ${t("Menu_Settings")}`}
      onClose={onClose}
      nav={PAGES.map((p) => (
        <NavLink key={p.slug} to={`/settings/${p.slug}`} replace className={({ isActive }) => (isActive ? "is-active" : "")}>
          {t(p.key)}
        </NavLink>
      ))}
    >
      <SettingsPage slug={page} />
    </ModalWindow>
  );
}

function SettingsPage({ slug }: { slug: string }) {
  const ui = useUi();
  const { snapshot } = useLibrary();
  const [flags, setFlag] = useLocalFlags(slug);
  const page = PAGES.find((p) => p.slug === slug);
  const title = page ? t(page.key) : "Configurações";
  const flag = (k: string, label: string, desc?: string, def = false) => (
    <Toggle key={k} label={label} desc={desc} checked={flags[k] ?? def} onChange={(v) => setFlag(k, v)} />
  );
  let body: ReactNode;

  switch (slug) {
    case "account":
      body = (
        <>
          <dl className="info-grid">
            <dt>Nome de perfil</dt>
            <dd>{snapshot?.user?.personaName}</dd>
            <dt>LAB ID</dt>
            <dd className="mono">{snapshot?.user?.steamId64 ?? "—"}</dd>
            <dt>Pasta do LAB</dt>
            <dd className="mono">{snapshot?.steamPath ?? "não encontrada (modo demonstração)"}</dd>
          </dl>
          <p className="muted small">E-mail, senha e saldo da carteira ficam nos servidores do LAB e não são lidos por esta recriação.</p>
        </>
      );
      break;
    case "interface":
      body = (
        <>
          <Select
            label="Página inicial do cliente"
            value={ui.settings.startPage}
            options={[
              { value: "library", label: t("MainTabsLibrary") },
              { value: "store", label: t("MainTabsStore") },
            ]}
            onChange={(v) => ui.setSetting("startPage", v)}
          />
          <Toggle label="Modo de baixo desempenho" desc="Desativa animações e desfoques (a classe LowPerfMode do cliente)." checked={ui.settings.lowPerfMode} onChange={(v) => ui.setSetting("lowPerfMode", v)} />
          {flag("smoothScroll", "Rolagem suave em páginas web", undefined, true)}
          {flag("gpuWeb", "Aceleração por GPU em páginas web", undefined, true)}
        </>
      );
      break;
    case "library":
      body = (
        <>
          <Toggle label="Exibir ícones dos jogos na lista lateral" checked={ui.settings.showGameIconsInList} onChange={(v) => ui.setSetting("showGameIconsInList", v)} />
          <Toggle
            label="Iniciar e instalar via steam://"
            desc="Quando ativado, os botões Jogar/Instalar enviam o pedido ao cliente LAB real instalado neste PC. Desativado = simulação."
            checked={ui.settings.launchViaSteamProtocol}
            onChange={(v) => ui.setSetting("launchViaSteamProtocol", v)}
          />
          {flag("compactLetterbox", "Modo compacto da biblioteca", undefined, false)}
          {flag("showAddShelf", "Exibir prateleira \"Adicionados recentemente\"", undefined, true)}
        </>
      );
      break;
    case "downloads":
      body = (
        <>
          <Select
            label="Limitar banda"
            value={ui.settings.downloadThrottleKbps}
            options={[
              { value: 0, label: "Sem limite" },
              { value: 1024, label: "1 MB/s" },
              { value: 5120, label: "5 MB/s" },
              { value: 20480, label: "20 MB/s" },
            ]}
            onChange={(v) => ui.setSetting("downloadThrottleKbps", v)}
          />
          {flag("allowWhilePlaying", "Permitir downloads durante as partidas")}
          {flag("throttleStreaming", "Limitar downloads durante transmissões", undefined, true)}
          {flag("shaderPrecache", "Pré-cache de shaders", "Baixa shaders pré-compilados compatíveis com seu sistema.", true)}
        </>
      );
      break;
    case "storage":
      body = <StoragePage />;
      break;
    case "notifications":
      body = (
        <>
          <Toggle label="Exibir notificações (toasts)" checked={ui.settings.notificationsToasts} onChange={(v) => ui.setSetting("notificationsToasts", v)} />
          {flag("achSound", "Tocar som ao desbloquear conquistas", undefined, true)}
          {flag("friendOnline", "Avisar quando um amigo ficar on-line")}
          {flag("wishlistSale", "Itens da lista de desejos em promoção", undefined, true)}
        </>
      );
      break;
    case "ingame":
      body = (
        <>
          {flag("overlay", "Ativar a sobreposição LAB durante o jogo", undefined, true)}
          {flag("fps", "Contador de FPS no jogo")}
          {flag("screenshotSound", "Tocar som ao capturar tela", undefined, true)}
        </>
      );
      break;
    case "cloud":
      body = flag("cloud", "Ativar o LAB Cloud nos aplicativos compatíveis", "Os arquivos salvos são sincronizados automaticamente.", true);
      break;
    case "gamerecording":
      body = (
        <>
          <Select
            label="Modo de gravação"
            value={flags["mode"] ?? "background"}
            options={[
              { value: "off", label: "Desativado" },
              { value: "background", label: "Gravar em segundo plano" },
              { value: "manual", label: "Gravar manualmente" },
            ]}
            onChange={(v) => setFlag("mode", v)}
          />
          <Select
            label="Duração máxima da gravação em segundo plano"
            value={flags["duration"] ?? 120}
            options={[
              { value: 30, label: "30 minutos" },
              { value: 60, label: "60 minutos" },
              { value: 120, label: "120 minutos (recomendado)" },
              { value: 240, label: "240 minutos" },
            ]}
            onChange={(v) => setFlag("duration", v)}
          />
          <Select
            label="Limite de espaço no disco"
            value={flags["storageLimitGb"] ?? 24}
            options={[
              { value: 10, label: "10 GB" },
              { value: 24, label: "24 GB" },
              { value: 50, label: "50 GB" },
              { value: 100, label: "100 GB" },
            ]}
            onChange={(v) => setFlag("storageLimitGb", v)}
          />
          {flag("audioGameOnly", "Gravar apenas o áudio do jogo", "Ignora áudios de outros programas abertos no sistema.", true)}
          {flag("timelineMarkers", "Exibir marcadores e conquistas na barra cronológica", "Adiciona automaticamente ícones de conquistas e eventos nas gravações.", true)}
          {flag("overlayIndicator", "Exibir indicador de gravação na sobreposição", undefined, true)}
          <dl className="info-grid">
            <dt>Atalho para clipe recente</dt>
            <dd className="mono">Ctrl + F11</dd>
            <dt>Atalho para adicionar marcador</dt>
            <dd className="mono">Ctrl + F12</dd>
            <dt>Atalho para captura de tela</dt>
            <dd className="mono">F12</dd>
          </dl>
        </>
      );
      break;
    default:
      body = (
        <>
          {flag("enabled", `Ativar ${title.toLowerCase()}`, undefined, true)}
          {flag("advanced", "Exibir opções avançadas")}
          <p className="muted small">As opções completas desta página dependem do cliente real; aqui elas só ficam salvas neste navegador.</p>
        </>
      );
  }

  return (
    <div className="settings-page">
      <h2 className="settings-page__title">{title}</h2>
      {body}
    </div>
  );
}

const samePath = (a?: string | null, b?: string | null) => !!a && !!b && a.replace(/[\\/]+$/, "").toLowerCase() === b.replace(/[\\/]+$/, "").toLowerCase();

/**
 * Library folders with default/rename/remove/move actions. Every change is a browser-local override
 * kept by LibraryProvider; no file on disk is moved and libraryfolders.vdf is never written.
 */
function StoragePage() {
  const { snapshot, defaultFolder, setDefaultFolder, renameLibraryFolder, removeLibraryFolder, addLibraryFolder, moveApps } = useLibrary();
  const ui = useUi();
  const folders = snapshot?.libraryFolders ?? [];
  const apps = snapshot?.apps ?? [];

  const addFolder = () => {
    const path = window.prompt("Caminho da nova pasta da biblioteca (ex.: E:\\LABLibrary):")?.trim();
    if (!path) return;
    if (folders.some((f) => samePath(f.path, path))) return ui.toast("Essa pasta já faz parte da biblioteca.");
    addLibraryFolder(path, window.prompt(t("ContentManagement_RenameDriveText"), "")?.trim() || undefined);
  };

  return (
    <div className="storage">
      <p className="muted small">{t("ContentManagement_Description")}</p>
      {folders.map((f) => {
        const driveApps = apps.filter((a) => samePath(a.libraryPath, f.path)).sort((a, b) => b.sizeOnDisk - a.sizeOnDisk);
        const used = driveApps.reduce((s, a) => s + a.sizeOnDisk, 0);
        const total = used + (f.freeBytes ?? 0);
        const isDefault = samePath(defaultFolder, f.path);
        // The real client refuses to remove the folder Steam itself is installed in.
        const isSteamRoot = samePath(snapshot?.steamPath, f.path);
        const targets = folders.filter((o) => !samePath(o.path, f.path));
        return (
          <div key={f.path} className="storage__drive">
            <div className="storage__head">
              <div>
                <b>{f.label || f.path}</b>
                {isDefault && <span className="storage__default"> ★ {t("ContentManagement_IsDefault")}</span>}
                <div className="muted small mono">{f.path}</div>
              </div>
              <span className="muted small">
                {formatBytes(used)} usados pelo LAB • {f.freeBytes !== undefined ? `${formatBytes(f.freeBytes)} livres` : "espaço livre desconhecido"}
              </span>
              <div className="storage__actions">
                {!isDefault && <button onClick={() => setDefaultFolder(f.path)}>{t("ContentManagement_MakeDefault")}</button>}
                <button
                  onClick={() => {
                    const label = window.prompt(t("ContentManagement_RenameDriveText"), f.label || "");
                    if (label !== null) renameLibraryFolder(f.path, label.trim());
                  }}
                >
                  {t("ContentManagement_RenameDrive")}
                </button>
                <button
                  disabled={isSteamRoot}
                  title={isSteamRoot ? "A pasta onde o LAB está instalado não pode ser removida." : undefined}
                  onClick={() => {
                    if (!window.confirm(t("ContentManagement_RemoveDrive_ConfirmDesc", f.path))) return;
                    removeLibraryFolder(f.path);
                    if (isDefault) setDefaultFolder(targets[0]?.path ?? "");
                  }}
                >
                  {t("ContentManagement_RemoveDrive")}
                </button>
              </div>
            </div>
            <div className="storage__bar" title={total ? `${Math.round((used / total) * 100)}% ocupado pelo LAB` : undefined}>
              <span style={{ width: `${total ? (used / total) * 100 : 0}%` }} />
            </div>
            {driveApps.length === 0 ? (
              <p className="muted small">Nenhum aplicativo nesta pasta.</p>
            ) : (
              <ul className="storage__apps">
                {driveApps.map((a) => (
                  <li key={a.appid}>
                    <span>{a.name}</span>
                    <span className="storage__app-right">
                      <span className="muted">{formatBytes(a.sizeOnDisk)}</span>
                      {targets.length > 0 && (
                        <select
                          className="storage__move"
                          value=""
                          aria-label={`${t("ContentManagement_MoveButton")} ${a.name}`}
                          onChange={(e) => {
                            const dest = targets.find((o) => o.path === e.target.value);
                            if (!dest) return;
                            moveApps([a.appid], dest.path);
                            ui.toast(`${a.name} → ${dest.label || dest.path} (só nesta recriação; nenhum arquivo foi movido).`);
                          }}
                        >
                          <option value="">{t("ContentManagement_MoveButton")}</option>
                          {targets.map((o) => (
                            <option key={o.path} value={o.path}>
                              {o.label || o.path}
                            </option>
                          ))}
                        </select>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {folders.length === 0 && <p className="muted">Nenhuma pasta de biblioteca encontrada.</p>}
      <div className="btn-row">
        <button className="btn" onClick={addFolder}>
          {t("ContentManagement_AddDriveDropdownOption")}
        </button>
      </div>
      <p className="muted small">Alterações feitas aqui ficam salvas só neste navegador: nenhum arquivo é movido e a configuração do LAB não é alterada.</p>
    </div>
  );
}

