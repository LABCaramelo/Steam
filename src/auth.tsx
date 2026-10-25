import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  access_status: string;
  avatar_url?: string | null;
  nickname?: string | null;
  bio?: string | null;
}

/** Conversas da Comunidade (src/community.tsx): só existem enquanto a sessão está aberta. */
export const COMMUNITY_STORAGE_PREFIX = "lab:community:";

function clearCommunityChats() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(COMMUNITY_STORAGE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // sessionStorage restrito
  }
}

// Expurgar qualquer chave de bypass legado do navegador
try {
  localStorage.removeItem("steam-recriada:auth");
  sessionStorage.removeItem("steam-recriada:auth");
} catch {
  // localStorage restrito
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loginWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string, nickname?: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  loginWithOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  /** Atalho para login com e-mail e senha */
  login: (email: string, password?: string) => Promise<{ ok: boolean; error?: string }>;
  /** Atualiza perfil de usuário (nome, apelido, avatar, bio) */
  updateProfile: (data: {
    name: string;
    nickname?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** Envia um arquivo de avatar para o bucket avatars */
  uploadAvatar: (file: File) => Promise<{ ok: boolean; url?: string; error?: string }>;
  /** Recarrega os dados do perfil */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Expiry is only a deadline; only getUser validates the credential and its identity. */
function sessionDeadline(session: Session): number {
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return 0;
    const cachedExpiry = typeof session.expires_at === "number" && Number.isFinite(session.expires_at) ? session.expires_at * 1000 : Infinity;
    return Math.min(payload.exp * 1000, cachedExpiry);
  } catch { return 0; }
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, access_status, avatar_url, nickname, bio")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserProfile;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authorization = useRef({ mounted: false, version: 0, token: null as string | null, userId: null as string | null });
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearAuth = useCallback(() => {
    const current = authorization.current;
    ++current.version;
    current.token = null;
    current.userId = null;
    clearTimeout(expiryTimer.current);
    expiryTimer.current = undefined;
    if (!current.mounted) return;
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsLoading(false);
    clearCommunityChats();
  }, []);

  const validateSession = useCallback(async (candidate: Session | null) => {
    const current = authorization.current;
    const version = ++current.version;
    if (!candidate?.access_token || !candidate.user?.id) { clearAuth(); return false; }
    if (candidate.access_token !== current.token || candidate.user.id !== current.userId) {
      current.token = null;
      current.userId = null;
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsLoading(true);
    }
    const result = await supabase.auth.getUser(candidate.access_token).catch(() => null);
    if (!current.mounted || version !== current.version) return false;
    const verified = result?.data.user;
    const deadline = sessionDeadline(candidate);
    if (!result || result.error || !verified || verified.is_anonymous || verified.id !== candidate.user.id || deadline <= Date.now()) {
      clearAuth(); return false;
    }
    clearTimeout(expiryTimer.current);
    expiryTimer.current = setTimeout(clearAuth, Math.min(deadline - Date.now(), 2_147_000_000));
    const prof = await fetchUserProfile(verified.id);
    if (!current.mounted || version !== current.version) return false;
    if (deadline <= Date.now()) { clearAuth(); return false; }
    current.token = candidate.access_token;
    current.userId = verified.id;
    setSession({ ...candidate, user: verified });
    setUser(verified);
    setProfile(prof);
    setIsLoading(false);
    return true;
  }, [clearAuth]);

  // Cached local sessions supply credentials; the Auth server decides whether they are valid.
  useEffect(() => {
    const current = authorization.current;
    current.mounted = true;
    let authTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const version = ++current.version;
      void supabase.auth.getSession().then(({ data, error }) => {
        if (!current.mounted || version !== current.version) return;
        if (error) clearAuth();
        else void validateSession(data.session);
      }).catch(() => { if (current.mounted && version === current.version) clearAuth(); });
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!current.mounted) return;
      clearTimeout(authTimer);
      if (event === "SIGNED_OUT" || !newSession) { clearAuth(); return; }
      const version = ++current.version;
      if (newSession.access_token !== current.token || newSession.user.id !== current.userId) {
        setSession(null); setUser(null); setProfile(null); setIsLoading(true);
      }
      // Never await Supabase calls while the SDK holds its auth callback lock.
      authTimer = setTimeout(() => {
        if (current.mounted && version === current.version) void validateSession(newSession);
      }, 0);
    });
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const poll = setInterval(onVisible, 60_000);
    return () => {
      current.mounted = false;
      ++current.version;
      clearTimeout(authTimer);
      clearTimeout(expiryTimer.current);
      clearInterval(poll);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      subscription.unsubscribe();
    };
  }, [clearAuth, validateSession]);

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.session && data.user) {
        const valid = await validateSession(data.session);
        return valid ? { ok: true } : { ok: false, error: "Não foi possível validar sua sessão. Entre novamente." };
      }

      return { ok: false, error: "Nenhuma sessão retornada pelo Supabase." };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Erro ao autenticar no Supabase." };
    }
  }, [validateSession]);

  const signUp = useCallback(
    async (email: string, password: string, name?: string, nickname?: string): Promise<{ ok: boolean; error?: string; message?: string }> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: name?.trim() || email.split("@")[0],
              nickname: nickname?.trim() || name?.trim() || email.split("@")[0],
            },
          },
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        if (data.session && data.user) {
          const valid = await validateSession(data.session);
          return valid ? { ok: true, message: "Conta criada com sucesso! Entrando…" } : { ok: false, error: "Não foi possível validar sua sessão. Entre novamente." };
        }

        // Tenta autenticação imediata caso o Supabase não tenha retornado a sessão no signUp
        const loginRes = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (loginRes.data?.session && loginRes.data?.user) {
          const valid = await validateSession(loginRes.data.session);
          return valid ? { ok: true, message: "Conta criada com sucesso! Entrando…" } : { ok: false, error: "Não foi possível validar sua sessão. Entre novamente." };
        }

        return {
          ok: true,
          message: "Conta criada com sucesso!",
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Erro ao criar conta." };
      }
    },
    [validateSession]
  );

  const loginWithOtp = useCallback(async (email: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Erro ao enviar link mágico." };
    }
  }, []);

  const logout = useCallback(async () => {
    clearAuth();
    try {
      localStorage.removeItem("steam-recriada:auth");
      sessionStorage.removeItem("steam-recriada:auth");
    } catch { /* Legacy cache cleanup cannot prevent signing out of the SDK. */ }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: "local" });
    } catch {
      try { await supabase.auth.signOut({ scope: "local" }); } catch { /* The UI remains closed. */ }
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const login = useCallback(
    (email: string, password = "") => {
      return loginWithPassword(email, password);
    },
    [loginWithPassword]
  );

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const version = authorization.current.version;
    const prof = await fetchUserProfile(user.id);
    if (authorization.current.mounted && authorization.current.userId === user.id && authorization.current.version === version) setProfile(prof);
  }, [user?.id]);

  const updateProfile = useCallback(
    async (data: {
      name: string;
      nickname?: string | null;
      avatar_url?: string | null;
      bio?: string | null;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        if (!user?.id) return { ok: false, error: "Usuário não autenticado." };
        const version = authorization.current.version;

        const { data: res, error } = await supabase.rpc("update_my_profile", {
          p_name: data.name,
          p_nickname: data.nickname ?? null,
          p_avatar_url: data.avatar_url ?? null,
          p_bio: data.bio ?? null,
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        if (res && res.success === false) {
          return { ok: false, error: res.message || res.error };
        }

        const prof = await fetchUserProfile(user.id);
        if (authorization.current.mounted && authorization.current.userId === user.id && authorization.current.version === version) setProfile(prof);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Erro ao atualizar perfil." };
      }
    },
    [user?.id]
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<{ ok: boolean; url?: string; error?: string }> => {
      try {
        if (!user?.id) return { ok: false, error: "Usuário não autenticado." };

        if (!file.type.startsWith("image/")) {
          return { ok: false, error: "O arquivo precisa ser uma imagem (PNG, JPG, WEBP ou GIF)." };
        }

        if (file.size > 5 * 1024 * 1024) {
          return { ok: false, error: "A imagem não pode ultrapassar 5 MB." };
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (sessionError || !token) return { ok: false, error: "Sessão inválida." };
        const { data: verified, error: authError } = await supabase.auth.getUser(token);
        if (authError || !verified.user || verified.user.is_anonymous || verified.user.id !== user.id) {
          return { ok: false, error: "Entre novamente no LAB para enviar seu avatar." };
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": file.type || "image/png",
            "x-folder": "avatars",
            "x-filename": file.name,
          },
          body: file,
        });

        const data = await res.json();
        if (!res.ok || !data.url) {
          return { ok: false, error: data.error || "Erro ao enviar avatar para o Cloudflare R2." };
        }

        return { ok: true, url: data.url };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Erro ao enviar imagem." };
      }
    },
    [user?.id]
  );

  // Apenas e estritamente sessões reais ativas do Supabase concedem autenticação
  const isAuthenticated = Boolean(session?.user);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        session,
        profile,
        loginWithPassword,
        signUp,
        loginWithOtp,
        logout,
        login,
        updateProfile,
        uploadAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser utilizado dentro de AuthProvider");
  }
  return ctx;
}
