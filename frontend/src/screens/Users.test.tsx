import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import Users from "./Users";

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

function renderUsers() {
  return render(
    <MemoryRouter>
      <Users />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: ADMIN,
    setUser: vi.fn(),
    refresh: vi.fn(),
    signOut: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Users screen", () => {
  it("shows a loading state while GET /users is in flight", async () => {
    let resolve: (value: unknown) => void = () => {};
    mockApiFetch.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderUsers();
    expect(screen.getByText(/loading accounts/i)).toBeInTheDocument();
    resolve([ADMIN]);
    await waitFor(() => expect(screen.queryByText(/loading accounts/i)).not.toBeInTheDocument());
  });

  it("shows an error state when GET /users fails, with a retry", async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError("Server unavailable", 500));
    renderUsers();
    await waitFor(() => expect(screen.getByText("Server unavailable")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an empty state when GET /users returns no accounts", async () => {
    mockApiFetch.mockResolvedValueOnce([]);
    renderUsers();
    await waitFor(() => expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument());
  });

  it("renders only accounts returned by GET /users, no seeded data", async () => {
    mockApiFetch.mockResolvedValueOnce([ADMIN, EMPLOYEE]);
    renderUsers();
    await waitFor(() => expect(screen.getByText(ADMIN.email)).toBeInTheDocument());
    expect(screen.getByText(EMPLOYEE.email)).toBeInTheDocument();
    expect(screen.queryByText("alice.berensen@quorq.ai")).not.toBeInTheDocument();
  });

  it("AC-017: posts email and password to POST /users and adds the created account with no reload", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce([ADMIN]);
    renderUsers();
    await waitFor(() => expect(screen.getByText(ADMIN.email)).toBeInTheDocument());

    const created = { id: 3, email: "new.person@quorq.ai", role: "employee", is_enabled: true };
    mockApiFetch.mockResolvedValueOnce(created);

    await user.click(screen.getByRole("button", { name: /add user/i }));
    await user.type(screen.getByLabelText(/work email/i), created.email);
    await user.type(screen.getByLabelText(/initial password/i), "a-long-enough-password");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText(created.email)).toBeInTheDocument());
    const call = mockApiFetch.mock.calls.find(
      ([path, init]) => path === "/users" && (init as RequestInit | undefined)?.method === "POST",
    );
    expect(call?.[1]).toMatchObject({ method: "POST" });
    const body = JSON.parse((call?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({ email: created.email, password: "a-long-enough-password" });
  });

  it("AC-017: shows the server's error when POST /users fails", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce([ADMIN]);
    renderUsers();
    await waitFor(() => expect(screen.getByText(ADMIN.email)).toBeInTheDocument());

    mockApiFetch.mockRejectedValueOnce(new ApiError("An account already exists", 400));

    await user.click(screen.getByRole("button", { name: /add user/i }));
    await user.type(screen.getByLabelText(/work email/i), "dup@quorq.ai");
    await user.type(screen.getByLabelText(/initial password/i), "a-long-enough-password");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText("An account already exists")).toBeInTheDocument());
  });

  it("AC-018: Make admin calls PATCH /users/{id} and updates the row from the response", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce([ADMIN, EMPLOYEE]);
    renderUsers();
    await waitFor(() => expect(screen.getByText(EMPLOYEE.email)).toBeInTheDocument());

    const updated = { ...EMPLOYEE, role: "admin" };
    mockApiFetch.mockResolvedValueOnce(updated);

    await user.click(screen.getByRole("button", { name: `Actions for ${"Marcus Odell"}` }));
    await user.click(screen.getByRole("menuitem", { name: /make admin/i }));

    await waitFor(() => {
      const call = mockApiFetch.mock.calls.find(([path]) => path === `/users/${EMPLOYEE.id}`);
      expect(call?.[1]).toMatchObject({ method: "PATCH" });
      const body = JSON.parse((call?.[1] as RequestInit).body as string);
      expect(body).toEqual({ role: "admin" });
    });
  });

  it("AC-019: Disable account calls PATCH with is_enabled=false and shows disabled state", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce([ADMIN, EMPLOYEE]);
    renderUsers();
    await waitFor(() => expect(screen.getByText(EMPLOYEE.email)).toBeInTheDocument());

    const updated = { ...EMPLOYEE, is_enabled: false };
    mockApiFetch.mockResolvedValueOnce(updated);

    await user.click(screen.getByRole("button", { name: `Actions for Marcus Odell` }));
    await user.click(screen.getByRole("menuitem", { name: /disable account/i }));

    await waitFor(() => {
      const call = mockApiFetch.mock.calls.find(([path]) => path === `/users/${EMPLOYEE.id}`);
      const body = JSON.parse((call?.[1] as RequestInit).body as string);
      expect(body).toEqual({ is_enabled: false });
    });
    await waitFor(() => expect(screen.getAllByText("Disabled").length).toBeGreaterThan(0));
  });

  it("AC-020: Reset password calls PATCH with the new password and confirms the lock is cleared", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce([ADMIN, EMPLOYEE]);
    renderUsers();
    await waitFor(() => expect(screen.getByText(EMPLOYEE.email)).toBeInTheDocument());

    const updated = { ...EMPLOYEE };
    mockApiFetch.mockResolvedValueOnce(updated);

    await user.click(screen.getByRole("button", { name: `Actions for Marcus Odell` }));
    await user.click(screen.getByRole("menuitem", { name: /reset password/i }));
    await user.type(screen.getByLabelText(/^new password$/i), "another-long-password");
    await user.type(screen.getByLabelText(/confirm new password/i), "another-long-password");
    await user.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => {
      const call = mockApiFetch.mock.calls.find(([path]) => path === `/users/${EMPLOYEE.id}`);
      const body = JSON.parse((call?.[1] as RequestInit).body as string);
      expect(body).toEqual({ password: "another-long-password" });
    });
    await waitFor(() =>
      expect(screen.getByText(/any sign-in lock has been cleared/i)).toBeInTheDocument(),
    );
  });

  it("AC-021: redirects a non-admin employee away from /users", async () => {
    mockUseAuth.mockReturnValue({
      user: EMPLOYEE,
      setUser: vi.fn(),
      refresh: vi.fn(),
      signOut: vi.fn(),
    });
    mockApiFetch.mockResolvedValueOnce([]);
    renderUsers();
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Users" })).not.toBeInTheDocument(),
    );
  });
});
