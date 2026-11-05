import { IconArrowRight, MagneticButton } from "@caramelo/design-system";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UNCONFIGURED_MESSAGE, useEntitlements } from "../entitlements";
import type { LibraryApp } from "../types";
import { useUi } from "../ui";
import { IconPlay } from "./Icons";
import { useAuth } from "../auth";
import { canUseTool, isActiveAdmin, toolAccessMessage } from "../toolPermissions";

/** The store follows the same role and publication rules as the library. */
export function AcquireButton({ app, size = "md", block }: { app: LibraryApp; size?: "sm" | "md" | "lg"; block?: boolean }) {
  const nav = useNavigate();
  const ui = useUi();
  const { owns, acquire, status } = useEntitlements();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = app.tool!.slug;

  if (!canUseTool(app.tool!, profile)) {
    const label = !app.tool!.available ? "Em breve" : app.tool!.stage === "beta" ? "Exclusivo BETA" : "Acesso indisponível";
    return <MagneticButton variant="surface" size={size} block={block} title={toolAccessMessage(app.tool!, profile)} disabled>{label}</MagneticButton>;
  }

  if (owns(slug) || isActiveAdmin(profile)) {
    return (
      <MagneticButton variant="surface" size={size} block={block} icon={<IconPlay size={16} />} onClick={() => nav(app.tool!.launchPath)}>
        Abrir
      </MagneticButton>
    );
  }

  const unconfigured = status === "unconfigured";
  const onAcquire = async () => {
    setBusy(true);
    setError(null);
    try {
      await acquire(slug);
      ui.toast(`${app.name} entrou na sua biblioteca.`);
      nav(`/library/app/${app.appid}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível adquirir agora.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`acquire ${block ? "acquire--block" : ""}`}>
      <MagneticButton
        variant="accent"
        size={size}
        block={block}
        disabled={busy || unconfigured || status === "loading"}
        aria-busy={busy}
        icon={<IconArrowRight />}
        onClick={onAcquire}
      >
        {busy ? "Adquirindo…" : "Adquirir"}
      </MagneticButton>
      {(error || unconfigured) && (
        <p className="acquire__error" role="alert">
          {error ?? UNCONFIGURED_MESSAGE}
        </p>
      )}
    </div>
  );
}

export function OwnedBadge({ owned, available, stage }: { owned: boolean; available: boolean; stage?: "beta" | "stable" }) {
  const { profile } = useAuth();
  const admin = isActiveAdmin(profile);
  if (!available) return <span className="store-badge store-badge--soon">{admin ? "Pré-publicação · ADMIN" : "Em breve"}</span>;
  return (
    <span className="store-badges">
      {stage === "beta" && <span className="store-badge store-badge--beta">Beta</span>}
      {stage === "beta" && !admin && profile?.role !== "beta"
        ? <span className="store-badge">Exclusivo BETA</span>
        : owned || admin ? <span className="store-badge store-badge--owned">Na biblioteca</span> : <span className="store-badge">Gratuito</span>}
    </span>
  );
}
