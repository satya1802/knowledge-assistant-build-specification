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
