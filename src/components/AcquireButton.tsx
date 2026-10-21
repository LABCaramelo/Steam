import { IconArrowRight, MagneticButton } from "@caramelo/design-system";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UNCONFIGURED_MESSAGE, useEntitlements } from "../entitlements";
import type { LibraryApp } from "../types";
import { useUi } from "../ui";
import { IconPlay } from "./Icons";

/** Upcoming tools cannot be acquired or launched from the store. */
export function AcquireButton({ app, size = "md", block }: { app: LibraryApp; size?: "sm" | "md" | "lg"; block?: boolean }) {
  const nav = useNavigate();
  const ui = useUi();
  const { owns, acquire, status } = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = app.tool!.slug;

  if (!app.tool!.available) {
    return <MagneticButton variant="surface" size={size} block={block} disabled>Em breve</MagneticButton>;
  }

  if (owns(slug)) {
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

export function OwnedBadge({ owned, available }: { owned: boolean; available: boolean }) {
  if (!available) return <span className="store-badge store-badge--soon">Em breve</span>;
  return owned ? <span className="store-badge store-badge--owned">Na biblioteca</span> : <span className="store-badge">Gratuito</span>;
}
