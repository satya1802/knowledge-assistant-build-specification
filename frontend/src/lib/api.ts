/// <reference types="vite/client" />
// Without the reference above, `import.meta.env` is not typed and `tsc --noEmit` fails --
// which `vite build` does not catch, because it tree-shakes this module out when no screen
// imports it yet.
//
// Where the generated API lives.
//
// Set at build time: the platform bakes the deployed API URL into the frontend build. The
// fallback is the local backend so a bare `npm run dev` still points somewhere real.
//
// The generated screens do NOT use this yet -- they render seeded sample data, exactly as
// they were approved. This is the seam to replace that with real calls, one screen at a
// time.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Thrown by apiFetch for any non-2xx response. `message` is the server's own
 * error detail when the response body provided one, so screens can show the
 * exact text the backend chose rather than a generic client-side guess. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered once by the auth provider so a 401 from anywhere -- not just
 * the screen that happens to be mounted -- clears client auth state and
 * sends the user back to Sign in. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Session-cookie auth: every call sends credentials so the HTTP-only cookie the
  // backend sets on login round-trips on subsequent requests, including across
  // plain http on localhost in Safari and Chrome. Callers may override via init.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = `${init?.method ?? "GET"} ${path} failed: ${response.status}`;
    try {
      const body = await response.clone().json();
      if (body && typeof body.detail === "string" && body.detail.trim()) {
        detail = body.detail;
      }
    } catch {
      // No JSON body (or not valid JSON) -- keep the generic message.
    }
    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new ApiError(detail, response.status);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export type ConversationSource = {
  document_id: string;
  filename: string;
  page?: number | null;
  text: string;
};

export type ConversationMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  sources: ConversationSource[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
};

/** GET /conversations[?q=]: the signed-in user's own conversations, newest
 * first, optionally filtered server-side by title/message text. */
export function listConversations(q?: string): Promise<ConversationSummary[]> {
  const trimmed = q?.trim();
  const query = trimmed ? `?q=${encodeURIComponent(trimmed)}` : "";
  return apiFetch<ConversationSummary[]>(`/conversations${query}`);
}

/** GET /conversations/{id}: the full exchange, including every message's
 * citations. */
export function getConversation(id: string): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(`/conversations/${id}`);
}

/** DELETE /conversations/{id}. */
export function deleteConversationRequest(id: string): Promise<void> {
  return apiFetch<void>(`/conversations/${id}`, { method: "DELETE" });
}

export type ChatStreamHandlers = {
  onToken?: (token: string) => void;
  onSources?: (sources: unknown) => void;
  /** Dispatched for the `no_match` SSE event: no chunk cleared the
   * retrieval threshold, so the backend never asked the model to answer.
   * `message` is the backend's own no-match copy, verbatim. */
  onNoMatch?: (message: string) => void;
  onPing?: () => void;
  onError?: (error: { code?: string; message?: string }) => void;
  onDone?: (data: { message_id?: string; conversation_id?: string; partial?: boolean }) => void;
};

/** Streams a POST response as Server-Sent Events using fetch + ReadableStream
 * (not EventSource, since the request needs a JSON body). Parses `event:`/`data:`
 * blocks separated by a blank line and dispatches each to the matching handler
 * by event name -- token, sources, ping, error, done. Pass an AbortController's
 * signal so a caller (e.g. a Stop button) can end the request immediately
 * without waiting for the server to close the stream. */
export async function postEventStream(
  path: string,
  body: unknown,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    let detail = `POST ${path} failed: ${response.status}`;
    try {
      const data = await response.clone().json();
      if (data && typeof data.detail === "string" && data.detail.trim()) detail = data.detail;
    } catch {
      // No JSON body (or not valid JSON) -- keep the generic message.
    }
    throw new ApiError(detail, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (eventName: string, dataStr: string) => {
    let data: unknown;
    if (dataStr) {
      try {
        data = JSON.parse(dataStr);
      } catch {
        data = dataStr;
      }
    }
    switch (eventName) {
      case "token":
        handlers.onToken?.(
          typeof data === "string" ? data : ((data as { token?: string } | undefined)?.token ?? ""),
        );
        break;
      case "sources":
        handlers.onSources?.((data as { sources?: unknown } | undefined)?.sources ?? data);
        break;
      case "no_match":
        handlers.onNoMatch?.(
          typeof data === "string"
            ? data
            : ((data as { message?: string } | undefined)?.message ?? ""),
        );
        break;
      case "ping":
        handlers.onPing?.();
        break;
      case "error":
        handlers.onError?.((data as { code?: string; message?: string } | undefined) ?? {});
        break;
      case "done":
        handlers.onDone?.(
          (data as { message_id?: string; conversation_id?: string; partial?: boolean } | undefined) ??
            {},
        );
        break;
      default:
        break;
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      if (!block.trim()) continue;
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      dispatch(eventName, dataLines.join("\n"));
    }
  }
}
