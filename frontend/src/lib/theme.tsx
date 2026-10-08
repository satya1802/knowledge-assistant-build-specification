/**
 * App-wide theme: one `data-theme` attribute on `<html>`, driven by the
 * user's saved choice (GET /auth/me) and -- when that choice is "system" --
 * a live `prefers-color-scheme` listener. Every screen reads colour from the
 * CSS custom properties in index.css, so setting this attribute once here
 * repaints the whole app; no screen owns its own palette.
 */
import * as React from "react";
import { useLocation } from "react-router-dom";

import { apiFetch } from "@/lib/api";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  /** The user's saved choice: "light", "dark" or "system". */
  theme: ThemeChoice;
  /** What is actually painted right now -- "system" resolved against the OS. */
  resolvedTheme: ResolvedTheme;
  /** Applies immediately (optimistic) and persists via PUT /account/theme.
   * Rejects if the save fails; the UI has already switched regardless. */
  setTheme: (choice: ThemeChoice) => Promise<void>;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemPrefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = React.useState<boolean>(getSystemPrefersDark);
  const location = useLocation();

  // AC-081: follow an OS light/dark change live, with no page reload.
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, []);

  // AC-080: restore the saved choice from GET /auth/me on first load and
  // again at the next sign-in -- re-checked on every route change, since
  // signing in always lands on a new route and an unauthenticated call here
  // simply fails quietly and leaves the current choice alone.
  React.useEffect(() => {
    let cancelled = false;
    apiFetch<{ theme?: unknown }>("/auth/me")
      .then((me) => {
        if (cancelled) return;
        if (isThemeChoice(me?.theme)) setThemeState(me.theme);
      })
      .catch(() => {
        // Not signed in, or the request failed: keep the current choice.
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const resolvedTheme: ResolvedTheme =
    theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light";

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
    }
  }, [resolvedTheme]);

  const setTheme = React.useCallback(async (choice: ThemeChoice) => {
    setThemeState(choice); // Switches immediately, independent of the save below.
    await apiFetch<void>("/account/theme", {
      method: "PUT",
      body: JSON.stringify({ theme: choice }),
    });
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
