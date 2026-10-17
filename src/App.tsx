import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, type Location } from "react-router-dom";
import { useLibrary } from "./api";
import { BottomBar } from "./components/BottomBar";
import { FriendsPanel } from "./components/FriendsPanel";
import { ModalWindow } from "./components/Modal";
import { SuperNav } from "./components/SuperNav";
import { TitleBar } from "./components/TitleBar";
import { IconMark } from "./components/Icons";
import { AppPropertiesModal } from "./pages/AppProperties";
import { CommunityPage } from "./pages/Community";
import { AchievementsPage } from "./pages/library/Achievements";
import { AppPage } from "./pages/library/AppPage";
import { CollectionsPage, CollectionView } from "./pages/library/Collections";
import { DownloadsPage } from "./pages/library/Downloads";
import { LibraryHome } from "./pages/library/Home";
import { LibraryLayout } from "./pages/library/LibraryLayout";
import { MediaPage } from "./pages/Media";
import { ProfilePage } from "./pages/Profile";
import { SettingsModal } from "./pages/Settings";
import { StorePage } from "./pages/Store";
import { useUi } from "./ui";

const isModalPath = (p: string) => p.startsWith("/settings") || /^\/app\/\d+\/properties/.test(p);

/**
 * Route layout follows the client's own route table (sp.js, webpack module 80344):
 * /library/home, /library/app/:appid[/achievements], /library/collection/:id, /library/collections,
 * /library/downloads, /app/:appid/properties/:section and /settings/:page. Store/community/profile are
 * web pages in the real client and get local stand-ins here.
 */
export function App() {
  const location = useLocation();
  const nav = useNavigate();
  const ui = useUi();
  const lastPage = useRef<Location | null>(null);
  const modal = isModalPath(location.pathname);
  if (!modal) lastPage.current = location;
  const background = modal ? (lastPage.current ?? ({ ...location, pathname: "/library/home" } as Location)) : location;
  const closeModal = () => nav(lastPage.current ? `${lastPage.current.pathname}${lastPage.current.search}` : "/library/home");

  return (
    <div className="client">
      <TitleBar />
      <SuperNav />
      <div className="client__body">
        <Routes location={background}>
          <Route path="/" element={<StartRedirect />} />
          <Route path="/library" element={<LibraryLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<LibraryHome />} />
            <Route path="app/:appid" element={<AppPage />} />
            <Route path="app/:appid/achievements/*" element={<AchievementsPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="collection/:collectionid" element={<CollectionView />} />
            <Route path="collection/:collectionid/:appid" element={<AppPage />} />
            <Route path="downloads" element={<DownloadsPage />} />
          </Route>
          <Route path="/media" element={<Navigate to="/media/grid" replace />} />
          <Route path="/media/grid" element={<MediaPage />} />
          <Route path="/media/list" element={<MediaPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/library/home" replace />} />
        </Routes>
        <FriendsPanel />
      </div>
      <BottomBar />

      {modal && (
        <Routes>
          <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
          <Route path="/settings/:page" element={<SettingsModal onClose={closeModal} />} />
          <Route path="/app/:appid/properties" element={<Navigate to="general" replace />} />
          <Route path="/app/:appid/properties/:section" element={<AppPropertiesModal onClose={closeModal} />} />
        </Routes>
      )}

      {ui.aboutOpen && <AboutModal onClose={() => ui.setAboutOpen(false)} />}

      <div className="toasts" aria-live="polite">
        {ui.settings.notificationsToasts &&
          ui.toasts.map((t) => (
            <div key={t.id} className="toast">
              {t.msg}
            </div>
          ))}
      </div>
    </div>
  );
}

function StartRedirect() {
  const { settings } = useUi();
  return <Navigate to={settings.startPage === "store" ? "/store" : "/library/home"} replace />;
}

function AboutModal({ onClose }: { onClose: () => void }) {
  const { snapshot } = useLibrary();
  useEffect(() => {
    document.title = "Sobre — Steam (Caramelo)";
    return () => {
      document.title = "Steam — Um Cara Caramelo";
    };
  }, []);
  return (
    <ModalWindow title="Sobre esta recriação" onClose={onClose}>
      <div className="settings-page about">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <IconMark size={32} />
          <div>
            <h2 className="settings-page__title" style={{ margin: 0, fontSize: 16, letterSpacing: "0.06em" }}>
              UM CARA CARAMELO
            </h2>
            <span style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 600, letterSpacing: "0.08em" }}>
              LABORATÓRIO DE INTERAÇÃO
            </span>
          </div>
        </div>

        <p>
          Interface reconstruída a partir da análise técnica e estática (REA) da <code>steamui</code>, adaptada integralmente para o sistema de design e interação oficial do <strong>Um Cara Caramelo</strong> (Paleta V1: Ink Black, Warm Cream, Caramel Orange e Electric Sky; tipografia em 3 vozes e rastro de figurinhas urbanas).
        </p>

        <dl className="info-grid">
          <dt>Fonte de dados</dt>
          <dd>{snapshot?.source === "local" ? `Instalação local em ${snapshot.steamPath}` : "Modo nuvem / demonstração"}</dd>
          <dt>Apps integrados</dt>
          <dd>{snapshot?.apps.length ?? 0}</dd>
          <dt>Identidade visual</dt>
          <dd>Caramelo Design System V1 (2026)</dd>
          <dt>Acesso ao disco</dt>
          <dd>Somente leitura (seguro)</dd>
        </dl>

        <p className="cm-handwritten" style={{ margin: "14px 0 6px" }}>
          "Estratégia precisa ser sentida. Menos ferramenta, mais sistema."
        </p>
        <p className="muted small">Projeto de estudo autoral sem afiliação corporativa com a Valve Corporation.</p>
      </div>
    </ModalWindow>
  );
}
