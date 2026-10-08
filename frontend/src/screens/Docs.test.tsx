import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Docs from "./Docs";

function renderScreen() {
  return render(
    <MemoryRouter>
      <Docs />
    </MemoryRouter>,
  );
}

describe("Docs screen", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-088: renders the Getting started guide with no API call made", async () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { name: /knowledge assistant documentation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /signing in/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /uploading documents/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /asking a question/i })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it("AC-090: tabs are keyboard navigable with arrow keys and move focus", async () => {
    const user = userEvent.setup();
    renderScreen();
    const guideTab = screen.getByRole("tab", { name: /getting started/i });
    const apiTab = screen.getByRole("tab", { name: /api reference/i });
    guideTab.focus();
    expect(guideTab).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(apiTab).toHaveFocus();
    expect(apiTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: /^api reference$/i }),
    ).toBeVisible();
  });

  it("AC-090: FAQ items expand and collapse on click", async () => {
    const user = userEvent.setup();
    renderScreen();
    const faqButton = screen.getByRole("button", {
      name: /incorrect email or password/i,
    });
    expect(faqButton).toHaveAttribute("aria-expanded", "false");
    await user.click(faqButton);
    expect(faqButton).toHaveAttribute("aria-expanded", "true");
  });

  it("AC-089: API reference documents every shipped endpoint with no chat/conversations endpoints invented", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("tab", { name: /api reference/i }));

    expect(screen.getByText("/auth/login")).toBeInTheDocument();
    expect(screen.getByText("/auth/config")).toBeInTheDocument();
    expect(screen.getByText("/auth/signup")).toBeInTheDocument();
    expect(screen.getByText("/auth/logout")).toBeInTheDocument();
    expect(screen.getByText("/auth/me")).toBeInTheDocument();
    expect(screen.getByText("/account/password")).toBeInTheDocument();
    expect(screen.getByText("/account/theme")).toBeInTheDocument();
    expect(screen.getAllByText("/documents").length).toBeGreaterThan(0);
    expect(screen.getByText("/documents/{id}/download")).toBeInTheDocument();
    expect(screen.getByText("/documents/{id}")).toBeInTheDocument();
    expect(screen.getAllByText("/users").length).toBeGreaterThan(0);
    expect(screen.getByText("/users/{id}")).toBeInTheDocument();

    // Not shipped by the backend this sprint -- must not be documented as live endpoints.
    expect(screen.queryByText("/chat/ask")).not.toBeInTheDocument();
    expect(screen.queryByText("/conversations")).not.toBeInTheDocument();
    expect(screen.queryByText("/documents/stream")).not.toBeInTheDocument();
  });

  it("AC-090: an endpoint entry expands to show its parameters and response", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("tab", { name: /api reference/i }));

    const loginButton = screen.getByRole("button", { name: /^POST\s*\/auth\/login/i });
    expect(loginButton).toHaveAttribute("aria-expanded", "false");
    await user.click(loginButton);
    expect(loginButton).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: /^POST\s*\/auth\/login/i });
    expect(region).toBeVisible();
    expect(region.textContent).toMatch(/example response/i);
  });

  it("AC-090: no knowledge base content or seeded user data appears on the page", () => {
    renderScreen();
    expect(screen.queryByText(/employee-handbook/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/travel-expenses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/it-security-policy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/satya\.ganaraju/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/marcus\.odell/i)).not.toBeInTheDocument();
  });

  it("filters endpoints by method", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("tab", { name: /api reference/i }));
    await user.click(screen.getByRole("button", { name: "DELETE" }));
    expect(screen.getByText(/showing 1 of/i)).toBeInTheDocument();
  });
});
