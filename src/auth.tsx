import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, access_status, avatar_url, nickname")
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

  // Carrega e sincroniza estritamente a sessão Supabase
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          const prof = await fetchUserProfile(initialSession.user.id);
          if (mounted) setProfile(prof);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch {
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const prof = await fetchUserProfile(newSession.user.id);
        if (mounted) setProfile(prof);
      } else {
        setProfile(null);
        clearCommunityChats();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
        setSession(data.session);
        setUser(data.user);
        const prof = await fetchUserProfile(data.user.id);
        setProfile(prof);
        return { ok: true };
      }

      return { ok: false, error: "Nenhuma sessão retornada pelo Supabase." };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Erro ao autenticar no Supabase." };
    }
  }, []);

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
          setSession(data.session);
          setUser(data.user);
          const prof = await fetchUserProfile(data.user.id);
          setProfile(prof);
          return { ok: true, message: "Conta criada com sucesso! Entrando…" };
        }

        // Tenta autenticação imediata caso o Supabase não tenha retornado a sessão no signUp
        const loginRes = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (loginRes.data?.session && loginRes.data?.user) {
          setSession(loginRes.data.session);
          setUser(loginRes.data.user);
          const prof = await fetchUserProfile(loginRes.data.user.id);
          setProfile(prof);
          return { ok: true, message: "Conta criada com sucesso! Entrando…" };
        }

        return {
          ok: true,
          message: "Conta criada com sucesso!",
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Erro ao criar conta." };
      }
    },
    []
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
    try {
      localStorage.removeItem("steam-recriada:auth");
      sessionStorage.removeItem("steam-recriada:auth");
      await supabase.auth.signOut();
    } catch {
      // Ignora erro de rede no logout
    } finally {
      clearCommunityChats();
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const login = useCallback(
    (email: string, password = "") => {
      return loginWithPassword(email, password);
    },
    [loginWithPassword]
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
