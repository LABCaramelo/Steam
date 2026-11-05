import { useState, useCallback, useRef } from "react";
import type {
  StoryLayer,
  StoryBackground,
  ActiveDrawer,
  BrandKit,
  StoryTemplate,
  TextLayer,
} from "../types";
import {
  loadBrandKits,
  saveBrandKits,
  getActiveBrandKitId,
  setActiveBrandKitId,
  DEFAULT_BRAND_KITS,
} from "./brandStore";
import { BUILT_IN_TEMPLATES } from "./templatesStore";

const MAX_HISTORY = 30;

export function useStoriesStore() {
  // Brand kits state
  const [brandKits, setBrandKits] = useState<BrandKit[]>(() => loadBrandKits());
  const [activeBrandKitId, setActiveKitId] = useState<string>(() => getActiveBrandKitId());

  const activeBrandKit =
    brandKits.find((k) => k.id === activeBrandKitId) || brandKits[0] || DEFAULT_BRAND_KITS[0];

  // Default initial story state (from template 0)
  const initialTemplate = BUILT_IN_TEMPLATES[0];
  const [background, setBackgroundState] = useState<StoryBackground>(initialTemplate.background);
  const [layers, setLayersState] = useState<StoryLayer[]>(initialTemplate.layers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // History for undo/redo
  const historyRef = useRef<{ background: StoryBackground; layers: StoryLayer[] }[]>([
    { background: initialTemplate.background, layers: initialTemplate.layers },
  ]);
  const historyIndexRef = useRef<number>(0);
  const [, setHistoryVersion] = useState(0);

  const pushHistory = useCallback((newBg: StoryBackground, newLayers: StoryLayer[]) => {
    const currentHist = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (currentHist.length >= MAX_HISTORY) {
      currentHist.shift();
    }
    currentHist.push({ background: newBg, layers: newLayers });
    historyRef.current = currentHist;
    historyIndexRef.current = currentHist.length - 1;
    setHistoryVersion((v) => v + 1);
  }, []);

  // UI state
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>("none");
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Selected layer reference
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  // Actions
  const setBackground = useCallback(
    (bg: StoryBackground) => {
      setBackgroundState(bg);
      pushHistory(bg, layers);
    },
    [layers, pushHistory]
  );

  const setLayers = useCallback(
    (newLayers: StoryLayer[]) => {
      setLayersState(newLayers);
      pushHistory(background, newLayers);
    },
    [background, pushHistory]
  );

  const addLayer = useCallback(
    (layer: StoryLayer) => {
      const next = [...layers, layer];
      setLayersState(next);
      setSelectedLayerId(layer.id);
      pushHistory(background, next);
    },
    [layers, background, pushHistory]
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<StoryLayer>) => {
      setLayersState((prev) => {
        const next = prev.map((l) => (l.id === id ? ({ ...l, ...patch } as StoryLayer) : l));
        pushHistory(background, next);
        return next;
      });
    },
    [background, pushHistory]
  );

  const removeLayer = useCallback(
    (id: string) => {
      setLayersState((prev) => {
        const next = prev.filter((l) => l.id !== id);
        pushHistory(background, next);
        return next;
      });
      if (selectedLayerId === id) setSelectedLayerId(null);
    },
    [selectedLayerId, background, pushHistory]
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      const target = layers.find((l) => l.id === id);
      if (!target) return;
      const copy: StoryLayer = {
        ...target,
        id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        x: target.x + 30,
        y: target.y + 30,
      } as StoryLayer;
      addLayer(copy);
    },
    [layers, addLayer]
  );

  const bringForward = useCallback(
    (id: string) => {
      setLayersState((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1 || idx === prev.length - 1) return prev;
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[idx + 1];
        next[idx + 1] = temp;
        pushHistory(background, next);
        return next;
      });
    },
    [background, pushHistory]
  );

  const sendBackward = useCallback(
    (id: string) => {
      setLayersState((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx <= 0) return prev;
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[idx - 1];
        next[idx - 1] = temp;
        pushHistory(background, next);
        return next;
      });
    },
    [background, pushHistory]
  );

  const bringToFront = useCallback(
    (id: string) => {
      setLayersState((prev) => {
        const target = prev.find((l) => l.id === id);
        if (!target) return prev;
        const next = [...prev.filter((l) => l.id !== id), target];
        pushHistory(background, next);
        return next;
      });
    },
    [background, pushHistory]
  );

  const sendToBack = useCallback(
    (id: string) => {
      setLayersState((prev) => {
        const target = prev.find((l) => l.id === id);
        if (!target) return prev;
        const next = [target, ...prev.filter((l) => l.id !== id)];
        pushHistory(background, next);
        return next;
      });
    },
    [background, pushHistory]
  );

  const centerLayer = useCallback(
    (id: string, axis: "x" | "y" | "both" = "both") => {
      setLayersState((prev) => {
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          return {
            ...l,
            x: axis === "y" ? l.x : 540,
            y: axis === "x" ? l.y : 960,
          } as StoryLayer;
        });
        pushHistory(background, next);
        return next;
      });
    },
    [background, pushHistory]
  );

  const toggleLock = useCallback(
    (id: string) => {
      setLayersState((prev) =>
        prev.map((l) => (l.id === id ? ({ ...l, locked: !l.locked } as StoryLayer) : l))
      );
    },
    []
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const snap = historyRef.current[historyIndexRef.current];
      setBackgroundState(snap.background);
      setLayersState(snap.layers);
      setHistoryVersion((v) => v + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const snap = historyRef.current[historyIndexRef.current];
      setBackgroundState(snap.background);
      setLayersState(snap.layers);
      setHistoryVersion((v) => v + 1);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const loadTemplate = useCallback(
    (template: StoryTemplate) => {
      setBackgroundState(template.background);
      setLayersState(template.layers);
      setSelectedLayerId(null);
      pushHistory(template.background, template.layers);
    },
    [pushHistory]
  );

  const resetStory = useCallback(() => {
    const blankBg: StoryBackground = { type: "color", value: "#101014" };
    setBackgroundState(blankBg);
    setLayersState([]);
    setSelectedLayerId(null);
    pushHistory(blankBg, []);
  }, [pushHistory]);

  const selectBrandKit = useCallback((id: string) => {
    setActiveKitId(id);
    setActiveBrandKitId(id);
  }, []);

  const updateBrandKit = useCallback(
    (updated: BrandKit) => {
      const next = brandKits.map((k) => (k.id === updated.id ? updated : k));
      setBrandKits(next);
      saveBrandKits(next);
    },
    [brandKits]
  );

  const createBrandKit = useCallback(
    (newKit: BrandKit) => {
      const next = [...brandKits, newKit];
      setBrandKits(next);
      saveBrandKits(next);
      selectBrandKit(newKit.id);
    },
    [brandKits, selectBrandKit]
  );

  // Apply active brand kit colors & typography to the current story layers
  const applyBrandKitToStory = useCallback(() => {
    const kit = activeBrandKit;
    const next = layers.map((l) => {
      if (l.type === "text") {
        const tl = l as TextLayer;
        return {
          ...tl,
          font: kit.fonts.headline || tl.font,
          color: kit.colors.textLight,
          backgroundColor:
            tl.backgroundMode === "pill" || tl.backgroundMode === "box"
              ? kit.colors.primary
              : tl.backgroundColor,
        };
      }
      if (l.type === "widget") {
        return {
          ...l,
          data: {
            ...l.data,
            primaryColor: kit.colors.primary,
          },
        };
      }
      if (l.type === "sticker" && l.stickerType === "badge") {
        return {
          ...l,
          bgColor: kit.colors.primary,
          color: kit.colors.textDark || "#101014",
        };
      }
      return l;
    });
    setLayersState(next);
    pushHistory(background, next);
  }, [activeBrandKit, layers, background, pushHistory]);

  return {
    background,
    setBackground,
    layers,
    setLayers,
    selectedLayerId,
    setSelectedLayerId,
    selectedLayer,
    addLayer,
    updateLayer,
    removeLayer,
    duplicateLayer,
    bringForward,
    sendBackward,
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
    // UI drawers
    activeDrawer,
    setActiveDrawer,
    showSafeZones,
    setShowSafeZones,
    editingTextId,
    setEditingTextId,
    isAudioMuted,
    setIsAudioMuted,
  };
}
