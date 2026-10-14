import { useState, type CSSProperties } from "react";
import { artUrl } from "../api";
import type { ArtKind, LibraryApp } from "../types";

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
  const [failed, setFailed] = useState(false);
  const has = app.art[kind] && !failed;
  if (!has) {
    return (
      <div className={`art-fallback ${className ?? ""}`} style={placeholderStyle(app.appid)}>
        {fallbackLabel && <span>{app.name}</span>}
      </div>
    );
  }
  return <img className={className} src={artUrl(app.appid, kind)} alt={kind === "logo" ? app.name : ""} draggable={false} onError={() => setFailed(true)} />;
}

export function AppIcon({ app, size = 16 }: { app: LibraryApp; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!app.art.icon || failed) {
    return (
      <span className="app-icon app-icon--fallback" style={{ width: size, height: size, ...placeholderStyle(app.appid) }}>
        {app.name.charAt(0)}
      </span>
    );
  }
  return <img className="app-icon" width={size} height={size} src={artUrl(app.appid, "icon")} alt="" onError={() => setFailed(true)} />;
}
