import { test, expect } from "@playwright/test";

import { askQuestion, signUpAndGoToChat } from "./helpers";

test("AC-068: Read aloud is disabled with an explanation, not failing silently, when the browser has no speech synthesis support", async ({
  page,
}) => {
  // Simulate a browser with no Web Speech API at all, before any app script
  // runs, so the feature-detection in Chat.tsx sees exactly what a real
  // unsupported browser would.
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).speechSynthesis;
  });

  await signUpAndGoToChat(page, "no-speech");
  await askQuestion(page, "What is the on-call rotation policy?");

  await expect(page.getByText(/no relevant documents were found/i)).toBeVisible({
    timeout: 20000,
  });

  const readAloudButton = page.getByRole("button", { name: "Read aloud" });
  await expect(readAloudButton).toBeDisabled();
  await expect(
    page.getByText(
      /read aloud is unavailable because this browser has no speech synthesis support/i,
    ),
  ).toBeVisible();
});
