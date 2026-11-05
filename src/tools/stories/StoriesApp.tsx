import { useRef, useEffect, useState } from "react";
import { useStoriesStore } from "./store/useStoriesStore";
import { initCustomFonts } from "./store/brandStore";
import { StoriesCanvas } from "./canvas/StoriesCanvas";
import { TopBar } from "./components/TopBar";
import { BottomActionBar } from "./components/BottomActionBar";
import { TextEditorModal } from "./components/TextEditorModal";
import { StickersDrawer } from "./components/StickersDrawer";
import { BackgroundDrawer } from "./components/BackgroundDrawer";
import { BrandKitDrawer } from "./components/BrandKitDrawer";
import { TemplatesDrawer } from "./components/TemplatesDrawer";
import { ExportModal } from "./components/ExportModal";
import { QrCodeModal } from "./components/QrCodeModal";
import { InstagramNativeFooter } from "./components/InstagramNativeFooter";
import { StoriesTrashBin } from "./components/StoriesTrashBin";
import { DrawingCanvas } from "./components/DrawingCanvas";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { toPng, toJpeg } from "html-to-image";
import type { TextLayer, ImageLayer, StoryFilterId } from "./types";
import "./stories.css";

export function StoriesApp() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Dragging & Trash Bin state
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Drawing overlay state
  const [isDrawing, setIsDrawing] = useState(false);

  // Quick feedback toast
  const [quickToast, setQuickToast] = useState<string | null>(null);

  const {
    background,
    setBackground,
    layers,
    selectedLayerId,
    setSelectedLayerId,
    selectedLayer,
    addLayer,
    updateLayer,
    removeLayer,
    duplicateLayer,
    bringToFront,
    sendToBack,
    centerLayer,
    toggleLock,
    undo,
    redo,
    canUndo,
    canRedo,
    loadTemplate,
    resetStory,
    // Brand kits
    brandKits,
    activeBrandKit,
    selectBrandKit,
    updateBrandKit,
    createBrandKit,
    applyBrandKitToStory,
    // UI state
    activeDrawer,
    setActiveDrawer,
    showSafeZones,
    setShowSafeZones,
    editingTextId,
    setEditingTextId,
    isAudioMuted,
    setIsAudioMuted,
  } = useStoriesStore();

  // Load custom fonts on mount
  useEffect(() => {
    initCustomFonts().catch(console.error);
  }, []);

  // Handler to create a new text layer or edit existing (Instagram Aa tap to type)
  const handleNewText = () => {
    const newId = `text_${Date.now()}`;
    const newTextLayer: TextLayer = {
      id: newId,
      type: "text",
      text: "Toque para digitar...",
      font: activeBrandKit.fonts.headline || "Space Grotesk",
      fontSize: 48,
      lineHeight: 1.25,
      letterSpacing: 0,
      color: activeBrandKit.colors.textLight || "#FFF4E8",
      align: "center",
      backgroundMode: "none",
      backgroundColor: activeBrandKit.colors.primary || "#FF701A",
      isUppercase: false,
      isBold: true,
      isItalic: false,
      maxWidth: 860,
      x: 540,
      y: 960,
      rotation: 0,
      scale: 1,
      opacity: 1,
    };
    addLayer(newTextLayer);
    setEditingTextId(newId);
  };

  const editingTextLayer = (layers.find((l) => l.id === editingTextId) as TextLayer) || null;

  // Instagram Native Quick Export ("Baixar Imagem" -> Instant PNG 1080x1920)
  const handleQuickExport = async () => {
    if (!canvasRef.current) return;
    try {
      setQuickToast("Salvando story em alta resolução...");
      const node = canvasRef.current;
      const dataUrl = await toPng(node, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        filter: (domNode: HTMLElement) => {
          if (domNode.classList && domNode.classList.contains("handle")) return false;
          return true;
        },
      });
      const link = document.createElement("a");
      const filename = `story-instagram-${Date.now()}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setQuickToast("Story salvo com sucesso! 📸");
      setTimeout(() => setQuickToast(null), 2500);
    } catch (err) {
      console.error(err);
      setQuickToast("Erro ao exportar story");
      setTimeout(() => setQuickToast(null), 2500);
    }
  };

  // Instagram Native Share (Web Share API or direct JPG download)
  const handleShareCloseFriends = async () => {
    if (!canvasRef.current) return;
    try {
      setQuickToast("Preparando compartilhamento...");
      const node = canvasRef.current;
      const dataUrl = await toJpeg(node, {
        width: 1080,
        height: 1920,
        quality: 0.95,
        filter: (domNode: HTMLElement) => {
          if (domNode.classList && domNode.classList.contains("handle")) return false;
          return true;
        },
      });

      if (navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `story-instagram.jpg`, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Story Instagram",
            files: [file],
          });
          setQuickToast("Story compartilhado! 🌟");
          setTimeout(() => setQuickToast(null), 2000);
          return;
        }
      }

      // Fallback: direct JPG download
      const link = document.createElement("a");
      link.download = `story-instagram-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
      setQuickToast("Story salvo em JPG! 🌟");
      setTimeout(() => setQuickToast(null), 2500);
    } catch (err) {
      console.error(err);
      setQuickToast("Erro ao compartilhar");
      setTimeout(() => setQuickToast(null), 2500);
    }
  };

  // Save drawing from DrawingCanvas
  const handleSaveDrawing = (drawingDataUrl: string | null) => {
    if (drawingDataUrl) {
      const drawingLayer: ImageLayer = {
        id: `drawing_${Date.now()}`,
        type: "image",
        url: drawingDataUrl,
        width: 1080,
        height: 1920,
        borderRadius: 0,
        shadow: false,
        border: false,
        borderColor: "transparent",
        borderWidth: 0,
        x: 540,
        y: 960,
        rotation: 0,
        scale: 1,
        opacity: 1,
      };
      addLayer(drawingLayer);
    }
    setIsDrawing(false);
  };

  // Select filter
  const handleSelectFilter = (filterId: StoryFilterId, intensity: number) => {
    setBackground({
      ...background,
      filter: filterId,
      filterIntensity: intensity,
    });
  };

  return (
    <div className="stories-app-root ig-editor-mode">
      {/* Top action toolbar (Instagram story header style) */}
      <TopBar
        activeDrawer={activeDrawer}
        onOpenDrawer={setActiveDrawer}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        showSafeZones={showSafeZones}
        onToggleSafeZones={() => setShowSafeZones(!showSafeZones)}
        isAudioMuted={isAudioMuted}
        onToggleAudio={() => setIsAudioMuted(!isAudioMuted)}
        onNewText={handleNewText}
        onOpenDrawing={() => setIsDrawing(true)}
        onReset={resetStory}
      />

      {/* Main workspace containing the 9:16 interactive canvas */}
      <main className="stories-workspace">
        <StoriesCanvas
          canvasRef={canvasRef}
          background={background}
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={updateLayer}
          onDeleteLayer={removeLayer}
          onDuplicateLayer={duplicateLayer}
          onEditTextLayer={(id) => setEditingTextId(id)}
          showSafeZones={showSafeZones}
          isMuted={isAudioMuted}
          onDragStateChange={(dragging, overTrash) => {
            setIsDraggingLayer(dragging);
            setIsOverTrash(overTrash);
          }}
          onTapEmpty={handleNewText}
        />

        {/* Floating bottom action bar when an element is selected */}
        <BottomActionBar
          selectedLayer={selectedLayer}
          onDelete={removeLayer}
          onDuplicate={duplicateLayer}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onCenter={centerLayer}
          onToggleLock={toggleLock}
          onEditText={(id) => setEditingTextId(id)}
          onDeselect={() => setSelectedLayerId(null)}
        />

        {/* Floating Trash Bin on Drag */}
        <StoriesTrashBin isVisible={isDraggingLayer} isOverTrash={isOverTrash} />

        {/* Instagram Native Footer Chrome */}
        <InstagramNativeFooter
          onQuickExport={handleQuickExport}
          onShareCloseFriends={handleShareCloseFriends}
          onOpenFullExport={() => setActiveDrawer("export")}
          isDragging={isDraggingLayer}
          isLayerSelected={Boolean(selectedLayerId)}
        />
      </main>

      {/* Fullscreen Drawing Canvas Overlay */}
      {isDrawing && (
        <div className="drawing-canvas-fullscreen-overlay">
          <DrawingCanvas onClose={handleSaveDrawing} />
        </div>
      )}

      {/* Fullscreen Text Editor Modal (Aa Mode) */}
      {editingTextId && (
        <TextEditorModal
          layer={editingTextLayer}
          activeBrandKit={activeBrandKit}
          onSave={(patch) => {
            if (editingTextId) updateLayer(editingTextId, patch);
          }}
          onClose={() => setEditingTextId(null)}
        />
      )}

      {/* Instagram Story Filters & Effects Drawer */}
      {activeDrawer === "filters" && (
        <FiltersDrawer
          activeFilterId={background.filter || "none"}
          activeIntensity={background.filterIntensity ?? 1}
          onSelectFilter={handleSelectFilter}
          onClose={() => setActiveDrawer("none")}
        />
      )}

      {/* Stickers & Widgets Drawer */}
      {activeDrawer === "stickers" && (
        <StickersDrawer
          activeBrandKit={activeBrandKit}
          onAddLayer={addLayer}
          onClose={() => setActiveDrawer("none")}
        />
      )}

      {/* Background Drawer */}
      {activeDrawer === "background" && (
        <BackgroundDrawer
          background={background}
          activeBrandKit={activeBrandKit}
          onChangeBackground={setBackground}
          onClose={() => setActiveDrawer("none")}
        />
      )}

      {/* Brand Kit Drawer */}
      {activeDrawer === "brand" && (
        <BrandKitDrawer
          brandKits={brandKits}
          activeBrandKit={activeBrandKit}
          onSelectBrandKit={selectBrandKit}
          onUpdateBrandKit={updateBrandKit}
          onCreateBrandKit={createBrandKit}
          onApplyBrandKitToStory={applyBrandKitToStory}
          onAddLayer={addLayer}
          onClose={() => setActiveDrawer("none")}
        />
      )}

      {/* Templates Drawer */}
      {activeDrawer === "templates" && (
        <TemplatesDrawer
          currentBackground={background}
          currentLayers={layers}
          onLoadTemplate={loadTemplate}
          onClose={() => setActiveDrawer("none")}
        />
      )}

      {/* Export Modal */}
      {activeDrawer === "export" && (
        <ExportModal
          canvasRef={canvasRef}
          onClose={() => setActiveDrawer("none")}
          onOpenQrCode={() => setShowQrModal(true)}
        />
      )}

      {/* Wi-Fi Mobile QR Code Modal */}
      {(showQrModal || activeDrawer === "qrcode") && (
        <QrCodeModal
          onClose={() => {
            setShowQrModal(false);
            if (activeDrawer === "qrcode") setActiveDrawer("none");
          }}
        />
      )}

      {/* Quick feedback toast */}
      {quickToast && (
        <div className="stories-quick-toast">
          <span>{quickToast}</span>
        </div>
      )}
    </div>
  );
}
