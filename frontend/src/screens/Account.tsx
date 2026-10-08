/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Button, Input, Label } = UI;
const { Check, X, Users, Clock, AlertCircle, CheckCircle } = Icons;

const USER = {
  id: "u_0147",
  name: "Satya Ganaraju",
  email: "satya.ganaraju@quorq.ai",
  role: "admin",
  is_enabled: true,
  created_at: "12 March 2026",
};

const SESSION = {
  created_at: "Today at 08:14",
  last_seen_at: "A moment ago",
  expires_note: "Signs out automatically after 3 days of inactivity",
  expires_on: "11 October 2026, 08:14",
};

const INITIAL_EVENTS = [
  { id: "e9", when: "8 Oct 2026, 08:14", kind: "success", label: "Signed in", detail: "Session started on this device" },
  { id: "e8", when: "7 Oct 2026, 17:42", kind: "success", label: "Signed in", detail: "Session started" },
  { id: "e7", when: "7 Oct 2026, 09:05", kind: "locked", label: "Email locked", detail: "5 failed attempts in 15 minutes — lock cleared automatically at 09:20" },
  { id: "e6", when: "7 Oct 2026, 09:03", kind: "failed", label: "Sign-in failed", detail: "Incorrect email or password" },
  { id: "e5", when: "7 Oct 2026, 09:02", kind: "failed", label: "Sign-in failed", detail: "Incorrect email or password" },
  { id: "e4", when: "6 Oct 2026, 16:20", kind: "success", label: "Signed in", detail: "Session started" },
  { id: "e3", when: "3 Oct 2026, 11:58", kind: "failed", label: "Sign-in failed", detail: "Incorrect email or password" },
  { id: "e2", when: "2 Oct 2026, 08:31", kind: "success", label: "Signed in", detail: "Session started" },
];

const THEME_OPTIONS = [
  { value: "light", title: "Light", description: "Always use the light palette." },
  { value: "dark", title: "Dark", description: "Always use the dark palette." },
  { value: "system", title: "System", description: "Follow your operating system setting." },
];

const PALETTE = {
  light: {
    page: "#F5F7F9",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF2F6",
    text: "#152434",
    heading: "#14304F",
    muted: "#5E6B7A",
    border: "#D9E0E8",
    buttonBg: "#14304F",
    buttonText: "#FFFFFF",
    okText: "#1F6B50",
    okBg: "#E7F3EE",
    errText: "#9A2A24",
    errBg: "#FBEAE8",
    warnText: "#8A5A10",
    warnBg: "#FCF2DF",
  },
  dark: {
    page: "#0E1A28",
    surface: "#152536",
    surfaceMuted: "#1C2F43",
    text: "#E9EFF5",
    heading: "#FFFFFF",
    muted: "#A6B7C8",
    border: "#2A3F57",
    buttonBg: "#2F8F6B",
    buttonText: "#07160F",
    okText: "#8CD9B6",
    okBg: "#153328",
    errText: "#F5A9A2",
    errBg: "#3A1E1C",
    warnText: "#F0CB85",
    warnBg: "#352714",
  },
};

const MIN_LENGTH = 12;

