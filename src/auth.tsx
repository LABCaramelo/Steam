import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const AUTH_STORAGE_KEY = "steam-recriada:auth";
const VALID_PASSWORD = (import.meta.env.VITE_ACCESS_PASSWORD as string | undefined) || "3451";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string, remember?: boolean) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored === "authenticated" || stored === VALID_PASSWORD;
    } catch {
      return false;
    }
  });

  const login = useCallback((password: string, remember = true): boolean => {
    if (password.trim() === VALID_PASSWORD) {
      if (remember) {
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, "authenticated");
        } catch {
          // localStorage indisponível
        }
      }
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // localStorage indisponível
    }
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
