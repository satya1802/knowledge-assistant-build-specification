/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Checkbox, Table, THead, TBody, TR, TH, TD, Tabs } = UI;
const { Search, ChevronRight, ChevronDown, User, Users, Package, Clock, Filter, Download, Upload, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } = Icons;

const TABS = [
  { id: "guide", label: "Getting started" },
  { id: "api", label: "API reference" },
];

const GUIDE_SECTIONS = [
  { id: "before-you-begin", label: "Before you begin" },
  { id: "signing-in", label: "Signing in" },
  { id: "asking", label: "Asking a question" },
  { id: "sources", label: "Sources and citations" },
  { id: "uploading", label: "Uploading documents" },
  { id: "history", label: "Your chat history" },
  { id: "account", label: "Account and appearance" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

const CHECKLIST = [
  { id: "c1", label: "Get your work email and starting password from an administrator" },
  { id: "c2", label: "Sign in and change your password on the Account page" },
  { id: "c3", label: "Ask your first question on the Chat page" },
  { id: "c4", label: "Open a numbered source chip and download the original document" },
];

const DOC_STATUSES = [
  {
    status: "Processing",
    icon: "clock",
    meaning:
      "Text extraction, chunking and embedding are still running in the background. The table updates by itself — no refresh needed.",
    typical: "Under a minute for a 10 MB PDF",
  },
  {
    status: "Ready",
    icon: "check",
    meaning:
      "Indexed and answerable. The chunk count shows how many ~1,000 character passages were stored for retrieval.",
    typical: "Visible to every signed-in employee",
  },
  {
    status: "Failed",
    icon: "alert",
    meaning:
      "Ingestion stopped and the readable reason is shown in the row, for example “Password-protected PDF”. Nothing from the document is used in answers.",
    typical: "Re-upload a corrected file",
  },
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
      "Five failed sign-in attempts within fifteen minutes lock that email address for fifteen minutes, even if the next password is correct. Wait for the window to pass and try again, or ask an administrator to reset your password — a reset clears the lock immediately.",
  },
  {
    id: "faq-no-docs",
    question: "The assistant says no relevant documents were found",
    answer:
      "Nothing in the knowledge base scored at or above the 0.62 similarity threshold for your question. The assistant will not invent an answer from general knowledge. Try rephrasing with the wording used in the document, or ask an administrator to upload the relevant policy or handbook.",
  },
  {
    id: "faq-quota",
    question: "I see “The AI service quota has been used up”",
    answer:
      "The organisation's Gemini quota for the period is exhausted. The stream closes cleanly and the input is re-enabled, so nothing is lost. Contact an administrator — there is no payment, plan or upgrade step anywhere in this product.",
  },
  {
    id: "faq-ocr",
    question: "A scanned PDF ingested but some pages were skipped",
    answer:
      "Pages with almost no extractable text are read with local Tesseract OCR. Where Tesseract is not installed on the server, text-bearing pages are ingested normally, scanned pages are skipped, and the document status records that OCR was unavailable.",
  },
];

const ENDPOINTS = [
  {
    id: "login",
    method: "POST",
    path: "/auth/login",
    access: "Public",
    summary: "Verify credentials and open a session.",
    description:
      "Checks the password against its bcrypt hash and sets an HTTP-only session cookie. Unknown email, wrong password and disabled account all return the same generic error. Five failures in fifteen minutes lock the email for fifteen minutes.",
    params: [
      { name: "email", loc: "body", type: "string", required: true, note: "Work email address" },
      { name: "password", loc: "body", type: "string", required: true, note: "Plain text over TLS; never logged" },
    ],
    response:
      '200 OK\nSet-Cookie: ka_session=…; HttpOnly; SameSite=Lax\n{\n  "id": 4,\n  "email": "alice@example.com",\n  "role": "employee",\n  "theme": "system"\n}',
  },
  {
    id: "signup",
    method: "POST",
    path: "/auth/signup",
    access: "Public",
    summary: "Create an account when self-signup is enabled.",
    description:
      "Rejected with a clear message when an administrator has turned self-signup off, and when the email already exists. The first account ever created becomes the admin; every later account is an employee.",
    params: [
      { name: "email", loc: "body", type: "string", required: true, note: "Must be unique" },
      { name: "password", loc: "body", type: "string", required: true, note: "Minimum 10 characters" },
    ],
    response:
      '201 Created\n{\n  "id": 12,\n  "email": "bob@example.com",\n  "role": "employee",\n  "is_enabled": true\n}\n\n403 Forbidden\n{ "detail": "Account creation is disabled" }',
  },
  {
    id: "logout",
    method: "POST",
    path: "/auth/logout",
    access: "Signed in",
    summary: "Delete the server-side session and clear the cookie.",
    description:
      "After logout, any protected page requires signing in again. Sessions also expire after a fixed idle period set by environment variable; there is no “remember me” option.",
    params: [],
    response: '204 No Content\nSet-Cookie: ka_session=; Max-Age=0',
  },
  {
    id: "me",
    method: "GET",
    path: "/auth/me",
    access: "Signed in",
    summary: "Return the signed-in user.",
    description:
      "Used by the frontend on load to decide which navigation items to render. Returns 401 when the session has expired or the account has been disabled.",
    params: [],
    response:
      '200 OK\n{\n  "id": 4,\n  "email": "alice@example.com",\n  "role": "admin",\n  "is_enabled": true,\n  "theme": "dark",\n  "created_at": "2026-02-11T09:14:00Z"\n}',
  },
  {
    id: "password",
    method: "POST",
    path: "/account/password",
    access: "Signed in",
    summary: "Change your own password.",
    description:
      "Requires the current password. A new bcrypt hash replaces the old one; other sessions are untouched. Validation failures are returned before any hashing is done.",
    params: [
      { name: "current_password", loc: "body", type: "string", required: true, note: "Verified against the stored hash" },
      { name: "new_password", loc: "body", type: "string", required: true, note: "Minimum 10 characters" },
    ],
    response: '204 No Content\n\n400 Bad Request\n{ "detail": "Current password is incorrect" }',
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
    response: '200 OK\n{ "theme": "system" }',
  },
  {
    id: "users-list",
    method: "GET",
    path: "/users",
    access: "Admin only",
    summary: "List all accounts.",
    description:
      "Employees calling this endpoint directly receive a permission error. Password hashes are never included in any response.",
    params: [
      { name: "q", loc: "query", type: "string", required: false, note: "Case-insensitive email match" },
    ],
    response:
      '200 OK\n[\n  { "id": 1, "email": "satya.ganaraju@quorq.ai", "role": "admin", "is_enabled": true },\n  { "id": 4, "email": "alice@example.com", "role": "employee", "is_enabled": true },\n  { "id": 9, "email": "dev.patel@example.com", "role": "employee", "is_enabled": false }\n]',
  },
  {
    id: "users-create",
    method: "POST",
    path: "/users",
    access: "Admin only",
    summary: "Add an enabled employee account.",
    description:
      "No notification email is sent — there is no SMTP dependency. The administrator shares the initial password out of band.",
    params: [
      { name: "email", loc: "body", type: "string", required: true, note: "Must be unique" },
      { name: "password", loc: "body", type: "string", required: true, note: "Initial password, stored as a bcrypt hash" },
      { name: "role", loc: "body", type: "enum", required: false, note: "admin | employee (default employee)" },
    ],
    response: '201 Created\n{ "id": 21, "email": "nina.obi@example.com", "role": "employee", "is_enabled": true }',
  },
  {
    id: "users-patch",
    method: "PATCH",
    path: "/users/{id}",
    access: "Admin only",
    summary: "Disable, promote, demote or reset a password.",
    description:
      "Disabling a user rejects their existing session on the next request. Setting a password clears any sign-in lock on that email.",
    params: [
      { name: "id", loc: "path", type: "integer", required: true, note: "User id" },
      { name: "is_enabled", loc: "body", type: "boolean", required: false, note: "false disables sign-in immediately" },
      { name: "role", loc: "body", type: "enum", required: false, note: "admin | employee" },
      { name: "password", loc: "body", type: "string", required: false, note: "Replaces the stored hash" },
    ],
    response: '200 OK\n{ "id": 9, "email": "dev.patel@example.com", "role": "employee", "is_enabled": true }',
  },
  {
    id: "docs-upload",
    method: "POST",
    path: "/documents",
    access: "Admin only",
    summary: "Upload a file and start background ingestion.",
    description:
      "Accepts PDF, DOCX, TXT and MD up to 25 MB. The response returns before extraction finishes; the record starts at status “processing”. Uploading a file that is already present creates a separate new document rather than a version.",
    params: [
      { name: "file", loc: "multipart", type: "binary", required: true, note: "PDF, DOCX, TXT or MD, max 25 MB" },
    ],
    response:
      '202 Accepted\n{\n  "id": 118,\n  "filename": "Travel-Expenses-2026.pdf",\n  "file_type": "pdf",\n  "size_bytes": 10485760,\n  "status": "processing",\n  "chunk_count": 0\n}\n\n413 Payload Too Large\n{ "detail": "Files must be 25 MB or smaller" }',
  },
  {
    id: "docs-list",
    method: "GET",
    path: "/documents",
    access: "Signed in",
    summary: "List knowledge base documents.",
    description:
      "Every ready document is visible to every signed-in employee; there is no per-document access control. Search is case-insensitive on the filename.",
    params: [
      { name: "q", loc: "query", type: "string", required: false, note: "Filename contains" },
      { name: "status", loc: "query", type: "enum", required: false, note: "processing | ready | failed" },
      { name: "file_type", loc: "query", type: "enum", required: false, note: "pdf | docx | txt | md" },
    ],
    response:
      '200 OK\n{\n  "total": 214,\n  "ready": 206,\n  "processing": 2,\n  "failed": 6,\n  "chunks_indexed": 38417,\n  "items": [\n    {\n      "id": 118,\n      "filename": "Travel-Expenses-2026.pdf",\n      "status": "ready",\n      "chunk_count": 142,\n      "uploaded_at": "2026-10-06T11:02:00Z"\n    }\n  ]\n}',
  },
  {
    id: "docs-download",
    method: "GET",
    path: "/documents/{id}/download",
    access: "Signed in",
    summary: "Download the original uploaded file.",
    description:
      "Streams the stored original from the server filesystem with its original filename and content type. Unauthenticated requests are refused and return no file content.",
    params: [{ name: "id", loc: "path", type: "integer", required: true, note: "Document id" }],
    response:
      '200 OK\nContent-Type: application/pdf\nContent-Disposition: attachment; filename="Travel-Expenses-2026.pdf"',
  },
  {
    id: "docs-delete",
    method: "DELETE",
    path: "/documents/{id}",
    access: "Admin only",
    summary: "Remove a document, its file, chunks and embeddings.",
    description:
      "Deletion is permanent. Once removed, no chunk from that document can be retrieved or cited in any later answer.",
    params: [{ name: "id", loc: "path", type: "integer", required: true, note: "Document id" }],
    response: '204 No Content',
  },
  {
    id: "docs-stream",
    method: "GET",
    path: "/documents/stream",
    access: "Signed in",
    summary: "Server-sent events for live ingestion status.",
    description:
      "Keeps the Knowledge base page current without a manual refresh. Each event carries one document's status and chunk count; keep-alive comments hold the connection open.",
    params: [],
    response:
      'event: document\ndata: { "id": 118, "status": "ready", "chunk_count": 142 }\n\nevent: document\ndata: { "id": 119, "status": "failed", "status_reason": "Password-protected PDF" }',
  },
  {
    id: "chat-ask",
    method: "POST",
    path: "/chat/ask",
    access: "Signed in",
    summary: "Ask a grounded question and stream the answer.",
    description:
      "The question is embedded, chunks at or above 0.62 cosine similarity are retrieved (top-k of about 5, set by environment variable and not exposed to users), and the answer is generated only from those chunks. When nothing clears the threshold the assistant replies that no relevant documents were found and no citations are returned.",
    params: [
      { name: "question", loc: "body", type: "string", required: true, note: "Plain English question" },
      { name: "conversation_id", loc: "body", type: "integer", required: false, note: "Omit to start a new conversation" },
    ],
    response:
      'event: token\ndata: { "text": "Economy class is the standard for " }\n\nevent: citation\ndata: { "ordinal": 1, "document": "Travel-Expenses-2026.pdf", "page": 4 }\n\nevent: done\ndata: { "conversation_id": 77, "message_id": 341 }',
  },
  {
    id: "conv-list",
    method: "GET",
    path: "/conversations",
    access: "Signed in",
    summary: "List your own conversations, newest first.",
    description:
      "Private to the signed-in user. Timestamps are stored without timezone information and interpreted as UTC before being grouped into Today / Yesterday / older date headings.",
    params: [
      { name: "q", loc: "query", type: "string", required: false, note: "Matches title or message text" },
    ],
    response:
      '200 OK\n[\n  { "id": 77, "title": "Expense claim deadline", "updated_at": "2026-10-08T08:41:00Z" },\n  { "id": 72, "title": "Parental leave notice period", "updated_at": "2026-10-07T16:10:00Z" }\n]',
  },
  {
    id: "conv-get",
    method: "GET",
    path: "/conversations/{id}",
    access: "Signed in",
    summary: "Reload one conversation with its citations.",
    description:
      "Requesting another user's conversation by id is refused with a permission error rather than a not-found, and nothing from the exchange is returned.",
    params: [{ name: "id", loc: "path", type: "integer", required: true, note: "Conversation id" }],
    response:
      '200 OK\n{\n  "id": 77,\n  "title": "Expense claim deadline",\n  "messages": [\n    { "role": "user", "content": "When must I submit expenses?" },\n    { "role": "assistant", "content": "Within 30 days…",\n      "citations": [ { "ordinal": 1, "document_id": 118, "page": 4 } ] }\n  ]\n}',
  },
  {
    id: "conv-delete",
    method: "DELETE",
    path: "/conversations/{id}",
    access: "Signed in",
    summary: "Permanently delete one of your conversations.",
    description:
      "The conversation and its messages are removed from history and from search results. Deleting the conversation currently open resets the chat panel to a new empty conversation.",
    params: [{ name: "id", loc: "path", type: "integer", required: true, note: "Conversation id" }],
    response: '204 No Content',
  },
];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const ENTITIES = [
  { name: "users", fields: "id, email, password_hash, role, is_enabled, theme, created_at" },
  { name: "sessions", fields: "id, user_id, created_at, last_seen_at" },
  { name: "login_attempts", fields: "id, email, succeeded, attempted_at" },
  {
    name: "documents",
    fields: "id, filename, file_type, size_bytes, storage_path, status, status_reason, chunk_count, uploaded_by, uploaded_at",
  },
  { name: "chunks", fields: "id, document_id, ordinal, page, text, embedding" },
  { name: "conversations", fields: "id, user_id, title, created_at, updated_at" },
  { name: "messages", fields: "id, conversation_id, role, content, created_at" },
  { name: "message_citations", fields: "id, message_id, chunk_id, ordinal" },
  { name: "app_settings", fields: "key, value" },
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
  const [copied, setCopied] = React.useState(false);

  const tabRefs = React.useRef([]);

  const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const ringStyle = { ["--tw-ring-color"]: brand.primaryColor };

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
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    const node = tabRefs.current[next];
    if (node) node.focus();
  }

  async function copyBaseUrl() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText("https://knowledge.internal.example.com/api");
      }
      setCopied(true);
    } catch (err) {
      setCopied(false);
    }
  }

  function statusIcon(kind) {
    if (kind === "check") return <Icons.CheckCircle className="h-4 w-4" aria-hidden="true" />;
    if (kind === "alert") return <Icons.AlertCircle className="h-4 w-4" aria-hidden="true" />;
    return <Icons.Clock className="h-4 w-4" aria-hidden="true" />;
  }

  const sectionHeading = "text-xl font-semibold tracking-tight";
  const prose = "mt-3 text-[15px] leading-7 text-slate-700";

  return (
    <div
      className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8"
      style={{ fontFamily: brand.fontBody, color: "#1F2A37" }}
    >
      {/* Page header */}
      <header className="border-b border-slate-200 pb-8">
        <p
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: brand.accentColor }}
        >
          Public documentation
        </p>
        <h1
          className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ fontFamily: brand.fontHeading, color: brand.primaryColor }}
        >
          Knowledge Assistant documentation
        </h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-700">
          Everything on this page is readable without an account. It explains how employees sign in, ask
          questions and verify answers against the shared knowledge base, and documents every endpoint the
          interface uses. No knowledge base content is exposed here.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => navigate("sign-in")}
            className={focusRing}
            style={{ backgroundColor: brand.primaryColor, color: "#FFFFFF", ...ringStyle }}
          >
            Sign in to Knowledge Assistant
            <Icons.ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="text-sm text-slate-600">
            Release 1.4 &middot; updated 6 October 2026 &middot; English only
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Documentation sections"
        className="mt-8 flex gap-1 border-b border-slate-200"
      >
        {TABS.map((t, i) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              ref={(el) => (tabRefs.current[i] = el)}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${focusRing} ${
                selected ? "" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              style={
                selected
                  ? { borderColor: brand.primaryColor, color: brand.primaryColor, ...ringStyle }
                  : ringStyle
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
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
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
                          current
                            ? "font-semibold"
                            : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        style={
                          current
                            ? {
                                borderColor: brand.accentColor,
                                color: brand.primaryColor,
                                backgroundColor: "#FFFFFF",
                                ...ringStyle,
                              }
                            : ringStyle
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
              <Card className="border border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle style={{ fontFamily: brand.fontHeading, color: brand.primaryColor }}>
                    Your first five minutes
                  </CardTitle>
                  <CardDescription>
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
                          onCheckedChange={() => setDone((d) => ({ ...d, [item.id]: !d[item.id] }))}
                          className={`mt-0.5 ${focusRing}`}
                          style={ringStyle}
                        />
                        <Label
                          htmlFor={item.id}
                          className={`text-[15px] leading-6 ${
                            done[item.id] ? "text-slate-500 line-through" : "text-slate-800"
                          }`}
                        >
                          {item.label}
                        </Label>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm font-medium" aria-live="polite" style={{ color: brand.accentColor }}>
                    {doneCount} of {CHECKLIST.length} steps complete
                  </p>
                </CardContent>
              </Card>

              <section id="before-you-begin" aria-labelledby="h-before">
                <h2 id="h-before" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Before you begin
                </h2>
                <p className={prose}>
                  Knowledge Assistant answers questions from the documents your organisation has uploaded, and
                  shows you exactly where each answer came from. It is an internal tool: there is no pricing,
                  no plan and nothing to buy.
                </p>
                <ul className="mt-4 space-y-2 text-[15px] leading-7 text-slate-700">
                  <li className="flex gap-3">
                    <Icons.User className="mt-1.5 h-4 w-4 shrink-0" aria-hidden="true" style={{ color: brand.accentColor }} />
                    <span>
                      An account. Where self-signup is switched off, an administrator creates it and gives you a
                      starting password in person or over chat &mdash; the product sends no email.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Icons.Package className="mt-1.5 h-4 w-4 shrink-0" aria-hidden="true" style={{ color: brand.accentColor }} />
                    <span>A current version of Chrome, Safari, Edge or Firefox. A phone-sized screen works too.</span>
                  </li>
                  <li className="flex gap-3">
                    <Icons.Users className="mt-1.5 h-4 w-4 shrink-0" aria-hidden="true" style={{ color: brand.accentColor }} />
                    <span>
                      Two roles exist: <strong>employee</strong> and <strong>admin</strong>. Everything except
                      uploading, deleting documents and managing users is open to both.
                    </span>
                  </li>
                </ul>
              </section>

              <section id="signing-in" aria-labelledby="h-signin">
                <h2 id="h-signin" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Signing in
                </h2>
                <ol className="mt-4 space-y-3 text-[15px] leading-7 text-slate-700">
                  <li className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: brand.primaryColor }}>1</span>
                    <span>Open the Sign in page and enter your work email and password.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: brand.primaryColor }}>2</span>
                    <span>You land on Chat. The sidebar holds your history, the knowledge base and your account.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: brand.primaryColor }}>3</span>
                    <span>
                      Change the password you were given on the Account page. Sessions end when you sign out or
                      after a fixed idle period, so an unattended browser does not leave the knowledge base open.
                    </span>
                  </li>
                </ol>
                <div
                  className="mt-5 rounded-lg border-l-4 bg-white p-4"
                  style={{ borderColor: brand.accentColor, borderRadius: brand.radius }}
                >
                  <p className="text-sm font-semibold" style={{ color: brand.primaryColor }}>
                    Why the error message never says which part was wrong
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Unknown email, wrong password and disabled account all produce the identical message, so no
                    one can use the form to discover which addresses exist. Five failures in fifteen minutes lock
                    that email for fifteen minutes.
                  </p>
                </div>
              </section>

              <section id="asking" aria-labelledby="h-asking">
                <h2 id="h-asking" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Asking a question
                </h2>
                <p className={prose}>
                  Type a plain English question and press Enter. Your question is matched against passages from
                  every ready document, and the answer is written only from the passages that matched &mdash;
                  the first words usually appear in about two seconds and the rest streams in.
                </p>
                <h3 className="mt-6 text-base font-semibold" style={{ color: brand.primaryColor }}>
                  Controls on each answer
                </h3>
                <ul className="mt-3 space-y-2 text-[15px] leading-7 text-slate-700">
                  <li><strong>Stop</strong> &mdash; halts streaming, keeps the partial answer and re-enables the input.</li>
                  <li><strong>Copy</strong> &mdash; puts the answer text on your clipboard and confirms briefly.</li>
                  <li><strong>Read aloud</strong> &mdash; uses your browser's own speech synthesis; hidden where the browser has none.</li>
                  <li><strong>Regenerate</strong> &mdash; runs retrieval and generation again and replaces the answer with its own fresh citations.</li>
                </ul>
                <div
                  className="mt-5 rounded-lg border border-slate-200 bg-white p-4"
                  style={{ borderRadius: brand.radius }}
                >
                  <p className="text-sm font-semibold" style={{ color: brand.primaryColor }}>
                    If nothing relevant exists
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    The assistant says so plainly and suggests asking an administrator to upload the right
                    document. It will never fall back to general knowledge, so an uncited answer cannot appear.
                  </p>
                </div>
              </section>

              <section id="sources" aria-labelledby="h-sources">
                <h2 id="h-sources" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Sources and citations
                </h2>
                <p className={prose}>
                  Every grounded answer carries numbered chips beneath it, one per cited passage, each labelled
                  with the document name and page. Activating a chip with a click or the keyboard opens a side
                  panel showing that exact passage and a link to download the original file. Closing the panel,
                  or pressing Escape, returns focus to the chip you opened it from.
                </p>
                <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">
                  {[
                    "1 Travel-Expenses-2026.pdf · p.4",
                    "2 Employee-Handbook.docx · §3.2",
                    "3 IT-Security-Policy-scan.pdf · p.11",
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[15px] leading-7 text-slate-700">
                  Scanned pages are read with OCR during ingestion, so an answer found only in an old scanned
                  policy is cited the same way as any other.
                </p>
              </section>

              <section id="uploading" aria-labelledby="h-upload">
                <h2 id="h-upload" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Uploading documents <span className="text-base font-normal text-slate-600">(administrators)</span>
                </h2>
                <p className={prose}>
                  Administrators drag files onto the dropzone on the Knowledge base page, or pick them from the
                  file picker. PDF, DOCX, TXT and MD are accepted up to 25 MB each; anything else is refused
                  before processing. Employees see the same table without a dropzone or delete control.
                </p>
                <div className="mt-5 overflow-x-auto">
                  <Table>
                    <THead>
                      <TR>
                        <TH scope="col">Status</TH>
                        <TH scope="col">What it means</TH>
                        <TH scope="col">Note</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {DOC_STATUSES.map((row) => (
                        <TR key={row.status}>
                          <TD>
                            <span
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold"
                              style={{ color: brand.primaryColor }}
                            >
                              {statusIcon(row.icon)}
                              {row.status}
                            </span>
                          </TD>
                          <TD className="text-sm leading-6 text-slate-700">{row.meaning}</TD>
                          <TD className="text-sm leading-6 text-slate-600">{row.typical}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
                <p className="mt-4 text-[15px] leading-7 text-slate-700">
                  Uploading a file that is already in the knowledge base creates a separate document rather than
                  a new version. Deleting a document removes its stored file, chunks and embeddings, and it stops
                  being cited immediately.
                </p>
              </section>

              <section id="history" aria-labelledby="h-history">
                <h2 id="h-history" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Your chat history
                </h2>
                <p className={prose}>
                  Conversations are private to you. The sidebar groups them under Today, Yesterday and older
                  dates, newest first. Search narrows the list by title or message text, selecting one reloads
                  the whole exchange with its source chips, and deleting one removes it permanently &mdash; if it
                  was the open conversation, the panel resets to a new empty one.
                </p>
              </section>

              <section id="account" aria-labelledby="h-account">
                <h2 id="h-account" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Account and appearance
                </h2>
                <p className={prose}>
                  The Account page does two things: change your password (current password, then the new one
                  twice, minimum ten characters) and choose Light, Dark or System. The appearance changes
                  immediately, follows your operating system when System is chosen, and is remembered the next
                  time you sign in.
                </p>
                <p className="mt-3 text-[15px] leading-7 text-slate-700">
                  Forgotten your password? There is no reset email. An administrator sets a new one from the
                  Users page, which also clears any sign-in lock on your address.
                </p>
              </section>

              <section id="troubleshooting" aria-labelledby="h-trouble">
                <h2 id="h-trouble" className={sectionHeading} style={{ color: brand.primaryColor }}>
                  Troubleshooting
                </h2>
                <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {FAQS.map((faq) => {
                    const open = openFaq === faq.id;
                    return (
                      <li key={faq.id}>
                        <h3 className="m-0">
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={`${faq.id}-panel`}
                            id={`${faq.id}-button`}
                            onClick={() => setOpenFaq(open ? null : faq.id)}
                            className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-[15px] font-medium hover:bg-slate-50 ${focusRing}`}
                            style={{ color: brand.primaryColor, ...ringStyle }}
                          >
                            <span>{faq.question}</span>
                            {open ? (
                              <Icons.ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                            ) : (
                              <Icons.ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        </h3>
                        <div
                          id={`${faq.id}-panel`}
                          role="region"
                          aria-labelledby={`${faq.id}-button`}
                          hidden={!open}
                          className="px-4 pb-4 text-[15px] leading-7 text-slate-700"
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
            <h2 className="text-2xl font-semibold tracking-tight" style={{ color: brand.primaryColor }}>
              API reference
            </h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">
              The same JSON API the interface uses. Authentication is a single HTTP-only session cookie set by{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px]">POST /auth/login</code> &mdash; there
              are no API keys to issue. Endpoints marked <strong>Admin only</strong> refuse employee sessions and
              change nothing.
            </p>

            <Card className="mt-6 border border-slate-200 bg-white">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Base URL</p>
                  <code className="mt-1 block text-[15px] font-medium" style={{ color: brand.primaryColor }}>
                    https://knowledge.internal.example.com/api
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <span aria-live="polite" className="text-sm font-medium" style={{ color: brand.accentColor }}>
                    {copied ? "Copied to clipboard" : ""}
                  </span>
                  <Button
                    type="button"
                    onClick={copyBaseUrl}
                    className={focusRing}
                    style={{ backgroundColor: "#FFFFFF", color: brand.primaryColor, border: `1px solid ${brand.primaryColor}`, ...ringStyle }}
                  >
                    <Icons.Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Copy base URL
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5" style={{ borderRadius: brand.radius }}>
              <h3 className="text-sm font-semibold" style={{ color: brand.primaryColor }}>
                Find an endpoint
              </h3>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="endpoint-search" className="text-sm font-medium text-slate-700">
                    Search by path or description
                  </Label>
                  <div className="relative mt-2">
                    <Icons.Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <Input
                      id="endpoint-search"
                      type="search"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setOpenEndpoint(null);
                      }}
                      placeholder="documents, conversations, login…"
                      className={`pl-9 ${focusRing}`}
                      style={ringStyle}
                    />
                  </div>
                </div>
                <div>
                  <span id="method-group-label" className="block text-sm font-medium text-slate-700">
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
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${focusRing} ${
                            on ? "" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          style={
                            on
                              ? { backgroundColor: brand.primaryColor, borderColor: brand.primaryColor, color: "#FFFFFF", ...ringStyle }
                              : ringStyle
                          }
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="admin-only"
                    checked={adminOnly}
                    onChange={() => {
                      setAdminOnly((v) => !v);
                      setOpenEndpoint(null);
                    }}
                    onCheckedChange={() => {
                      setAdminOnly((v) => !v);
                      setOpenEndpoint(null);
                    }}
                    className={focusRing}
                    style={ringStyle}
                  />
                  <Label htmlFor="admin-only" className="text-sm text-slate-700">
                    Admin-only endpoints
                  </Label>
                </div>
                <div className="flex items-center gap-4">
                  <p aria-live="polite" className="text-sm text-slate-600">
                    Showing {filtered.length} of {ENDPOINTS.length} endpoints
                  </p>
                  <Button
                    type="button"
                    onClick={clearFilters}
                    className={focusRing}
                    style={{ backgroundColor: "transparent", color: brand.primaryColor, border: "1px solid #CBD5E1", ...ringStyle }}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            </div>

            {/* Endpoint list */}
            {filtered.length === 0 ? (
              <div
                className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
                style={{ borderRadius: brand.radius }}
              >
                <Icons.Search className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold" style={{ color: brand.primaryColor }}>
                  No endpoints match those filters
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Try a shorter search term, or clear the method and access filters to see all eighteen
                  endpoints again.
                </p>
                <Button
                  type="button"
                  onClick={clearFilters}
                  className={`mt-6 ${focusRing}`}
                  style={{ backgroundColor: brand.primaryColor, color: "#FFFFFF", ...ringStyle }}
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
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                      style={{ borderRadius: brand.radius }}
                    >
                      <h3 className="m-0">
                        <button
                          type="button"
                          id={`${ep.id}-button`}
                          aria-expanded={open}
                          aria-controls={`${ep.id}-detail`}
                          onClick={() => setOpenEndpoint(open ? null : ep.id)}
                          className={`flex w-full items-start gap-4 px-4 py-4 text-left hover:bg-slate-50 ${focusRing}`}
                          style={ringStyle}
                        >
                          <span className="mt-0.5 w-16 shrink-0 rounded border border-slate-300 px-2 py-0.5 text-center text-[11px] font-bold tracking-wider text-slate-700">
                            {ep.method}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[15px] font-semibold" style={{ color: brand.primaryColor }}>
                              {ep.path}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-slate-600">{ep.summary}</span>
                          </span>
                          <span
                            className="mt-0.5 hidden whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-block"
                            style={
                              ep.access === "Admin only"
                                ? { borderColor: brand.accentColor, color: brand.accentColor }
                                : { borderColor: "#CBD5E1", color: "#475569" }
                            }
                          >
                            {ep.access}
                          </span>
                          {open ? (
                            <Icons.ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                          ) : (
                            <Icons.ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                          )}
                        </button>
                      </h3>
                      <div
                        id={`${ep.id}-detail`}
                        role="region"
                        aria-labelledby={`${ep.id}-button`}
                        hidden={!open}
                        className="border-t border-slate-200 px-4 py-5"
                      >
                        <p className="max-w-3xl text-[15px] leading-7 text-slate-700">{ep.description}</p>
                        <p className="mt-3 text-sm text-slate-600 sm:hidden">
                          <strong>Access:</strong> {ep.access}
                        </p>

                        {ep.params.length > 0 ? (
                          <div className="mt-5">
                            <h4 className="text-sm font-semibold" style={{ color: brand.primaryColor }}>
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
                                      <TD className="text-sm text-slate-600">{p.loc}</TD>
                                      <TD className="text-sm text-slate-600">{p.type}</TD>
                                      <TD className="text-sm text-slate-700">{p.required ? "Required" : "Optional"}</TD>
                                      <TD className="text-sm text-slate-600">{p.note}</TD>
                                    </TR>
                                  ))}
                                </TBody>
                              </Table>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-5 text-sm text-slate-600">No parameters.</p>
                        )}

                        <div className="mt-5">
                          <h4 className="text-sm font-semibold" style={{ color: brand.primaryColor }}>
                            Example response
                          </h4>
                          <pre
                            tabIndex={0}
                            className={`mt-2 overflow-x-auto rounded-md p-4 text-[13px] leading-6 text-slate-100 ${focusRing}`}
                            style={{ backgroundColor: brand.primaryColor, borderRadius: brand.radius, ...ringStyle }}
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
              <h3 id="h-entities" className="text-xl font-semibold tracking-tight" style={{ color: brand.primaryColor }}>
                Stored entities
              </h3>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">
                Field names as they appear in responses. Password hashes and raw embeddings are never returned
                by the API.
              </p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {ENTITIES.map((e) => (
                  <div
                    key={e.name}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                    style={{ borderRadius: brand.radius }}
                  >
                    <dt className="font-mono text-sm font-semibold" style={{ color: brand.primaryColor }}>
                      {e.name}
                    </dt>
                    <dd className="mt-1 font-mono text-[13px] leading-6 text-slate-600">{e.fields}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        )}
      </div>

      <footer className="mt-14 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <p>
          Something here out of date, or an endpoint behaving differently?{" "}
          <button
            type="button"
            onClick={() => navigate("sign-in")}
            className={`font-semibold underline underline-offset-2 ${focusRing}`}
            style={{ color: brand.primaryColor, ...ringStyle }}
          >
            Sign in
          </button>{" "}
          and ask your Knowledge Assistant administrator.
        </p>
      </footer>
    </div>
  );
}
