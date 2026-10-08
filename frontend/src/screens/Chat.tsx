/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Table } = UI;
const { Plus, Search, X, ChevronRight, ChevronDown, Bell, FileText, Clock, Trash, Download, ArrowRight, AlertCircle, CheckCircle } = Icons;

const TODAY = '2026-10-08';
const YESTERDAY = '2026-10-07';

const CHUNKS = {
  c1: {
    id: 'c1',
    filename: 'Employee-Handbook-2026.pdf',
    file_type: 'PDF',
    page: 'Page 14',
    score: 0.84,
    text:
      'Parental leave. Employees with at least 26 weeks of continuous service are entitled to 26 weeks of parental leave at full pay, followed by up to 13 weeks at the statutory rate. Requests are made through the HR portal and must be submitted at least 8 weeks before the intended start date.'
  },
  c2: {
    id: 'c2',
    filename: 'Parental-Leave-Policy-v4.docx',
    file_type: 'DOCX',
    page: 'Section 3.2',
    score: 0.79,
    text:
      'Shared parental leave may be taken in a maximum of three separate blocks. Each block requires eight weeks of written notice to the line manager and to People Operations. Blocks may not be shorter than two consecutive weeks.'
  },
  c3: {
    id: 'c3',
    filename: 'Remote-Access-Standard.pdf',
    file_type: 'PDF',
    page: 'Page 7',
    score: 0.81,
    text:
      'Contractors are issued VPN credentials only after their sponsoring manager files a Form RA-2 with the service desk. Credentials expire automatically 90 days after issue and must be re-approved by the sponsoring manager before they can be used again.'
  },
  c4: {
    id: 'c4',
    filename: 'IT-Security-Handbook.docx',
    file_type: 'DOCX',
    page: 'Table 4',
    score: 0.72,
    text:
      'Contractor accounts — review cycle: 90 days. Multi-factor authentication: required. Network access: limited to the project segment. Exceptions must be recorded by the Head of Security and reviewed at each quarterly access review.'
  },
  c5: {
    id: 'c5',
    filename: 'Expenses-Policy-2026.md',
    file_type: 'MD',
    page: 'Position 42',
    score: 0.88,
    text:
      'Client entertainment is capped at £60 per head including service. Anything above this limit requires written pre-approval from a director, and the claim must be itemised rather than submitted as a single total. Alcohol is reimbursable only as part of a meal.'
  },
  c6: {
    id: 'c6',
    filename: 'Fire-Safety-Policy-2011-scan.pdf',
    file_type: 'PDF (OCR)',
    page: 'Page 3',
    score: 0.77,
    text:
      'In the event of the alarm sounding, all staff must leave by the nearest marked exit and assemble at the car park muster point. Fire wardens sweep each floor and report to the incident officer, who alone may authorise re-entry to the building.'
  },
  c7: {
    id: 'c7',
    filename: 'Travel-Booking-Guide.pdf',
    file_type: 'PDF',
    page: 'Page 2',
    score: 0.8,
    text:
      'All international travel must be approved by the budget holder and then booked through Clarkson Travel within 48 hours of that approval. Rail is the default mode for journeys under 400 km; a flight on such a route requires a stated business reason.'
  },
  c8: {
    id: 'c8',
    filename: 'Laptop-Refresh-Schedule.docx',
    file_type: 'DOCX',
    page: 'Table 1',
    score: 0.75,
    text:
      'Standard laptops are replaced on a 36-month cycle. Engineering workstations are replaced at 24 months. Devices outside warranty are not repaired; a replacement is issued and the old device is returned to IT asset management.'
  }
};

const NO_MATCH_TEXT =
  'I could not find anything relevant to that question in the knowledge base, so I have not answered it. Every answer here is drawn from indexed documents and carries a citation. If you expect this to be covered, ask an administrator to upload the relevant document to the knowledge base and try again.';

