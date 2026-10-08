import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import SignIn from "@/screens/SignIn";
import Chat from "@/screens/Chat";
import KnowledgeBase from "@/screens/KnowledgeBase";
import Account from "@/screens/Account";
import Users from "@/screens/Users";
import Docs from "@/screens/Docs";
import { AuthProvider, RequireAuth, useAuth } from "@/lib/auth";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block rounded-[var(--brand-radius)] px-3 py-2 text-sm font-medium transition-colors",
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
  return (
    <div className="flex min-h-screen">
      <aside
        className="w-56 shrink-0 border-r p-4"
        style={{
          backgroundColor: "var(--brand-surface)",
          borderColor: "var(--brand-border)",
        }}
      >
        <p
          className="mb-4 px-3 text-sm font-semibold"
          style={{ fontFamily: "var(--brand-font-heading)" }}
        >
          {"Knowledge Assistant \u00b7 Build specification"}
        </p>
        <nav className="flex flex-col gap-1">
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
      <main className="flex-1 overflow-auto">
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
