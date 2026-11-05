import { useState, useEffect } from "react";
import type { CapMode, TakeRecord } from "./types";
import { TopBar } from "./components/TopBar";
import { RecorderView } from "./components/RecorderView";
import { StudioView } from "./components/StudioView";
import { LibraryDrawer } from "./components/LibraryDrawer";
import { ShareModal } from "./components/ShareModal";
import { ExportModal } from "./components/ExportModal";
import { saveTake, getAllTakes, deleteTake, updateTake } from "./utils/storage";
import { generateSampleTake } from "./utils/sampleDemo";
import "./cap.css";

export function CapApp() {
  const [mode, setMode] = useState<CapMode>("recorder");
  const [takes, setTakes] = useState<TakeRecord[]>([]);
  const [activeTake, setActiveTake] = useState<TakeRecord | null>(null);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // Load saved takes from IndexedDB on startup (and support ?take=<id> query param)
  useEffect(() => {
    async function load() {
      try {
        const stored = await getAllTakes();
        setTakes(stored);

        // Check if a specific take was requested in the URL
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("take");
        if (requestedId) {
          const matched = stored.find((t) => t.id === requestedId);
          if (matched) {
            setActiveTake(matched);
            setMode("studio");
            return;
          }
        }

        if (stored.length > 0 && !activeTake) {
          setActiveTake(stored[0]);
        }
      } catch (err) {
        console.error("Failed to load takes from IndexedDB:", err);
      }
    }
    load();
  }, []);

  const handleTakeFinished = async (newTake: TakeRecord) => {
    try {
      await saveTake(newTake);
      setTakes((prev) => [newTake, ...prev]);
      setActiveTake(newTake);
      setMode("studio");
    } catch (err) {
      console.error("Failed to save take:", err);
    }
  };

  const handleUpdateActiveTake = async (patch: Partial<TakeRecord>) => {
    if (!activeTake) return;
    const updated = { ...activeTake, ...patch };
    setActiveTake(updated);
    setTakes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    try {
      await updateTake(activeTake.id, patch);
    } catch (err) {
      console.error("Failed to update take in IndexedDB:", err);
    }
  };

  const handleDeleteTake = async (id: string) => {
    try {
      const target = takes.find((t) => t.id === id);
      if (target?.videoUrl && target.videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.videoUrl);
      }
      await deleteTake(id);
      setTakes((prev) => prev.filter((t) => t.id !== id));
      if (activeTake?.id === id) {
        const remaining = takes.filter((t) => t.id !== id);
        setActiveTake(remaining.length > 0 ? remaining[0] : null);
        if (remaining.length === 0) {
          setMode("recorder");
        }
      }
    } catch (err) {
      console.error("Failed to delete take:", err);
    }
  };

  const handleLoadDemo = async () => {
    setIsGeneratingDemo(true);
    try {
      const demoTake = await generateSampleTake();
      await saveTake(demoTake);
      setTakes((prev) => [demoTake, ...prev]);
      setActiveTake(demoTake);
      setMode("studio");
    } catch (err) {
      console.error("Failed to generate demo take:", err);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  return (
    <div className="cap-root">
      <TopBar
        mode={mode}
        setMode={setMode}
        activeTake={activeTake}
        onNewTake={() => setMode("recorder")}
        onOpenExport={() => setShowExportModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        takesCount={takes.length}
      />

      <main className="cap-view-container">
        {mode === "recorder" && (
          <RecorderView
            onTakeFinished={handleTakeFinished}
            onLoadSample={handleLoadDemo}
            isGeneratingSample={isGeneratingDemo}
          />
        )}

        {mode === "studio" && activeTake && (
          <StudioView
            take={activeTake}
            onUpdateTake={handleUpdateActiveTake}
          />
        )}

        {mode === "library" && (
          <LibraryDrawer
            takes={takes}
            onSelectTake={(t) => {
              setActiveTake(t);
              setMode("studio");
            }}
            onDeleteTake={handleDeleteTake}
            onShareTake={(t) => {
              setActiveTake(t);
              setShowShareModal(true);
            }}
            onNewRecording={() => setMode("recorder")}
            onLoadDemo={handleLoadDemo}
          />
        )}
      </main>

      {/* Share Modal */}
      {showShareModal && activeTake && (
        <ShareModal
          take={activeTake}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && activeTake && (
        <ExportModal
          take={activeTake}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
