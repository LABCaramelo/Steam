import { CopyButton, ThemeToggle } from "@caramelo/design-system";
import { useState, type ReactNode } from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";
import { useLibrary } from "../api";
import { useAuth } from "../auth";
import { EditProfileModal } from "../components/EditProfileModal";
import { IconEdit } from "../components/Icons";
import { ModalWindow, Select, Toggle } from "../components/Modal";
import { t, type LocKey } from "../i18n";
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  notifyBrowser,
  playNotificationSound,
  requestBrowserNotificationPermission,
} from "../notifications";
import { useCarameloTheme } from "../theme";
import { useUi } from "../ui";

// Page slugs follow the client's route table (sp.js module 80344: Settings.* -> /settings/<slug>).
// Family, security, library, downloads, storage, in-game, controller, Remote Play, broadcast and
// compatibility pages were removed from the LAB; their old URLs open the account page.
const PAGES: { slug: string; key: LocKey }[] = [
  { slug: "account", key: "Settings_Page_Account" },
  { slug: "notifications", key: "Settings_Page_Notifications" },
  { slug: "interface", key: "Settings_Page_Interface" },
  { slug: "cloud", key: "Settings_Page_Cloud" },
  { slug: "friends", key: "Settings_Page_Friends" },
  { slug: "voice", key: "Settings_Page_Voice" },
  { slug: "music", key: "Settings_Page_Music" },
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
  if (!PAGES.some((p) => p.slug === page)) return <Navigate to="/settings/account" replace />;
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
  const { profile } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [flags, setFlag] = useLocalFlags(slug);
  const theme = useCarameloTheme();
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>Dados da conta no LAB</h3>
              <p className="muted small" style={{ margin: 0 }}>Gerencie seus dados públicos, apelido na comunidade e foto.</p>
            </div>
            <button
              type="button"
              className="btn btn--blue"
              onClick={() => setIsEditingProfile(true)}
            >
              <IconEdit size={14} />
              <span>Editar perfil</span>
            </button>
          </div>

          <dl className="info-grid">
            <dt>Nome de exibição</dt>
            <dd>{profile?.name || snapshot?.user?.personaName || "—"}</dd>
            <dt>Apelido no LAB</dt>
            <dd>{profile?.nickname ? `@${profile.nickname}` : <span className="muted">não definido</span>}</dd>
            <dt>E-mail</dt>
            <dd className="mono">{profile?.email || "—"}</dd>
            <dt>Nível de acesso</dt>
            <dd>
              <span className="cm-brand-badge" style={{ textTransform: "uppercase" }}>
                {profile?.role === "admin" ? "Administrador" : "Membro"}
              </span>
            </dd>
            <dt>Frase / Bio</dt>
            <dd className="cm-handwritten" style={{ fontSize: "15px" }}>
              "{profile?.bio || "elegância + pequena confissão patética"}"
            </dd>
            <dt>LAB ID</dt>
            <dd className="mono copy-row">
              {snapshot?.user?.steamId64 ?? "—"}
              {snapshot?.user?.steamId64 && <CopyButton value={snapshot.user.steamId64} aria-label="Copiar LAB ID" />}
            </dd>
            <dt>Pasta do LAB</dt>
            <dd className="mono">{snapshot?.steamPath ?? "não encontrada (modo demonstração)"}</dd>
          </dl>
          <p className="muted small">O acesso é protegido por verificação de segurança no WhatsApp oficial do LAB.</p>

          {isEditingProfile && <EditProfileModal onClose={() => setIsEditingProfile(false)} />}
        </>
      );
      break;
    case "interface":
      body = (
        <>
          <div className="field">
            <div className="field__text">
              <div className="field__label">Tema</div>
              <div className="field__desc">{theme === "dark" ? "Escuro (Ink Black)" : "Claro (Warm Cream)"}. A troca vale para o LAB, a biblioteca de prompts e o site.</div>
            </div>
            <ThemeToggle theme={theme} />
          </div>
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
          <Toggle label="Exibir ícones das ferramentas na lista lateral" checked={ui.settings.showGameIconsInList} onChange={(v) => ui.setSetting("showGameIconsInList", v)} />
          {flag("smoothScroll", "Rolagem suave em páginas web", undefined, true)}
          {flag("gpuWeb", "Aceleração por GPU em páginas web", undefined, true)}
        </>
      );
      break;
    case "notifications": {
      const hasBrowser = isBrowserNotificationSupported();
      const notifPerm = getBrowserNotificationPermission();
      body = (
        <>
          <Toggle
            label="Exibir notificações na interface (toasts)"
            desc="Exibe um aviso flutuante dentro do LAB ao receber mensagens."
            checked={ui.settings.notificationsToasts}
            onChange={(v) => ui.setSetting("notificationsToasts", v)}
          />
          <Toggle
            label="Avisos no navegador"
            desc={
              !hasBrowser
                ? "Este navegador não suporta notificações de sistema."
                : notifPerm === "granted"
                ? "Ativo. O navegador avisa quando você receber mensagens mesmo em outra aba."
                : notifPerm === "denied"
                ? "Bloqueado nas configurações de permissão do navegador."
                : "Permite que o navegador exiba notificações na área de trabalho quando chegar mensagem."
            }
            checked={hasBrowser && notifPerm === "granted" && ui.settings.browserNotifications}
            disabled={!hasBrowser || notifPerm === "denied"}
            onChange={async (v) => {
              if (v && notifPerm !== "granted") {
                const p = await requestBrowserNotificationPermission();
                if (p === "granted") {
                  ui.setSetting("browserNotifications", true);
                  ui.toast("Notificações no navegador ativadas.");
                }
              } else {
                ui.setSetting("browserNotifications", v);
              }
            }}
          />
          <Toggle
            label="Som de nova mensagem"
            desc="Toca um som suave ao receber uma mensagem na Comunidade."
            checked={ui.settings.notificationSound}
            onChange={(v) => ui.setSetting("notificationSound", v)}
          />
          <div style={{ marginTop: 8, marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              className="cm-btn cm-btn--ghost cm-btn--sm"
              onClick={() => {
                if (ui.settings.notificationSound) playNotificationSound();
                if (ui.settings.notificationsToasts) ui.toast("Teste de notificação na interface.");
                if (hasBrowser && notifPerm === "granted") {
                  notifyBrowser("Teste de Notificação · LAB Caramelo", {
                    body: "O navegador está configurado para avisar quando novas mensagens chegarem!",
                  });
                }
              }}
            >
              Testar som e notificação
            </button>
            <span className="muted small">Dispara um som e notificação de teste</span>
          </div>
          {flag("friendOnline", "Avisar quando um amigo ficar on-line")}
          {flag("achSound", "Tocar som ao desbloquear conquistas", undefined, true)}
        </>
      );
      break;
    }
    case "cloud":
      body = flag("cloud", "Ativar o LAB Cloud nos aplicativos compatíveis", "Os arquivos salvos são sincronizados automaticamente.", true);
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
