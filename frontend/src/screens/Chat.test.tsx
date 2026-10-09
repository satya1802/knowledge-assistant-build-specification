import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("AC-059/AC-060/AC-061: renders numbered chips, opens the panel with chunk text/doc/page and a real download link, and Escape returns focus to the chip", async () => {
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
    await askQuestion(user, "What is the leave policy?");

    ctrl.push(sseBlock("token", { token: "Answer text." }));
    ctrl.push(
      sseBlock("sources", {
        sources: [
          {
            id: "doc-1",
            filename: "Handbook.pdf",
            page: "Page 14",
            file_type: "PDF",
            score: 0.84,
            text: "Parental leave details.",
          },
          {
            id: "doc-2",
            filename: "Scanned-Policy.pdf",
            page: "Page 3",
            file_type: "PDF",
            score: 0.7,
            text: "OCR-extracted clause text.",
          },
        ],
      }),
    );
    ctrl.push(sseBlock("done", {}));
    ctrl.close();

    const chip1 = await screen.findByRole("button", { name: /source 1:.*handbook\.pdf/i });
    const chip2 = screen.getByRole("button", { name: /source 2:.*scanned-policy\.pdf/i });
    expect(chip1).toBeInTheDocument();
    expect(chip2).toBeInTheDocument();

    await user.click(chip2);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("OCR-extracted clause text.")).toBeInTheDocument();
    expect(within(dialog).getByText("Scanned-Policy.pdf")).toBeInTheDocument();
    expect(within(dialog).getByText("Page 3")).toBeInTheDocument();

    const downloadLink = within(dialog).getByRole("link", { name: /download original/i });
    expect(downloadLink).toHaveAttribute(
      "href",
      expect.stringContaining("/documents/doc-2/download"),
    );
    expect(downloadLink).toHaveAttribute("download");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(chip2).toHaveFocus();
  });

  it("AC-063/AC-064: no_match shows the backend's message, no source chips, and no general-knowledge answer", async () => {
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
    await askQuestion(user, "What is the meaning of life?");

    const noMatchMessage = "No relevant documents were found for this question.";
    ctrl.push(sseBlock("no_match", { message: noMatchMessage }));
    ctrl.push(sseBlock("done", {}));
    ctrl.close();

    await waitFor(() => expect(screen.getByText(noMatchMessage)).toBeInTheDocument());
    expect(screen.queryByText(/sources \(/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /source 1:/i })).not.toBeInTheDocument();
  });

  it("AC-066: Copy places the completed answer on the clipboard and shows a short confirmation", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
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
    await askQuestion(user, "What is the dress code?");

    ctrl.push(sseBlock("token", { token: "Business casual is expected." }));
    ctrl.push(sseBlock("done", {}));
    ctrl.close();

    await waitFor(() =>
      expect(screen.getByText("Business casual is expected.")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /^copy$/i }));

    expect(writeText).toHaveBeenCalledWith("Business casual is expected.");
    expect(await screen.findByText(/answer copied to clipboard/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
  });

  it("AC-067: Read aloud speaks the answer with the browser's speech synthesis and the control toggles to stop playback", async () => {
    const user = userEvent.setup();
    const speak = vi.fn();
    const cancel = vi.fn();
    class FakeUtterance {
      text: string;
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal("speechSynthesis", { speak, cancel });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);

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
    await askQuestion(user, "What is the dress code?");

    ctrl.push(sseBlock("token", { token: "Business casual is expected." }));
    ctrl.push(sseBlock("done", {}));
    ctrl.close();

    await waitFor(() =>
      expect(screen.getByText("Business casual is expected.")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /^read aloud$/i }));

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe("Business casual is expected.");
    expect(await screen.findByRole("button", { name: /^stop reading$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^stop reading$/i }));

    expect(cancel).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: /^read aloud$/i })).toBeInTheDocument();
  });

  it("AC-068: Read aloud is disabled with an explanation when the browser has no speech synthesis support", async () => {
    const user = userEvent.setup();
    // No `vi.stubGlobal("speechSynthesis", ...)` here: jsdom has no Web Speech
    // API by default, which is exactly the condition this criterion covers.
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
    await askQuestion(user, "What is the dress code?");

    ctrl.push(sseBlock("token", { token: "Business casual is expected." }));
    ctrl.push(sseBlock("done", {}));
    ctrl.close();

    await waitFor(() =>
      expect(screen.getByText("Business casual is expected.")).toBeInTheDocument(),
    );

    const readAloudButton = screen.getByRole("button", { name: /^read aloud$/i });
    expect(readAloudButton).toBeDisabled();
    expect(
      screen.getByText(
        /read aloud is unavailable because this browser has no speech synthesis support/i,
      ),
    ).toBeInTheDocument();
  });

  it("AC-069: Regenerate re-runs retrieval and generation for the same question and the new streamed answer, with its own source chips, replaces the previous one", async () => {
    const user = userEvent.setup();
    const ctrl1 = createControllableStream();
    const ctrl2 = createControllableStream();
    const bodies: unknown[] = [];
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      const stream = bodies.length === 1 ? ctrl1.stream : ctrl2.stream;
      return Promise.resolve({
        ok: true,
        status: 200,
        body: stream,
        clone: () => ({ json: async () => ({}) }),
      } as Response);
    });

    renderScreen();
    await askQuestion(user, "What is the leave policy?");

    ctrl1.push(sseBlock("token", { token: "First answer." }));
    ctrl1.push(
      sseBlock("sources", {
        sources: [
          {
            id: "doc-a",
            filename: "DocA.pdf",
            page: "Page 1",
            file_type: "PDF",
            score: 0.9,
            text: "A",
          },
        ],
      }),
    );
    ctrl1.push(sseBlock("done", {}));
    ctrl1.close();

    await waitFor(() => expect(screen.getByText("First answer.")).toBeInTheDocument());
    expect(await screen.findByText("DocA.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual({ question: "What is the leave policy?" });
    // The regenerated turn is in flight: the old answer and its chips are
    // already gone from the one assistant message, replaced by the
    // streaming indicator, not appended as a second turn.
    expect(screen.queryByText("First answer.")).not.toBeInTheDocument();
    expect(screen.getByText(/generating answer/i)).toBeInTheDocument();

    ctrl2.push(sseBlock("token", { token: "Second answer." }));
    ctrl2.push(
      sseBlock("sources", {
        sources: [
          {
            id: "doc-b",
            filename: "DocB.pdf",
            page: "Page 2",
            file_type: "PDF",
            score: 0.75,
            text: "B",
          },
        ],
      }),
    );
    ctrl2.push(sseBlock("done", {}));
    ctrl2.close();

    await waitFor(() => expect(screen.getByText("Second answer.")).toBeInTheDocument());
    expect(await screen.findByText("DocB.pdf")).toBeInTheDocument();
    expect(screen.queryByText("First answer.")).not.toBeInTheDocument();
    expect(screen.queryByText("DocA.pdf")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Knowledge Assistant ·/i)).toHaveLength(1);
  });

  it("starts with no seeded conversations, chunks or answers on screen", () => {
    renderScreen();
    expect(screen.queryByText(/employee-handbook-2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/parental leave entitlement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vpn access for contractors/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ask your first question/i })).toBeInTheDocument();
  });
});
