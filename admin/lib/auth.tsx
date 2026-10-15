"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, setRefreshHandler } from "./api";

export type Role = "USER" | "SUPPORT" | "CONTENT_MANAGER" | "ADMIN" | "SUPER_ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
}

interface Session {
  accessToken: string;
  tokenType: string;
  accessTokenExpiresAt: string;
  refreshToken: string | null;
  refreshTokenExpiresAt?: string;
  user: AuthUser;
}

interface LoginResult {
  mfaRequired: boolean;
  accessToken: string | null;
  tokenType: string | null;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  user: AuthUser | null;
  mfaToken: string | null;
  mfaTokenExpiresAt: string | null;
}

export type LoginOutcome = { kind: "session" } | { kind: "mfa"; mfaToken: string; expiresAt: string | null };

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Role gate used only to hide controls — the server enforces every write. */
  can: (min: Role) => boolean;
}

const RANK: Record<Role, number> = { USER: 0, SUPPORT: 1, CONTENT_MANAGER: 2, ADMIN: 3, SUPER_ADMIN: 4 };
export const roleLabel = (r?: Role | null) =>
  ({ USER: "User", SUPPORT: "Support", CONTENT_MANAGER: "Content manager", ADMIN: "Administrator", SUPER_ADMIN: "Super admin" })[r ?? "USER"];

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = "vaulten_admin_session";

function loadStored(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const persist = useCallback((s: Session | null) => {
    setSession(s);
    try {
      if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode */
    }
  }, []);

  const acceptSession = useCallback(
    (s: Session) => {
      if (s.user.role === "USER") {
        throw new ApiError(403, "This account has no staff role.", "FORBIDDEN");
      }
      persist(s);
    },
    [persist],
  );

  // One silent refresh on 401. Admin-web sessions refresh through the
  // HttpOnly cookie the API sets, so the body is empty unless we hold a token.
  const refresh = useCallback(async (): Promise<string | null> => {
    const cur = sessionRef.current;
    try {
      const s = await api<Session>("/auth/refresh", {
        method: "POST",
        body: cur?.refreshToken ? { refreshToken: cur.refreshToken } : {},
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      persist(s);
      return s.accessToken;
    } catch {
      persist(null);
      return null;
    }
  }, [persist]);

  useEffect(() => {
    setRefreshHandler(refresh);
    return () => setRefreshHandler(null);
  }, [refresh]);

  useEffect(() => {
    const stored = loadStored();
    if (!stored) {
      setLoading(false);
      return;
    }
    setSession(stored);
    api<AuthUser>("/users/me", { token: stored.accessToken })
      .then((u) => {
        if (u.role === "USER") persist(null);
        else persist({ ...stored, user: u });
      })
      .catch(() => persist(null))
      .finally(() => setLoading(false));
  }, [persist]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const r = await api<LoginResult>("/auth/login", {
        method: "POST",
        body: { email, password, deviceLabel: "Admin web" },
      });
      if (r.mfaRequired) {
        return { kind: "mfa", mfaToken: r.mfaToken!, expiresAt: r.mfaTokenExpiresAt };
      }
      acceptSession({
        accessToken: r.accessToken!,
        tokenType: r.tokenType ?? "Bearer",
        accessTokenExpiresAt: r.accessTokenExpiresAt!,
        refreshToken: r.refreshToken,
        user: r.user!,
      });
      return { kind: "session" };
    },
    [acceptSession],
  );

  const verifyMfa = useCallback(
    async (mfaToken: string, code: string) => {
      const s = await api<Session>("/auth/mfa/verify", { method: "POST", body: { mfaToken, code } });
      acceptSession(s);
    },
    [acceptSession],
  );

  const logout = useCallback(async () => {
    const cur = sessionRef.current;
    if (cur) await api("/auth/logout", { method: "POST", token: cur.accessToken }).catch(() => undefined);
    persist(null);
  }, [persist]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      token: session?.accessToken ?? null,
      loading,
      login,
      verifyMfa,
      logout,
      can: (min) => !!session && RANK[session.user.role] >= RANK[min],
    }),
    [session, loading, login, verifyMfa, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
