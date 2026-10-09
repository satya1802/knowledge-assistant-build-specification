import { test, expect } from "@playwright/test";

import { askQuestion, signUpAndGoToChat } from "./helpers";

test("AC-069: Regenerate asks the backend again for the same question and the new streamed answer replaces the previous one", async ({
  page,
}) => {
  const askRequestBodies: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/chat/ask")) {
      askRequestBodies.push(request.postData() ?? "");
    }
  });

  await signUpAndGoToChat(page, "regenerate");
  const question = "What is the on-call rotation policy?";
  await askQuestion(page, question);

  // The assistant's message header carries a clock time ("Knowledge
  // Assistant · HH:MM"), which distinguishes this one conversation turn from
  // the unrelated "Knowledge Assistant" brand text in the app's sidebar.
  const assistantTurn = page.getByText(/Knowledge Assistant · \d{2}:\d{2}/);
  await expect(page.getByText(/no relevant documents were found/i)).toBeVisible({
    timeout: 20000,
  });
  await expect(assistantTurn).toHaveCount(1);

  await page.getByRole("button", { name: "Regenerate" }).click();

  // Retrieval and generation genuinely running again -- not the UI just
  // re-showing the old text -- shows up first as the same in-progress state
  // a fresh question produces.
  await expect(page.getByText(/generating answer/i)).toBeVisible();
  await expect(page.getByText(/no relevant documents were found/i)).toBeVisible({
    timeout: 20000,
  });

  expect(askRequestBodies).toHaveLength(2);
  for (const body of askRequestBodies) {
    expect(JSON.parse(body)).toEqual({ question });
  }
  // Still exactly one assistant turn: the regenerated answer replaced the
  // previous one in place rather than being appended as a new message.
  await expect(assistantTurn).toHaveCount(1);
});
