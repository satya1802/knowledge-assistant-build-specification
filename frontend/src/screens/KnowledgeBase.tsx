/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Button, Input, Label, Select, Table, THead, TBody, TR, TH, TD, Stat } = UI;
const {
  Search,
  X,
  FileText,
  Package,
  Clock,
  Trash,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
} = Icons;

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "md"];
const MAX_BYTES = 25 * 1024 * 1024;

const INITIAL_DOCUMENTS = [
  {
    id: "doc-41",
    filename: "Employee-Handbook-2026.pdf",
    file_type: "PDF",
    size_bytes: 4404019,
    status: "ready",
    status_reason: null,
    chunk_count: 182,
    uploaded_by: "priya.raman@northgate.co",
    uploaded_at: "2026-10-08T09:12:00Z",
  },
  {
    id: "doc-40",
    filename: "Expense-Policy-v7.docx",
    file_type: "DOCX",
    size_bytes: 839680,
    status: "processing",
    status_reason: "Extracting text and embedding chunks",
    chunk_count: 0,
    uploaded_by: "priya.raman@northgate.co",
    uploaded_at: "2026-10-08T08:40:00Z",
  },
  {
    id: "doc-39",
    filename: "Q3-Security-Review.pdf",
    file_type: "PDF",
    size_bytes: 12163481,
    status: "failed",
    status_reason: "Password-protected PDF — remove encryption and upload again",
    chunk_count: 0,
    uploaded_by: "marcus.hale@northgate.co",
    uploaded_at: "2026-10-07T16:21:00Z",
  },
  {
    id: "doc-38",
    filename: "Supplier-Contract-Acme-2024.pdf",
    file_type: "PDF",
    size_bytes: 8911872,
    status: "ready",
    status_reason: "12 scanned pages read with Tesseract OCR (English)",
    chunk_count: 57,
    uploaded_by: "marcus.hale@northgate.co",
    uploaded_at: "2026-10-07T14:03:00Z",
  },
  {
    id: "doc-37",
    filename: "Procurement-Thresholds.docx",
    file_type: "DOCX",
    size_bytes: 614400,
    status: "failed",
    status_reason: "AI service quota used up — contact an administrator, then upload again",
    chunk_count: 0,
    uploaded_by: "priya.raman@northgate.co",
    uploaded_at: "2026-10-07T11:48:00Z",
  },
  {
    id: "doc-36",
    filename: "Benefits-Summary-2026.docx",
    file_type: "DOCX",
    size_bytes: 1258291,
    status: "ready",
    status_reason: null,
    chunk_count: 48,
    uploaded_by: "dana.okoye@northgate.co",
    uploaded_at: "2026-10-06T15:30:00Z",
  },
  {
    id: "doc-35",
    filename: "Incident-Response-Runbook.md",
    file_type: "MD",
    size_bytes: 29286,
    status: "ready",
    status_reason: null,
    chunk_count: 33,
    uploaded_by: "dana.okoye@northgate.co",
    uploaded_at: "2026-10-06T10:02:00Z",
  },
  {
    id: "doc-34",
    filename: "Fire-Safety-Certificate-2019.pdf",
    file_type: "PDF",
    size_bytes: 2306867,
    status: "ready",
    status_reason: "OCR unavailable: Tesseract is not installed — 4 scanned pages skipped",
    chunk_count: 11,
    uploaded_by: "marcus.hale@northgate.co",
    uploaded_at: "2026-10-05T09:55:00Z",
  },
  {
    id: "doc-33",
    filename: "Remote-Working-Guidelines.txt",
    file_type: "TXT",
    size_bytes: 18944,
    status: "ready",
    status_reason: null,
    chunk_count: 21,
    uploaded_by: "priya.raman@northgate.co",
    uploaded_at: "2026-10-03T13:17:00Z",
  },
  {
    id: "doc-32",
    filename: "Data-Retention-Standard.pdf",
    file_type: "PDF",
    size_bytes: 3251200,
    status: "ready",
    status_reason: null,
    chunk_count: 94,
    uploaded_by: "dana.okoye@northgate.co",
    uploaded_at: "2026-10-02T17:44:00Z",
  },
  {
    id: "doc-31",
    filename: "Sales-Playbook-EMEA.docx",
    file_type: "DOCX",
    size_bytes: 6291456,
    status: "ready",
    status_reason: null,
    chunk_count: 140,
    uploaded_by: "marcus.hale@northgate.co",
    uploaded_at: "2026-10-01T08:26:00Z",
  },
  {
    id: "doc-30",
    filename: "Onboarding-Checklist.md",
    file_type: "MD",
    size_bytes: 14336,
    status: "ready",
    status_reason: null,
    chunk_count: 6,
    uploaded_by: "priya.raman@northgate.co",
    uploaded_at: "2026-09-29T12:10:00Z",
  },
  {
    id: "doc-29",
    filename: "Code-of-Conduct.pdf",
    file_type: "PDF",
    size_bytes: 2621440,
    status: "ready",
    status_reason: null,
    chunk_count: 71,
    uploaded_by: "dana.okoye@northgate.co",
    uploaded_at: "2026-09-28T16:05:00Z",
  },
  {
    id: "doc-28",
    filename: "Legacy-Pension-Scheme-1998.pdf",
    file_type: "PDF",
    size_bytes: 10171187,
    status: "ready",
    status_reason: "38 scanned pages read with Tesseract OCR (English)",
    chunk_count: 62,
    uploaded_by: "marcus.hale@northgate.co",
    uploaded_at: "2026-09-25T11:31:00Z",
  },
  {
    id: "doc-27",
    filename: "Office-Access-Map.pdf",
    file_type: "PDF",
    size_bytes: 972800,
    status: "ready",
    status_reason: null,
    chunk_count: 9,
    uploaded_by: "priya.raman@northgate.co",
    uploaded_at: "2026-09-24T09:48:00Z",
  },
  {
    id: "doc-26",
    filename: "Travel-Booking-Guide.pdf",
    file_type: "PDF",
    size_bytes: 1887436,
    status: "processing",
    status_reason: "Queued behind 1 other document",
    chunk_count: 0,
    uploaded_by: "dana.okoye@northgate.co",
    uploaded_at: "2026-09-23T14:12:00Z",
  },
];