const ANSWER_LIBRARY = [
  {
    keys: ['parental', 'maternity', 'paternity', 'leave', 'baby'],
    chunks: ['c1', 'c2'],
    text:
      "Employees with at least 26 weeks of continuous service are entitled to 26 weeks of parental leave at full pay, followed by up to 13 weeks at the statutory rate [1]. Requests go through the HR portal and must be submitted at least eight weeks before the intended start date [1]. If you would rather take the time in stages, shared parental leave can be split into a maximum of three blocks of at least two weeks each, and every block needs eight weeks of written notice to your line manager and People Operations [2]."
  },
  {
    keys: ['vpn', 'contractor', 'remote access', 'credential', 'mfa'],
    chunks: ['c3', 'c4'],
    text:
      'Contractors are issued VPN credentials only after their sponsoring manager files a Form RA-2 with the service desk [1]. Those credentials expire automatically 90 days after they are issued and must be re-approved by the sponsoring manager before they can be used again [1]. Contractor accounts also require multi-factor authentication and are limited to the project network segment, with any exception recorded by the Head of Security and revisited at the quarterly access review [2].'
  },
  {
    keys: ['expense', 'dinner', 'entertain', 'client', 'meal', '£', 'spend'],
    chunks: ['c5'],
    text:
      'Client entertainment is capped at £60 per head including service [1]. Anything above that figure needs written pre-approval from a director, and the claim has to be itemised rather than submitted as a single total [1]. Alcohol is reimbursable only when it forms part of a meal [1].'
  },
  {
    keys: ['fire', 'alarm', 'evacuat', 'muster', 'emergency'],
    chunks: ['c6'],
    text:
      'If the alarm sounds, leave by the nearest marked exit and assemble at the car park muster point [1]. Fire wardens sweep each floor and then report to the incident officer, who is the only person able to authorise re-entry to the building [1]. This passage comes from a scanned 2011 policy that was read with OCR, so check the original PDF if the wording matters.'
  },
  {
    keys: ['travel', 'flight', 'train', 'rail', 'trip', 'book'],
    chunks: ['c7'],
    text:
      'International travel must be approved by the budget holder first and then booked through Clarkson Travel within 48 hours of that approval [1]. For journeys under 400 km rail is the default mode, and taking a flight on such a route requires a stated business reason on the booking [1].'
  },
  {
    keys: ['laptop', 'refresh', 'device', 'hardware', 'workstation', 'macbook'],
    chunks: ['c8'],
    text:
      'Standard laptops are replaced on a 36-month cycle, while engineering workstations are replaced at 24 months [1]. Devices that are out of warranty are not repaired — IT issues a replacement and the old device is returned to asset management [1].'
  }
];

