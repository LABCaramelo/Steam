import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

/**
 * Tools in the signed-in person's library (public.user_tools). The store reads it to show
 * "Adquirir" or "Na biblioteca"; LibraryProvider only registers owned tools.
 * Rows are written only by public.acquire_tool on the server (supabase/lab-tools.sql).
 */

export type EntitlementStatus = "loading" | "ready" | "unconfigured" | "error";

interface EntitlementsState {
  status: EntitlementStatus;
  owned: ReadonlySet<string>;
  owns: (slug: string) => boolean;
  /** Adds the tool to the library. Rejects with a message for the person. */
  acquire: (slug: string) => Promise<void>;
  refresh: () => void;
}

const Ctx = createContext<EntitlementsState | null>(null);
const NONE: ReadonlySet<string> = new Set();

/** PostgREST answers these when lab-tools.sql was not run on the project yet. */
const MISSING = new Set(["PGRST202", "PGRST205", "42P01", "42883"]);

export const UNCONFIGURED_MESSAGE = "A loja ainda não está ligada ao banco do LAB. Rode supabase/lab-tools.sql no Supabase.";

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [status, setStatus] = useState<EntitlementStatus>("loading");
  const [owned, setOwned] = useState<ReadonlySet<string>>(NONE);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setOwned(NONE);
      setStatus("ready");
      return;
    }
    let alive = true;
    supabase
      .from("user_tools")
      .select("tool_slug")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setStatus(MISSING.has(error.code) ? "unconfigured" : "error");
          return;
        }
        setOwned(new Set((data ?? []).map((row) => row.tool_slug as string)));
        setStatus("ready");
      });
    return () => {
      alive = false;
    };
  }, [userId, tick]);

  // A tool acquired in another tab shows up when this one gets focus again.
  useEffect(() => {
    const onFocus = () => setTick((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const acquire = useCallback(async (slug: string) => {
    const { error } = await supabase.rpc("acquire_tool", { p_slug: slug });
    if (error) {
      if (MISSING.has(error.code)) throw new Error(UNCONFIGURED_MESSAGE);
      throw new Error(error.message || "Não foi possível adquirir a ferramenta agora. Tente de novo.");
    }
    setOwned((prev) => new Set([...prev, slug]));
    setStatus("ready");
  }, []);

  const value = useMemo<EntitlementsState>(
    () => ({ status, owned, owns: (slug) => owned.has(slug), acquire, refresh: () => setTick((n) => n + 1) }),
    [status, owned, acquire],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useEntitlements fora do EntitlementsProvider");
  return value;
}
