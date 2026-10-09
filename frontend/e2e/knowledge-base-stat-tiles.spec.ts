import { expect, test, type Page } from "@playwright/test";

/**
 * US-013 -- Knowledge base stat tiles (AC-043, AC-044).
 *
 * Drives the real backend through the browser (self-signup -- see
 * backend/app/config.py's SELF_SIGNUP_ENABLED, on by default) and
 * cross-checks what the page shows against GET /documents, so both halves
 * of the sprint (the React tiles and the FastAPI list endpoint) are proven
 * together, not just the frontend's own arithmetic.
 *
 * AC-045 (an empty knowledge base shows zero-value tiles and an empty-state
 * message) is proven in frontend/src/screens/KnowledgeBase.test.tsx instead:
 * it is a pure client-side rendering concern given an empty `GET /documents`
 * list, and this suite shares one ever-growing SQLite database across every
 * spec and test run (see backend/app/database.py) with no reliable way from
 * here to make it empty again.
 */

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8000";
const PASSWORD = "a-strong-test-password-123!";

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1_000_000)}@example.com`;
}

type DocumentRecord = {
  status: string;
  chunk_count?: number | null;
};

function expectedStats(documents: DocumentRecord[]) {
  return {
    total: documents.length,
    ready: documents.filter((d) => d.status === "ready").length,
    processing: documents.filter((d) => d.status === "processing").length,
    failed: documents.filter((d) => d.status === "failed").length,
    chunks: documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0),
  };
}

/** Signs up a brand-new account through the UI and waits for the redirect to
 * Chat that a successful sign-up produces. Returns the role the server
 * assigned (the first account ever created becomes admin -- AC-015 -- any
 * other becomes an employee), so callers can adapt to whichever this
 * environment's database already holds. */
async function signUp(page: Page, email: string): Promise<{ role: string }> {
  await page.goto("/sign-in");

  const signUpTab = page.getByRole("tab", { name: "Create account" });
  if (!(await signUpTab.count())) {
    test.skip(
      true,
      "Self-signup is disabled in this environment (SELF_SIGNUP_ENABLED=0) and no seeded " +
        "account credentials are available, so this suite has no way to sign in.",
    );
    return { role: "employee" };
  }
  await signUpTab.click();

  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/signup") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await responsePromise;
  await page.waitForURL("**/chat");

  return (await response.json()) as { role: string };
}

/** The tiles are rendered as `<dt>label</dt><dd>value</dd>` pairs inside one
 * `<dl>`; this selects the `<dd>` belonging to a given label's `<dt>`. */
function tileValue(page: Page, label: string) {
  return page.locator(`div:has(dt:text-is("${label}"))`).locator("dd");
}

test.describe("Knowledge base stat tiles", () => {
  test("AC-043: tiles show total documents, ready, processing, failed and chunks indexed, matching GET /documents", async ({
    page,
  }) => {
    await signUp(page, uniqueEmail("ac043"));

    await page.goto("/knowledge-base");
    await expect(page.getByRole("heading", { name: "Knowledge base" })).toBeVisible();
    await expect(page.getByText("Total documents")).toBeVisible();

    const apiResponse = await page.context().request.get(`${API_BASE_URL}/documents`);
    expect(apiResponse.ok()).toBe(true);
    const body = (await apiResponse.json()) as DocumentRecord[] | { items: DocumentRecord[] };
    const documents = Array.isArray(body) ? body : body.items;
    const expected = expectedStats(documents);

    await expect(tileValue(page, "Total documents")).toHaveText(String(expected.total));
    await expect(tileValue(page, "Ready")).toHaveText(String(expected.ready));
    await expect(tileValue(page, "Processing")).toHaveText(String(expected.processing));
    await expect(tileValue(page, "Failed")).toHaveText(String(expected.failed));
    await expect(tileValue(page, "Chunks indexed")).toHaveText(expected.chunks.toLocaleString());
  });

  test("AC-044: a newly uploaded document moves the Processing and Ready tiles live, with no page reload", async ({
    page,
  }) => {
    const signedUp = await signUp(page, uniqueEmail("ac044"));
    test.skip(
      signedUp.role !== "admin",
      "This environment's knowledge base already has an admin account, so self-signup produced " +
        "an employee account here, which cannot see the admin-only upload control this test needs.",
    );

    await page.goto("/knowledge-base");
    await expect(page.getByText("Total documents")).toBeVisible();

    const before = {
      total: Number(await tileValue(page, "Total documents").innerText()),
      processing: Number(await tileValue(page, "Processing").innerText()),
      ready: Number(await tileValue(page, "Ready").innerText()),
    };

    const fileName = `ac-044-${Date.now()}.txt`;
    await page.setInputFiles("#kb-file-input", {
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from(
        "This short note exists only to drive the Knowledge base stat tiles end to end.",
      ),
    });

    // The upload response lands the new row -- and so the tile count -- at
    // "processing" immediately, before ingestion has even started.
    await expect(tileValue(page, "Total documents")).toHaveText(String(before.total + 1));
    await expect(tileValue(page, "Processing")).toHaveText(String(before.processing + 1));

    // A plain-text file needs no OCR and ingests against the offline Gemini
    // stub, so it finishes quickly. No page.reload() happens anywhere in
    // this test -- the component's GET /documents/stream subscription is
    // what is expected to move these two tiles on its own (AC-044).
    await expect(tileValue(page, "Ready")).toHaveText(String(before.ready + 1), {
      timeout: 30_000,
    });
    await expect(tileValue(page, "Processing")).toHaveText(String(before.processing));
  });
});