export default function Screen() {
  const navigate = useNavigate();
  const [themeChoice, setThemeChoice] = React.useState("system");
  const [systemDark, setSystemDark] = React.useState(function () {
    return typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
  });

  React.useEffect(function () {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = function (e) { setSystemDark(e.matches); };
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, []);

  const isDark = themeChoice === "dark" || (themeChoice === "system" && systemDark);
  const c = isDark ? PALETTE.dark : PALETTE.light;

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState({});
  const [formStatus, setFormStatus] = React.useState(null);
  const [themeStatus, setThemeStatus] = React.useState("");
  const [passwordChanged, setPasswordChanged] = React.useState("24 August 2026");
  const [events, setEvents] = React.useState(INITIAL_EVENTS);

  const rules = [
    { id: "len", text: "At least " + MIN_LENGTH + " characters", met: next.length >= MIN_LENGTH },
    { id: "num", text: "Contains a number", met: /[0-9]/.test(next) },
    { id: "match", text: "Confirmation matches", met: next.length > 0 && next === confirm },
  ];

  function handleThemeChange(value) {
    setThemeChoice(value);
    const label = value === "light" ? "Light" : value === "dark" ? "Dark" : "System";
    setThemeStatus("Appearance saved. " + label + " is now in use.");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};

    if (!current) nextErrors.current = "Enter your current password.";
    if (!next) nextErrors.next = "Enter a new password.";
    else if (next.length < MIN_LENGTH) nextErrors.next = "New password must be at least " + MIN_LENGTH + " characters.";
    else if (!/[0-9]/.test(next)) nextErrors.next = "New password must include at least one number.";
    else if (next === current) nextErrors.next = "New password must be different from your current password.";
    if (!confirm) nextErrors.confirm = "Re-enter the new password to confirm it.";
    else if (confirm !== next) nextErrors.confirm = "New password and confirmation do not match.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormStatus({ kind: "error", message: "Your password was not changed. Check the highlighted fields below." });
      return;
    }

    if (current.length < 8) {
      setErrors({ current: "Incorrect current password." });
      setFormStatus({ kind: "error", message: "Current password is incorrect. Your stored password is unchanged." });
      return;
    }

    setErrors({});
    setCurrent("");
    setNext("");
    setConfirm("");
    setPasswordChanged("Today at 09:41");
    setFormStatus({ kind: "success", message: "Password updated. Use the new password the next time you sign in." });
    setEvents(function (prev) {
      return [{
        id: "e-" + (prev.length + 10),
        when: "8 Oct 2026, 09:41",
        kind: "success",
        label: "Password changed",
        detail: "Changed from the Account page",
      }].concat(prev);
    });
  }

  function handleSignOut() {
    navigate("sign-in");
  }

  const fieldStyle = {
    backgroundColor: isDark ? "#0F1E2E" : "#FFFFFF",
    color: c.text,
    borderColor: c.border,
  };

  const sectionStyle = {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderRadius: brand.radius,
  };

  function EventPill(props) {
    const map = {
      success: { bg: c.okBg, fg: c.okText, Icon: Icons.CheckCircle, word: "Success" },
      failed: { bg: c.errBg, fg: c.errText, Icon: Icons.X, word: "Failed" },
      locked: { bg: c.warnBg, fg: c.warnText, Icon: Icons.AlertCircle, word: "Locked" },
    };
    const s = map[props.kind] || map.success;
    const Icon = s.Icon;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border"
        style={{ backgroundColor: s.bg, color: s.fg, borderColor: s.fg, borderRadius: "999px" }}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {s.word}
      </span>
    );
  }

  return (
    <div
      className="w-full min-h-full px-6 py-8 sm:px-10"
      style={{ backgroundColor: c.page, color: c.text, fontFamily: brand.fontBody }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: c.heading, fontFamily: brand.fontHeading }}
          >
            Account
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: c.muted }}>
            Manage the password for your Knowledge Assistant sign-in and choose how the interface looks on
            this device.
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
              style={{ backgroundColor: brand.primaryColor, color: "#FFFFFF", borderRadius: "999px" }}
              aria-hidden="true"
            >
              SG
            </span>
            <div>
              <h2 id="profile-heading" className="text-lg font-semibold" style={{ color: c.heading }}>
                {USER.name}
              </h2>
              <p className="text-sm" style={{ color: c.muted }}>{USER.email}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: c.muted }}>
                <span
                  className="inline-flex items-center gap-1.5 border px-2 py-0.5 font-medium"
                  style={{ color: brand.accentColor, borderColor: brand.accentColor, borderRadius: "999px" }}
                >
                  <Icons.Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Administrator
                </span>
                <span>Account created {USER.created_at}</span>
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:text-right">
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: c.muted }}>Password last changed</dt>
              <dd className="font-medium" style={{ color: c.text }}>{passwordChanged}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide" style={{ color: c.muted }}>Signed in since</dt>
              <dd className="font-medium" style={{ color: c.text }}>{SESSION.created_at}</dd>
            </div>
          </dl>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <section className="border p-6" style={sectionStyle} aria-labelledby="password-heading">
              <h2 id="password-heading" className="text-xl font-semibold" style={{ color: c.heading }}>
                Change password
              </h2>
              <p className="mt-1.5 text-sm" style={{ color: c.muted }}>
                Your new password replaces the one stored for {USER.email}. Other devices stay signed in until
                their sessions expire.
              </p>

              <div aria-live="polite" role="status">
                {formStatus ? (
                  <p
                    className="mt-5 flex items-start gap-2 border px-4 py-3 text-sm"
                    style={{
                      backgroundColor: formStatus.kind === "success" ? c.okBg : c.errBg,
                      color: formStatus.kind === "success" ? c.okText : c.errText,
                      borderColor: formStatus.kind === "success" ? c.okText : c.errText,
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
                    onChange={function (e) { setCurrent(e.target.value); }}
                    aria-invalid={errors.current ? "true" : undefined}
                    aria-describedby={errors.current ? "current-password-error" : undefined}
                  />
                  {errors.current ? (
                    <p id="current-password-error" className="mt-1.5 text-sm font-medium" style={{ color: c.errText }}>
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
                      onChange={function (e) { setNext(e.target.value); }}
                      aria-invalid={errors.next ? "true" : undefined}
                      aria-describedby={"password-rules" + (errors.next ? " new-password-error" : "")}
                    />
                    {errors.next ? (
                      <p id="new-password-error" className="mt-1.5 text-sm font-medium" style={{ color: c.errText }}>
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
                      onChange={function (e) { setConfirm(e.target.value); }}
                      aria-invalid={errors.confirm ? "true" : undefined}
                      aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
                    />
                    {errors.confirm ? (
                      <p id="confirm-password-error" className="mt-1.5 text-sm font-medium" style={{ color: c.errText }}>
                        {errors.confirm}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div
                  id="password-rules"
                  className="border px-4 py-3"
                  style={{ backgroundColor: c.surfaceMuted, borderColor: c.border, borderRadius: brand.radius }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: c.heading }}>Password requirements</h3>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {rules.map(function (rule) {
                      const Icon = rule.met ? Icons.CheckCircle : Icons.AlertCircle;
                      return (
                        <li key={rule.id} className="flex items-center gap-2 text-sm" style={{ color: rule.met ? c.okText : c.muted }}>
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
                    className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                    style={{ backgroundColor: c.buttonBg, color: c.buttonText, borderRadius: brand.radius }}
                  >
                    Update password
                  </UI.Button>
                  <UI.Button
                    type="button"
                    variant="outline"
                    className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                    style={{ backgroundColor: "transparent", color: c.text, borderColor: c.border, borderRadius: brand.radius }}
                    onClick={function () {
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

            <section className="border p-6" style={sectionStyle} aria-labelledby="appearance-heading">
              <h2 id="appearance-heading" className="text-xl font-semibold" style={{ color: c.heading }}>
                Appearance
              </h2>
              <p className="mt-1.5 text-sm" style={{ color: c.muted }}>
                Applies immediately and is saved to your profile, so it follows you to your next sign-in.
              </p>

              <fieldset className="mt-5 border-0 p-0 m-0">
                <legend className="sr-only">Interface theme</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {THEME_OPTIONS.map(function (option) {
                    const selected = themeChoice === option.value;
                    const previewDark = option.value === "dark" || (option.value === "system" && systemDark);
                    return (
                      <label
                        key={option.value}
                        htmlFor={"theme-" + option.value}
                        className="flex cursor-pointer flex-col gap-3 border p-4 focus-within:ring-2 focus-within:ring-emerald-600"
                        style={{
                          borderColor: selected ? brand.accentColor : c.border,
                          borderWidth: selected ? "2px" : "1px",
                          backgroundColor: selected ? (isDark ? c.surfaceMuted : "#F2F8F5") : "transparent",
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
                            onChange={function () { handleThemeChange(option.value); }}
                            className="mt-1 h-4 w-4"
                            style={{ accentColor: brand.accentColor }}
                          />
                          <span>
                            <span className="block text-sm font-semibold" style={{ color: c.heading }}>
                              {option.title}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: c.muted }}>
                              {option.description}
                            </span>
                          </span>
                        </span>
                        <span
                          className="flex h-12 overflow-hidden border"
                          style={{ borderColor: c.border, borderRadius: "0.375rem" }}
                          aria-hidden="true"
                        >
                          <span className="w-1/3" style={{ backgroundColor: brand.primaryColor }} />
                          <span className="flex-1" style={{ backgroundColor: previewDark ? "#0E1A28" : "#F5F7F9" }} />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <p className="mt-4 text-sm" style={{ color: c.muted }}>
                {themeChoice === "system"
                  ? "Your operating system is currently set to " + (systemDark ? "dark" : "light") + ". The interface follows it without a reload."
                  : "Using the " + (themeChoice === "dark" ? "dark" : "light") + " palette on every device you sign in from."}
              </p>
              <p className="mt-2 text-sm font-medium" role="status" aria-live="polite" style={{ color: c.okText }}>
                {themeStatus}
              </p>
            </section>
          </div>

          <div className="flex flex-col gap-8">
            <section className="border p-6" style={sectionStyle} aria-labelledby="session-heading">
              <h2 id="session-heading" className="text-xl font-semibold" style={{ color: c.heading }}>
                This session
              </h2>
              <dl className="mt-4 flex flex-col gap-4 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide" style={{ color: c.muted }}>Started</dt>
                  <dd style={{ color: c.text }}>{SESSION.created_at}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide" style={{ color: c.muted }}>Last activity</dt>
                  <dd style={{ color: c.text }}>{SESSION.last_seen_at}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide" style={{ color: c.muted }}>Expires</dt>
                  <dd style={{ color: c.text }}>{SESSION.expires_on}</dd>
                </div>
              </dl>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed" style={{ color: c.muted }}>
                <Icons.Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{SESSION.expires_note}. There is no &ldquo;remember me&rdquo; option.</span>
              </p>
              <UI.Button
                type="button"
                onClick={handleSignOut}
                className="mt-5 w-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                style={{ backgroundColor: c.buttonBg, color: c.buttonText, borderRadius: brand.radius }}
              >
                Sign out
              </UI.Button>
              <UI.Button
                type="button"
                variant="outline"
                onClick={function () { navigate("users"); }}
                className="mt-3 w-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                style={{ backgroundColor: "transparent", color: c.text, borderColor: c.border, borderRadius: brand.radius }}
              >
                Manage users
              </UI.Button>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: c.muted }}>
                Forgotten passwords are reset by an administrator on the Users page — the assistant sends no email.
              </p>
            </section>

            <section className="border p-6" style={sectionStyle} aria-labelledby="activity-heading">
              <h2 id="activity-heading" className="text-xl font-semibold" style={{ color: c.heading }}>
                Recent security activity
              </h2>
              <p className="mt-1.5 text-sm" style={{ color: c.muted }}>
                Sign-in attempts and password changes recorded for your email.
              </p>
              <ul className="mt-5 flex flex-col">
                {events.slice(0, 7).map(function (event, index) {
                  return (
                    <li
                      key={event.id}
                      className="flex flex-col gap-1.5 py-3"
                      style={{ borderTop: index === 0 ? "none" : "1px solid " + c.border }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium" style={{ color: c.text }}>{event.label}</span>
                        <EventPill kind={event.kind} />
                      </div>
                      <span className="text-xs" style={{ color: c.muted }}>{event.when}</span>
                      <span className="text-xs leading-relaxed" style={{ color: c.muted }}>{event.detail}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
