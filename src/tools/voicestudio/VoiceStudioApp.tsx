import { useState, useEffect } from "react";
import type { StudioTab, VoicePreset, ScriptBlock, AudioTake, EngineConfig, FXRackConfig } from "./types";
import { Header } from "./components/Header";
import { TTSStudio } from "./components/TTSStudio";
import { VoiceCloningStudio } from "./components/VoiceCloningStudio";
import { VoiceDesigner } from "./components/VoiceDesigner";
import { VideoDubbingStudio } from "./components/VideoDubbingStudio";
import { DictationStudio } from "./components/DictationStudio";
import { NarratorBatchQueue } from "./components/NarratorBatchQueue";
import { StudioFXRack } from "./components/StudioFXRack";
import { EngineSettingsModal } from "./components/EngineSettingsModal";
import { TakesDrawer } from "./components/TakesDrawer";
import {
  loadStoredVoices,
  saveStoredVoices,
  loadStoredScripts,
  saveStoredScripts,
  loadStoredTakes,
  saveStoredTakes,
  loadEngineConfig,
  saveEngineConfig,
  loadFXConfig,
  saveFXConfig,
} from "./utils/storage";
import "./voicestudio.css";

export function VoiceStudioApp() {
  const [activeTab, setActiveTab] = useState<StudioTab>("tts");
  const [voices, setVoices] = useState<VoicePreset[]>([]);
  const [scripts, setScripts] = useState<ScriptBlock[]>([]);
  const [takes, setTakes] = useState<AudioTake[]>([]);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(loadEngineConfig());
  const [fxConfig, setFxConfig] = useState<FXRackConfig>(loadFXConfig());

  const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);
  const [isTakesDrawerOpen, setIsTakesDrawerOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    setVoices(loadStoredVoices());
    setScripts(loadStoredScripts());
    setTakes(loadStoredTakes());
  }, []);

  // Voice Handlers
  const handleAddVoice = (newVoice: VoicePreset) => {
    const updated = [newVoice, ...voices];
    setVoices(updated);
    saveStoredVoices(updated);
  };

  const handleDeleteVoice = (voiceId: string) => {
    const updated = voices.filter((v) => v.id !== voiceId);
    setVoices(updated);
    saveStoredVoices(updated);
  };

  // Script Handlers
  const handleUpdateScripts = (newScripts: ScriptBlock[]) => {
    setScripts(newScripts);
    saveStoredScripts(newScripts);
  };

  // Take Handlers
  const handleAddTake = (newTake: AudioTake) => {
    const updated = [newTake, ...takes];
    setTakes(updated);
    saveStoredTakes(updated);
  };

  const handleDeleteTake = (takeId: string) => {
    const updated = takes.filter((t) => t.id !== takeId);
    setTakes(updated);
    saveStoredTakes(updated);
  };

  const handleClearTakes = () => {
    setTakes([]);
    saveStoredTakes([]);
  };

  // Config Handlers
  const handleSaveEngineConfig = (newConfig: EngineConfig) => {
    setEngineConfig(newConfig);
    saveEngineConfig(newConfig);
  };

  const handleUpdateFX = (newFX: FXRackConfig) => {
    setFxConfig(newFX);
    saveFXConfig(newFX);
  };

  // Transition from Dictation to TTS
  const handleSendDictationToTTS = (text: string) => {
    const newBlock: ScriptBlock = {
      id: `script-${Date.now()}`,
      speakerId: voices[0]?.id || "canonical-luiz-caramelo",
      text,
      emotion: "confessional",
      pauseAfterSeconds: 0.5,
      speed: 1.0,
      pitchOffset: 0,
    };
    handleUpdateScripts([...scripts, newBlock]);
    setActiveTab("tts");
  };

  return (
    <div className="voicestudio-root">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        engineConfig={engineConfig}
        onOpenEngineSettings={() => setIsEngineModalOpen(true)}
        onToggleTakesDrawer={() => setIsTakesDrawerOpen(!isTakesDrawerOpen)}
        takesCount={takes.length}
      />

      <main className="vs-main-content">
        {activeTab === "tts" && (
          <TTSStudio
            voices={voices}
            scripts={scripts}
            onUpdateScripts={handleUpdateScripts}
            onAddTake={handleAddTake}
            engineConfig={engineConfig}
          />
        )}

        {activeTab === "cloning" && (
          <VoiceCloningStudio
            voices={voices}
            onAddVoice={handleAddVoice}
            onDeleteVoice={handleDeleteVoice}
            onAddTake={handleAddTake}
          />
        )}

        {activeTab === "designer" && (
          <VoiceDesigner onAddVoice={handleAddVoice} onAddTake={handleAddTake} />
        )}

        {activeTab === "dubbing" && (
          <VideoDubbingStudio voices={voices} onAddTake={handleAddTake} />
        )}

        {activeTab === "dictation" && (
          <DictationStudio onSendToTTS={handleSendDictationToTTS} />
        )}

        {activeTab === "batch" && (
          <NarratorBatchQueue voices={voices} onAddTake={handleAddTake} />
        )}

        {activeTab === "fx" && (
          <StudioFXRack fxConfig={fxConfig} onUpdateFX={handleUpdateFX} />
        )}
      </main>

      <EngineSettingsModal
        config={engineConfig}
        isOpen={isEngineModalOpen}
        onClose={() => setIsEngineModalOpen(false)}
        onSaveConfig={handleSaveEngineConfig}
      />

      <TakesDrawer
        isOpen={isTakesDrawerOpen}
        onClose={() => setIsTakesDrawerOpen(false)}
        takes={takes}
        onDeleteTake={handleDeleteTake}
        onClearTakes={handleClearTakes}
      />
    </div>
  );
}
