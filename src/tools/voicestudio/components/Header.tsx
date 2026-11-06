import React from "react";
import type { StudioTab, EngineConfig } from "../types";
import {
  Mic,
  Dna,
  Sliders,
  Film,
  Zap,
  Layers,
  SlidersHorizontal,
  Headphones,
  Cpu,
  Volume2,
  Server,
} from "lucide-react";

interface HeaderProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  engineConfig: EngineConfig;
  onOpenEngineSettings: () => void;
  onToggleTakesDrawer: () => void;
  takesCount: number;
}

interface TabDef {
  id: StudioTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  badge?: string;
}

const TABS: TabDef[] = [
  { id: "tts", label: "Locução & TTS", icon: Mic },
  { id: "cloning", label: "Clonagem Vocal", icon: Dna },
  { id: "designer", label: "Design de Voz", icon: Sliders },
  { id: "dubbing", label: "Dublagem de Vídeo", icon: Film, badge: "646 langs" },
  { id: "dictation", label: "Ditado & Copy", icon: Zap },
  { id: "batch", label: "Narrador em Lote", icon: Layers },
  { id: "fx", label: "Rack FX & Master", icon: SlidersHorizontal },
];

export function Header({
  activeTab,
  onTabChange,
  engineConfig,
  onOpenEngineSettings,
  onToggleTakesDrawer,
  takesCount,
}: HeaderProps) {
  const getEngineBadge = () => {
    switch (engineConfig.activeEngine) {
      case "local_server":
        return {
          label: "Local Server",
          status: engineConfig.localServerStatus === "connected" ? "connected" : "idle",
          Icon: Server,
        };
      case "elevenlabs":
        return {
          label: "ElevenLabs API",
          status: engineConfig.elevenLabsApiKey ? "connected" : "idle",
          Icon: Zap,
        };
      case "openai":
        return {
          label: "OpenAI TTS",
          status: engineConfig.openAiApiKey ? "connected" : "idle",
          Icon: Cpu,
        };
      case "procedural":
        return {
          label: "Web Audio Procedural",
          status: "connected",
          Icon: Sliders,
        };
      default:
        return {
          label: "Web Speech Nativo",
          status: "connected",
          Icon: Volume2,
        };
    }
  };

  const engineInfo = getEngineBadge();
  const EngineIcon = engineInfo.Icon;

  return (
    <header className="vs-header">
      <div className="vs-header__brand">
        <div className="vs-header__logo">
          <div className="vs-header__icon-pill">
            <Mic size={16} strokeWidth={1.5} className="vs-header__icon" />
          </div>
          <div>
            <div className="vs-header__title-row">
              <span className="vs-header__name">VOICE STUDIO</span>
              <span className="vs-header__tag">LAB / 17</span>
            </div>
            <p className="vs-header__tagline">Locução, clonagem vocal &amp; dublagem com IA</p>
          </div>
        </div>

        <div className="vs-header__controls">
          <button
            type="button"
            className={`vs-engine-pill vs-engine-pill--${engineInfo.status}`}
            onClick={onOpenEngineSettings}
            title="Configurar motor de síntese, servidor local ou chaves de API"
          >
            <span className="vs-engine-pill__dot" />
            <span className="vs-engine-pill__icon"><EngineIcon size={12} strokeWidth={1.5} /></span>
            <span className="vs-engine-pill__label">{engineInfo.label}</span>
          </button>

          <button
            type="button"
            className="vs-takes-trigger"
            onClick={onToggleTakesDrawer}
            title="Ver histórico de áudios e gravações"
          >
            <Headphones size={13} strokeWidth={1.5} style={{ marginRight: 5 }} />
            <span>Takes</span>
            {takesCount > 0 && <span className="vs-takes-count">{takesCount}</span>}
          </button>
        </div>
      </div>

      <nav className="vs-nav" aria-label="Abas do Voice Studio">
        <div className="vs-nav__scroll">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`vs-tab-btn ${isActive ? "vs-tab-btn--active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                <span className="vs-tab-btn__icon"><TabIcon size={14} strokeWidth={1.5} /></span>
                <span className="vs-tab-btn__label">{tab.label}</span>
                {tab.badge && <span className="vs-tab-btn__badge">{tab.badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