const STATUS_META = {
  ready: {
    label: "Ready",
    icon: "CheckCircle",
    fg: "#1F6B50",
    bg: "#E7F2ED",
    border: "#BFDFD2",
  },
  processing: {
    label: "Processing",
    icon: "Clock",
    fg: "#14304F",
    bg: "#E6ECF2",
    border: "#C4D1DE",
  },
  failed: {
    label: "Failed",
    icon: "AlertCircle",
    fg: "#9A2A1E",
    bg: "#FBEAE7",
    border: "#EFC6BF",
  },
};

const CURRENT_USER = "satya.ganaraju@quorq.ai";

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatUploaded(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const time = pad(d.getHours()) + ":" + pad(d.getMinutes());
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, now)) return "Today, " + time;
  if (sameDay(d, yesterday)) return "Yesterday, " + time;
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
}

function estimateChunks(bytes) {
  return Math.max(1, Math.round(bytes / 4200));
}

export default function Screen() {
  const navigate = useNavigate();
  const [documents, setDocuments] = React.useState(INITIAL_DOCUMENTS);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [role, setRole] = React.useState("admin");
  const [uploadErrors, setUploadErrors] = React.useState([]);
  const [notice, setNotice] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(null);

  const nextId = React.useRef(42);
  const fileInputRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const confirmRef = React.useRef(null);
  const lastTrigger = React.useRef(null);

  const isAdmin = role === "admin";

  // Live ingestion: documents in "processing" settle to "ready" the way the
  // background worker would, and the tiles follow without a manual refresh.
  const processingIds = documents.filter((d) => d.status === "processing").map((d) => d.id);
  const processingKey = processingIds.join("|");

  React.useEffect(() => {
    if (!processingKey) return undefined;
    const ids = processingKey.split("|");
    const timers = ids.map((id, i) =>
      setTimeout(
        () => {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === id && d.status === "processing"
                ? {
                    ...d,
                    status: "ready",
                    status_reason: null,
                    chunk_count: estimateChunks(d.size_bytes),
                  }
                : d,
            ),
          );
          setNotice({
            tone: "info",
            text: "Ingestion finished — a document is now ready to be cited in chat.",
          });
        },
        3600 + i * 2200,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [processingKey]);

  // Dialog: focus management, Escape to close, focus returns to the trigger.
  React.useEffect(() => {
    if (!pendingDelete) return undefined;
    if (confirmRef.current) confirmRef.current.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPendingDelete(null);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [pendingDelete]);

  const closeDialog = React.useCallback(() => {
    setPendingDelete(null);
    if (lastTrigger.current && lastTrigger.current.focus) lastTrigger.current.focus();
  }, []);

  const stats = React.useMemo(() => {
    return {
      total: documents.length,
      ready: documents.filter((d) => d.status === "ready").length,
      processing: documents.filter((d) => d.status === "processing").length,
      failed: documents.filter((d) => d.status === "failed").length,
      chunks: documents.reduce((sum, d) => sum + d.chunk_count, 0),
    };
  }, [documents]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => (q ? d.filename.toLowerCase().includes(q) : true))
      .filter((d) => (statusFilter === "all" ? true : d.status === statusFilter))
      .filter((d) => (typeFilter === "all" ? true : d.file_type === typeFilter))
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }, [documents, query, statusFilter, typeFilter]);

  const filtersActive = query.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  function handleFiles(fileList: FileList | File[] | null) {
    const files: File[] = Array.from(fileList || []);
    if (!files.length) return;
    const errors: string[] = [];
    const accepted: (typeof documents)[number][] = [];
    let duplicate = false;

    files.forEach((file: File) => {
      const parts = file.name.split(".");
      const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";
      if (ACCEPTED_EXTENSIONS.indexOf(ext) === -1) {
        errors.push(
          file.name + " — unsupported format. Accepted formats are PDF, DOCX, TXT and MD.",
        );
        return;
      }
      if (file.size > MAX_BYTES) {
        errors.push(file.name + " — " + formatSize(file.size) + " exceeds the 25 MB limit.");
        return;
      }
      if (documents.some((d) => d.filename === file.name)) duplicate = true;
      nextId.current += 1;
      accepted.push({
        id: "doc-" + nextId.current,
        filename: file.name,
        file_type: ext.toUpperCase(),
        size_bytes: file.size,
        status: "processing",
        status_reason: "Extracting text and embedding chunks",
        chunk_count: 0,
        uploaded_by: CURRENT_USER,
        uploaded_at: new Date().toISOString(),
      });
    });

    setUploadErrors(errors);
    if (accepted.length) {
      setDocuments((prev) => [...accepted, ...prev]);
      setNotice({
        tone: "success",
        text:
          accepted.length +
          (accepted.length === 1 ? " file accepted" : " files accepted") +
          " and queued for processing." +
          (duplicate
            ? " A document with the same filename already existed, so a separate new document was created."
            : ""),
      });
    } else if (errors.length) {
      setNotice(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDownload(doc) {
    setNotice({
      tone: "info",
      text:
        "Downloading the original file “" +
        doc.filename +
        "” (" +
        formatSize(doc.size_bytes) +
        ").",
    });
  }

  function confirmDelete() {
    const doc = pendingDelete;
    if (!doc) return;
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    setNotice({
      tone: "info",
      text:
        "“" +
        doc.filename +
        "” was deleted, along with its stored file and " +
        doc.chunk_count +
        " indexed chunks.",
    });
    closeDialog();
  }

  const focusRing =
    "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14304F]";
  const fieldClass =
    "w-full rounded-md border border-[#C9D3DC] bg-white px-3 py-2 text-sm text-[#14304F] " +
    focusRing;

  const tiles = [
    { label: "Total documents", value: stats.total, hint: "in the shared knowledge base" },
    { label: "Ready", value: stats.ready, hint: "answerable in chat" },
    { label: "Processing", value: stats.processing, hint: "background ingestion" },
    { label: "Failed", value: stats.failed, hint: "reason shown in the table" },
    {
      label: "Chunks indexed",
      value: stats.chunks.toLocaleString(),
      hint: "768-dimension embeddings",
    },
  ];

  return (
    <div
      className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8"
      style={{ fontFamily: brand.fontBody, color: brand.primaryColor }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ fontFamily: brand.fontHeading }}
          >
            Knowledge base
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: brand.neutralColor }}>
            Every document marked ready is searchable by everyone signed in, and is cited by name
            and page whenever the assistant uses it. Administrators upload and remove files.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <UI.Button
            type="button"
            onClick={() => navigate("chat")}
            className={
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white " +
              focusRing
            }
            style={{ backgroundColor: brand.primaryColor }}
          >
            <Icons.Search className="h-4 w-4" aria-hidden="true" />
            Ask a question
          </UI.Button>
        </div>
      </div>

      {/* Role preview — mirrors what an employee without admin rights sees */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-[#DCE3EA] bg-white px-4 py-3">
        <span className="text-sm font-medium">Viewing this page as</span>
        <div
          className="flex gap-1 rounded-md bg-[#EDF1F5] p-1"
          role="group"
          aria-label="Preview the page with a different role"
        >
          {[
            { key: "admin", label: "Administrator" },
            { key: "employee", label: "Employee" },
          ].map((opt) => {
            const active = role === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={active}
                onClick={() => setRole(opt.key)}
                className={"rounded px-3 py-1.5 text-sm font-medium " + focusRing}
                style={
                  active
                    ? { backgroundColor: brand.primaryColor, color: "#FFFFFF" }
                    : { color: brand.neutralColor }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm" style={{ color: brand.neutralColor }}>
          {isAdmin
            ? "Upload and delete controls are shown."
            : "Upload and delete are hidden; the API refuses them too."}
        </p>
      </div>

      {/* Stat tiles */}
      <section aria-labelledby="kb-overview-heading" className="mt-8">
        <h2 id="kb-overview-heading" className="sr-only">
          Library overview
        </h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-lg border border-[#DCE3EA] bg-white px-4 py-5">
              <dt
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: brand.neutralColor }}
              >
                {tile.label}
              </dt>
              <dd
                className="mt-2 text-3xl font-semibold tabular-nums"
                style={{ fontFamily: brand.fontHeading }}
              >
                {tile.value}
              </dd>
              <p className="mt-1 text-xs" style={{ color: brand.neutralColor }}>
                {tile.hint}
              </p>
            </div>
          ))}
        </dl>
      </section>

      {/* Notice / live region */}
      <div aria-live="polite" className="mt-6 empty:mt-0">
        {notice ? (
          <div
            role="status"
            className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: notice.tone === "success" ? "#BFDFD2" : "#C4D1DE",
              backgroundColor: notice.tone === "success" ? "#E7F2ED" : "#EDF1F5",
              color: brand.primaryColor,
            }}
          >
            <span className="flex items-start gap-2">
              <Icons.CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{notice.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss this message"
              className={"shrink-0 rounded p-1 " + focusRing}
            >
              <Icons.X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Upload */}
      {isAdmin ? (
        <section aria-labelledby="kb-upload-heading" className="mt-8">
          <h2
            id="kb-upload-heading"
            className="text-lg font-semibold"
            style={{ fontFamily: brand.fontHeading }}
          >
            Upload documents
          </h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className="mt-3 rounded-lg border-2 border-dashed bg-white px-6 py-8 transition-colors"
            style={{
              borderColor: dragging ? brand.accentColor : "#C9D3DC",
              backgroundColor: dragging ? "#F1F8F5" : "#FFFFFF",
            }}
          >
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: "#E6ECF2" }}
                >
                  <Icons.Upload
                    className="h-5 w-5"
                    aria-hidden="true"
                    style={{ color: brand.primaryColor }}
                  />
                </span>
                <div>
                  <p className="text-sm font-medium">Drag files here, or choose them below</p>
                  <p className="mt-1 text-sm" style={{ color: brand.neutralColor }}>
                    PDF, DOCX, TXT or MD, up to 25 MB each. Processing runs in the background — you
                    can leave this page.
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <UI.Label htmlFor="kb-file-input" className="block text-sm font-medium">
                  Select files to upload
                </UI.Label>
                <input
                  id="kb-file-input"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => handleFiles(e.target.files)}
                  aria-describedby="kb-file-help"
                  className={
                    "mt-1.5 block w-full rounded-md border border-[#C9D3DC] bg-white text-sm text-[#14304F] file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white " +
                    focusRing
                  }
                  style={{ "--tw-file-bg": brand.primaryColor } as React.CSSProperties}
                />
                <p
                  id="kb-file-help"
                  className="mt-1.5 text-xs"
                  style={{ color: brand.neutralColor }}
                >
                  Re-uploading an existing filename creates a separate new document.
                </p>
              </div>
            </div>

            {uploadErrors.length ? (
              <div
                role="alert"
                className="mt-5 rounded-md border px-4 py-3"
                style={{ borderColor: "#EFC6BF", backgroundColor: "#FBEAE7" }}
              >
                <p
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "#9A2A1E" }}
                >
                  <Icons.AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {uploadErrors.length === 1
                    ? "1 file was rejected"
                    : uploadErrors.length + " files were rejected"}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-8 text-sm" style={{ color: "#7A2016" }}>
                  {uploadErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Documents */}
      <section aria-labelledby="kb-documents-heading" className="mt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h2
            id="kb-documents-heading"
            className="text-lg font-semibold"
            style={{ fontFamily: brand.fontHeading }}
          >
            Documents
          </h2>
          <p className="text-sm" style={{ color: brand.neutralColor }} aria-live="polite">
            Showing {visible.length} of {documents.length} documents
          </p>
        </div>

        {/* Filters */}
        <div className="mt-4 grid gap-4 rounded-lg border border-[#DCE3EA] bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <UI.Label htmlFor="kb-search" className="block text-sm font-medium">
              Search by document name
            </UI.Label>
            <div className="relative mt-1.5">
              <Icons.Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
                style={{ color: brand.neutralColor }}
              />
              <UI.Input
                id="kb-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. expense"
                className={fieldClass + " pl-9"}
              />
            </div>
          </div>

          <div>
            <UI.Label htmlFor="kb-status" className="block text-sm font-medium">
              Status
            </UI.Label>
            <select
              id="kb-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={fieldClass + " mt-1.5"}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <UI.Label htmlFor="kb-type" className="block text-sm font-medium">
              File type
            </UI.Label>
            <select
              id="kb-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={fieldClass + " mt-1.5"}
            >
              <option value="all">All types</option>
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="TXT">TXT</option>
              <option value="MD">MD</option>
            </select>
          </div>

          <div className="lg:pb-0.5">
            <UI.Button
              type="button"
              onClick={clearFilters}
              disabled={!filtersActive}
              className={
                "inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#C9D3DC] bg-white px-4 py-2 text-sm font-medium disabled:opacity-45 lg:w-auto " +
                focusRing
              }
              style={{ color: brand.primaryColor }}
            >
              <Icons.Filter className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </UI.Button>
          </div>
        </div>

        {/* Table or empty state */}
        {documents.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[#DCE3EA] bg-white px-6 py-16 text-center">
            <Icons.Package
              className="mx-auto h-8 w-8"
              aria-hidden="true"
              style={{ color: brand.neutralColor }}
            />
            <h3 className="mt-4 text-base font-semibold">The knowledge base is empty</h3>
            <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: brand.neutralColor }}>
              {isAdmin
                ? "Upload a PDF, DOCX, TXT or MD file above and it will be extracted, chunked and embedded automatically."
                : "No documents have been uploaded yet. Ask an administrator to add the policies you need."}
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[#DCE3EA] bg-white px-6 py-16 text-center">
            <Icons.Search
              className="mx-auto h-8 w-8"
              aria-hidden="true"
              style={{ color: brand.neutralColor }}
            />
            <h3 className="mt-4 text-base font-semibold">No documents match your filters</h3>
            <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: brand.neutralColor }}>
              Nothing in the knowledge base matches{" "}
              {query.trim() ? "“" + query.trim() + "”" : "the selected filters"}.
            </p>
            <UI.Button
              type="button"
              onClick={clearFilters}
              className={
                "mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white " +
                focusRing
              }
              style={{ backgroundColor: brand.primaryColor }}
            >
              Clear filters
            </UI.Button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#DCE3EA] bg-white">
            <UI.Table className="w-full min-w-[840px] border-collapse text-sm">
              <caption className="sr-only">
                Documents in the shared knowledge base, with type, size, upload date, status and
                chunk count.
              </caption>
              <UI.THead>
                <UI.TR className="border-b border-[#DCE3EA]">
                  <UI.TH scope="col" className="px-4 py-3 text-left font-semibold">
                    Document
                  </UI.TH>
                  <UI.TH scope="col" className="px-4 py-3 text-left font-semibold">
                    Type
                  </UI.TH>
                  <UI.TH scope="col" className="px-4 py-3 text-right font-semibold">
                    Size
                  </UI.TH>
                  <UI.TH scope="col" className="px-4 py-3 text-left font-semibold">
                    Uploaded
                  </UI.TH>
                  <UI.TH scope="col" className="px-4 py-3 text-left font-semibold">
                    Status
                  </UI.TH>
                  <UI.TH scope="col" className="px-4 py-3 text-right font-semibold">
                    Chunks
                  </UI.TH>
                  <UI.TH scope="col" className="px-4 py-3 text-right font-semibold">
                    Actions
                  </UI.TH>
                </UI.TR>
              </UI.THead>
              <UI.TBody>
                {visible.map((doc) => {
                  const meta = STATUS_META[doc.status];
                  const StatusIcon = Icons[meta.icon];
                  return (
                    <UI.TR
                      key={doc.id}
                      className="border-b border-[#EDF1F5] align-top last:border-b-0"
                    >
                      <UI.TH scope="row" className="px-4 py-4 text-left font-medium">
                        <span className="flex items-start gap-2">
                          <Icons.FileText
                            className="mt-0.5 h-4 w-4 shrink-0"
                            aria-hidden="true"
                            style={{ color: brand.neutralColor }}
                          />
                          <span className="min-w-0">
                            <span className="block break-all">{doc.filename}</span>
                            <span
                              className="mt-1 block text-xs font-normal"
                              style={{ color: brand.neutralColor }}
                            >
                              Added by {doc.uploaded_by}
                            </span>
                            {doc.status_reason ? (
                              <span
                                className="mt-1 block text-xs font-normal"
                                style={{
                                  color: doc.status === "failed" ? "#9A2A1E" : brand.neutralColor,
                                }}
                              >
                                {doc.status_reason}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </UI.TH>
                      <UI.TD className="px-4 py-4" style={{ color: brand.neutralColor }}>
                        {doc.file_type}
                      </UI.TD>
                      <UI.TD
                        className="px-4 py-4 text-right tabular-nums"
                        style={{ color: brand.neutralColor }}
                      >
                        {formatSize(doc.size_bytes)}
                      </UI.TD>
                      <UI.TD
                        className="whitespace-nowrap px-4 py-4"
                        style={{ color: brand.neutralColor }}
                      >
                        {formatUploaded(doc.uploaded_at)}
                      </UI.TD>
                      <UI.TD className="px-4 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{
                            color: meta.fg,
                            backgroundColor: meta.bg,
                            borderColor: meta.border,
                          }}
                        >
                          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {meta.label}
                        </span>
                      </UI.TD>
                      <UI.TD
                        className="px-4 py-4 text-right tabular-nums"
                        style={{ color: brand.neutralColor }}
                      >
                        {doc.status === "ready" ? doc.chunk_count.toLocaleString() : "—"}
                      </UI.TD>
                      <UI.TD className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            aria-label={"Download original file " + doc.filename}
                            className={
                              "rounded-md border border-[#C9D3DC] p-2 hover:bg-[#EDF1F5] " +
                              focusRing
                            }
                          >
                            <Icons.Download
                              className="h-4 w-4"
                              aria-hidden="true"
                              style={{ color: brand.primaryColor }}
                            />
                          </button>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                lastTrigger.current = e.currentTarget;
                                setPendingDelete(doc);
                              }}
                              aria-label={"Delete " + doc.filename}
                              className={
                                "rounded-md border border-[#C9D3DC] p-2 hover:bg-[#FBEAE7] " +
                                focusRing
                              }
                            >
                              <Icons.Trash
                                className="h-4 w-4"
                                aria-hidden="true"
                                style={{ color: "#9A2A1E" }}
                              />
                            </button>
                          ) : null}
                        </div>
                      </UI.TD>
                    </UI.TR>
                  );
                })}
              </UI.TBody>
            </UI.Table>
          </div>
        )}

        <p className="mt-4 text-xs" style={{ color: brand.neutralColor }}>
          Retrieval uses a 0.62 cosine similarity threshold and returns the five best-matching
          chunks. Deleted documents stop appearing in answers immediately.
        </p>
      </section>

      {/* Delete confirmation dialog */}
      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14304F]/50 px-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="kb-delete-title"
            aria-describedby="kb-delete-desc"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2
              id="kb-delete-title"
              className="text-lg font-semibold"
              style={{ fontFamily: brand.fontHeading }}
            >
              Delete this document?
            </h2>
            <p
              id="kb-delete-desc"
              className="mt-3 text-sm leading-relaxed"
              style={{ color: brand.neutralColor }}
            >
              “{pendingDelete.filename}” will be removed along with its stored original file and{" "}
              {pendingDelete.chunk_count.toLocaleString()} indexed chunks. Answers will stop citing
              it straight away. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <UI.Button
                type="button"
                onClick={closeDialog}
                className={
                  "rounded-md border border-[#C9D3DC] bg-white px-4 py-2 text-sm font-medium " +
                  focusRing
                }
                style={{ color: brand.primaryColor }}
              >
                Cancel
              </UI.Button>
              <UI.Button
                type="button"
                ref={confirmRef}
                onClick={confirmDelete}
                className={
                  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white " +
                  focusRing
                }
                style={{ backgroundColor: "#9A2A1E" }}
              >
                <Icons.Trash className="h-4 w-4" aria-hidden="true" />
                Delete document
              </UI.Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
