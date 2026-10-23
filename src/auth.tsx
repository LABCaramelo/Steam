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

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const prof = await fetchUserProfile(user.id);
    setProfile(prof);
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
        setProfile(prof);
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

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return { ok: false, error: "Sessão inválida." };

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
