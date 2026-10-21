import { useEffect, useState } from "react";
import { useLibrary } from "../api";
import { useAuth } from "../auth";
import type { MemberStatus } from "../community";
import { useUi, type PersonaStatus } from "../ui";

const STATUS_COLOR: Record<PersonaStatus, string> = {
  online: "var(--c-online)",
  away: "var(--c-away)",
  invisible: "var(--c-offline)",
  offline: "var(--c-offline)",
};

export function Avatar({ size = 32 }: { size?: number }) {
  const { snapshot } = useLibrary();
  const { profile } = useAuth();
  const { status } = useUi();
  const [failed, setFailed] = useState(false);
  const name = profile?.nickname || profile?.name || snapshot?.user?.personaName || "?";
  const avatarUrl = profile?.avatar_url || snapshot?.user?.avatarUrl;
  const style = { width: size, height: size, borderColor: STATUS_COLOR[status] };

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  if (avatarUrl && !failed) {
    return <img className="avatar" style={style} src={avatarUrl} alt={name} onError={() => setFailed(true)} />;
  }

  if (snapshot?.user?.hasAvatar && !failed) {
    return <img className="avatar" style={style} src="/api/avatar" alt={name} onError={() => setFailed(true)} />;
  }

  return (
    <span className="avatar avatar--fallback" style={{ ...style, fontSize: size * 0.45 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Avatar de outro membro da Comunidade; a borda mostra se a pessoa está on-line, ausente ou fora. */
export function MemberAvatar({ name, url, status, size = 32 }: { name: string; url: string | null; status: MemberStatus | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderColor: STATUS_COLOR[status ?? "offline"] };

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (url && !failed) {
    return <img className="avatar" style={style} src={url} alt={name} onError={() => setFailed(true)} />;
  }

  return (
    <span className="avatar avatar--fallback" style={{ ...style, fontSize: size * 0.45 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export { STATUS_COLOR };
