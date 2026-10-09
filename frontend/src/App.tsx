import * as React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import SignIn from "@/screens/SignIn";
import Chat from "@/screens/Chat";
import KnowledgeBase from "@/screens/KnowledgeBase";
import Account from "@/screens/Account";
import Users from "@/screens/Users";
import Docs from "@/screens/Docs";
import { AuthProvider, RequireAuth, useAuth } from "@/lib/auth";
import { Icons } from "@/lib/icons";
import { FOCUS_RING } from "@/lib/ui";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block rounded-[var(--brand-radius)] px-3 py-2 text-sm font-medium transition-colors",
    FOCUS_RING,
    isActive ? "bg-[var(--brand-hover)] text-[var(--brand-fg)]" : "text-[var(--brand-fg-muted)]",
  ].join(" ");

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [navOpen, setNavOpen] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  function closeNav() {
    setNavOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Mobile top bar: holds the nav toggle -- the sidebar itself is
          hidden below the `lg` breakpoint until this is pressed. */}
      <div
        className="flex items-center justify-between border-b px-4 py-3 lg:hidden"
        style={{
          backgroundColor: "var(--brand-surface)",
          borderColor: "var(--brand-border)",
        }}
      >
        <p className="text-sm font-semibold" style={{ fontFamily: "var(--brand-font-heading)" }}>
          {"Knowledge Assistant"}
        </p>
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          aria-label={navOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setNavOpen((v) => !v)}
          className={
            "inline-flex h-9 w-9 items-center justify-center rounded-[var(--brand-radius)] border " +
            FOCUS_RING
          }
          style={{ borderColor: "var(--brand-border)" }}
        >
          {navOpen ? (
            <Icons.X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Icons.Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Backdrop: only present (and clickable) while the mobile menu is
          open; harmless to render unconditionally omitted otherwise. */}
      {navOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-hidden="true"
          onClick={closeNav}
        />
      ) : null}

      <aside
        id="app-sidebar"
        aria-label="Primary"
        className={
          (navOpen ? "fixed inset-y-0 left-0 z-40 flex " : "hidden ") +
          "w-64 shrink-0 flex-col overflow-y-auto border-r p-4 lg:static lg:z-auto lg:flex lg:w-56"
        }
        style={{
          backgroundColor: "var(--brand-surface)",
          borderColor: "var(--brand-border)",
        }}
      >
        <p
          className="mb-4 hidden px-3 text-sm font-semibold lg:block"
          style={{ fontFamily: "var(--brand-font-heading)" }}
        >
          {"Knowledge Assistant · Build specification"}
        </p>
        <nav className="flex flex-col gap-1" onClick={closeNav}>
          <NavLink to="/sign-in" className={navLinkClass}>
            {"Sign in"}
          </NavLink>
          <NavLink to="/chat" className={navLinkClass}>
            {"Chat"}
          </NavLink>
          <NavLink to="/knowledge-base" className={navLinkClass}>
            {"Knowledge base"}
          </NavLink>
          <NavLink to="/account" className={navLinkClass}>
            {"Account"}
          </NavLink>
          {isAdmin ? (
            <NavLink to="/users" className={navLinkClass}>
              {"Users"}
            </NavLink>
          ) : null}
          <NavLink to="/docs" className={navLinkClass}>
            {"Documentation"}
          </NavLink>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <Chat />
              </RequireAuth>
            }
          />
          <Route
            path="/knowledge-base"
            element={
              <RequireAuth>
                <KnowledgeBase />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAuth>
                <Users />
              </RequireAuth>
            }
          />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </main>
    </div>
  );
}
