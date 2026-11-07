import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { enableMapSet } from "immer";
import { useToolUser } from "../shared/kit";
import { activateLabUser } from "./lib/labAccess";
import { Home } from "./pages/Home";
import { ProjectPage } from "./pages/ProjectPage";
import { SettingsModal } from "./components/settings/SettingsModal";
import { Toasts } from "./components/ui/Toasts";
import "./styles/global.css";

enableMapSet();

export function ClaqueteApp() {
  const user = useToolUser();

  useEffect(() => {
    activateLabUser(user.id);
    return () => activateLabUser(null);
  }, [user.id]);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<Home />} />
          <Route path="/canvas/:projectId" element={<ProjectPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
        <SettingsModal />
        <Toasts />
      </HashRouter>
    </div>
  );
}
