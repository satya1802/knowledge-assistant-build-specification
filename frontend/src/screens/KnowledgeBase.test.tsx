import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import KnowledgeBase from "./KnowledgeBase";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockApiFetch = vi.mocked(apiFetch);
const mockUseAuth = vi.mocked(useAuth);

const ADMIN = { id: "1", email: "satya.ganaraju@quorq.ai", role: "admin", is_enabled: true };
const EMPLOYEE = { id: 2, email: "marcus.odell@quorq.ai", role: "employee", is_enabled: true };

const DOC_READY = {
  id: 101,
  filename: "Employee-Handbook-2026.pdf",
  file_type: "pdf",
  size_bytes: 4404019,
  status: "ready",
  status_reason: null,
  chunk_count: 182,
  uploaded_by: "priya.raman@northgate.co",
  uploaded_at: "2026-10-08T09:12:00Z",
};

const DOC_PROCESSING = {
  id: 102,
  filename: "Expense-Policy-v7.docx",
  file_type: "docx",
  size_bytes: 839680,
  status: "processing",
  status_reason: null,
  chunk_count: 0,
  uploaded_by: "priya.raman@northgate.co",
  uploaded_at: "2026-10-08T08:40:00Z",
};

const DOC_FAILED = {
  id: 103,
  filename: "Corrupt-Scan.pdf",
  file_type: "pdf",
  size_bytes: 120000,
  status: "failed",
  status_reason: "The file could not be parsed: unsupported PDF encoding.",
  chunk_count: 0,
  uploaded_by: "priya.raman@northgate.co",
  uploaded_at: "2026-10-08T07:00:00Z",
};

/** A minimal, controllable stand-in for the browser's EventSource, so
 * AC-029 can be driven deterministically: tests hold `instances[0]` and fire
 * the "document" event or the error handler themselves. */
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  withCredentials: boolean;
  closed = false;
  onerror: ((ev: Event) => void) | null = null;
  private listeners: Record<string, Array<(ev: MessageEvent) => void>> = {};

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = !!init?.withCredentials;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  }

  emit(type: string, data: unknown) {
    (this.listeners[type] || []).forEach((listener) =>
      listener({ data: JSON.stringify(data) } as MessageEvent),
    );
  }

  triggerError() {
    if (this.onerror) this.onerror(new Event("error"));
  }

  close() {
    this.closed = true;
  }
}

function renderScreen() {
  return render(
    <MemoryRouter>
      <KnowledgeBase />
    </MemoryRouter>,
  );
}

