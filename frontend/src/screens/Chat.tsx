/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import {
  postEventStream,
  ApiError,
  API_BASE_URL,
  listConversations,
  getConversation,
  deleteConversationRequest,
} from "@/lib/api";

const { Table } = UI;
const {
  Plus,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Bell,
  FileText,
  Clock,
  Trash,
  Download,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} = Icons;

const SUGGESTIONS = [
  "How much parental leave am I entitled to?",
  "How does a contractor get VPN access?",
  "What is the limit on client dinners?",
];

const STOPPED_TEXT = "No answer was generated before the request was stopped.";
const CONNECTION_LOST_TEXT = "Connection to the assistant was lost. Try asking again.";
const SEARCH_DEBOUNCE_MS = 300;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function makeEmptyConversation(id) {
  return {
    id,
    backendId: null,
    title: "",
    updatedAt: new Date().toISOString(),
    messages: [],
    loaded: true,
  };
}

function timeFromIso(iso) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function mapDetailToLocal(detail) {
  return {
    id: detail.id,
    backendId: detail.id,
    title: detail.title,
    updatedAt: detail.updated_at,
    loaded: true,
    messages: (detail.messages || []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      time: timeFromIso(m.created_at),
      state: "complete",
      sources: (m.sources || []).map((s) => ({
        id: s.document_id,
        filename: s.filename,
        page: s.page,
        text: s.text,
      })),
    })),
  };
}

