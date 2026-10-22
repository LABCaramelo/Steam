import { useEffect, useState, type CSSProperties } from "react";
import { artUrl, steamCdnArtUrl } from "../api";
import type { ArtKind, LibraryApp } from "../types";
import { getRegisteredTool, subscribeCustomToolAssets } from "../toolCatalog";

/** Hue derived from the appid so placeholder art is stable per game. */
const hue = (appid: number) => (appid * 47) % 360;

export function placeholderStyle(appid: number): CSSProperties {
  const h = hue(appid);
  return { background: `linear-gradient(160deg, hsl(${h} 35% 32%), hsl(${(h + 40) % 360} 40% 14%))` };
}

interface Props {
  app: LibraryApp;
  kind: ArtKind;
  className?: string;
  /** Text shown when the image is missing (defaults to the app name). */
  fallbackLabel?: boolean;
}

export function AppArt({ app, kind, className, fallbackLabel = true }: Props) {
  const [triedCdn, setTriedCdn] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, setAssetTick] = useState(0);

  useEffect(() => {
    return subscribeCustomToolAssets(() => {
      setTriedCdn(false);
      setFailed(false);
      setAssetTick((t) => t + 1);
    });
  }, []);

  const handleError = () => {
    if (!triedCdn && !getRegisteredTool(app.appid) && !app.tool) {
      setTriedCdn(true);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div className={`art-fallback ${className ?? ""}`} style={placeholderStyle(app.appid)}>
        {fallbackLabel && <span>{app.name}</span>}
      </div>
    );
  }

  // Tenta primeiro a URL da API local; se falhar (ex: Vercel), o handleError muda para o CDN oficial do Steam
  const src = triedCdn ? steamCdnArtUrl(app.appid, kind) : artUrl(app.appid, kind);

  return (
    <img
      key={src}
      className={className}
      src={src}
      alt={kind === "logo" ? app.name : ""}
      draggable={false}
      onError={handleError}
    />
  );
}

export function AppIcon({ app, size = 16 }: { app: LibraryApp; size?: number }) {
  const [triedCdn, setTriedCdn] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, setAssetTick] = useState(0);

  useEffect(() => {
    return subscribeCustomToolAssets(() => {
      setTriedCdn(false);
      setFailed(false);
      setAssetTick((t) => t + 1);
    });
  }, []);

  const handleError = () => {
    if (!triedCdn && !getRegisteredTool(app.appid) && !app.tool) {
      setTriedCdn(true);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <span className="app-icon app-icon--fallback" style={{ width: size, height: size, ...placeholderStyle(app.appid) }}>
        {app.name.charAt(0)}
      </span>
    );
  }

  const src = triedCdn ? steamCdnArtUrl(app.appid, "icon") : artUrl(app.appid, "icon");

  return (
    <img
      key={src}
      className="app-icon"
      width={size}
      height={size}
      src={src}
      alt=""
      onError={handleError}
    />
  );
}
