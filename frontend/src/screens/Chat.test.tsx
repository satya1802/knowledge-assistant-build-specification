import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Chat from "./Chat";

function renderScreen() {
  return render(
    <MemoryRouter>
      <Chat />
    </MemoryRouter>,
  );
}

/** A ReadableStream the test can push SSE blocks into on demand, so a test
 * can assert on UI state mid-stream (e.g. clicking Stop after one token). */
function createControllableStream() {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
  });
  const encoder = new TextEncoder();
  return {
    stream,
    push(block: string) {
      controllerRef!.enqueue(encoder.encode(block));
    },
    close() {
      controllerRef!.close();
    },
  };
}

function sseBlock(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function askQuestion(user: ReturnType<typeof userEvent.setup>, question: string) {
  const textarea = screen.getByLabelText(/ask a question about your documents/i);
  await user.type(textarea, question);
  await user.click(screen.getByRole("button", { name: /send question/i }));
}

describe("Chat screen", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-055/AC-057: posts to /chat/ask, shows a streaming indicator immediately, then renders tokens and sources from the server", async () => {
    const user = userEvent.setup();
    const ctrl = createControllableStream();
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      expect(url).toContain("/chat/ask");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ question: "What is the leave policy?" });
      return Promise.resolve({
        ok: true,
        status: 200,
        body: ctrl.stream,
        clone: () => ({ json: async () => ({}) }),
      } as Response);
    });

    renderScreen();
    await askQuestion(user, "What is the leave policy?");

    // Streaming indicator appears immediately, before any token has arrived.
    expect(await screen.findByText(/generating answer/i)).toBeInTheDocument();

    ctrl.push(sseBlock("ping", {}));
    ctrl.push(sseBlock("token", { token: "Employees get " }));
    ctrl.push(sseBlock("token", { token: "26 weeks of leave." }));
    ctrl.push(
      sseBlock("sources", {
        sources: [
          {
            id: "s1",
            filename: "Handbook.pdf",
            page: "Page 14",
            file_type: "PDF",
            score: 0.84,
            text: "Parental leave details.",
          },
        ],
      }),
    );
    ctrl.push(sseBlock("done", {}));
    ctrl.close();

    await waitFor(() =>
      expect(screen.getByText("Employees get 26 weeks of leave.")).toBeInTheDocument(),
    );
    expect(await screen.findByText("Handbook.pdf")).toBeInTheDocument();
    expect(screen.queryByText(/generating answer/i)).not.toBeInTheDocument();
  });

  it("AC-058: Stop aborts immediately, keeps the partial answer, clears streaming state and re-enables the composer", async () => {
    const user = userEvent.setup();
    const ctrl = createControllableStream();
    const abortedSignals: AbortSignal[] = [];
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      if (init.signal) abortedSignals.push(init.signal as AbortSignal);
      return Promise.resolve({
        ok: true,
        status: 200,
        body: ctrl.stream,
        clone: () => ({ json: async () => ({}) }),
      } as Response);
    });

    renderScreen();
    await askQuestion(user, "What is the VPN policy?");

    ctrl.push(sseBlock("token", { token: "Contractors need a VPN form." }));
    await waitFor(() =>
      expect(screen.getByText("Contractors need a VPN form.")).toBeInTheDocument(),
    );

    const stopButtons = screen.getAllByRole("button", { name: "Stop" });
    await user.click(stopButtons[stopButtons.length - 1]);

    expect(abortedSignals[0].aborted).toBe(true);
    expect(screen.getByText("Contractors need a VPN form.")).toBeInTheDocument();
    expect(screen.queryByText(/generating answer/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/ask a question about your documents/i)).not.toBeDisabled();
  });

  it("AC-094/AC-097: an error event with code quota_exhausted renders the server's own text with no upgrade/pay/billing copy, and re-enables input", async () => {
    const user = userEvent.setup();
    const ctrl = createControllableStream();
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        body: ctrl.stream,
        clone: () => ({ json: async () => ({}) }),
      } as Response),
    );

    renderScreen();
    await askQuestion(user, "Are we switching pension providers?");

    const quotaMessage =
      "The AI service quota for this organisation has been used up, so no answer could be generated. Nothing was lost — your question is still in this conversation and you can send it again once quota is available.";
    ctrl.push(sseBlock("error", { code: "quota_exhausted", message: quotaMessage }));
    ctrl.close();

    await waitFor(() => expect(screen.getByText(quotaMessage)).toBeInTheDocument());
    expect(screen.getByLabelText(/ask a question about your documents/i)).not.toBeDisabled();
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/billing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bpay\b/i)).not.toBeInTheDocument();
  });

  it("starts with no seeded conversations, chunks or answers on screen", () => {
    renderScreen();
    expect(screen.queryByText(/employee-handbook-2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/parental leave entitlement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vpn access for contractors/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ask your first question/i })).toBeInTheDocument();
  });
});
