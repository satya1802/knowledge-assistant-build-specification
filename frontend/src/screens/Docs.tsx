import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { API_BASE_URL } from "@/lib/api";

const {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Checkbox,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} = UI;

const TABS = [
  { id: "guide", label: "Getting started" },
  { id: "api", label: "API reference" },
];

const GUIDE_SECTIONS = [
  { id: "before-you-begin", label: "Before you begin" },
  { id: "signing-in", label: "Signing in" },
  { id: "asking", label: "Asking a question" },
  { id: "uploading", label: "Uploading documents" },
  { id: "account", label: "Account and appearance" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

const CHECKLIST = [
  { id: "c1", label: "Get your work email and starting password from an administrator" },
  { id: "c2", label: "Sign in and change your password on the Account page" },
  { id: "c3", label: "Ask your first question on the Chat page" },
  { id: "c4", label: "If you are an administrator, upload a document on the Knowledge base page" },
];

const FAQS = [
  {
    id: "faq-credentials",
    question: "I get “Incorrect email or password” but I am sure it is right",
    answer:
      "The same message is shown whether the email is unknown, the password is wrong, or the account has been disabled — that is deliberate, so nobody can discover which addresses exist. Ask an administrator to confirm your account is enabled, or to set you a new password from the Users page.",
  },
  {
    id: "faq-locked",
    question: "My email has been locked",
    answer:
      "Repeated failed sign-in attempts within a short window lock that email address for a cooldown period, even if the next password is correct. Wait for the window to pass and try again, or ask an administrator to reset your password — a reset clears the lock immediately.",
  },
  {
    id: "faq-signup",
    question: "There is no “Create account” option on the sign-in page",
    answer:
      "Self-service account creation can be switched off by an administrator. When it is off, an administrator creates your account for you and shares the starting password directly — the product sends no email.",
  },
  {
    id: "faq-upload",
    question: "I am an administrator and uploading a file fails immediately",
    answer:
      "Uploads are accepted only as PDF, DOCX, TXT or MD, and only up to 25 MB. Anything else, or anything larger, is refused before it is stored, with a message naming the accepted formats or the size limit.",
  },
];

// Endpoints exactly as implemented in app/routers (auth, account, documents,
// users). Nothing here is aspirational: every path, method, parameter and
// response shape matches the shipped FastAPI routes and Pydantic schemas.
const ENDPOINTS = [
  {
    id: "auth-config",
    method: "GET",
    path: "/auth/config",
    access: "Public",
    summary: "Check whether self-service account creation is turned on.",
    description:
      "Called by the sign-in page before it renders, so the “Create account” option only appears when an administrator has enabled self-signup.",
    params: [],
    response: '200 OK\n{ "self_signup_enabled": true }',
  },
  {
    id: "login",
    method: "POST",
    path: "/auth/login",
    access: "Public",
    summary: "Verify credentials and open a session.",
    description:
      "Checks the password against its bcrypt hash and sets an HTTP-only session cookie. Unknown email, wrong password and disabled account all return the same generic error, with the same status code.",
    params: [
      { name: "email", loc: "body", type: "string", required: true, note: "Work email address" },
      {
        name: "password",
        loc: "body",
        type: "string",
        required: true,
        note: "Plain text over TLS; never logged",
      },
    ],
    response:
      '200 OK\nSet-Cookie: session_id=…; HttpOnly; SameSite=Lax\n{\n  "id": "4f2a1c9e2b7a4d6c",\n  "email": "name@example.com",\n  "role": "employee",\n  "is_enabled": true,\n  "theme": "system"\n}\n\n401 Unauthorized\n{ "detail": "Incorrect email or password" }',
  },
  {
    id: "signup",
    method: "POST",
    path: "/auth/signup",
    access: "Public",
    summary: "Create an account when self-signup is enabled.",
    description:
      "Rejected with a clear message when an administrator has turned self-signup off, and when the email already exists. The very first account ever created on the system becomes the admin; every account after that is an employee.",
    params: [
      { name: "email", loc: "body", type: "string", required: true, note: "Must be unique" },
      { name: "password", loc: "body", type: "string", required: true, note: "Chosen by the user" },
    ],
    response:
      '201 Created\n{\n  "id": "9b31ef02a7c4",\n  "email": "name@example.com",\n  "role": "employee",\n  "is_enabled": true,\n  "theme": "system"\n}\n\n403 Forbidden\n{ "detail": "Account creation is currently disabled" }',
  },
  {
    id: "logout",
    method: "POST",
    path: "/auth/logout",
    access: "Signed in",
    summary: "Delete the server-side session and clear the cookie.",
    description:
      "After logout, any protected page requires signing in again. Sessions also expire after a fixed idle period set by the server; there is no “remember me” option.",
    params: [],
    response: '200 OK\nSet-Cookie: session_id=; Max-Age=0\n{ "detail": "Logged out" }',
  },
  {
    id: "me",
    method: "GET",
    path: "/auth/me",
    access: "Signed in",
    summary: "Return the signed-in user.",
    description:
      "Used by the frontend on load to decide which navigation items to render and which theme to apply. Returns 401 when the session has expired or the account has been disabled.",
    params: [],
    response:
      '200 OK\n{\n  "id": "4f2a1c9e2b7a4d6c",\n  "email": "name@example.com",\n  "role": "admin",\n  "is_enabled": true,\n  "theme": "dark"\n}',
  },
  {
    id: "password",
    method: "POST",
    path: "/account/password",
    access: "Signed in",
    summary: "Change your own password.",
    description:
      "Requires the current password. A new bcrypt hash replaces the old one; other sessions are untouched.",
    params: [
      {
        name: "current_password",
        loc: "body",
        type: "string",
        required: true,
        note: "Verified against the stored hash",
      },
      {
        name: "new_password",
        loc: "body",
        type: "string",
        required: true,
        note: "Minimum 12 characters",
      },
    ],
    response:
      '200 OK\n{ "detail": "Password updated" }\n\n400 Bad Request\n{ "detail": "Current password is incorrect" }',
  },
  {
    id: "theme",
    method: "PUT",
    path: "/account/theme",
    access: "Signed in",
    summary: "Store the Light / Dark / System preference.",
    description:
      "The choice persists across reloads and later sign-ins. With “system” the interface follows the operating system appearance without a page reload.",
    params: [
      { name: "theme", loc: "body", type: "enum", required: true, note: "light | dark | system" },
    ],
    response: '200 OK\n{ "detail": "Theme updated" }',
  },
  {
    id: "docs-list",
    method: "GET",
    path: "/documents",
    access: "Signed in",
    summary: "List every uploaded document.",
    description:
      "Returns every document row, newest upload first. There is no filtering or search on this endpoint.",
    params: [],
    response:
      '200 OK\n[\n  {\n    "id": "7c1e9a4f2b3d",\n    "filename": "example-document.pdf",\n    "file_type": "pdf",\n    "size_bytes": 1048576,\n    "status": "processing",\n    "uploaded_by": "4f2a1c9e2b7a4d6c",\n    "uploaded_at": "2026-10-08T09:12:00Z"\n  }\n]',
  },
  {
    id: "docs-upload",
    method: "POST",
    path: "/documents",
    access: "Admin only",
    summary: "Upload a file as multipart form data.",
    description:
      "Accepts PDF, DOCX, TXT and MD up to 25 MB; anything else, or a mismatched content type, is refused with a 400 before anything is stored. Every uploaded document is created at status “processing” — extraction, chunking and indexing are not part of this build.",
    params: [
      {
        name: "file",
        loc: "multipart",
        type: "binary",
        required: true,
        note: "PDF, DOCX, TXT or MD, max 25 MB",
      },
    ],
    response:
      '201 Created\n{\n  "id": "7c1e9a4f2b3d",\n  "filename": "example-document.pdf",\n  "file_type": "pdf",\n  "size_bytes": 1048576,\n  "status": "processing",\n  "uploaded_by": "4f2a1c9e2b7a4d6c",\n  "uploaded_at": "2026-10-08T09:12:00Z"\n}\n\n400 Bad Request\n{ "detail": "File exceeds the 25 MB size limit" }',
  },
  {
    id: "docs-download",
    method: "GET",
    path: "/documents/{id}/download",
    access: "Signed in",
    summary: "Download the original uploaded file.",
    description:
      "Streams the stored original from the server filesystem with its original filename and content type.",
    params: [{ name: "id", loc: "path", type: "string", required: true, note: "Document id" }],
    response:
      '200 OK\nContent-Type: application/pdf\nContent-Disposition: attachment; filename="example-document.pdf"\n\n404 Not Found\n{ "detail": "Document not found" }',
  },
  {
    id: "docs-delete",
    method: "DELETE",
    path: "/documents/{id}",
    access: "Admin only",
    summary: "Remove a document and its stored file.",
    description: "Deletion is permanent, including the original file on disk.",
    params: [{ name: "id", loc: "path", type: "string", required: true, note: "Document id" }],
    response: '204 No Content\n\n404 Not Found\n{ "detail": "Document not found" }',
  },
  {
    id: "users-list",
    method: "GET",
    path: "/users",
    access: "Admin only",
    summary: "List every account, ordered by email.",
    description:
      "Employees calling this endpoint directly receive a 403 and no data. Password hashes are never included in any response.",
    params: [],
    response:
      '200 OK\n[\n  { "id": "1a2b3c", "email": "admin@example.com", "role": "admin", "is_enabled": true, "theme": "system" },\n  { "id": "4d5e6f", "email": "name@example.com", "role": "employee", "is_enabled": true, "theme": "light" }\n]',
  },
  {
    id: "users-create",
    method: "POST",
    path: "/users",
    access: "Admin only",
    summary: "Add an enabled account.",
    description:
      "No notification email is sent — there is no SMTP dependency. The administrator shares the initial password out of band. Defaults to the employee role when none is given.",
    params: [
      { name: "email", loc: "body", type: "string", required: true, note: "Must be unique" },
      {
        name: "password",
        loc: "body",
        type: "string",
        required: true,
        note: "Initial password, stored as a bcrypt hash",
      },
      {
        name: "role",
        loc: "body",
        type: "enum",
        required: false,
        note: "admin | employee (default employee)",
      },
    ],
    response:
      '201 Created\n{ "id": "9f8e7d", "email": "name@example.com", "role": "employee", "is_enabled": true, "theme": "system" }\n\n400 Bad Request\n{ "detail": "An account already exists for this email" }',
  },
  {
    id: "users-patch",
    method: "PATCH",
    path: "/users/{id}",
    access: "Admin only",
    summary: "Disable, promote, demote or reset a password.",
    description:
      "Every field is optional; only the fields present in the request are changed. Setting a password clears any sign-in lock recorded against that account's email.",
    params: [
      { name: "id", loc: "path", type: "string", required: true, note: "User id" },
      {
        name: "is_enabled",
        loc: "body",
        type: "boolean",
        required: false,
        note: "false disables sign-in immediately",
      },
      { name: "role", loc: "body", type: "enum", required: false, note: "admin | employee" },
      {
        name: "password",
        loc: "body",
        type: "string",
        required: false,
        note: "Replaces the stored hash",
      },
    ],
    response:
      '200 OK\n{ "id": "9f8e7d", "email": "name@example.com", "role": "employee", "is_enabled": true, "theme": "system" }\n\n404 Not Found\n{ "detail": "User not found" }',
  },
];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const ENTITIES = [
  { name: "users", fields: "id, email, password_hash, role, is_enabled, theme, created_at" },
  { name: "sessions", fields: "id, user_id, created_at, last_activity_at, expires_at" },
  { name: "login_lockouts", fields: "email, failed_count, first_failure_at, locked_until" },
  {
    name: "documents",
    fields:
      "id, filename, stored_filename, content_type, file_type, size_bytes, status, uploaded_by, uploaded_at",
  },
];

export default function Screen() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("guide");
  const [activeSection, setActiveSection] = React.useState("before-you-begin");
  const [done, setDone] = React.useState({ c1: true, c2: false, c3: false, c4: false });
  const [openFaq, setOpenFaq] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [methods, setMethods] = React.useState([]);
  const [adminOnly, setAdminOnly] = React.useState(false);
  const [openEndpoint, setOpenEndpoint] = React.useState(null);

  const tabRefs = React.useRef([]);

  const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const ringStyle = { ["--tw-ring-color"]: "var(--brand-primary)" } as React.CSSProperties;

  const doneCount = CHECKLIST.filter((item) => done[item.id]).length;

  const filtered = ENDPOINTS.filter((ep) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      ep.path.toLowerCase().includes(q) ||
      ep.summary.toLowerCase().includes(q) ||
      ep.description.toLowerCase().includes(q) ||
      ep.method.toLowerCase() === q;
    const matchesMethod = methods.length === 0 || methods.includes(ep.method);
    const matchesAccess = !adminOnly || ep.access === "Admin only";
    return matchesQuery && matchesMethod && matchesAccess;
  });

  function toggleMethod(m) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
    setOpenEndpoint(null);
  }

  function clearFilters() {
    setQuery("");
    setMethods([]);
    setAdminOnly(false);
  }

  function onTabKeyDown(event, index) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    const node = tabRefs.current[next];
    if (node) node.focus();
  }

  const sectionHeading = "text-xl font-semibold tracking-tight";
  const prose = "mt-3 text-[15px] leading-7";
  const mutedText = { color: "var(--brand-fg-muted)" } as React.CSSProperties;
  const headingColor = { color: "var(--brand-fg-heading)" } as React.CSSProperties;
  const cardStyle = {
    backgroundColor: "var(--brand-surface)",
    borderColor: "var(--brand-border)",
    borderRadius: brand.radius,
  } as React.CSSProperties;

  return (
    <div
      className="w-full min-h-full px-5 py-10 sm:px-8"
      style={{
        backgroundColor: "var(--brand-background)",
        color: "var(--brand-fg)",
        fontFamily: brand.fontBody,
      }}
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Page header */}
        <header className="border-b pb-8" style={{ borderColor: "var(--brand-border)" }}>
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--brand-accent)" }}
          >
            Public documentation
          </p>
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: brand.fontHeading, ...headingColor }}
          >
            Knowledge Assistant documentation
          </h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-7" style={mutedText}>
            Everything on this page is readable without an account and makes no call to the backend.
            It explains how employees sign in, ask questions and, for administrators, upload
            documents to the shared knowledge base, and it documents every endpoint the interface
            uses. No knowledge base content or account data is shown here.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => navigate("sign-in")}
              className={focusRing}
              style={{
                backgroundColor: "var(--brand-primary)",
                color: "var(--brand-primary-fg)",
                ...ringStyle,
              }}
            >
              Sign in to Knowledge Assistant
              <Icons.ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Documentation sections"
          className="mt-8 flex gap-1 border-b"
          style={{ borderColor: "var(--brand-border)" }}
        >
          {TABS.map((t, i) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${focusRing} ${
                  selected ? "" : "border-transparent"
                }`}
                style={
                  selected
                    ? {
                        borderColor: "var(--brand-primary)",
                        color: "var(--brand-primary)",
                        ...ringStyle,
                      }
                    : { color: "var(--brand-fg-muted)", ...ringStyle }
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Getting started */}
        <div
          role="tabpanel"
          id="panel-guide"
          aria-labelledby="tab-guide"
          tabIndex={0}
          hidden={tab !== "guide"}
          className={`${focusRing} outline-none`}
          style={ringStyle}
        >
          {tab === "guide" && (
            <div className="grid gap-10 pt-8 lg:grid-cols-4">
              <nav aria-label="On this page" className="lg:col-span-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em]" style={mutedText}>
                  On this page
                </h2>
                <ul className="mt-4 space-y-1 lg:sticky lg:top-6">
                  {GUIDE_SECTIONS.map((s) => {
                    const current = activeSection === s.id;
                    return (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          onClick={() => setActiveSection(s.id)}
                          aria-current={current ? "true" : undefined}
                          className={`block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors ${focusRing} ${
                            current ? "font-semibold" : "border-transparent"
                          }`}
                          style={
                            current
                              ? {
                                  borderColor: "var(--brand-accent)",
                                  color: "var(--brand-primary)",
                                  backgroundColor: "var(--brand-surface)",
                                  ...ringStyle,
                                }
                              : { color: "var(--brand-fg-muted)", ...ringStyle }
                          }
                        >
                          {s.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="space-y-10 lg:col-span-3">
                {/* Checklist */}
                <Card className="border" style={cardStyle}>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: brand.fontHeading, ...headingColor }}>
                      Your first five minutes
                    </CardTitle>
                    <CardDescription style={mutedText}>
                      Tick these off as you go. The list is yours while this page is open.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {CHECKLIST.map((item) => (
                        <li key={item.id} className="flex items-start gap-3">
                          <Checkbox
                            id={item.id}
                            checked={!!done[item.id]}
                            onChange={() => setDone((d) => ({ ...d, [item.id]: !d[item.id] }))}
                            className={`mt-0.5 ${focusRing}`}
                            style={ringStyle}
                          />
                          <Label
                            htmlFor={item.id}
                            className="text-[15px] leading-6"
                            style={done[item.id] ? mutedText : { color: "var(--brand-fg)" }}
                          >
                            {item.label}
                          </Label>
                        </li>
                      ))}
                    </ul>
                    <p
                      className="mt-4 text-sm font-medium"
                      aria-live="polite"
                      style={{ color: "var(--brand-accent)" }}
                    >
                      {doneCount} of {CHECKLIST.length} steps complete
                    </p>
                  </CardContent>
                </Card>

                <section id="before-you-begin" aria-labelledby="h-before">
                  <h2 id="h-before" className={sectionHeading} style={headingColor}>
                    Before you begin
                  </h2>
                  <p className={prose} style={mutedText}>
                    Knowledge Assistant answers questions from the documents your organisation has
                    uploaded. It is an internal tool: there is no pricing, no plan and nothing to
                    buy.
                  </p>
                  <ul className="mt-4 space-y-2 text-[15px] leading-7" style={mutedText}>
                    <li className="flex gap-3">
                      <Icons.User
                        className="mt-1.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                        style={{ color: "var(--brand-accent)" }}
                      />
                      <span>
                        An account. Where self-signup is switched off, an administrator creates it
                        and gives you a starting password directly &mdash; the product sends no
                        email.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <Icons.Package
                        className="mt-1.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                        style={{ color: "var(--brand-accent)" }}
                      />
                      <span>
                        A current version of Chrome, Safari, Edge or Firefox. A phone-sized screen
                        works too.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <Icons.Users
                        className="mt-1.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                        style={{ color: "var(--brand-accent)" }}
                      />
                      <span>
                        Two roles exist: <strong>employee</strong> and <strong>admin</strong>.
                        Uploading, deleting documents and managing users is limited to admins;
                        everything else is open to both.
                      </span>
                    </li>
                  </ul>
                </section>

                <section id="signing-in" aria-labelledby="h-signin">
                  <h2 id="h-signin" className={sectionHeading} style={headingColor}>
                    Signing in
                  </h2>
                  <ol className="mt-4 space-y-3 text-[15px] leading-7" style={mutedText}>
                    <li className="flex gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--brand-primary)",
                          color: "var(--brand-primary-fg)",
                        }}
                      >
                        1
                      </span>
                      <span>Open the Sign in page and enter your work email and password.</span>
                    </li>
                    <li className="flex gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--brand-primary)",
                          color: "var(--brand-primary-fg)",
                        }}
                      >
                        2
                      </span>
                      <span>
                        You land on Chat. The sidebar holds Chat, the knowledge base, your account
                        and, for admins, user management.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--brand-primary)",
                          color: "var(--brand-primary-fg)",
                        }}
                      >
                        3
                      </span>
                      <span>
                        Change the password you were given on the Account page. Sessions end when
                        you sign out or after a fixed idle period, so an unattended browser does not
                        leave the knowledge base open.
                      </span>
                    </li>
                  </ol>
                  <div
                    className="mt-5 rounded-lg border-l-4 p-4"
                    style={{
                      borderColor: "var(--brand-accent)",
                      backgroundColor: "var(--brand-surface)",
                      borderRadius: brand.radius,
                    }}
                  >
                    <p className="text-sm font-semibold" style={headingColor}>
                      Why the error message never says which part was wrong
                    </p>
                    <p className="mt-1 text-sm leading-6" style={mutedText}>
                      Unknown email, wrong password and disabled account all produce the identical
                      message, so no one can use the form to discover which addresses exist.
                      Repeated failures lock that email for a cooldown period.
                    </p>
                  </div>
                </section>

                <section id="asking" aria-labelledby="h-asking">
                  <h2 id="h-asking" className={sectionHeading} style={headingColor}>
                    Asking a question
                  </h2>
                  <p className={prose} style={mutedText}>
                    Type a plain English question on the Chat page and send it. Questions are
                    intended to be answered using the documents uploaded to the knowledge base, so
                    the more specific your wording, the easier it is to match against the right
                    passage.
                  </p>
                  <div className="mt-5 rounded-lg border p-4" style={{ ...cardStyle }}>
                    <p className="text-sm font-semibold" style={headingColor}>
                      If nothing relevant has been uploaded yet
                    </p>
                    <p className="mt-1 text-sm leading-6" style={mutedText}>
                      Ask an administrator to upload the document that covers your question on the
                      Knowledge base page.
                    </p>
                  </div>
                </section>

                <section id="uploading" aria-labelledby="h-upload">
                  <h2 id="h-upload" className={sectionHeading} style={headingColor}>
                    Uploading documents{" "}
                    <span className="text-base font-normal" style={mutedText}>
                      (administrators)
                    </span>
                  </h2>
                  <p className={prose} style={mutedText}>
                    Administrators drag files onto the dropzone on the Knowledge base page, or pick
                    them from the file picker. PDF, DOCX, TXT and MD are accepted up to 25 MB each;
                    anything else is refused before it is stored. Employees see the same list
                    without a dropzone or delete control.
                  </p>
                  <p className="mt-4 text-[15px] leading-7" style={mutedText}>
                    Every upload is recorded with the filename, size, type and who uploaded it, and
                    starts at status <strong>processing</strong>. Deleting a document removes its
                    stored file and its row immediately.
                  </p>
                </section>

                <section id="account" aria-labelledby="h-account">
                  <h2 id="h-account" className={sectionHeading} style={headingColor}>
                    Account and appearance
                  </h2>
                  <p className={prose} style={mutedText}>
                    The Account page does two things: change your password (current password, then
                    the new one twice, minimum twelve characters) and choose Light, Dark or System.
                    The appearance changes immediately, follows your operating system when System is
                    chosen, and is remembered the next time you sign in.
                  </p>
                  <p className="mt-3 text-[15px] leading-7" style={mutedText}>
                    Forgotten your password? There is no reset email. An administrator sets a new
                    one from the Users page, which also clears any sign-in lock on your address.
                  </p>
                </section>

                <section id="troubleshooting" aria-labelledby="h-trouble">
                  <h2 id="h-trouble" className={sectionHeading} style={headingColor}>
                    Troubleshooting
                  </h2>
                  <ul
                    className="mt-4 divide-y overflow-hidden rounded-lg border"
                    style={{
                      borderColor: "var(--brand-border)",
                      backgroundColor: "var(--brand-surface)",
                    }}
                  >
                    {FAQS.map((faq) => {
                      const open = openFaq === faq.id;
                      return (
                        <li key={faq.id} style={{ borderColor: "var(--brand-border)" }}>
                          <h3 className="m-0">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={`${faq.id}-panel`}
                              id={`${faq.id}-button`}
                              onClick={() => setOpenFaq(open ? null : faq.id)}
                              className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-[15px] font-medium ${focusRing}`}
                              style={headingColor}
                              onMouseDown={(e) => e.currentTarget.style.setProperty("--hover", "1")}
                            >
                              <span>{faq.question}</span>
                              {open ? (
                                <Icons.ChevronDown
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Icons.ChevronRight
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </h3>
                          <div
                            id={`${faq.id}-panel`}
                            role="region"
                            aria-labelledby={`${faq.id}-button`}
                            hidden={!open}
                            className="px-4 pb-4 text-[15px] leading-7"
                            style={mutedText}
                          >
                            {faq.answer}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </div>

        {/* API reference */}
        <div
          role="tabpanel"
          id="panel-api"
          aria-labelledby="tab-api"
          tabIndex={0}
          hidden={tab !== "api"}
          className={`${focusRing} outline-none`}
          style={ringStyle}
        >
          {tab === "api" && (
            <div className="pt-8">
              <h2 className="text-2xl font-semibold tracking-tight" style={headingColor}>
                API reference
              </h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7" style={mutedText}>
                The same JSON API the interface uses. Authentication is a single HTTP-only session
                cookie set by{" "}
                <code
                  className="rounded px-1 py-0.5 text-[13px]"
                  style={{ backgroundColor: "var(--brand-surface-muted)" }}
                >
                  POST /auth/login
                </code>{" "}
                &mdash; there are no API keys to issue. Endpoints marked <strong>Admin only</strong>{" "}
                refuse employee sessions with a 403 and change nothing.
              </p>

              <Card className="mt-6 border" style={cardStyle}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.12em]"
                      style={mutedText}
                    >
                      Base URL
                    </p>
                    <code className="mt-1 block text-[15px] font-medium" style={headingColor}>
                      {API_BASE_URL}
                    </code>
                    <p className="mt-1 text-xs" style={mutedText}>
                      Set at build time for the deployed environment; every path below is appended
                      to it directly, with no additional prefix.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <div className="mt-8 rounded-lg border p-5" style={{ ...cardStyle }}>
                <h3 className="text-sm font-semibold" style={headingColor}>
                  Find an endpoint
                </h3>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <Label
                      htmlFor="endpoint-search"
                      className="text-sm font-medium"
                      style={{ color: "var(--brand-fg)" }}
                    >
                      Search by path or description
                    </Label>
                    <div className="relative mt-2">
                      <Icons.Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                        aria-hidden="true"
                        style={mutedText}
                      />
                      <Input
                        id="endpoint-search"
                        type="search"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setOpenEndpoint(null);
                        }}
                        placeholder="documents, users, login…"
                        className={`pl-9 ${focusRing}`}
                        style={ringStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <span
                      id="method-group-label"
                      className="block text-sm font-medium"
                      style={{ color: "var(--brand-fg)" }}
                    >
                      Filter by method
                    </span>
                    <div
                      role="group"
                      aria-labelledby="method-group-label"
                      className="mt-2 flex flex-wrap gap-2"
                    >
                      {METHODS.map((m) => {
                        const on = methods.includes(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleMethod(m)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${focusRing}`}
                            style={
                              on
                                ? {
                                    backgroundColor: "var(--brand-primary)",
                                    borderColor: "var(--brand-primary)",
                                    color: "var(--brand-primary-fg)",
                                    ...ringStyle,
                                  }
                                : {
                                    borderColor: "var(--brand-border)",
                                    backgroundColor: "var(--brand-surface)",
                                    color: "var(--brand-fg)",
                                    ...ringStyle,
                                  }
                            }
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div
                  className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4"
                  style={{ borderColor: "var(--brand-border)" }}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="admin-only"
                      checked={adminOnly}
                      onChange={() => {
                        setAdminOnly((v) => !v);
                        setOpenEndpoint(null);
                      }}
                      className={focusRing}
                      style={ringStyle}
                    />
                    <Label
                      htmlFor="admin-only"
                      className="text-sm"
                      style={{ color: "var(--brand-fg)" }}
                    >
                      Admin-only endpoints
                    </Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <p aria-live="polite" className="text-sm" style={mutedText}>
                      Showing {filtered.length} of {ENDPOINTS.length} endpoints
                    </p>
                    <Button
                      type="button"
                      onClick={clearFilters}
                      className={focusRing}
                      style={{
                        backgroundColor: "transparent",
                        color: "var(--brand-primary)",
                        border: "1px solid var(--brand-border)",
                        ...ringStyle,
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                </div>
              </div>

              {/* Endpoint list */}
              {filtered.length === 0 ? (
                <div
                  className="mt-8 rounded-lg border border-dashed px-6 py-14 text-center"
                  style={{
                    borderColor: "var(--brand-border)",
                    backgroundColor: "var(--brand-surface)",
                  }}
                >
                  <Icons.Search className="mx-auto h-6 w-6" aria-hidden="true" style={mutedText} />
                  <h3 className="mt-4 text-base font-semibold" style={headingColor}>
                    No endpoints match those filters
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={mutedText}>
                    Try a shorter search term, or clear the method and access filters to see all{" "}
                    {ENDPOINTS.length} endpoints again.
                  </p>
                  <Button
                    type="button"
                    onClick={clearFilters}
                    className={`mt-6 ${focusRing}`}
                    style={{
                      backgroundColor: "var(--brand-primary)",
                      color: "var(--brand-primary-fg)",
                      ...ringStyle,
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <ul className="mt-8 space-y-3">
                  {filtered.map((ep) => {
                    const open = openEndpoint === ep.id;
                    return (
                      <li
                        key={ep.id}
                        className="overflow-hidden rounded-lg border"
                        style={{
                          borderColor: "var(--brand-border)",
                          backgroundColor: "var(--brand-surface)",
                        }}
                      >
                        <h3 className="m-0">
                          <button
                            type="button"
                            id={`${ep.id}-button`}
                            aria-expanded={open}
                            aria-controls={`${ep.id}-detail`}
                            onClick={() => setOpenEndpoint(open ? null : ep.id)}
                            className={`flex w-full items-start gap-4 px-4 py-4 text-left ${focusRing}`}
                            style={ringStyle}
                          >
                            <span
                              className="mt-0.5 w-16 shrink-0 rounded border px-2 py-0.5 text-center text-[11px] font-bold tracking-wider"
                              style={{
                                borderColor: "var(--brand-border)",
                                color: "var(--brand-fg)",
                              }}
                            >
                              {ep.method}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="block font-mono text-[15px] font-semibold"
                                style={headingColor}
                              >
                                {ep.path}
                              </span>
                              <span className="mt-1 block text-sm leading-6" style={mutedText}>
                                {ep.summary}
                              </span>
                            </span>
                            <span
                              className="mt-0.5 hidden whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-block"
                              style={
                                ep.access === "Admin only"
                                  ? {
                                      borderColor: "var(--brand-accent)",
                                      color: "var(--brand-accent)",
                                    }
                                  : {
                                      borderColor: "var(--brand-border)",
                                      color: "var(--brand-fg-muted)",
                                    }
                              }
                            >
                              {ep.access}
                            </span>
                            {open ? (
                              <Icons.ChevronDown
                                className="mt-1 h-4 w-4 shrink-0"
                                aria-hidden="true"
                                style={mutedText}
                              />
                            ) : (
                              <Icons.ChevronRight
                                className="mt-1 h-4 w-4 shrink-0"
                                aria-hidden="true"
                                style={mutedText}
                              />
                            )}
                          </button>
                        </h3>
                        <div
                          id={`${ep.id}-detail`}
                          role="region"
                          aria-labelledby={`${ep.id}-button`}
                          hidden={!open}
                          className="border-t px-4 py-5"
                          style={{ borderColor: "var(--brand-border)" }}
                        >
                          <p className="max-w-3xl text-[15px] leading-7" style={mutedText}>
                            {ep.description}
                          </p>
                          <p className="mt-3 text-sm sm:hidden" style={mutedText}>
                            <strong>Access:</strong> {ep.access}
                          </p>

                          {ep.params.length > 0 ? (
                            <div className="mt-5">
                              <h4 className="text-sm font-semibold" style={headingColor}>
                                Parameters
                              </h4>
                              <div className="mt-2 overflow-x-auto">
                                <Table>
                                  <THead>
                                    <TR>
                                      <TH scope="col">Name</TH>
                                      <TH scope="col">In</TH>
                                      <TH scope="col">Type</TH>
                                      <TH scope="col">Required</TH>
                                      <TH scope="col">Notes</TH>
                                    </TR>
                                  </THead>
                                  <TBody>
                                    {ep.params.map((p) => (
                                      <TR key={p.name}>
                                        <TD className="font-mono text-[13px]">{p.name}</TD>
                                        <TD className="text-sm" style={mutedText}>
                                          {p.loc}
                                        </TD>
                                        <TD className="text-sm" style={mutedText}>
                                          {p.type}
                                        </TD>
                                        <TD
                                          className="text-sm"
                                          style={{ color: "var(--brand-fg)" }}
                                        >
                                          {p.required ? "Required" : "Optional"}
                                        </TD>
                                        <TD className="text-sm" style={mutedText}>
                                          {p.note}
                                        </TD>
                                      </TR>
                                    ))}
                                  </TBody>
                                </Table>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-5 text-sm" style={mutedText}>
                              No parameters.
                            </p>
                          )}

                          <div className="mt-5">
                            <h4 className="text-sm font-semibold" style={headingColor}>
                              Example response
                            </h4>
                            <pre
                              tabIndex={0}
                              className={`mt-2 overflow-x-auto rounded-md p-4 text-[13px] leading-6 ${focusRing}`}
                              style={{
                                backgroundColor: "var(--brand-primary)",
                                color: "var(--brand-primary-fg)",
                                borderRadius: brand.radius,
                                ...ringStyle,
                              }}
                            >
                              <code>{ep.response}</code>
                            </pre>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Entities */}
              <section className="mt-12" aria-labelledby="h-entities">
                <h3
                  id="h-entities"
                  className="text-xl font-semibold tracking-tight"
                  style={headingColor}
                >
                  Stored entities
                </h3>
                <p className="mt-3 max-w-3xl text-[15px] leading-7" style={mutedText}>
                  Column names as they exist in the database. Password hashes are never returned by
                  the API.
                </p>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  {ENTITIES.map((e) => (
                    <div
                      key={e.name}
                      className="rounded-lg border p-4"
                      style={{
                        borderColor: "var(--brand-border)",
                        backgroundColor: "var(--brand-surface)",
                      }}
                    >
                      <dt className="font-mono text-sm font-semibold" style={headingColor}>
                        {e.name}
                      </dt>
                      <dd className="mt-1 font-mono text-[13px] leading-6" style={mutedText}>
                        {e.fields}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          )}
        </div>

        <footer
          className="mt-14 border-t pt-6 text-sm"
          style={{ borderColor: "var(--brand-border)", color: "var(--brand-fg-muted)" }}
        >
          <p>
            Something here out of date, or an endpoint behaving differently?{" "}
            <button
              type="button"
              onClick={() => navigate("sign-in")}
              className={`font-semibold underline underline-offset-2 ${focusRing}`}
              style={{ color: "var(--brand-primary)", ...ringStyle }}
            >
              Sign in
            </button>{" "}
            and ask your Knowledge Assistant administrator.
          </p>
        </footer>
      </div>
    </div>
  );
}
