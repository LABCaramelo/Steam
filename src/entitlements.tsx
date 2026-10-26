import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { getToolBySlug } from "./toolCatalog";
import { clearToolLocalData, publishToolRelease, subscribeToolReleases } from "./toolLifecycle";
import { assertToolReleaseConfirmed, toolReleaseFailure } from "./toolRelease";

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
  /** Permanently deletes this person's tool data and removes the acquisition. */
  release: (slug: string, onReleased?: () => void) => Promise<void>;
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
  const request = useRef(0);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  useEffect(() => {
    ++request.current;
    setOwned(NONE);
    setStatus(userId ? "loading" : "ready");
  }, [userId]);

  useEffect(() => {
    const version = ++request.current;
    if (!userId) {
      setOwned(NONE);
      setStatus("ready");
      return;
    }
    let alive = true;
    supabase
      .from("user_tools")
      .select("tool_slug")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!alive || version !== request.current || currentUser.current !== userId) return;
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

  useEffect(() => subscribeToolReleases((notice) => {
    if (notice.userId !== currentUser.current) return;
    ++request.current;
    setOwned((prev) => new Set([...prev].filter((slug) => slug !== notice.slug)));
    setTick((value) => value + 1);
  }), []);

  // A tool acquired in another tab shows up when this one gets focus again.
  useEffect(() => {
    const onFocus = () => setTick((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const acquire = useCallback(async (slug: string) => {
    if (!userId) throw new Error("Entre no LAB para adquirir ferramentas.");
    if (!getToolBySlug(slug)?.tool?.available) {
      throw new Error("Esta ferramenta estará disponível em breve. A aquisição ainda não foi liberada.");
    }
    const { error } = await supabase.rpc("acquire_tool", { p_slug: slug });
    if (error) {
      if (MISSING.has(error.code)) throw new Error(UNCONFIGURED_MESSAGE);
      throw new Error(error.message || "Não foi possível adquirir a ferramenta agora. Tente de novo.");
    }
    if (currentUser.current !== userId) return;
    ++request.current;
    setOwned((prev) => new Set([...prev, slug]));
    setStatus("ready");
  }, [userId]);

  const release = useCallback(async (slug: string, onReleased?: () => void) => {
    const app = getToolBySlug(slug);
    if (!userId) throw new Error("Entre no LAB para remover a ferramenta.");
    if (!app?.tool) throw new Error("Ferramenta não encontrada.");
    const { data, error } = await Promise.resolve(supabase.rpc("release_tool", { p_slug: slug }))
      .catch((cause: unknown) => { throw toolReleaseFailure(cause); });
    if (error) {
      throw toolReleaseFailure(error);
    }
    assertToolReleaseConfirmed(data, slug);
    const notice = { userId, slug, appid: app.appid };
    // The database transaction succeeded before any local data or library state is changed.
    // Move the caller off the removed tool before broadcasting invalidates its route.
    if (currentUser.current === userId) onReleased?.();
    publishToolRelease(notice);
    void clearToolLocalData(notice);
    if (currentUser.current !== userId) throw new Error("A conta mudou durante a solicitação. Confira a biblioteca da conta original.");
    ++request.current;
    setOwned((prev) => new Set([...prev].filter((value) => value !== slug)));
  }, [userId]);

  const value = useMemo<EntitlementsState>(
    () => ({ status, owned, owns: (slug) => owned.has(slug), acquire, release, refresh: () => setTick((n) => n + 1) }),
    [status, owned, acquire, release],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useEntitlements fora do EntitlementsProvider");
  return value;
}
