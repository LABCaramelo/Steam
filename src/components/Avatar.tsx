import { useState } from "react";
import { useLibrary } from "../api";
import { useUi, type PersonaStatus } from "../ui";

const STATUS_COLOR: Record<PersonaStatus, string> = {
  online: "var(--c-online)",
  away: "var(--c-away)",
  invisible: "var(--c-offline)",
  offline: "var(--c-offline)",
};

export function Avatar({ size = 32 }: { size?: number }) {
  const { snapshot } = useLibrary();
  const { status } = useUi();
  const [failed, setFailed] = useState(false);
  const name = snapshot?.user?.personaName ?? "?";
  const style = { width: size, height: size, borderColor: STATUS_COLOR[status] };
  if (snapshot?.user?.hasAvatar && !failed) {
    return <img className="avatar" style={style} src="/api/avatar" alt="" onError={() => setFailed(true)} />;
  }
  return (
    <span className="avatar avatar--fallback" style={{ ...style, fontSize: size * 0.45 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export { STATUS_COLOR };
