import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearToken, getToken, setToken } from "../api/client";
import {
  deleteAccount as apiDeleteAccount,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type UserOut,
} from "../api/auth";

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

function persistUser(user: UserOut | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore storage failures (e.g. private mode) — the in-memory state still works
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUserState] = useState<UserOut | null>(() => readStoredUser());
  const [loading] = useState(false);

  const applyAuth = useCallback((accessToken: string, nextUser: UserOut) => {
    setToken(accessToken);
    persistUser(nextUser);
    setTokenState(accessToken);
    setUserState(nextUser);
  }, []);

  const clearAuth = useCallback(() => {
    clearToken();
    persistUser(null);
    setTokenState(null);
    setUserState(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      applyAuth(res.access_token, res.user);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await apiRegister(email, password);
      applyAuth(res.access_token, res.user);
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // end the local session regardless of the server response
    }
    clearAuth();
  }, [clearAuth]);

  const deleteAccount = useCallback(async () => {
    await apiDeleteAccount();
    clearAuth();
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      loading,
      login,
      register,
      logout,
      deleteAccount,
    }),
    [user, token, loading, login, register, logout, deleteAccount]
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
