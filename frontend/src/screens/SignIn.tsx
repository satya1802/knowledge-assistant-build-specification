/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const { Input, Label } = UI;
const { Check, X, Users, FileText, Clock, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } = Icons;

type AuthUser = {
  id: string | number;
  email: string;
  role: string;
  is_enabled: boolean;
};

const MIN_PASSWORD_LENGTH = 10;
const GENERIC_ERROR = "Incorrect email or password.";
const LOCK_MINUTES = 15;
const MAX_ATTEMPTS = 5;

const ASSURANCES = [
  "Ask a question in plain English and get an answer drawn only from Wexford documents.",
  "Every answer carries numbered source chips linking to the page it came from.",
  "Your conversation history is private to you and grouped by date.",
];

export default function Screen() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [tab, setTab] = React.useState("signin");

  // Sign-in form
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [signInError, setSignInError] = React.useState(null);
  const [signInLoading, setSignInLoading] = React.useState(false);

  // Create-account form
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [signUpErrors, setSignUpErrors] = React.useState<Record<string, string>>({});
  const [signUpLoading, setSignUpLoading] = React.useState(false);

  const [showExpiredNotice, setShowExpiredNotice] = React.useState(true);

  // Whether the server currently allows self-service account creation. Starts
  // false so the create-account tab never flashes into view before the check
  // resolves; only a confirmed `true` response renders it.
  const [signupEnabled, setSignupEnabled] = React.useState(false);

  const tabRefs = { signin: React.useRef(null), signup: React.useRef(null) };

  const tabs = signupEnabled
    ? [
        { id: "signin", label: "Sign in" },
        { id: "signup", label: "Create account" },
      ]
    : [{ id: "signin", label: "Sign in" }];

  // Restore an existing session on load: if the HTTP-only cookie is still valid
  // the server will say who it belongs to and we can skip straight to Chat.
  React.useEffect(function () {
    let cancelled = false;
    auth.refresh().then(function (user) {
      if (!cancelled && user) navigate("chat");
    });
    return function () {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Self-signup is a server-side switch: read it fresh on every load rather
  // than hard-coding an assumption client-side.
  React.useEffect(function () {
    let cancelled = false;
    apiFetch<{ self_signup_enabled: boolean }>("/auth/config")
      .then(function (config) {
        if (!cancelled) setSignupEnabled(Boolean(config.self_signup_enabled));
      })
      .catch(function () {
        if (!cancelled) setSignupEnabled(false);
      });
    return function () {
      cancelled = true;
    };
  }, []);

  // If the create-account tab is selected but the server switch turns off
  // (or resolves false after a prior session), fall back to sign-in rather
  // than leaving a stale tab selected with no panel to show.
  React.useEffect(
    function () {
      if (tab === "signup" && !signupEnabled) setTab("signin");
    },
    [tab, signupEnabled],
  );

  function onTabKeyDown(event, index) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
    const id = tabs[next].id;
    setTab(id);
    const ref = tabRefs[id];
    if (ref && ref.current) ref.current.focus();
  }

  async function handleSignIn(event) {
    event.preventDefault();
    const key = email.trim();
    if (!key || !password) {
      setSignInError({
        kind: "validation",
        message: "Enter both your work email and your password.",
      });
      return;
    }

    setSignInError(null);
    setSignInLoading(true);
    try {
      const user = await apiFetch<AuthUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: key, password }),
      });
      auth.setUser(user);
      setSignInLoading(false);
      navigate("chat");
    } catch (err) {
      // Any rejection -- wrong password, unknown email, or a disabled account --
      // renders the same single message the server returned. Never indicate
      // which field was wrong.
      setSignInLoading(false);
      const message = err instanceof ApiError && err.message ? err.message : GENERIC_ERROR;
      setSignInError({ kind: "generic", message });
    }
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const key = newEmail.trim();

    if (!key) {
      errors.email = "Enter your work email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
      errors.email = "Enter a valid email address, for example name@wexford.co.uk.";
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.password = "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.";
    }
    if (confirmPassword !== newPassword) {
      errors.confirm = "The two passwords do not match.";
    }

    setSignUpErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSignUpLoading(true);
    try {
      const user = await apiFetch<AuthUser>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email: key, password: newPassword }),
      });
      // Success signs the visitor in immediately -- same as the sign-in form --
      // rather than leaving them on a confirmation screen they have to click
      // through.
      auth.setUser(user);
      setSignUpLoading(false);
      navigate("chat");
    } catch (err) {
      // A rejected signup must never leave the UI signed in. The server's own
      // message (e.g. duplicate email) is shown against the email field, and
      // the form is left exactly as the visitor typed it.
      setSignUpLoading(false);
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "This account could not be created. Sign in instead, or ask an administrator for help.";
      setSignUpErrors({ email: message });
    }
  }

  const fieldClass = "w-full";
  const focusRing =
    "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14304F]";

  return (
    <div
      className="min-h-full w-full"
      style={{ backgroundColor: brand.backgroundColor, fontFamily: brand.fontBody }}
    >
      <div className="w-full px-5 py-8 sm:px-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(420px,520px)] lg:gap-12">
          {/* Brand panel */}
          <section
            className="rounded-xl p-8 text-white sm:p-10"
            style={{ backgroundColor: brand.primaryColor, borderRadius: "0.75rem" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold tracking-tight"
                style={{ backgroundColor: brand.accentColor, color: "#FFFFFF" }}
                aria-hidden="true"
              >
                KA
              </div>
              <div>
                <p className="text-base font-semibold leading-tight">Knowledge Assistant</p>
                <p className="text-sm leading-tight text-white/70">Wexford Group · Internal</p>
              </div>
            </div>

            <p
              className="mt-10 max-w-md text-xl leading-relaxed text-white/90 sm:text-2xl"
              style={{ fontFamily: brand.fontHeading }}
            >
              Answers from the company&rsquo;s own documents, with the source attached.
            </p>

            <h2 className="mt-10 text-xs font-semibold uppercase tracking-widest text-white/60">
              What you can do here
            </h2>
            <ul className="mt-4 space-y-4">
              {ASSURANCES.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full"
                    style={{ backgroundColor: brand.accentColor }}
                    aria-hidden="true"
                  >
                    <Icons.Check className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="text-sm leading-relaxed text-white/85">{item}</span>
                </li>
              ))}
            </ul>

            <hr className="mt-10 border-white/15" />

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                onClick={() => navigate("docs")}
                className={
                  "inline-flex items-center gap-2 rounded text-sm font-medium text-white underline underline-offset-4 hover:text-white/80 " +
                  focusRing +
                  " focus-visible:ring-white focus-visible:ring-offset-[#14304F]"
                }
              >
                <Icons.FileText className="h-4 w-4" aria-hidden="true" />
                Getting started
              </button>
              <button
                type="button"
                onClick={() => navigate("docs")}
                className={
                  "inline-flex items-center gap-2 rounded text-sm font-medium text-white underline underline-offset-4 hover:text-white/80 " +
                  focusRing +
                  " focus-visible:ring-white focus-visible:ring-offset-[#14304F]"
                }
              >
                <Icons.ArrowRight className="h-4 w-4" aria-hidden="true" />
                API reference
              </button>
            </div>
            <p className="mt-6 text-xs text-white/55">
              Release 1.4 · No account data leaves Wexford infrastructure.
            </p>
          </section>

          {/* Form panel */}
          <section className="flex flex-col justify-center">
            <h1
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ color: brand.primaryColor, fontFamily: brand.fontHeading }}
            >
              Sign in to Knowledge Assistant
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
              Use your Wexford work email. Sessions end automatically after 7 days of inactivity;
              there is no &ldquo;remember me&rdquo; option.
            </p>

            {showExpiredNotice && (
              <div
                className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4"
                style={{ borderRadius: brand.radius }}
              >
                <Icons.Clock
                  className="mt-0.5 h-4 w-4 flex-none text-amber-700"
                  aria-hidden="true"
                />
                <p className="flex-1 text-sm leading-relaxed text-amber-900">
                  <span className="font-semibold">Session ended.</span> You were signed out after a
                  period of inactivity. Sign in again to return to Chat.
                </p>
                <button
                  type="button"
                  aria-label="Dismiss session ended notice"
                  onClick={() => setShowExpiredNotice(false)}
                  className={"-m-1 rounded p-1 text-amber-800 hover:bg-amber-100 " + focusRing}
                >
                  <Icons.X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <div
              className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              style={{ borderRadius: "0.75rem" }}
            >
              {tabs.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Account access"
                  className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
                >
                  {tabs.map((t, index) => {
                    const selected = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        ref={tabRefs[t.id]}
                        role="tab"
                        id={"tab-" + t.id}
                        type="button"
                        aria-selected={selected}
                        aria-controls={"panel-" + t.id}
                        tabIndex={selected ? 0 : -1}
                        onKeyDown={(e) => onTabKeyDown(e, index)}
                        onClick={() => setTab(t.id)}
                        className={
                          "rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                          focusRing +
                          (selected
                            ? " bg-white shadow-sm"
                            : " text-slate-600 hover:text-slate-900")
                        }
                        style={selected ? { color: brand.primaryColor } : undefined}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sign in panel */}
              {tab === "signin" && (
                <div
                  role="tabpanel"
                  id="panel-signin"
                  aria-labelledby="tab-signin"
                  className="pt-6"
                >
                  <form onSubmit={handleSignIn} noValidate className="space-y-5">
                    <div aria-live="assertive">
                      {signInError && (
                        <div
                          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4"
                          style={{ borderRadius: brand.radius }}
                        >
                          <Icons.AlertCircle
                            className="mt-0.5 h-4 w-4 flex-none text-red-700"
                            aria-hidden="true"
                          />
                          <p className="text-sm leading-relaxed text-red-800">
                            <span className="font-semibold">
                              {signInError.kind === "validation"
                                ? "Check the form. "
                                : "Sign-in failed. "}
                            </span>
                            {signInError.message}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <UI.Label htmlFor="signin-email">Work email</UI.Label>
                      <UI.Input
                        id="signin-email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        className={fieldClass}
                        value={email}
                        aria-invalid={signInError ? true : undefined}
                        aria-describedby={signInError ? "signin-help" : undefined}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <UI.Label htmlFor="signin-password">Password</UI.Label>
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-pressed={showPassword}
                          className={
                            "rounded text-xs font-medium underline underline-offset-2 " + focusRing
                          }
                          style={{ color: brand.primaryColor }}
                        >
                          {showPassword ? "Hide password" : "Show password"}
                        </button>
                      </div>
                      <UI.Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className={fieldClass}
                        value={password}
                        aria-invalid={signInError ? true : undefined}
                        aria-describedby={signInError ? "signin-help" : undefined}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <p
                      id="signin-help"
                      className="text-xs leading-relaxed"
                      style={{ color: brand.neutralColor }}
                    >
                      After {MAX_ATTEMPTS} failed attempts in {LOCK_MINUTES} minutes, an email
                      address is locked for {LOCK_MINUTES} minutes.
                    </p>

                    <button
                      type="submit"
                      disabled={signInLoading}
                      className={
                        "w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 " +
                        focusRing
                      }
                      style={{
                        backgroundColor: brand.primaryColor,
                        borderRadius: brand.radius,
                      }}
                    >
                      {signInLoading ? "Signing in…" : "Sign in"}
                    </button>
                  </form>
                </div>
              )}

              {/* Create account panel */}
              {tab === "signup" && (
                <div
                  role="tabpanel"
                  id="panel-signup"
                  aria-labelledby="tab-signup"
                  className="pt-6"
                >
                  <form onSubmit={handleSignUp} noValidate className="space-y-5">
                    <p className="text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                      Self-service account creation is currently enabled. The role shown after
                      creation is assigned by the server.
                    </p>

                    <div>
                      <UI.Label htmlFor="signup-email">Work email</UI.Label>
                      <UI.Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        className={fieldClass}
                        value={newEmail}
                        aria-invalid={signUpErrors.email ? true : undefined}
                        aria-describedby={signUpErrors.email ? "signup-email-error" : undefined}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                      {signUpErrors.email && (
                        <p
                          id="signup-email-error"
                          className="mt-2 flex items-start gap-2 text-sm text-red-800"
                        >
                          <Icons.AlertCircle
                            className="mt-0.5 h-4 w-4 flex-none"
                            aria-hidden="true"
                          />
                          {signUpErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <UI.Label htmlFor="signup-password">Password</UI.Label>
                      <UI.Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        className={fieldClass}
                        value={newPassword}
                        aria-invalid={signUpErrors.password ? true : undefined}
                        aria-describedby={
                          signUpErrors.password ? "signup-password-error" : "signup-password-hint"
                        }
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      {signUpErrors.password ? (
                        <p
                          id="signup-password-error"
                          className="mt-2 flex items-start gap-2 text-sm text-red-800"
                        >
                          <Icons.AlertCircle
                            className="mt-0.5 h-4 w-4 flex-none"
                            aria-hidden="true"
                          />
                          {signUpErrors.password}
                        </p>
                      ) : (
                        <p
                          id="signup-password-hint"
                          className="mt-2 text-xs"
                          style={{ color: brand.neutralColor }}
                        >
                          At least {MIN_PASSWORD_LENGTH} characters.
                        </p>
                      )}
                    </div>

                    <div>
                      <UI.Label htmlFor="signup-confirm">Confirm password</UI.Label>
                      <UI.Input
                        id="signup-confirm"
                        type="password"
                        autoComplete="new-password"
                        className={fieldClass}
                        value={confirmPassword}
                        aria-invalid={signUpErrors.confirm ? true : undefined}
                        aria-describedby={signUpErrors.confirm ? "signup-confirm-error" : undefined}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      {signUpErrors.confirm && (
                        <p
                          id="signup-confirm-error"
                          className="mt-2 flex items-start gap-2 text-sm text-red-800"
                        >
                          <Icons.AlertCircle
                            className="mt-0.5 h-4 w-4 flex-none"
                            aria-hidden="true"
                          />
                          {signUpErrors.confirm}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={signUpLoading}
                      className={
                        "w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 " +
                        focusRing
                      }
                      style={{
                        backgroundColor: brand.accentColor,
                        borderRadius: brand.radius,
                      }}
                    >
                      {signUpLoading ? "Creating account…" : "Create account"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <p className="mt-6 text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
              Forgotten your password? There is no reset email. Contact the IT service desk on
              extension 4120 and an administrator will set a new one from the Users page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
