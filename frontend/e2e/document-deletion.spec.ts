import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * US-? -- Admin document deletion (AC-052, AC-053, AC-054).
 *
 * Mirrors document-download.spec.ts's approach: self-signup makes the first
 * account on a fresh database the admin (AC-015), so an upload-dependent
 * scenario skips itself if some other admin already exists from a prior
 * run, rather than fail on an environment precondition it cannot control.
 *
 * AC-053 ("no chunk or embedding of a deleted document remains retrievable
 * from the vector store") has no public retrieval/chat endpoint yet to query
 * directly against (no /chat or /search router exists in this build) -- so
 * this suite proves it indirectly: the document row 404s, its chunk_count
 * is gone from GET /documents, and a code read of
 * backend/app/services/vector_store.py and backend/app/models.py confirms
 * embeddings live *only* in `document_chunks.embedding`, a column covered by
 * both the ORM cascade (`cascade="all, delete-orphan"` on `Document.chunks`)
 * and the FK's `ondelete="CASCADE"` -- there is no second index or store an
 * embedding could survive in. Once a retrieval endpoint exists, a direct
 * "ask about the deleted document, get no citation" assertion should be
 * added here.
 */

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8000";
const PASSWORD = "a-strong-test-password-123!";

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUp(
  request: APIRequestContext,
  email: string,
): Promise<{ role: string }> {
  const response = await request.post(`${API_BASE_URL}/auth/signup`, {
    data: { email, password: PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function uploadTextDocument(
  request: APIRequestContext,
  filename: string,
): Promise<{ id: string; chunk_count?: number }> {
  const response = await request.post(`${API_BASE_URL}/documents`, {
    multipart: {
      file: {
        name: filename,
        mimeType: "text/plain",
        buffer: Buffer.from(
          "This fixture note exists only to drive the document deletion e2e suite.",
        ),
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/** Polls GET /documents/{id} until ingestion finishes (status "ready" or
 * "failed"), so the chunk/embedding assertions have something real to act
 * on, not a row still at "processing". */
async function waitForIngestion(
  request: APIRequestContext,
  id: string,
): Promise<{ status: string; chunk_count: number }> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const response = await request.get(`${API_BASE_URL}/documents/${id}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    if (body.status === "ready" || body.status === "failed") {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Document ${id} never left "processing" within 30s`);
}

test.describe("Admin document deletion", () => {
  test("AC-052/AC-053: admin DELETE removes the document, its stored file, and its chunks/embeddings beyond retrieval", async ({
    request,
  }) => {
    const adminEmail = uniqueEmail("delete-admin");
    const account = await signUp(request, adminEmail);
    test.skip(
      account.role !== "admin",
      "This database already has an admin account from a prior run, so a freshly " +
        "signed-up account cannot upload/delete a document here.",
    );

    const uploaded = await uploadTextDocument(request, `ac-052-${Date.now()}.txt`);
    const ingested = await waitForIngestion(request, uploaded.id);
    expect(ingested.status).toBe("ready");
    expect(ingested.chunk_count).toBeGreaterThan(0);

    // Sanity: the file is downloadable, and listed, before deletion.
    const preDownload = await request.get(`${API_BASE_URL}/documents/${uploaded.id}/download`);
    expect(preDownload.status()).toBe(200);
    const preList = await request.get(`${API_BASE_URL}/documents`);
    const preBody = await preList.json();
    const preItems = Array.isArray(preBody) ? preBody : preBody.items;
    expect(preItems.some((d: { id: string }) => d.id === uploaded.id)).toBe(true);

    const deleteResponse = await request.delete(`${API_BASE_URL}/documents/${uploaded.id}`);
    expect(deleteResponse.status()).toBe(204);

    // AC-052: the row is gone.
    const getAfterDelete = await request.get(`${API_BASE_URL}/documents/${uploaded.id}`);
    expect(getAfterDelete.status()).toBe(404);

    // AC-052: the stored original file is gone -- download 404s, not 200.
    const downloadAfterDelete = await request.get(
      `${API_BASE_URL}/documents/${uploaded.id}/download`,
    );
    expect(downloadAfterDelete.status()).toBe(404);

    // AC-053: nothing about this document -- including its chunk_count --
    // is retrievable through the list endpoint any more.
    const postList = await request.get(`${API_BASE_URL}/documents`);
    const postBody = await postList.json();
    const postItems = Array.isArray(postBody) ? postBody : postBody.items;
    expect(postItems.some((d: { id: string }) => d.id === uploaded.id)).toBe(false);
  });

  test("AC-054: a non-admin receives 403 from DELETE and sees no Delete control in the UI", async ({
    request,
    page,
  }) => {
    const adminEmail = uniqueEmail("ac054-admin");
    const adminAccount = await signUp(request, adminEmail);
    test.skip(
      adminAccount.role !== "admin",
      "This database already has an admin account from a prior run, so a freshly " +
        "signed-up account cannot upload a document for this non-admin to be denied against.",
    );

    const filename = `ac-054-${Date.now()}.txt`;
    const uploaded = await uploadTextDocument(request, filename);
    await waitForIngestion(request, uploaded.id);

    const employeeEmail = uniqueEmail("ac054-employee");
    const employeeAccount = await signUp(request, employeeEmail);
    expect(employeeAccount.role).toBe("employee");

    // API half: DELETE as the employee is refused outright.
    const deleteAsEmployee = await request.delete(`${API_BASE_URL}/documents/${uploaded.id}`);
    expect(deleteAsEmployee.status()).toBe(403);

    // The document must still be there afterwards -- a 403 that somehow
    // still deleted the row would be worse than useless.
    const stillThere = await request.get(`${API_BASE_URL}/documents/${uploaded.id}`);
    expect(stillThere.status()).toBe(200);

    // UI half: signed in as the same non-admin, the row renders with no
    // Delete control at all -- not a disabled one, not one that 403s on
    // click, simply absent.
    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill(employeeEmail);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/chat$/);

    await page.goto("/knowledge-base");
    await expect(page.getByText(filename)).toBeVisible();
    await expect(page.getByRole("button", { name: `Delete ${filename}` })).toHaveCount(0);

    // Control: the admin, on the same page, does see the Delete control.
    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill(adminEmail);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/chat$/);

    await page.goto("/knowledge-base");
    await expect(page.getByRole("button", { name: `Delete ${filename}` })).toBeVisible();
  });

  test("DELETE of an unknown id returns 404 and leaves other documents untouched", async ({
    request,
  }) => {
    const adminEmail = uniqueEmail("ac052-404-admin");
    const account = await signUp(request, adminEmail);
    test.skip(
      account.role !== "admin",
      "This database already has an admin account from a prior run, so a freshly " +
        "signed-up account cannot upload documents for this scenario.",
    );

    const keepA = await uploadTextDocument(request, `keep-a-${Date.now()}.txt`);
    const keepB = await uploadTextDocument(request, `keep-b-${Date.now()}.txt`);

    const response = await request.delete(`${API_BASE_URL}/documents/no-such-document-id`);
    expect(response.status()).toBe(404);

    const getA = await request.get(`${API_BASE_URL}/documents/${keepA.id}`);
    const getB = await request.get(`${API_BASE_URL}/documents/${keepB.id}`);
    expect(getA.status()).toBe(200);
    expect(getB.status()).toBe(200);
  });
});
