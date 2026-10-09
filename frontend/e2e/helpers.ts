import { Page, expect } from "@playwright/test";

/**
 * Creates a brand-new account through the real sign-up flow and lands on
 * Chat, authenticated by the HTTP-only session cookie the backend set --
 * exactly as an employee would, never by seeding a session directly.
 * Self-signup is on by default (`SELF_SIGNUP_ENABLED`), so the "Create
 * account" tab is available against the stock server this suite boots.
 */
export async function signUpAndGoToChat(page: Page, emailPrefix: string): Promise<string> {
  const email = `${emailPrefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
  const password = "Sup3rSecret!2026";

  await page.goto("/sign-in");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
  return email;
}

/** Fills the composer and sends a question, the way a person would. */
export async function askQuestion(page: Page, question: string): Promise<void> {
  await page.getByLabel("Ask a question about your documents").fill(question);
  await page.getByRole("button", { name: "Send question" }).click();
}
