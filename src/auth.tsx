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

const AUTH_STORAGE_KEY = "steam-recriada:auth";
const VALID_PASSWORD = (import.meta.env.VITE_ACCESS_PASSWORD as string | undefined) || "3451";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loginWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string, nickname?: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  loginWithOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithMasterPassword: (password: string, remember?: boolean) => boolean;
  logout: () => Promise<void>;
  /** Compatibilidade com implementações legadas */
  login: (emailOrPassword: string, passwordOrRemember?: string | boolean) => boolean | Promise<{ ok: boolean; error?: string }>;
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
  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored === "authenticated" || stored === VALID_PASSWORD;
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carrega e sincroniza a sessão Supabase
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
        }
      } catch {
        // Sem rede ou erro de inicialização
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

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        const prof = await fetchUserProfile(data.user.id);
        setProfile(prof);
        return { ok: true };
      }

      return { ok: false, error: "Nenhuma sessão retornada pelo servidor." };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Erro desconhecido ao autenticar." };
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

        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          if (data.user) {
            const prof = await fetchUserProfile(data.user.id);
            setProfile(prof);
          }
          return { ok: true, message: "Conta criada com sucesso! Entrando…" };
        }

        // Se o Supabase não retornou a sessão diretamente no signUp, autentica imediatamente
        const loginRes = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (loginRes.data?.session) {
          setSession(loginRes.data.session);
          setUser(loginRes.data.user);
          if (loginRes.data.user) {
            const prof = await fetchUserProfile(loginRes.data.user.id);
            setProfile(prof);
          }
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

  const loginWithMasterPassword = useCallback((password: string, remember = true): boolean => {
    if (password.trim() === VALID_PASSWORD) {
      if (remember) {
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, "authenticated");
        } catch {
          // localStorage indisponível
        }
      }
      setIsMasterAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      await supabase.auth.signOut();
    } catch {
      // Ignora erro de rede no logout
    } finally {
      setIsMasterAuthenticated(false);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const login = useCallback(
    (emailOrPassword: string, passwordOrRemember?: string | boolean) => {
      // Se passado com senha ou formato de email, usa Supabase
      if (typeof passwordOrRemember === "string") {
        return loginWithPassword(emailOrPassword, passwordOrRemember);
      }
      // Caso contrário, tenta como senha mestra
      const remember = typeof passwordOrRemember === "boolean" ? passwordOrRemember : true;
      return loginWithMasterPassword(emailOrPassword, remember);
    },
    [loginWithPassword, loginWithMasterPassword]
  );

  const isAuthenticated = Boolean(session || user || isMasterAuthenticated);

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
        loginWithMasterPassword,
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
