import { useNavigate, useOutletContext } from "react-router-dom";
import { AppArt } from "../../components/AppArt";
import { IconDownload, IconPlay } from "../../components/Icons";
import type { LibraryApp } from "../../types";
import type { LibraryOutletContext } from "./LibraryLayout";
import { usePlayAction } from "./play";

/** Portrait library capsule (library_600x900) with the hover play/install affordance. */
export function Capsule({ app, size = "md", caption }: { app: LibraryApp; size?: "sm" | "md" | "lg"; caption?: string }) {
  const nav = useNavigate();
  const { openContext } = useOutletContext<LibraryOutletContext>();
  const play = usePlayAction(app);
  return (
    <div
      className={`capsule capsule--${size}`}
      role="button"
      tabIndex={0}
      title={app.name}
      onClick={() => nav(`/library/app/${app.appid}`)}
      onKeyDown={(e) => e.key === "Enter" && nav(`/library/app/${app.appid}`)}
      onContextMenu={(e) => {
        e.preventDefault();
        openContext({ app, x: e.clientX, y: e.clientY });
      }}
    >
      <div className="capsule__art">
        <AppArt app={app} kind="capsule" />
        {(play.variant === "play" || play.variant === "install") && (
          <button
            className={`capsule__play capsule__play--${play.variant}`}
            title={play.label}
            onClick={(e) => {
              e.stopPropagation();
              play.onClick();
            }}
          >
            {play.variant === "play" ? <IconPlay size={18} /> : <IconDownload size={18} />}
          </button>
        )}
        {play.variant === "running" && <span className="capsule__badge">Jogando</span>}
        {play.variant === "busy" && <span className="capsule__badge">{play.label}</span>}
      </div>
      {caption && <div className="capsule__caption">{caption}</div>}
    </div>
  );
}
