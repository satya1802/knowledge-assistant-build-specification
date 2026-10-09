import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme, type ThemeChoice } from "@/lib/theme";

const THEME_OPTIONS: Array<{ value: ThemeChoice; title: string; description: string }> = [
  { value: "light", title: "Light", description: "Always use the light palette." },
  { value: "dark", title: "Dark", description: "Always use the dark palette." },
  { value: "system", title: "System", description: "Follow your operating system setting." },
];

const MIN_LENGTH = 12;

type FormStatus = { kind: "success" | "error"; message: string } | null;

export default function Screen() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formStatus, setFormStatus] = React.useState<FormStatus>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [themeStatus, setThemeStatus] = React.useState("");

  const rules = [
    { id: "len", text: "At least " + MIN_LENGTH + " characters", met: next.length >= MIN_LENGTH },
    { id: "num", text: "Contains a number", met: /[0-9]/.test(next) },
    { id: "match", text: "Confirmation matches", met: next.length > 0 && next === confirm },
  ];

  async function handleThemeChange(value: ThemeChoice) {
    const label = value === "light" ? "Light" : value === "dark" ? "Dark" : "System";
    try {
      await setTheme(value);
      setThemeStatus("Appearance saved. " + label + " is now in use.");
    } catch {
      setThemeStatus(
        "Appearance switched to " + label + " here, but saving it failed. Try again shortly.",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!current) nextErrors.current = "Enter your current password.";
    if (!next) nextErrors.next = "Enter a new password.";
    else if (next.length < MIN_LENGTH)
      nextErrors.next = "New password must be at least " + MIN_LENGTH + " characters.";
    if (!confirm) nextErrors.confirm = "Re-enter the new password to confirm it.";
    else if (confirm !== next) nextErrors.confirm = "New password and confirmation do not match.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormStatus({
        kind: "error",
        message: "Your password was not changed. Check the highlighted fields below.",
      });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await apiFetch<void>("/account/password", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setFormStatus({
        kind: "success",
        message: "Password updated. Use the new password the next time you sign in.",
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Try again.";
      setFormStatus({ kind: "error", message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // Sign out client-side regardless -- the user should never be stuck here.
    }
    signOut();
  }

  const fieldStyle = {
    backgroundColor: "var(--brand-surface)",
    color: "var(--brand-fg)",
    borderColor: "var(--brand-border)",
  };

  const sectionStyle = {
    backgroundColor: "var(--brand-surface)",
    borderColor: "var(--brand-border)",
    borderRadius: brand.radius,
  };

  const email = user?.email ?? "";
  const role = user?.role ?? "employee";
  const isAdmin = role === "admin";
  const initials = email
    .split(/[@._]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className="w-full min-h-full px-6 py-8 sm:px-10"
      style={{
        backgroundColor: "var(--brand-background)",
        color: "var(--brand-fg)",
        fontFamily: brand.fontBody,
      }}
    >
      <div className="w-full">
        <header className="mb-8">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: "var(--brand-fg-heading)", fontFamily: brand.fontHeading }}
          >
            Account
          </h1>
          <p
            className="mt-2 max-w-2xl text-sm leading-relaxed"
            style={{ color: "var(--brand-fg-muted)" }}
          >
            Manage the password for your Knowledge Assistant sign-in and choose how the interface
            looks on this device.
          </p>
        </header>

        <section
          className="mb-8 border p-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
          style={sectionStyle}
          aria-labelledby="profile-heading"
        >
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center text-lg font-semibold"
              style={{
                backgroundColor: "var(--brand-primary)",
                color: "var(--brand-primary-fg)",
                borderRadius: "999px",
              }}
              aria-hidden="true"
            >
              {initials || "?"}
            </span>
            <div>
              <h2
                id="profile-heading"
                className="text-lg font-semibold"
                style={{ color: "var(--brand-fg-heading)" }}
              >
                {email || "Loading…"}
              </h2>
              <p
                className="mt-2 flex flex-wrap items-center gap-2 text-xs"
                style={{ color: "var(--brand-fg-muted)" }}
              >
                <span
                  className="inline-flex items-center gap-1.5 border px-2 py-0.5 font-medium"
                  style={{
                    color: "var(--brand-accent)",
                    borderColor: "var(--brand-accent)",
                    borderRadius: "999px",
                  }}
                >
                  <Icons.Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {isAdmin ? "Administrator" : "Employee"}
                </span>
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <section className="border p-6" style={sectionStyle} aria-labelledby="password-heading">
              <h2
                id="password-heading"
                className="text-xl font-semibold"
                style={{ color: "var(--brand-fg-heading)" }}
              >
                Change password
              </h2>
              <p className="mt-1.5 text-sm" style={{ color: "var(--brand-fg-muted)" }}>
                Your new password replaces the one stored for {email || "your account"}. Other
                devices stay signed in until their sessions expire.
              </p>

              <div aria-live="polite" role="status">
                {formStatus ? (
                  <p
                    className="mt-5 flex items-start gap-2 border px-4 py-3 text-sm"
                    style={{
                      backgroundColor:
                        formStatus.kind === "success"
                          ? "var(--brand-success-bg)"
                          : "var(--brand-danger-bg)",
                      color:
                        formStatus.kind === "success"
                          ? "var(--brand-success-fg)"
                          : "var(--brand-danger-fg)",
                      borderColor:
                        formStatus.kind === "success"
                          ? "var(--brand-success-fg)"
                          : "var(--brand-danger-fg)",
                      borderRadius: brand.radius,
                    }}
                  >
                    {formStatus.kind === "success" ? (
                      <Icons.CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      <strong className="font-semibold">
                        {formStatus.kind === "success" ? "Success: " : "Not saved: "}
                      </strong>
                      {formStatus.message}
                    </span>
                  </p>
                ) : null}
              </div>

              <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                <div className="max-w-md">
                  <UI.Label htmlFor="current-password">Current password</UI.Label>
                  <UI.Input
                    id="current-password"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    className="mt-1.5 w-full focus-visible:ring-2 focus-visible:ring-emerald-600"
                    style={fieldStyle}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    aria-invalid={errors.current ? "true" : undefined}
                    aria-describedby={errors.current ? "current-password-error" : undefined}
                  />
                  {errors.current ? (
                    <p
                      id="current-password-error"
                      className="mt-1.5 text-sm font-medium"
                      style={{ color: "var(--brand-danger-fg)" }}
                    >
                      {errors.current}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <UI.Label htmlFor="new-password">New password</UI.Label>
                    <UI.Input
                      id="new-password"
                      name="new_password"
                      type="password"
                      autoComplete="new-password"
                      className="mt-1.5 w-full focus-visible:ring-2 focus-visible:ring-emerald-600"
                      style={fieldStyle}
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      aria-invalid={errors.next ? "true" : undefined}
                      aria-describedby={
                        "password-rules" + (errors.next ? " new-password-error" : "")
                      }
                    />
                    {errors.next ? (
                      <p
                        id="new-password-error"
                        className="mt-1.5 text-sm font-medium"
                        style={{ color: "var(--brand-danger-fg)" }}
                      >
                        {errors.next}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <UI.Label htmlFor="confirm-password">Confirm new password</UI.Label>
                    <UI.Input
                      id="confirm-password"
                      name="confirm_password"
                      type="password"
                      autoComplete="new-password"
                      className="mt-1.5 w-full focus-visible:ring-2 focus-visible:ring-emerald-600"
                      style={fieldStyle}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      aria-invalid={errors.confirm ? "true" : undefined}
                      aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
                    />
                    {errors.confirm ? (
                      <p
                        id="confirm-password-error"
                        className="mt-1.5 text-sm font-medium"
                        style={{ color: "var(--brand-danger-fg)" }}
                      >
                        {errors.confirm}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div
                  id="password-rules"
                  className="border px-4 py-3"
                  style={{
                    backgroundColor: "var(--brand-surface-muted)",
                    borderColor: "var(--brand-border)",
                    borderRadius: brand.radius,
                  }}
                >
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "var(--brand-fg-heading)" }}
                  >
                    Password requirements
                  </h3>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {rules.map((rule) => {
                      const Icon = rule.met ? Icons.CheckCircle : Icons.AlertCircle;
                      return (
                        <li
                          key={rule.id}
                          className="flex items-center gap-2 text-sm"
                          style={{
                            color: rule.met ? "var(--brand-success-fg)" : "var(--brand-fg-muted)",
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{rule.text}</span>
                          <span className="sr-only">{rule.met ? "(met)" : "(not yet met)"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <UI.Button
                    type="submit"
                    disabled={submitting}
                    className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                    style={{
                      backgroundColor: "var(--brand-primary)",
                      color: "var(--brand-primary-fg)",
                      borderRadius: brand.radius,
                    }}
                  >
                    {submitting ? "Updating…" : "Update password"}
                  </UI.Button>
                  <UI.Button
                    type="button"
                    variant="secondary"
                    className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--brand-fg)",
                      borderColor: "var(--brand-border)",
                      borderRadius: brand.radius,
                    }}
                    onClick={() => {
                      setCurrent("");
                      setNext("");
                      setConfirm("");
                      setErrors({});
                      setFormStatus(null);
                    }}
                  >
                    Clear form
                  </UI.Button>
                </div>
              </form>
            </section>

            <section
              className="border p-6"
              style={sectionStyle}
              aria-labelledby="appearance-heading"
            >
              <h2
                id="appearance-heading"
                className="text-xl font-semibold"
                style={{ color: "var(--brand-fg-heading)" }}
              >
                Appearance
              </h2>
              <p className="mt-1.5 text-sm" style={{ color: "var(--brand-fg-muted)" }}>
                Applies immediately and is saved to your profile, so it follows you to your next
                sign-in.
              </p>

              <fieldset className="mt-5 border-0 p-0 m-0">
                <legend className="sr-only">Interface theme</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {THEME_OPTIONS.map((option) => {
                    const selected = theme === option.value;
                    const previewDark =
                      option.value === "dark" ||
                      (option.value === "system" && resolvedTheme === "dark");
                    return (
                      <label
                        key={option.value}
                        htmlFor={"theme-" + option.value}
                        className="flex cursor-pointer flex-col gap-3 border p-4 focus-within:ring-2 focus-within:ring-emerald-600"
                        style={{
                          borderColor: selected ? "var(--brand-accent)" : "var(--brand-border)",
                          borderWidth: selected ? "2px" : "1px",
                          backgroundColor: selected ? "var(--brand-surface-muted)" : "transparent",
                          borderRadius: brand.radius,
                        }}
                      >
                        <span className="flex items-start gap-2.5">
                          <input
                            id={"theme-" + option.value}
                            type="radio"
                            name="theme"
                            value={option.value}
                            checked={selected}
                            onChange={() => handleThemeChange(option.value)}
                            className="mt-1 h-4 w-4"
                            style={{ accentColor: "var(--brand-accent)" }}
                          />
                          <span>
                            <span
                              className="block text-sm font-semibold"
                              style={{ color: "var(--brand-fg-heading)" }}
                            >
                              {option.title}
                            </span>
                            <span
                              className="mt-0.5 block text-xs leading-relaxed"
                              style={{ color: "var(--brand-fg-muted)" }}
                            >
                              {option.description}
                            </span>
                          </span>
                        </span>
                        <span
                          className="flex h-12 overflow-hidden border"
                          style={{ borderColor: "var(--brand-border)", borderRadius: "0.375rem" }}
                          aria-hidden="true"
                        >
                          <span
                            className="w-1/3"
                            style={{ backgroundColor: "var(--brand-primary)" }}
                          />
                          <span
                            className="flex-1"
                            style={{ backgroundColor: previewDark ? "#0e1a28" : "#f5f7f9" }}
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <p className="mt-4 text-sm" style={{ color: "var(--brand-fg-muted)" }}>
                {theme === "system"
                  ? "Your operating system is currently set to " +
                    (resolvedTheme === "dark" ? "dark" : "light") +
                    ". The interface follows it without a reload."
                  : "Using the " +
                    (theme === "dark" ? "dark" : "light") +
                    " palette on every device you sign in from."}
              </p>
              <p
                className="mt-2 text-sm font-medium"
                role="status"
                aria-live="polite"
                style={{ color: "var(--brand-success-fg)" }}
              >
                {themeStatus}
              </p>
            </section>
          </div>

          <div className="flex flex-col gap-8">
            <section className="border p-6" style={sectionStyle} aria-labelledby="session-heading">
              <h2
                id="session-heading"
                className="text-xl font-semibold"
                style={{ color: "var(--brand-fg-heading)" }}
              >
                This session
              </h2>
              <dl className="mt-4 flex flex-col gap-4 text-sm">
                <div>
                  <dt
                    className="text-xs uppercase tracking-wide"
                    style={{ color: "var(--brand-fg-muted)" }}
                  >
                    Signed in as
                  </dt>
                  <dd style={{ color: "var(--brand-fg)" }}>{email || "—"}</dd>
                </div>
                <div>
                  <dt
                    className="text-xs uppercase tracking-wide"
                    style={{ color: "var(--brand-fg-muted)" }}
                  >
                    Role
                  </dt>
                  <dd style={{ color: "var(--brand-fg)" }}>
                    {isAdmin ? "Administrator" : "Employee"}
                  </dd>
                </div>
              </dl>
              <p
                className="mt-4 flex items-start gap-2 text-xs leading-relaxed"
                style={{ color: "var(--brand-fg-muted)" }}
              >
                <Icons.Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  There is no &ldquo;remember me&rdquo; option; this session expires automatically
                  from inactivity.
                </span>
              </p>
              <UI.Button
                type="button"
                onClick={handleSignOut}
                className="mt-5 w-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                style={{
                  backgroundColor: "var(--brand-primary)",
                  color: "var(--brand-primary-fg)",
                  borderRadius: brand.radius,
                }}
              >
                Sign out
              </UI.Button>
              <UI.Button
                type="button"
                variant="secondary"
                onClick={() => navigate("users")}
                className="mt-3 w-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--brand-fg)",
                  borderColor: "var(--brand-border)",
                  borderRadius: brand.radius,
                }}
              >
                Manage users
              </UI.Button>
              <p
                className="mt-3 text-xs leading-relaxed"
                style={{ color: "var(--brand-fg-muted)" }}
              >
                Forgotten passwords are reset by an administrator on the Users page — the assistant
                sends no email.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
