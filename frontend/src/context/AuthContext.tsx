import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getToken } from "../api/client";
import type { UserOut } from "../api/auth";

const USER_KEY = "auth_user";

export interface AuthContextValue {
  user: UserOut | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): UserOut | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserOut) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token] = useState<string | null>(() => getToken());
  const [user] = useState<UserOut | null>(() => readStoredUser());
  const [loading] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      loading,
      // Real authentication is implemented by ticket #10 (Login, Registrierung
      // und Konto-Verwaltung). The token persistence plumbing is wired here.
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      deleteAccount: async () => {},
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
