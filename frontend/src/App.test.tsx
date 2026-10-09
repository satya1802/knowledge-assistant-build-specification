import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders without crashing and shows the first screen's nav link", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("AC-086: the mobile nav toggle exposes aria-expanded/aria-controls and opens the sidebar", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    const toggle = screen.getByRole("button", { name: "Open navigation menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "app-sidebar");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("AC-086: Escape closes the open mobile nav and returns focus to the toggle", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    const toggle = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(toggle);
    const closeToggle = screen.getByRole("button", { name: "Close navigation menu" });
    expect(closeToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });

    const reopenToggle = screen.getByRole("button", { name: "Open navigation menu" });
    expect(reopenToggle).toHaveAttribute("aria-expanded", "false");
    expect(reopenToggle).toHaveFocus();
  });
});