export default function Screen() {
  const navigate = useNavigate();
  const {
    Search,
    Plus,
    Trash,
    X,
    FileText,
    AlertCircle,
    CheckCircle,
    Download,
    ArrowRight,
    Clock,
    ChevronDown,
    ChevronRight,
  } = Icons;

  // `conversations` holds only conversations persisted on the server
  // (populated from GET /conversations); the currently unsaved "new
  // conversation" lives separately in `draftConv` until the backend assigns
  // it a real id (on the first exchange's `done` event), at which point it
  // moves into `conversations`.
  const [conversations, setConversations] = React.useState([]);
  const [draftConv, setDraftConv] = React.useState(() => makeEmptyConversation("draft-1"));
  const [activeId, setActiveId] = React.useState("draft-1");
  const [historyQuery, setHistoryQuery] = React.useState("");
  const [historyError, setHistoryError] = React.useState("");
  const [loadingConvId, setLoadingConvId] = React.useState(null);
  const [questionText, setQuestionText] = React.useState("");
  const [streamingId, setStreamingId] = React.useState(null);
  const [panel, setPanel] = React.useState(null);
  const [copiedId, setCopiedId] = React.useState(null);
  const [speakingId, setSpeakingId] = React.useState(null);
  const [confirmId, setConfirmId] = React.useState(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const idRef = React.useRef(100);
  const chipReturnRef = React.useRef(null);
  const deleteReturnRef = React.useRef(null);
  const panelCloseRef = React.useRef(null);
  const confirmRef = React.useRef(null);
  const composerRef = React.useRef(null);
  const abortRef = React.useRef(null);
  const historyQueryRef = React.useRef("");
  const didMountSearchRef = React.useRef(false);

  const speechSupported =
    typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";

  const nextId = () => {
    idRef.current += 1;
    return "id-" + idRef.current;
  };

  const nowTime = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  const nowIso = () => new Date().toISOString();

  /* ---------- copy confirmation ---------- */
  React.useEffect(() => {
    if (!copiedId) return undefined;
    const t = setTimeout(() => setCopiedId(null), 2200);
    return () => clearTimeout(t);
  }, [copiedId]);

  /* ---------- source panel: focus + escape ---------- */
  React.useEffect(() => {
    if (!panel) return undefined;
    if (panelCloseRef.current) panelCloseRef.current.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closePanel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);

  /* ---------- delete dialog: focus + escape ---------- */
  React.useEffect(() => {
    if (!confirmId) return undefined;
    if (confirmRef.current) confirmRef.current.focus();
    const onKey = (e) => {
      if (e.key === "Escape") closeConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmId]);

  /* ---------- stop speech on unmount ---------- */
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  /* ---------- abort any in-flight request on unmount ---------- */
  React.useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.controller.abort();
    };
  }, []);

  /* ---------- keep a ref of the current search term for async callbacks ---------- */
  React.useEffect(() => {
    historyQueryRef.current = historyQuery;
  }, [historyQuery]);

  /* ---------- load the user's conversation history on mount ---------- */
  React.useEffect(() => {
    fetchConversations(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- debounced search against GET /conversations?q= ---------- */
  React.useEffect(() => {
    if (!didMountSearchRef.current) {
      didMountSearchRef.current = true;
      return undefined;
    }
    const term = historyQuery.trim();
    const timer = setTimeout(() => {
      fetchConversations(term || undefined);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyQuery]);

  async function fetchConversations(q) {
    try {
      const results = await listConversations(q);
      mergeServerList(results);
      setHistoryError("");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load your conversations. Try again.";
      setHistoryError(message);
    }
  }

  function mergeServerList(serverList) {
    setConversations((cs) => {
      const byId = new Map(cs.map((c) => [c.id, c]));
      return (serverList || []).map((s) => {
        const prev = byId.get(s.id);
        if (prev && prev.loaded) {
          return { ...prev, title: s.title, updatedAt: s.updated_at };
        }
        return {
          id: s.id,
          backendId: s.id,
          title: s.title,
          updatedAt: s.updated_at,
          loaded: false,
          messages: [],
        };
      });
    });
  }

  function refreshConversationsList() {
    fetchConversations(historyQueryRef.current.trim() || undefined);
  }

  async function selectConversation(id) {
    setHistoryOpen(false);
    setActiveId(id);
    const target = conversations.find((c) => c.id === id);
    if (!target || target.loaded) return;
    setLoadingConvId(id);
    try {
      const detail = await getConversation(id);
      setHistoryError("");
      setConversations((cs) => cs.map((c) => (c.id === id ? mapDetailToLocal(detail) : c)));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load this conversation. Try again.";
      setHistoryError(message);
    } finally {
      setLoadingConvId((current) => (current === id ? null : current));
    }
  }

  const active =
    draftConv && draftConv.id === activeId
      ? draftConv
      : conversations.find((c) => c.id === activeId) || null;

  /* ---------- applies an update to whichever of draftConv/conversations
   * currently holds this conversation id ---------- */
  function updateConv(convId, updater) {
    setDraftConv((d) => (d && d.id === convId ? updater(d) : d));
    setConversations((cs) => cs.map((c) => (c.id === convId ? updater(c) : c)));
  }

  /* ---------- once the backend assigns a real conversation id (on the
   * first exchange's `done` event), the draft becomes a persisted entry ---------- */
  function promoteConversation(oldId, newId) {
    if (oldId === newId) return;
    setDraftConv((d) => {
      if (!d || d.id !== oldId) return d;
      const persisted = { ...d, id: newId, backendId: newId, loaded: true };
      setConversations((cs) => [persisted, ...cs.filter((c) => c.id !== newId)]);
      return null;
    });
    setConversations((cs) =>
      cs.map((c) => (c.id === oldId ? { ...c, id: newId, backendId: newId } : c)),
    );
    setActiveId((current) => (current === oldId ? newId : current));
    refreshConversationsList();
  }

  function appendToken(convId, msgId, token) {
    if (!token) return;
    updateConv(convId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === msgId ? { ...m, content: m.content + token } : m,
      ),
    }));
  }

  function applySources(convId, msgId, sources) {
    const list = Array.isArray(sources) ? sources : [];
    updateConv(convId, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === msgId ? { ...m, sources: list } : m)),
    }));
  }

  function applyNoMatch(convId, msgId, message) {
    const text =
      typeof message === "string" && message.trim()
        ? message
        : "No relevant documents were found for this question.";
    updateConv(convId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === msgId ? { ...m, state: "none", content: text, sources: [] } : m,
      ),
    }));
  }

  function applyError(convId, msgId, code, message) {
    const text =
      typeof message === "string" && message.trim()
        ? message
        : "Something went wrong generating this answer. Try again.";
    updateConv(convId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === msgId
          ? {
              ...m,
              state: code === "quota_exhausted" ? "error" : "none",
              content: text,
              errorCode: code,
            }
          : m,
      ),
    }));
  }

  function finalizeDone(convId, msgId) {
    updateConv(convId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === msgId && m.state === "streaming" ? { ...m, state: "complete" } : m,
      ),
    }));
  }

  async function runStream(convId, msgId, question, backendId) {
    const controller = new AbortController();
    abortRef.current = { controller, convId, msgId };
    setStreamingId(msgId);
    try {
      await postEventStream(
        "/chat/ask",
        backendId ? { question, conversation_id: backendId } : { question },
        {
          onToken: (token) => appendToken(convId, msgId, token),
          onSources: (sources) => applySources(convId, msgId, sources),
          onNoMatch: (message) => applyNoMatch(convId, msgId, message),
          onPing: () => {},
          onError: (err) => applyError(convId, msgId, err && err.code, err && err.message),
          onDone: (data) => {
            finalizeDone(convId, msgId);
            const newBackendId =
              data && typeof data.conversation_id === "string" ? data.conversation_id : null;
            if (newBackendId) promoteConversation(convId, newBackendId);
          },
        },
        controller.signal,
      );
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (!isAbort) {
        const message = err instanceof ApiError ? err.message : CONNECTION_LOST_TEXT;
        applyError(convId, msgId, "connection_lost", message);
      }
    } finally {
      if (abortRef.current && abortRef.current.msgId === msgId) abortRef.current = null;
      setStreamingId((current) => (current === msgId ? null : current));
    }
  }

  function handleAsk(e) {
    e.preventDefault();
    const question = questionText.trim();
    if (!question || streamingId) return;
    const userId = nextId();
    const msgId = nextId();
    const time = nowTime();
    const convId = activeId;
    const backendId = active ? active.backendId : null;
    updateConv(convId, (c) => ({
      ...c,
      title: c.title || (question.length > 46 ? question.slice(0, 46) + "…" : question),
      updatedAt: nowIso(),
      messages: [
        ...c.messages,
        {
          id: userId,
          role: "user",
          content: question,
          time,
          state: "complete",
          sources: [],
        },
        {
          id: msgId,
          role: "assistant",
          content: "",
          time,
          state: "streaming",
          sources: [],
        },
      ],
    }));
    setQuestionText("");
    runStream(convId, msgId, question, backendId);
  }

  function handleStop() {
    const current = abortRef.current;
    if (!current) return;
    current.controller.abort();
    updateConv(current.convId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === current.msgId
          ? {
              ...m,
              state: m.content.trim() ? "complete" : "none",
              content: m.content || STOPPED_TEXT,
            }
          : m,
      ),
    }));
    abortRef.current = null;
    setStreamingId(null);
    if (composerRef.current) composerRef.current.focus();
  }

  function handleRegenerate(message) {
    if (streamingId || !active) return;
    const idx = active.messages.findIndex((m) => m.id === message.id);
    let question = "";
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (active.messages[i].role === "user") {
        question = active.messages[i].content;
        break;
      }
    }
    if (!question) return;
    const convId = active.id;
    const backendId = active.backendId;
    updateConv(convId, (c) => ({
      ...c,
      updatedAt: nowIso(),
      messages: c.messages.map((m) =>
        m.id === message.id
          ? {
              ...m,
              content: "",
              state: "streaming",
              sources: [],
              time: nowTime(),
            }
          : m,
      ),
    }));
    runStream(convId, message.id, question, backendId);
  }

  function handleCopy(message) {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message.content).catch(() => {});
    }
    setCopiedId(message.id);
  }

  function handleSpeak(message) {
    if (!speechSupported) return;
    if (speakingId === message.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(message.content);
    utterance.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingId(message.id);
  }

  function newConversation() {
    if (streamingId) handleStop();
    if (draftConv) {
      setActiveId(draftConv.id);
    } else {
      const id = nextId();
      setDraftConv(makeEmptyConversation(id));
      setActiveId(id);
    }
    setHistoryOpen(false);
    if (composerRef.current) composerRef.current.focus();
  }

  function openPanel(source, ordinal, el) {
    chipReturnRef.current = el;
    setPanel({ source, ordinal });
  }

  function closePanel() {
    setPanel(null);
    if (chipReturnRef.current) chipReturnRef.current.focus();
  }

  function askConfirm(convId, el) {
    deleteReturnRef.current = el;
    setConfirmId(convId);
  }

  function closeConfirm() {
    setConfirmId(null);
    if (deleteReturnRef.current) deleteReturnRef.current.focus();
  }

  async function deleteConversation() {
    const id = confirmId;
    if (!id) return;
    if (abortRef.current && abortRef.current.convId === id) {
      abortRef.current.controller.abort();
      abortRef.current = null;
      setStreamingId(null);
    }
    const isDraft = draftConv && draftConv.id === id;
    if (isDraft) {
      const fresh = makeEmptyConversation(nextId());
      setDraftConv(fresh);
      setActiveId(fresh.id);
      setConfirmId(null);
      setHistoryError("");
      if (composerRef.current) composerRef.current.focus();
      return;
    }
    try {
      await deleteConversationRequest(id);
      setHistoryError("");
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (activeId === id) {
        const fresh = makeEmptyConversation(nextId());
        setDraftConv(fresh);
        setActiveId(fresh.id);
      }
      setConfirmId(null);
      if (composerRef.current) composerRef.current.focus();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not delete this conversation. Try again.";
      setHistoryError(message);
      setConfirmId(null);
    }
  }

  /* ---------- history grouping ---------- */
  const term = historyQuery.trim().toLowerCase();
  const filtered = conversations
    .filter((c) => {
      if (!term) return true;
      const inTitle = (c.title || "New conversation").toLowerCase().includes(term);
      const inBody = c.messages.some((m) => m.content.toLowerCase().includes(term));
      return inTitle || inBody;
    })
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const today = isoDate(new Date());
  const yesterday = isoDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  function dayLabel(iso) {
    const day = iso.slice(0, 10);
    if (day === today) return "Today";
    if (day === yesterday) return "Yesterday";
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  }

  const groups = [];
  filtered.forEach((c) => {
    const label = dayLabel(c.updatedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(c);
    else groups.push({ label, items: [c] });
  });

  const navy = brand.primaryColor;
  const green = brand.accentColor;
  const focusRing =
    "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14304F] focus-visible:ring-offset-white";

  const panelChunk = panel ? panel.source : null;
  const confirmTarget =
    (draftConv && draftConv.id === confirmId ? draftConv : null) ||
    conversations.find((c) => c.id === confirmId) ||
    null;

  return (
    <div
      className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8"
      style={{ fontFamily: brand.fontBody, color: "#1F2933" }}
    >
      {/* Page heading */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-[28px]"
            style={{ color: navy, fontFamily: brand.fontHeading }}
          >
            Chat
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Ask a question in plain English. Answers are generated only from documents indexed in
            the shared knowledge base, and every answer carries numbered citations you can open.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("knowledge-base")}
            className={
              "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 " +
              focusRing
            }
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Knowledge base
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={newConversation}
            className={
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 " +
              focusRing
            }
            style={{ backgroundColor: navy }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New conversation
          </button>
        </div>
      </div>

      {/* Mobile history toggle */}
      <div className="mt-5 lg:hidden">
        <button
          type="button"
          aria-expanded={historyOpen}
          aria-controls="history-panel"
          onClick={() => setHistoryOpen((v) => !v)}
          className={
            "inline-flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 " +
            focusRing
          }
        >
          <span>Conversation history ({conversations.length})</span>
          <ChevronDown
            className={"h-4 w-4 transition-transform " + (historyOpen ? "rotate-180" : "")}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ---------------- Sidebar: history ---------------- */}
        <aside
          id="history-panel"
          aria-label="Conversation history"
          className={
            (historyOpen ? "block " : "hidden ") +
            "lg:block rounded-xl border border-slate-200 bg-white"
          }
        >
          <div className="border-b border-slate-200 px-4 py-4">
            <h2
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: navy, fontFamily: brand.fontHeading }}
            >
              Conversation history
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Private to you. Grouped by the day of the last message.
            </p>
            <div className="mt-3">
              <label htmlFor="history-search" className="block text-sm font-medium text-slate-700">
                Search your conversations
              </label>
              <div className="relative mt-1.5">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="history-search"
                  type="search"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="e.g. expenses"
                  className={
                    "w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 " +
                    focusRing
                  }
                />
              </div>
            </div>
            {historyError && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-[#E7C3BF] bg-[#FCF2F1] px-3 py-2 text-xs leading-5 text-[#5F2120]"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {historyError}
              </p>
            )}
          </div>

          <div className="max-h-[52vh] overflow-y-auto px-2 py-3 lg:max-h-[60vh]">
            {groups.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">No conversations match</p>
                <p className="mt-1 text-sm text-slate-500">
                  Nothing in your history mentions “{historyQuery.trim()}”.
                </p>
                <button
                  type="button"
                  onClick={() => setHistoryQuery("")}
                  className={
                    "mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 " +
                    focusRing
                  }
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Clear search
                </button>
              </div>
            ) : (
              groups.map((group) => (
                <section key={group.label} className="mb-4 last:mb-0">
                  <h3 className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.label}
                  </h3>
                  <ul className="space-y-0.5">
                    {group.items.map((c) => {
                      const isActive = c.id === activeId;
                      const preview =
                        c.messages.length === 0
                          ? "No messages yet"
                          : c.messages[c.messages.length - 1].content.slice(0, 64) ||
                            "Answer in progress…";
                      return (
                        <li key={c.id} className="group relative">
                          <div
                            className={
                              "flex items-stretch rounded-lg " +
                              (isActive ? "bg-[#EEF2F6]" : "hover:bg-slate-50")
                            }
                          >
                            <button
                              type="button"
                              aria-current={isActive ? "true" : undefined}
                              onClick={() => selectConversation(c.id)}
                              className={"flex-1 rounded-lg px-3 py-2.5 text-left " + focusRing}
                            >
                              <span
                                className="block truncate text-sm font-medium"
                                style={{ color: isActive ? navy : "#334155" }}
                              >
                                {c.title || "New conversation"}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {c.updatedAt.slice(11, 16)} ·{" "}
                                {loadingConvId === c.id ? "Loading…" : preview}
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={"Delete conversation: " + (c.title || "New conversation")}
                              onClick={(e) => askConfirm(c.id, e.currentTarget)}
                              className={
                                "mr-1 self-center rounded-md p-2 text-slate-400 hover:bg-white hover:text-[#B3261E] " +
                                focusRing
                              }
                            >
                              <Trash className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={() => navigate("account")}
              className={
                "rounded text-xs font-medium text-slate-600 underline hover:text-slate-900 " +
                focusRing
              }
            >
              Account & appearance settings
            </button>
          </div>
        </aside>

        {/* ---------------- Main: conversation ---------------- */}
        <section
          aria-label="Conversation"
          className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h2
                className="truncate text-lg font-semibold"
                style={{ color: navy, fontFamily: brand.fontHeading }}
              >
                {active && active.title ? active.title : "New conversation"}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {active && active.messages.length > 0
                  ? dayLabel(active.updatedAt) + " at " + active.updatedAt.slice(11, 16)
                  : "Not started"}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: "#E8F3EE", color: "#1F6B4F" }}
            >
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Grounded answers only
            </span>
          </div>

          {/* Messages */}
          <div className="max-h-[56vh] min-h-[320px] overflow-y-auto px-5 py-6">
            {!active || active.messages.length === 0 ? (
              <div className="mx-auto max-w-xl py-8 text-center">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: navy }}
                  aria-hidden="true"
                >
                  KA
                </div>
                <h3
                  className="mt-4 text-base font-semibold"
                  style={{ color: navy, fontFamily: brand.fontHeading }}
                >
                  Ask your first question
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Answers come from the documents indexed in the knowledge base. If nothing in them
                  is relevant, the assistant will say so rather than guess.
                </p>
                <ul className="mt-5 flex flex-col items-stretch gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionText(s);
                          if (composerRef.current) composerRef.current.focus();
                        }}
                        className={
                          "flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-left text-sm text-slate-700 hover:border-slate-300 hover:bg-white " +
                          focusRing
                        }
                      >
                        {s}
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ol className="space-y-6">
                {active.messages.map((m) => {
                  if (m.role === "user") {
                    return (
                      <li key={m.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-xl bg-[#EEF2F6] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            You · {m.time}
                          </p>
                          <p className="mt-1.5 text-[15px] leading-7 text-slate-900">{m.content}</p>
                        </div>
                      </li>
                    );
                  }
                  const isStreaming = m.state === "streaming";
                  const sources = m.sources || [];
                  return (
                    <li key={m.id} className="flex gap-3">
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: navy }}
                        aria-hidden="true"
                      >
                        KA
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Knowledge Assistant · {m.time}
                        </p>

                        {m.state === "error" ? (
                          <div className="mt-2 rounded-lg border border-[#E7C3BF] bg-[#FCF2F1] p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-[#8C1D18]">
                              <AlertCircle className="h-4 w-4" aria-hidden="true" />
                              Error
                            </p>
                            <p className="mt-2 text-[15px] leading-7 text-[#5F2120]">{m.content}</p>
                          </div>
                        ) : m.state === "none" ? (
                          <div className="mt-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <AlertCircle className="h-4 w-4" aria-hidden="true" />
                              No relevant documents found
                            </p>
                            <p className="mt-2 text-[15px] leading-7 text-slate-700">{m.content}</p>
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-800">
                            {m.content}
                            {isStreaming && (
                              <span
                                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse"
                                style={{ backgroundColor: green }}
                                aria-hidden="true"
                              />
                            )}
                          </p>
                        )}

                        {isStreaming && (
                          <div className="mt-3 flex items-center gap-3">
                            <span role="status" className="text-xs font-medium text-slate-500">
                              Generating answer from {sources.length || 0} retrieved passages…
                            </span>
                            <button
                              type="button"
                              onClick={handleStop}
                              className={
                                "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 " +
                                focusRing
                              }
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Stop
                            </button>
                          </div>
                        )}

                        {m.state === "complete" && sources.length > 0 && (
                          <div className="mt-4">
                            <p
                              id={"sources-" + m.id}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                              Sources ({sources.length})
                            </p>
                            <ul
                              aria-labelledby={"sources-" + m.id}
                              className="mt-2 flex flex-wrap gap-2"
                            >
                              {sources.map((ch, i) => (
                                <li key={ch.id || i}>
                                  <button
                                    type="button"
                                    onClick={(e) => openPanel(ch, i + 1, e.currentTarget)}
                                    aria-label={
                                      "Source " +
                                      (i + 1) +
                                      ": " +
                                      (ch.filename || "source") +
                                      (ch.page ? ", " + ch.page : "") +
                                      ". Open the cited passage"
                                    }
                                    className={
                                      "inline-flex max-w-full items-center gap-2 rounded-full border border-slate-300 bg-white py-1.5 pl-1.5 pr-3 text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50 " +
                                      focusRing
                                    }
                                  >
                                    <span
                                      className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                      style={{ backgroundColor: green }}
                                      aria-hidden="true"
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="truncate font-medium">
                                      {ch.filename || "Source " + (i + 1)}
                                    </span>
                                    {ch.page && <span className="text-slate-500">{ch.page}</span>}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(m.state === "complete" || m.state === "none") && (
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(m)}
                              className={
                                "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 " +
                                focusRing
                              }
                            >
                              {copiedId === m.id ? (
                                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {copiedId === m.id ? "Copied" : "Copy"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSpeak(m)}
                              disabled={!speechSupported}
                              aria-describedby={!speechSupported ? "speech-unsupported" : undefined}
                              className={
                                "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent " +
                                focusRing
                              }
                            >
                              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                              {speakingId === m.id ? "Stop reading" : "Read aloud"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerate(m)}
                              disabled={Boolean(streamingId)}
                              className={
                                "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 " +
                                focusRing
                              }
                            >
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              Regenerate
                            </button>
                            {copiedId === m.id && (
                              <span
                                role="status"
                                className="text-xs font-medium"
                                style={{ color: green }}
                              >
                                Answer copied to clipboard
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {!speechSupported && (
            <p id="speech-unsupported" className="px-5 text-xs text-slate-500">
              Read aloud is unavailable because this browser has no speech synthesis support.
            </p>
          )}

          {/* Composer */}
          <form onSubmit={handleAsk} className="border-t border-slate-200 px-5 py-5">
            <label htmlFor="question" className="block text-sm font-medium text-slate-700">
              Ask a question about your documents
            </label>
            <textarea
              id="question"
              ref={composerRef}
              rows={3}
              value={questionText}
              disabled={Boolean(streamingId)}
              onChange={(e) => setQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk(e);
                }
              }}
              aria-describedby="composer-hint"
              className={
                "mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] leading-6 text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 " +
                focusRing
              }
              placeholder="For example: what notice do I need to give before parental leave?"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p id="composer-hint" className="text-xs leading-5 text-slate-500">
                Press Enter to send, Shift + Enter for a new line. Retrieval uses the five best
                matching passages above a 0.62 similarity threshold.
              </p>
              <div className="flex items-center gap-2">
                {streamingId && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className={
                      "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 " +
                      focusRing
                    }
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Stop
                  </button>
                )}
                <button
                  type="submit"
                  disabled={Boolean(streamingId) || questionText.trim().length === 0}
                  className={
                    "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 " +
                    focusRing
                  }
                  style={{ backgroundColor: navy }}
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  Send question
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>

      {/* ---------------- Source side panel ---------------- */}
      {panelChunk && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closePanel}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-panel-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Source {panel.ordinal}
                </p>
                <h2
                  id="source-panel-title"
                  className="mt-1 break-words text-lg font-semibold"
                  style={{ color: navy, fontFamily: brand.fontHeading }}
                >
                  {panelChunk.filename || "Source"}
                </h2>
              </div>
              <button
                type="button"
                ref={panelCloseRef}
                onClick={closePanel}
                aria-label="Close source panel"
                className={
                  "rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 " +
                  focusRing
                }
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </dt>
                  <dd className="mt-1 text-slate-800">{panelChunk.page || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    File type
                  </dt>
                  <dd className="mt-1 text-slate-800">{panelChunk.file_type || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cosine similarity
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {typeof panelChunk.score === "number" ? panelChunk.score.toFixed(2) : "—"}{" "}
                    <span className="text-slate-500">(threshold 0.62)</span>
                  </dd>
                </div>
              </dl>

              <h3 className="mt-6 text-sm font-semibold text-slate-900">Cited passage</h3>
              <blockquote
                className="mt-2 rounded-lg border-l-4 bg-[#F8FAFC] px-4 py-3 text-[15px] leading-7 text-slate-800"
                style={{ borderColor: green }}
              >
                {panelChunk.text || ""}
              </blockquote>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 px-5 py-4">
              <a
                href={API_BASE_URL + "/documents/" + (panelChunk.id || "") + "/download"}
                download
                aria-label={"Download original: " + (panelChunk.filename || "this source")}
                className={
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 " +
                  focusRing
                }
                style={{ backgroundColor: navy }}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download original
              </a>
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  navigate("knowledge-base");
                }}
                className={
                  "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 " +
                  focusRing
                }
              >
                View in knowledge base
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Delete confirmation ---------------- */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeConfirm}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2
              id="delete-title"
              className="text-lg font-semibold"
              style={{ color: navy, fontFamily: brand.fontHeading }}
            >
              Delete this conversation?
            </h2>
            <p id="delete-desc" className="mt-2 text-sm leading-6 text-slate-600">
              “{confirmTarget.title || "New conversation"}” and its {confirmTarget.messages.length}{" "}
              messages will be permanently removed from your history. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                className={
                  "rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 " +
                  focusRing
                }
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmRef}
                onClick={deleteConversation}
                className={
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 " +
                  focusRing
                }
                style={{ backgroundColor: "#8C1D18" }}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
                Delete conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