const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'Parental leave entitlement',
    updatedAt: TODAY + 'T09:12:00Z',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'How much parental leave am I entitled to, and how much notice do I need to give?',
        time: '09:11',
        state: 'complete',
        citations: []
      },
      {
        id: 'm2',
        role: 'assistant',
        content: ANSWER_LIBRARY[0].text,
        time: '09:12',
        state: 'complete',
        citations: ['c1', 'c2']
      }
    ]
  },
  {
    id: 'conv-2',
    title: 'VPN access for contractors',
    updatedAt: TODAY + 'T08:26:00Z',
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'What does a contractor need before they can get VPN access?',
        time: '08:24',
        state: 'complete',
        citations: []
      },
      {
        id: 'm4',
        role: 'assistant',
        content: ANSWER_LIBRARY[1].text,
        time: '08:25',
        state: 'complete',
        citations: ['c3', 'c4']
      },
      {
        id: 'm5',
        role: 'user',
        content: 'And who signs off an exception to the 90-day expiry?',
        time: '08:26',
        state: 'complete',
        citations: []
      },
      {
        id: 'm6',
        role: 'assistant',
        content:
          'The AI service quota for this organisation has been used up, so no answer could be generated. Nothing was lost — your question is still in this conversation and you can send it again once quota is available. Please contact an administrator.',
        time: '08:26',
        state: 'error',
        citations: []
      }
    ]
  },
  {
    id: 'conv-3',
    title: 'Expense limit for client dinners',
    updatedAt: YESTERDAY + 'T16:48:00Z',
    messages: [
      {
        id: 'm7',
        role: 'user',
        content: 'Is there a per-head limit when I take a client out for dinner?',
        time: '16:47',
        state: 'complete',
        citations: []
      },
      {
        id: 'm8',
        role: 'assistant',
        content: ANSWER_LIBRARY[2].text,
        time: '16:48',
        state: 'complete',
        citations: ['c5']
      }
    ]
  },
  {
    id: 'conv-4',
    title: 'Pension provider switch',
    updatedAt: YESTERDAY + 'T11:05:00Z',
    messages: [
      {
        id: 'm9',
        role: 'user',
        content: 'Are we moving the pension scheme to a new provider next year?',
        time: '11:05',
        state: 'complete',
        citations: []
      },
      {
        id: 'm10',
        role: 'assistant',
        content: NO_MATCH_TEXT,
        time: '11:05',
        state: 'none',
        citations: []
      }
    ]
  },
  {
    id: 'conv-5',
    title: 'Fire evacuation muster point',
    updatedAt: '2026-10-06T14:20:00Z',
    messages: [
      {
        id: 'm11',
        role: 'user',
        content: 'Where do we assemble if the fire alarm goes off at the Leeds office?',
        time: '14:19',
        state: 'complete',
        citations: []
      },
      {
        id: 'm12',
        role: 'assistant',
        content: ANSWER_LIBRARY[3].text,
        time: '14:20',
        state: 'complete',
        citations: ['c6']
      }
    ]
  },
  {
    id: 'conv-6',
    title: 'International travel approval chain',
    updatedAt: '2026-10-02T10:02:00Z',
    messages: [
      {
        id: 'm13',
        role: 'user',
        content: 'Who approves international travel before I book a flight?',
        time: '10:01',
        state: 'complete',
        citations: []
      },
      {
        id: 'm14',
        role: 'assistant',
        content: ANSWER_LIBRARY[4].text,
        time: '10:02',
        state: 'complete',
        citations: ['c7']
      }
    ]
  },
  {
    id: 'conv-7',
    title: 'Laptop refresh cycle',
    updatedAt: '2026-09-29T15:37:00Z',
    messages: [
      {
        id: 'm15',
        role: 'user',
        content: 'How often are engineering laptops replaced?',
        time: '15:36',
        state: 'complete',
        citations: []
      },
      {
        id: 'm16',
        role: 'assistant',
        content: ANSWER_LIBRARY[5].text,
        time: '15:37',
        state: 'complete',
        citations: ['c8']
      }
    ]
  }
];

