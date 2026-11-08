import React, { useState } from "react";
import { EngineConfig } from "../types";
import { X, Settings2, Server, Cpu, Sparkles, Check, RefreshCw } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EngineConfig;
  onSaveConfig: (cfg: EngineConfig) => void;
  onResetDatabase: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDatabase,
}) => {
  const [formData, setFormData] = useState<EngineConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="bg-[#18181e] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF701A]/10 text-[#FF701A] border border-[#FF701A]/20">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#FFF4E8]">Configurações do Estúdio Trilha</h2>
              <p className="text-xs text-white/50">Motores de geração, ACE-Step 1.5 e conexões</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-xs font-bold text-white/70 uppercase mb-2">Motor de Áudio Ativo</label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  formData.provider === "webaudio_synth"
                    ? "bg-[#FF701A]/10 border-[#FF701A] text-[#FFF4E8]"
                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="webaudio_synth"
                  checked={formData.provider === "webaudio_synth"}
                  onChange={() => setFormData({ ...formData, provider: "webaudio_synth" })}
                  className="mt-1 accent-[#FF701A]"
                />
                <div>
                  <div className="text-xs font-bold text-[#FFF4E8] flex items-center gap-1.5">
                    <Cpu size={14} className="text-[#FF701A]" />
                    Síntese Musical Nativa Web Audio (Offline / Instantâneo)
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Gera arranjos polifônicos, baterias e melodias diretamente no navegador sem exigir servidor de GPU externo.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  formData.provider === "local_acestep"
                    ? "bg-[#FF701A]/10 border-[#FF701A] text-[#FFF4E8]"
                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="local_acestep"
                  checked={formData.provider === "local_acestep"}
                  onChange={() => setFormData({ ...formData, provider: "local_acestep" })}
                  className="mt-1 accent-[#FF701A]"
                />
                <div>
                  <div className="text-xs font-bold text-[#FFF4E8] flex items-center gap-1.5">
                    <Server size={14} className="text-[#25BFFF]" />
                    Servidor Local ACE-Step 1.5 (Gradio / GPU Local)
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Conecta ao modelo oficial ACE-Step 1.5 rodando na sua máquina via Gradio em localhost.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Gradio API Endpoint */}
          {formData.provider === "local_acestep" && (
            <div className="bg-[#101014] p-3 rounded-xl border border-white/10 space-y-2">
              <label className="block text-xs font-bold text-white/70 uppercase">
                URL do Gradio Server
              </label>
              <input
                type="text"
                value={formData.gradioApiUrl}
                onChange={(e) => setFormData({ ...formData, gradioApiUrl: e.target.value })}
                placeholder="http://localhost:7860"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#FFF4E8] focus:border-[#FF701A] focus:outline-none"
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoEnhance}
                onChange={(e) => setFormData({ ...formData, autoEnhance: e.target.checked })}
                className="rounded accent-[#FF701A]"
              />
              <span className="text-white/80">Aprimorar prompts musicais automaticamente com IA</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoCover}
                onChange={(e) => setFormData({ ...formData, autoCover: e.target.checked })}
                className="rounded accent-[#FF701A]"
              />
              <span className="text-white/80">Gerar capas procedurais exclusivas para cada trilha</span>
            </label>
          </div>

          {/* Reset database action */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/40">Dados locais salvos em IndexedDB</span>
            <button
              type="button"
              onClick={onResetDatabase}
              className="text-red-400/80 hover:text-red-400 flex items-center gap-1 font-semibold"
            >
              <RefreshCw size={12} />
              Restaurar Demonstrações
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#FF701A] hover:bg-[#ff8533] text-[#101014] font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xl"
            >
              {savedSuccess ? <Check size={16} /> : <Sparkles size={16} />}
              {savedSuccess ? "Configurações Salvas!" : "Salvar Preferências"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
