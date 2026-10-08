import * as React from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch, setUnauthorizedHandler } from "@/lib/api";

export type AuthUser = {
  id: string | number;
  email: string;
  role: string;
  is_enabled?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** True once setUser/refresh has resolved at least once for this provider. */
  setUser: (user: AuthUser | null) => void;
  /** Calls GET /auth/me and updates the shared user, returning it (or null on 401). */
  refresh: () => Promise<AuthUser | null>;
  /** Clears client auth state and returns the user to Sign in. */
  signOut: () => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = React.useState<AuthUser | null>(null);
  const navigate = useNavigate();

  const signOut = React.useCallback(() => {
    setUserState(null);
    navigate("/sign-in");
  }, [navigate]);

  React.useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const refresh = React.useCallback(async () => {
    try {
      const me = await apiFetch<AuthUser>("/auth/me");
      setUserState(me);
      return me;
    } catch {
      setUserState(null);
      return null;
    }
  }, []);

  const setUser = React.useCallback((next: AuthUser | null) => {
    setUserState(next);
  }, []);

  const value = React.useMemo(
    () => ({ user, setUser, refresh, signOut }),
    [user, setUser, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/**
 * Wraps a protected route. Resolves GET /auth/me on every entry -- so
 * navigating between guarded screens re-checks the session each time -- and
 * renders nothing until that resolves, so no seeded/real content is visible
 * before the check completes. A 401 redirects to Sign in instead of
 * rendering the wrapped screen at all.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setAllowed(false);
    refresh().then((me) => {
      if (cancelled) return;
      if (me) {
        setAllowed(true);
      } else {
        navigate("/sign-in", { replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!allowed) return null;
  return <>{children}</>;
}
