import { test, expect } from "@playwright/test";

import { askQuestion, signUpAndGoToChat } from "./helpers";

// Clipboard read/write permission is chromium-only, which matches the single
// project this suite runs (see playwright.config.ts).
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("AC-066: Copy places the completed answer on the clipboard and shows a confirmation", async ({
  page,
}) => {
  await signUpAndGoToChat(page, "copy");
  await askQuestion(page, "What is the on-call rotation policy?");

  // A fresh account has no documents in the shared knowledge base, so
  // retrieval finds nothing and the backend's own no-match reply completes
  // the turn -- still a completed answer, which is all AC-066 requires.
  const answer = page.getByText(/no relevant documents were found/i);
  await expect(answer).toBeVisible({ timeout: 20000 });
  const answerText = ((await answer.textContent()) ?? "").trim();
  expect(answerText.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Copy", exact: true }).click();

  await expect(page.getByText(/answer copied to clipboard/i)).toBeVisible();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe(answerText);
});
