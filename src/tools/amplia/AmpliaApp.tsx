import { useCallback, useEffect, useState } from "react";
import type {
  AmpliaMode,
  AudioStudioSettings,
  BgRemoveSettings,
  EngineStatus,
  MediaAsset,
  RestoreSettings,
  UpscaleSettings,
  VideoToolsSettings,
} from "./types";
import { Header } from "./components/Header";
import { StageView } from "./components/StageView";
import { ControlPanel } from "./components/ControlPanel";
import { PresetsModal } from "./components/PresetsModal";
import { EngineBridgeModal } from "./components/EngineBridgeModal";
import {
  checkEngineHealth,
  DEFAULT_ENGINE_URL,
  triggerAudioDenoise,
  triggerAudioSeparation,
  triggerBgRemove,
  triggerImageUpscale,
  triggerMagicEraser,
  triggerRestoreOldPhoto,
  uploadImageToEngine,
} from "./utils/engineClient";
import { clientSideQuickUpscale, compositeWithBackground } from "./utils/imageProcessor";
import { masterAudio } from "./utils/audioDsp";
import "./amplia.css";

export function AmpliaApp() {
  const [currentMode, setCurrentMode] = useState<AmpliaMode>("upscale");
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Engine Bridge State
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    connected: false,
    url: DEFAULT_ENGINE_URL,
    checking: true,
  });

  // Modals
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isEngineModalOpen, setIsEngineModalOpen] = useState<boolean>(false);

  // Settings per module
  const [upscaleSettings, setUpscaleSettings] = useState<UpscaleSettings>({
    scale: 4,
    model: "realesrgan-x4plus",
    faceRestore: true,
    faceStrength: 85,
    denoiseStrength: 20,
  });

  const [bgSettings, setBgSettings] = useState<BgRemoveSettings>({
    mode: "transparent",
    solidColor: "#101014",
    feathering: 2,
  });

  const [brushSize, setBrushSize] = useState<number>(28);
  const [maskDataUrl, setMaskDataUrl] = useState<string | undefined>(undefined);

  const [restoreSettings, setRestoreSettings] = useState<RestoreSettings>({
    denoiseLevel: 50,
    deblurLevel: 40,
    colorizeSaturation: 1.0,
    colorizeWarmth: 0.15,
  });

  const [audioSettings, setAudioSettings] = useState<AudioStudioSettings>({
    subMode: "mastering",
    targetLufs: -14,
    bassEnhance: 2.0,
    airPresence: 1.5,
    warmth: 0.2,
    limiterCeilingDb: -0.5,
  });

  const [videoSettings, setVideoSettings] = useState<VideoToolsSettings>({
    subMode: "compress",
    targetSizeMb: 25,
    gifFps: 15,
    gifWidth: 640,
    cleanAudioAction: "remove_noise",
  });

  // Audio Metrics for display
  const [audioMetrics, setAudioMetrics] = useState<{
    originalLufs?: number;
    masteredLufs?: number;
    originalPeakDb?: number;
    masteredPeakDb?: number;
  }>({});

  // Check Engine Health on mount
  const refreshEngineHealth = useCallback(async (customUrl?: string) => {
    setEngineStatus((prev) => ({ ...prev, checking: true }));
    const result = await checkEngineHealth(customUrl || engineStatus.url);
    setEngineStatus(result);
  }, [engineStatus.url]);

  useEffect(() => {
    refreshEngineHealth();
  }, [refreshEngineHealth]);

  // File loading
  const handleSelectFile = (file: File) => {
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");
    const type: "image" | "audio" | "video" = isAudio ? "audio" : isVideo ? "video" : "image";

    const objectUrl = URL.createObjectURL(file);
    const newAsset: MediaAsset = {
      id: `asset-${Date.now()}`,
      file,
      name: file.name,
      type,
      originalUrl: objectUrl,
      sizeBytes: file.size,
      status: "idle",
    };

    if (isAudio && currentMode !== "audio_studio") {
      setCurrentMode("audio_studio");
    } else if (isVideo && currentMode !== "video_tools") {
      setCurrentMode("video_tools");
    }

    setAsset(newAsset);
    setMaskDataUrl(undefined);
  };

  // Preset Selection
  const handleSelectPreset = (presetId: string, mode: AmpliaMode) => {
    setCurrentMode(mode);
    if (presetId === "carrossel_head") {
      setUpscaleSettings({
        scale: 4,
        model: "realesrgan-x4plus",
        faceRestore: false,
        faceStrength: 70,
        denoiseStrength: 15,
      });
    } else if (presetId === "model_sheet_face") {
      setUpscaleSettings({
        scale: 4,
        model: "realesrgan-x4plus",
        faceRestore: true,
        faceStrength: 90,
        denoiseStrength: 10,
      });
    } else if (presetId === "sticker_layer") {
      setBgSettings({
        mode: "transparent",
        solidColor: "#101014",
        feathering: 2,
      });
    } else if (presetId === "reels_voiceover") {
      setAudioSettings({
        subMode: "mastering",
        targetLufs: -14,
        bassEnhance: 1.5,
        airPresence: 3.0,
        warmth: 0.25,
        limiterCeilingDb: -0.5,
      });
    }
  };

  // Main Processing Handler
  const handleRunProcess = async () => {
    if (!asset || !asset.file) return;
    setIsProcessing(true);

    try {
      // 1. Audio Studio Processing
      if (currentMode === "audio_studio") {
        if (audioSettings.subMode === "mastering") {
          // Native browser DSP mastering (instant, 100% offline)
          const arrayBuffer = await asset.file.arrayBuffer();
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);

          const { blob, metrics } = await masterAudio(decoded, {
            targetLufs: audioSettings.targetLufs,
            bassBoostDb: audioSettings.bassEnhance,
            airBoostDb: audioSettings.airPresence,
            warmth: audioSettings.warmth,
            limiterCeilingDb: audioSettings.limiterCeilingDb,
          });

          const resUrl = URL.createObjectURL(blob);
          setAsset((prev) =>
            prev
              ? {
                  ...prev,
                  resultUrl: resUrl,
                  resultBlob: blob,
                  status: "done",
                  processedAt: Date.now(),
                }
              : null
          );
          setAudioMetrics(metrics);
        } else if (audioSettings.subMode === "stem_split" && engineStatus.connected) {
          const { vocalsUrl, instrumentalUrl } = await triggerAudioSeparation(
            asset.file,
            engineStatus.url
          );
          setAsset((prev) =>
            prev
              ? {
                  ...prev,
                  resultUrl: vocalsUrl,
                  status: "done",
                  meta: { instrumentalUrl },
                }
              : null
          );
        } else if (audioSettings.subMode === "voice_denoise" && engineStatus.connected) {
          const blob = await triggerAudioDenoise(asset.file, engineStatus.url);
          const resUrl = URL.createObjectURL(blob);
          setAsset((prev) =>
            prev ? { ...prev, resultUrl: resUrl, resultBlob: blob, status: "done" } : null
          );
        } else {
          // Fallback if local engine not connected for stems/denoise
          setIsEngineModalOpen(true);
        }
      }

      // 2. Image Upscale & Face Restore
      else if (currentMode === "upscale" || currentMode === "face_restore") {
        if (engineStatus.connected && upscaleSettings.model !== "quick-cas") {
          const taskId = await uploadImageToEngine(asset.file, engineStatus.url);
          const downloadUrl = await triggerImageUpscale(
            taskId,
            {
              scale: upscaleSettings.scale,
              model: upscaleSettings.model,
              faceRestore: upscaleSettings.faceRestore || currentMode === "face_restore",
              faceStrength: upscaleSettings.faceStrength,
              denoise: upscaleSettings.denoiseStrength,
            },
            engineStatus.url
          );
          setAsset((prev) =>
            prev ? { ...prev, resultUrl: downloadUrl, status: "done" } : null
          );
        } else {
          // Fast native browser upscale with CAS sharpening filter
          const { url, blob } = await clientSideQuickUpscale(
            asset.originalUrl,
            upscaleSettings.scale >= 4 ? 4 : 2,
            0.75
          );
          setAsset((prev) =>
            prev ? { ...prev, resultUrl: url, resultBlob: blob, status: "done" } : null
          );
        }
      }

      // 3. Background Removal
      else if (currentMode === "bg_remove") {
        if (engineStatus.connected) {
          const blob = await triggerBgRemove(asset.file, engineStatus.url);
          let finalUrl = URL.createObjectURL(blob);
          if (bgSettings.mode === "solid" && bgSettings.solidColor !== "transparent") {
            const compositedBlob = await compositeWithBackground(
              finalUrl,
              bgSettings.solidColor,
              asset.width || 1200,
              asset.height || 1200
            );
            finalUrl = URL.createObjectURL(compositedBlob);
          }
          setAsset((prev) =>
            prev ? { ...prev, resultUrl: finalUrl, resultBlob: blob, status: "done" } : null
          );
        } else {
          setIsEngineModalOpen(true);
        }
      }

      // 4. Magic Eraser (Inpainting)
      else if (currentMode === "magic_eraser") {
        if (engineStatus.connected && maskDataUrl) {
          const maskRes = await fetch(maskDataUrl);
          const maskBlob = await maskRes.blob();
          const blob = await triggerMagicEraser(asset.file, maskBlob, engineStatus.url);
          const resUrl = URL.createObjectURL(blob);
          setAsset((prev) =>
            prev ? { ...prev, resultUrl: resUrl, resultBlob: blob, status: "done" } : null
          );
        } else {
          setIsEngineModalOpen(true);
        }
      }

      // 5. Old Photo Restore & Colorize
      else if (currentMode === "colorize" || currentMode === "denoise_deblur") {
        if (engineStatus.connected) {
          const blob = await triggerRestoreOldPhoto(
            asset.file,
            { colorize: currentMode === "colorize", faceRestore: true },
            engineStatus.url
          );
          const resUrl = URL.createObjectURL(blob);
          setAsset((prev) =>
            prev ? { ...prev, resultUrl: resUrl, resultBlob: blob, status: "done" } : null
          );
        } else {
          setIsEngineModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error("[Amplia] Erro no processamento:", err);
      alert(err.message || "Ocorreu um erro durante o processamento com IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Output
  const handleDownloadResult = () => {
    if (!asset || !asset.resultUrl) return;
    const a = document.createElement("a");
    a.href = asset.resultUrl;
    const ext =
      asset.type === "audio"
        ? "wav"
        : asset.type === "video"
        ? "mp4"
        : "png";
    a.download = `${asset.name.replace(/\.[^.]+$/, "")}-amplia-lab.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="amplia-root">
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        engineStatus={engineStatus}
        onOpenEngineModal={() => setIsEngineModalOpen(true)}
        onOpenPresetsModal={() => setIsPresetsOpen(true)}
      />

      <main className="amplia-workspace">
        <StageView
          asset={asset}
          mode={currentMode}
          onSelectFile={handleSelectFile}
          brushSize={brushSize}
          onMaskChange={setMaskDataUrl}
          onClearMask={() => setMaskDataUrl(undefined)}
          audioMetrics={audioMetrics}
        />

        <ControlPanel
          mode={currentMode}
          asset={asset}
          engineStatus={engineStatus}
          upscaleSettings={upscaleSettings}
          setUpscaleSettings={setUpscaleSettings}
          bgSettings={bgSettings}
          setBgSettings={setBgSettings}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          restoreSettings={restoreSettings}
          setRestoreSettings={setRestoreSettings}
          audioSettings={audioSettings}
          setAudioSettings={setAudioSettings}
          videoSettings={videoSettings}
          setVideoSettings={setVideoSettings}
          isProcessing={isProcessing}
          onRunProcess={handleRunProcess}
          onDownloadResult={handleDownloadResult}
        />
      </main>

      {/* Modals */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      <EngineBridgeModal
        isOpen={isEngineModalOpen}
        onClose={() => setIsEngineModalOpen(false)}
        engineStatus={engineStatus}
        onRefreshHealth={refreshEngineHealth}
      />
    </div>
  );
}