const SUGGESTIONS = [
  'How much parental leave am I entitled to?',
  'How does a contractor get VPN access?',
  'What is the limit on client dinners?'
];

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
    ChevronRight
  } = Icons;

  const [conversations, setConversations] = React.useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = React.useState('conv-1');
  const [historyQuery, setHistoryQuery] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [stream, setStream] = React.useState(null);
  const [panel, setPanel] = React.useState(null);
  const [downloadNote, setDownloadNote] = React.useState('');
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

  const speechSupported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

  const nextId = () => {
    idRef.current += 1;
    return 'id-' + idRef.current;
  };

  const nowTime = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  const nowIso = () => TODAY + 'T' + nowTime() + ':00Z';

  /* ---------- streaming ---------- */
  React.useEffect(() => {
    if (!stream) return undefined;
    if (stream.idx >= stream.words.length) {
      setConversations((cs) =>
        cs.map((c) =>
          c.id === stream.convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === stream.msgId ? { ...m, state: stream.finalState } : m
                )
              }
            : c
        )
      );
      setStream(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      const next = Math.min(stream.idx + 3, stream.words.length);
      const text = stream.words.slice(0, next).join(' ');
      setConversations((cs) =>
        cs.map((c) =>
          c.id === stream.convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === stream.msgId ? { ...m, content: text } : m
                )
              }
            : c
        )
      );
      setStream((s) => (s ? { ...s, idx: next } : null));
    }, 60);
    return () => clearTimeout(timer);
  }, [stream]);

  /* ---------- copy confirmation ---------- */
  React.useEffect(() => {
    if (!copiedId) return undefined;
    const t = setTimeout(() => setCopiedId(null), 2200);
    return () => clearTimeout(t);
  }, [copiedId]);

  React.useEffect(() => {
    if (!downloadNote) return undefined;
    const t = setTimeout(() => setDownloadNote(''), 3500);
    return () => clearTimeout(t);
  }, [downloadNote]);

  /* ---------- source panel: focus + escape ---------- */
  React.useEffect(() => {
    if (!panel) return undefined;
    if (panelCloseRef.current) panelCloseRef.current.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panel]);

  /* ---------- delete dialog: focus + escape ---------- */
  React.useEffect(() => {
    if (!confirmId) return undefined;
    if (confirmRef.current) confirmRef.current.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeConfirm();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmId]);

  /* ---------- stop speech on unmount ---------- */
  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const active = conversations.find((c) => c.id === activeId) || null;

  function retrieve(question) {
    const q = question.toLowerCase();
    const hit = ANSWER_LIBRARY.find((a) => a.keys.some((k) => q.includes(k)));
    if (!hit) return { found: false, text: NO_MATCH_TEXT, chunks: [] };
    return { found: true, text: hit.text, chunks: hit.chunks };
  }

  function handleAsk(e) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || stream) return;
    const result = retrieve(question);
    const userId = nextId();
    const msgId = nextId();
    const time = nowTime();
    const convId = activeId;
    setConversations((cs) =>
      cs.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: c.title || (question.length > 46 ? question.slice(0, 46) + '…' : question),
              updatedAt: nowIso(),
              messages: [
                ...c.messages,
                { id: userId, role: 'user', content: question, time, state: 'complete', citations: [] },
                {
                  id: msgId,
                  role: 'assistant',
                  content: '',
                  time,
                  state: 'streaming',
                  citations: result.chunks
                }
              ]
            }
          : c
      )
    );
    setStream({
      convId,
      msgId,
      words: result.text.split(' '),
      idx: 0,
      finalState: result.found ? 'complete' : 'none'
    });
    setDraft('');
  }

  function handleStop() {
    if (!stream) return;
    const s = stream;
    setConversations((cs) =>
      cs.map((c) =>
        c.id === s.convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === s.msgId
                  ? { ...m, state: m.content.trim() ? s.finalState : 'none', content: m.content || NO_MATCH_TEXT }
                  : m
              )
            }
          : c
      )
    );
    setStream(null);
  }

  function handleRegenerate(message) {
    if (stream || !active) return;
    const idx = active.messages.findIndex((m) => m.id === message.id);
    let question = '';
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (active.messages[i].role === 'user') {
        question = active.messages[i].content;
        break;
      }
    }
    if (!question) return;
    const result = retrieve(question);
    setConversations((cs) =>
      cs.map((c) =>
        c.id === active.id
          ? {
              ...c,
              updatedAt: nowIso(),
              messages: c.messages.map((m) =>
                m.id === message.id
                  ? { ...m, content: '', state: 'streaming', citations: result.chunks, time: nowTime() }
                  : m
              )
            }
          : c
      )
    );
    setStream({
      convId: active.id,
      msgId: message.id,
      words: result.text.split(' '),
      idx: 0,
      finalState: result.found ? 'complete' : 'none'
    });
  }

  function handleCopy(message) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
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
    if (stream) handleStop();
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
    } else {
      const id = nextId();
      setConversations((cs) => [
        { id, title: '', updatedAt: nowIso(), messages: [] },
        ...cs
      ]);
      setActiveId(id);
    }
    setHistoryOpen(false);
    if (composerRef.current) composerRef.current.focus();
  }

  function openPanel(chunkId, ordinal, el) {
    chipReturnRef.current = el;
    setPanel({ chunkId, ordinal });
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

  function deleteConversation() {
    const id = confirmId;
    if (!id) return;
    if (stream && stream.convId === id) setStream(null);
    setConversations((cs) => {
      const remaining = cs.filter((c) => c.id !== id);
      if (activeId === id) {
        const fresh = { id: 'id-' + (idRef.current += 1), title: '', updatedAt: nowIso(), messages: [] };
        setActiveId(fresh.id);
        return [fresh, ...remaining];
      }
      return remaining;
    });
    setConfirmId(null);
    if (composerRef.current) composerRef.current.focus();
  }

  /* ---------- history grouping ---------- */
  const term = historyQuery.trim().toLowerCase();
  const filtered = conversations
    .filter((c) => {
      if (!term) return true;
      const inTitle = (c.title || 'New conversation').toLowerCase().includes(term);
      const inBody = c.messages.some((m) => m.content.toLowerCase().includes(term));
      return inTitle || inBody;
    })
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  function dayLabel(iso) {
    const day = iso.slice(0, 10);
    if (day === TODAY) return 'Today';
    if (day === YESTERDAY) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC'
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
    'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14304F] focus-visible:ring-offset-white';

  const panelChunk = panel ? CHUNKS[panel.chunkId] : null;
  const confirmTarget = conversations.find((c) => c.id === confirmId) || null;

  return (
    <div
      className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8"
      style={{ fontFamily: brand.fontBody, color: '#1F2933' }}
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
            Ask a question in plain English. Answers are generated only from documents indexed in the
            shared knowledge base, and every answer carries numbered citations you can open.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('knowledge-base')}
            className={
              'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ' +
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
              'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 ' +
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
            'inline-flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 ' +
            focusRing
          }
        >
          <span>Conversation history ({conversations.length})</span>
          <ChevronDown
            className={'h-4 w-4 transition-transform ' + (historyOpen ? 'rotate-180' : '')}
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
            (historyOpen ? 'block ' : 'hidden ') +
            'lg:block rounded-xl border border-slate-200 bg-white'
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
                    'w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 ' +
                    focusRing
                  }
                />
              </div>
            </div>
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
                  onClick={() => setHistoryQuery('')}
                  className={
                    'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ' +
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
                          ? 'No messages yet'
                          : c.messages[c.messages.length - 1].content.slice(0, 64) ||
                            'Answer in progress…';
                      return (
                        <li key={c.id} className="group relative">
                          <div
                            className={
                              'flex items-stretch rounded-lg ' +
                              (isActive ? 'bg-[#EEF2F6]' : 'hover:bg-slate-50')
                            }
                          >
                            <button
                              type="button"
                              aria-current={isActive ? 'true' : undefined}
                              onClick={() => {
                                setActiveId(c.id);
                                setHistoryOpen(false);
                              }}
                              className={
                                'flex-1 rounded-lg px-3 py-2.5 text-left ' + focusRing
                              }
                            >
                              <span
                                className="block truncate text-sm font-medium"
                                style={{ color: isActive ? navy : '#334155' }}
                              >
                                {c.title || 'New conversation'}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {c.updatedAt.slice(11, 16)} · {preview}
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={'Delete conversation: ' + (c.title || 'New conversation')}
                              onClick={(e) => askConfirm(c.id, e.currentTarget)}
                              className={
                                'mr-1 self-center rounded-md p-2 text-slate-400 hover:bg-white hover:text-[#B3261E] ' +
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
              onClick={() => navigate('account')}
              className={'rounded text-xs font-medium text-slate-600 underline hover:text-slate-900 ' + focusRing}
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
                {active && active.title ? active.title : 'New conversation'}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {active && active.messages.length > 0
                  ? dayLabel(active.updatedAt) + ' at ' + active.updatedAt.slice(11, 16)
                  : 'Not started'}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: '#E8F3EE', color: '#1F6B4F' }}
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
                  Answers come from the 48 documents indexed in the knowledge base. If nothing in
                  them is relevant, the assistant will say so rather than guess.
                </p>
                <ul className="mt-5 flex flex-col items-stretch gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(s);
                          if (composerRef.current) composerRef.current.focus();
                        }}
                        className={
                          'flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-left text-sm text-slate-700 hover:border-slate-300 hover:bg-white ' +
                          focusRing
                        }
                      >
                        {s}
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ol className="space-y-6">
                {active.messages.map((m) => {
                  if (m.role === 'user') {
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
                  const isStreaming = m.state === 'streaming';
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

                        {m.state === 'error' ? (
                          <div className="mt-2 rounded-lg border border-[#E7C3BF] bg-[#FCF2F1] p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-[#8C1D18]">
                              <AlertCircle className="h-4 w-4" aria-hidden="true" />
                              Error · Gemini quota exhausted
                            </p>
                            <p className="mt-2 text-[15px] leading-7 text-[#5F2120]">{m.content}</p>
                          </div>
                        ) : m.state === 'none' ? (
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
                              Generating answer from {m.citations.length || 0} retrieved passages…
                            </span>
                            <button
                              type="button"
                              onClick={handleStop}
                              className={
                                'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ' +
                                focusRing
                              }
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Stop
                            </button>
                          </div>
                        )}

                        {m.state === 'complete' && m.citations.length > 0 && (
                          <div className="mt-4">
                            <p
                              id={'sources-' + m.id}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                              Sources ({m.citations.length})
                            </p>
                            <ul
                              aria-labelledby={'sources-' + m.id}
                              className="mt-2 flex flex-wrap gap-2"
                            >
                              {m.citations.map((cid, i) => {
                                const ch = CHUNKS[cid];
                                return (
                                  <li key={cid}>
                                    <button
                                      type="button"
                                      onClick={(e) => openPanel(cid, i + 1, e.currentTarget)}
                                      aria-label={
                                        'Source ' +
                                        (i + 1) +
                                        ': ' +
                                        ch.filename +
                                        ', ' +
                                        ch.page +
                                        '. Open the cited passage'
                                      }
                                      className={
                                        'inline-flex max-w-full items-center gap-2 rounded-full border border-slate-300 bg-white py-1.5 pl-1.5 pr-3 text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50 ' +
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
                                      <span className="truncate font-medium">{ch.filename}</span>
                                      <span className="text-slate-500">{ch.page}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {(m.state === 'complete' || m.state === 'none') && (
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(m)}
                              className={
                                'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 ' +
                                focusRing
                              }
                            >
                              {copiedId === m.id ? (
                                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {copiedId === m.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSpeak(m)}
                              disabled={!speechSupported}
                              aria-describedby={!speechSupported ? 'speech-unsupported' : undefined}
                              className={
                                'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent ' +
                                focusRing
                              }
                            >
                              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                              {speakingId === m.id ? 'Stop reading' : 'Read aloud'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerate(m)}
                              disabled={Boolean(stream)}
                              className={
                                'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 ' +
                                focusRing
                              }
                            >
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              Regenerate
                            </button>
                            {copiedId === m.id && (
                              <span role="status" className="text-xs font-medium" style={{ color: green }}>
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
              value={draft}
              disabled={Boolean(stream)}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk(e);
                }
              }}
              aria-describedby="composer-hint"
              className={
                'mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] leading-6 text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 ' +
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
                {stream && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className={
                      'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ' +
                      focusRing
                    }
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Stop
                  </button>
                )}
                <button
                  type="submit"
                  disabled={Boolean(stream) || draft.trim().length === 0}
                  className={
                    'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ' +
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

      {downloadNote && (
        <p role="status" className="mt-4 text-sm font-medium" style={{ color: green }}>
          {downloadNote}
        </p>
      )}

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
                  {panelChunk.filename}
                </h2>
              </div>
              <button
                type="button"
                ref={panelCloseRef}
                onClick={closePanel}
                aria-label="Close source panel"
                className={'rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 ' + focusRing}
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
                  <dd className="mt-1 text-slate-800">{panelChunk.page}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    File type
                  </dt>
                  <dd className="mt-1 text-slate-800">{panelChunk.file_type}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cosine similarity
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {panelChunk.score.toFixed(2)}{' '}
                    <span className="text-slate-500">(threshold 0.62)</span>
                  </dd>
                </div>
              </dl>

              <h3 className="mt-6 text-sm font-semibold text-slate-900">Cited passage</h3>
              <blockquote
                className="mt-2 rounded-lg border-l-4 bg-[#F8FAFC] px-4 py-3 text-[15px] leading-7 text-slate-800"
                style={{ borderColor: green }}
              >
                {panelChunk.text}
              </blockquote>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setDownloadNote('Download of ' + panelChunk.filename + ' has started.')}
                className={
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 ' +
                  focusRing
                }
                style={{ backgroundColor: navy }}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download original
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  navigate('knowledge-base');
                }}
                className={
                  'inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ' +
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
          <div className="absolute inset-0 bg-slate-900/40" onClick={closeConfirm} aria-hidden="true" />
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
              “{confirmTarget.title || 'New conversation'}” and its {confirmTarget.messages.length}{' '}
              messages will be permanently removed from your history. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                className={
                  'rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ' +
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
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 ' +
                  focusRing
                }
                style={{ backgroundColor: '#8C1D18' }}
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
