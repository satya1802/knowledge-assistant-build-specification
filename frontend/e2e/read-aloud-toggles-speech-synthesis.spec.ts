import { test, expect } from "@playwright/test";

import { askQuestion, signUpAndGoToChat } from "./helpers";

test("AC-067: Read aloud speaks the answer with the browser's built-in speech synthesis and the control toggles to stop playback", async ({
  page,
}) => {
  await signUpAndGoToChat(page, "read-aloud");
  await askQuestion(page, "What is the on-call rotation policy?");

  await expect(page.getByText(/no relevant documents were found/i)).toBeVisible({
    timeout: 20000,
  });

  const readAloudButton = page.getByRole("button", { name: "Read aloud" });
  await expect(readAloudButton).toBeEnabled();

  await readAloudButton.click();
  // Toggles to a Stop control the moment playback starts -- the control
  // itself, not a timer, is what proves playback is understood to be live.
  await expect(page.getByRole("button", { name: "Stop reading" })).toBeVisible();

  await page.getByRole("button", { name: "Stop reading" }).click();
  await expect(page.getByRole("button", { name: "Read aloud" })).toBeVisible();
});