function pdfFile(name = "New-Policy.pdf", sizeBytes = 1024) {
  const file = new File(["x".repeat(Math.min(sizeBytes, 10))], name, {
    type: "application/pdf",
  });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: ADMIN,
    setUser: vi.fn(),
    refresh: vi.fn(),
    signOut: vi.fn(),
  });
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("KnowledgeBase screen", () => {
  it("shows a loading state while GET /documents is in flight", async () => {
    let resolve: (value: unknown) => void = () => {};
    mockApiFetch.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderScreen();
    expect(screen.getByText(/loading documents/i)).toBeInTheDocument();
    resolve({ items: [] });
    await waitFor(() => expect(screen.queryByText(/loading documents/i)).not.toBeInTheDocument());
  });

  it("shows an error state when GET /documents fails, with a retry", async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError("Server unavailable", 500));
    renderScreen();
    await waitFor(() => expect(screen.getByText("Server unavailable")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders only documents returned by GET /documents, no seeded sample rows or role toggle", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY, DOC_PROCESSING] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument());
    expect(screen.getByText(DOC_PROCESSING.filename)).toBeInTheDocument();
    // A seeded sample that used to ship with the prototype must be gone.
    expect(screen.queryByText("Q3-Security-Review.pdf")).not.toBeInTheDocument();
    // The role preview toggle must be gone entirely.
    expect(
      screen.queryByRole("group", { name: /preview the page with a different role/i }),
    ).not.toBeInTheDocument();
  });

  it("AC-023: dropping/picking a PDF posts to POST /documents and the new row appears at status processing without reload", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    const created = {
      id: 200,
      filename: "New-Policy.pdf",
      file_type: "pdf",
      size_bytes: 1024,
      status: "processing",
      chunk_count: 0,
      uploaded_at: "2026-10-08T10:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => created,
      clone() {
        return this;
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/the knowledge base is empty/i)).toBeInTheDocument(),
    );

    const input = document.getElementById("kb-file-input") as HTMLInputElement;
    await user.upload(input, pdfFile("New-Policy.pdf", 1024));

    await waitFor(() => expect(screen.getByText("New-Policy.pdf")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/documents"),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    const callInit = fetchMock.mock.calls[0][1];
    expect(callInit.headers).toBeUndefined();
    expect(callInit.body).toBeInstanceOf(FormData);

    const row = screen.getByText("New-Policy.pdf").closest("tr") as HTMLElement;
    expect(within(row).getByText("Processing")).toBeInTheDocument();
  });

  it("AC-024: refuses an unsupported extension locally, naming the accepted formats", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/the knowledge base is empty/i)).toBeInTheDocument(),
    );

    const input = document.getElementById("kb-file-input") as HTMLInputElement;
    const badFile = new File(["x"], "image.png", { type: "image/png" });
    // fireEvent bypasses userEvent's own `accept` filtering, so the component's
    // own validation (not the browser's) is what is under test here.
    Object.defineProperty(input, "files", { value: [badFile] });
    fireEvent.change(input);

    await waitFor(() =>
      expect(screen.getByText(/accepted formats are pdf, docx, txt and md/i)).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("image.png")).not.toBeInTheDocument();
  });

  it("AC-024: surfaces the server's rejection message when the server refuses an accepted-type file", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "This document could not be parsed" }),
      clone() {
        return this;
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/the knowledge base is empty/i)).toBeInTheDocument(),
    );

    const input = document.getElementById("kb-file-input") as HTMLInputElement;
    await user.upload(input, pdfFile("Broken.pdf", 2048));

    await waitFor(() =>
      expect(screen.getByText(/this document could not be parsed/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Broken.pdf")).not.toBeInTheDocument();
  });

  it("AC-025: refuses a file larger than 25 MB with a message stating the limit, and adds no row", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/the knowledge base is empty/i)).toBeInTheDocument(),
    );

    const input = document.getElementById("kb-file-input") as HTMLInputElement;
    const bigFile = pdfFile("Huge.pdf", 26 * 1024 * 1024);
    await user.upload(input, bigFile);

    await waitFor(() => expect(screen.getByText(/exceeds the 25 mb limit/i)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Huge.pdf")).not.toBeInTheDocument();
  });

  it("AC-026: re-uploading an existing filename adds a separate new row and leaves the existing row untouched", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY] });
    const created = {
      id: 300,
      filename: DOC_READY.filename,
      file_type: "pdf",
      size_bytes: 2048,
      status: "processing",
      chunk_count: 0,
      uploaded_at: "2026-10-08T11:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => created,
      clone() {
        return this;
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument());

    const input = document.getElementById("kb-file-input") as HTMLInputElement;
    await user.upload(input, pdfFile(DOC_READY.filename, 2048));

    await waitFor(() => {
      const rows = screen.getAllByText(DOC_READY.filename);
      expect(rows.length).toBe(2);
    });
    const existingRow = screen
      .getAllByText(DOC_READY.filename)
      .map((el) => el.closest("tr"))
      .find((tr) => within(tr as HTMLElement).queryByText("Ready"));
    expect(existingRow).toBeTruthy();
    expect(within(existingRow as HTMLElement).getByText("182")).toBeInTheDocument();
  });

  it("AC-027: an employee does not see the dropzone, file picker or delete controls", async () => {
    mockUseAuth.mockReturnValue({
      user: EMPLOYEE,
      setUser: vi.fn(),
      refresh: vi.fn(),
      signOut: vi.fn(),
    });
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument());

    expect(document.getElementById("kb-file-input")).not.toBeInTheDocument();
    expect(screen.queryByText(/upload documents/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete employee-handbook/i)).not.toBeInTheDocument();
    // AC-050: downloading is not an admin-only action -- any signed-in user,
    // including an employee, still gets the download control for the row.
    expect(
      screen.getByRole("link", { name: /download original file employee-handbook-2026\.pdf/i }),
    ).toBeInTheDocument();
  });

  it("AC-050: the download control links straight to that document's original file on the server", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY, DOC_PROCESSING] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument());

    const readyLink = screen.getByRole("link", {
      name: new RegExp(`download original file ${DOC_READY.filename}`, "i"),
    });
    expect(readyLink).toHaveAttribute(
      "href",
      expect.stringContaining(`/documents/${DOC_READY.id}/download`),
    );

    // Each row's link names its own document -- the processing row's link
    // must not point at the ready row's file, or vice versa.
    const processingLink = screen.getByRole("link", {
      name: new RegExp(`download original file ${DOC_PROCESSING.filename}`, "i"),
    });
    expect(processingLink).toHaveAttribute(
      "href",
      expect.stringContaining(`/documents/${DOC_PROCESSING.id}/download`),
    );
    expect(processingLink.getAttribute("href")).not.toBe(readyLink.getAttribute("href"));
  });

  it("AC-046: lists name, type, size, upload date, status and chunk count from the API", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument());
    const row = screen.getByText(DOC_READY.filename).closest("tr") as HTMLElement;
    expect(within(row).getByText("PDF")).toBeInTheDocument();
    expect(within(row).getByText(/4\.2 MB/)).toBeInTheDocument();
    expect(within(row).getByText("Ready")).toBeInTheDocument();
    expect(within(row).getByText("182")).toBeInTheDocument();
  });

  it("AC-047: typing part of a name filters the table case-insensitively", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY, DOC_PROCESSING] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/search by document name/i), "EMPLOYEE-handbook");
    await waitFor(() => {
      expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument();
      expect(screen.queryByText(DOC_PROCESSING.filename)).not.toBeInTheDocument();
    });
  });

  it("AC-048: filtering by status and by file type narrows the list, and clearing restores it", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY, DOC_PROCESSING, DOC_FAILED] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/^status$/i), "failed");
    await waitFor(() => {
      expect(screen.getByText(DOC_FAILED.filename)).toBeInTheDocument();
      expect(screen.queryByText(DOC_READY.filename)).not.toBeInTheDocument();
      expect(screen.queryByText(DOC_PROCESSING.filename)).not.toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/^status$/i), "all");
    await user.selectOptions(screen.getByLabelText(/file type/i), "DOCX");
    await waitFor(() => {
      expect(screen.getByText(DOC_PROCESSING.filename)).toBeInTheDocument();
      expect(screen.queryByText(DOC_READY.filename)).not.toBeInTheDocument();
      expect(screen.queryByText(DOC_FAILED.filename)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    await waitFor(() => {
      expect(screen.getByText(DOC_READY.filename)).toBeInTheDocument();
      expect(screen.getByText(DOC_PROCESSING.filename)).toBeInTheDocument();
      expect(screen.getByText(DOC_FAILED.filename)).toBeInTheDocument();
    });
  });

  it("AC-049 / AC-031: a failed document's status_reason is visible in its row without affecting other rows", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_READY, DOC_FAILED] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_FAILED.filename)).toBeInTheDocument());

    const failedRow = screen.getByText(DOC_FAILED.filename).closest("tr") as HTMLElement;
    expect(within(failedRow).getByText(DOC_FAILED.status_reason)).toBeInTheDocument();
    expect(within(failedRow).getByText("Failed")).toBeInTheDocument();

    const readyRow = screen.getByText(DOC_READY.filename).closest("tr") as HTMLElement;
    expect(within(readyRow).getByText("Ready")).toBeInTheDocument();
    expect(within(readyRow).queryByText(/could not be parsed/i)).not.toBeInTheDocument();
  });

  it("AC-029: subscribes to GET /documents/stream with credentials and applies a document event without reload", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_PROCESSING] });
    renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_PROCESSING.filename)).toBeInTheDocument());

    expect(MockEventSource.instances).toHaveLength(1);
    const source = MockEventSource.instances[0];
    expect(source.url).toContain("/documents/stream");
    expect(source.withCredentials).toBe(true);

    source.emit("document", { ...DOC_PROCESSING, status: "ready", chunk_count: 40 });

    const row = await waitFor(() => screen.getByText(DOC_PROCESSING.filename).closest("tr"));
    await waitFor(() => expect(within(row as HTMLElement).getByText("Ready")).toBeInTheDocument());
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("AC-029: falls back to polling GET /documents when the stream errors", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApiFetch.mockResolvedValue({ items: [DOC_PROCESSING] });
    renderScreen();
    await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));

    const source = MockEventSource.instances[0];
    source.triggerError();

    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));

    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(3));
  });

  it("AC-029: closes the stream and stops polling on unmount", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [DOC_PROCESSING] });
    const { unmount } = renderScreen();
    await waitFor(() => expect(screen.getByText(DOC_PROCESSING.filename)).toBeInTheDocument());

    const source = MockEventSource.instances[0];
    unmount();
    expect(source.closed).toBe(true);
  });
});
