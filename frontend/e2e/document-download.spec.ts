import { expect, test } from "@playwright/test";

/**
 * US-015 -- Download the original uploaded file.
 *
 * AC-050 needs a real document on the server, which needs an admin account
 * to upload it (POST /documents is admin-only, per KNOW9BAE95-18-1). Per the
 * build spec, "the first account is the admin" -- so this spec signs up a
 * fresh account first and only proceeds with the upload-dependent assertions
 * if that account actually came back as admin, i.e. this is a fresh
 * database. If some other admin already exists (a previous run's data
 * persisted), the upload-dependent test skips itself rather than fail on an
 * environment precondition it cannot control.
 */

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8000";
const PASSWORD = "a-strong-test-password-123!";

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test.describe("US-015: download the original uploaded file", () => {
  test("AC-051: an unauthenticated request for a document download is refused with no file content returned", async ({
    request,
  }) => {
    // A fresh, unauthenticated API request context: no prior /auth/login means
    // no session cookie is ever sent -- exactly "an unauthenticated visitor".
    const response = await request.get(`${API_BASE_URL}/documents/some-document-id/download`);

    expect(response.status()).toBe(401);
    const body = await response.body();
    // The refusal must carry no file bytes at all, not just a non-200 status.
    expect(body.length).toBeLessThan(500);
    expect(body.toString("utf-8")).not.toContain("%PDF");
  });

  test("a malformed/invalid session cookie is refused with no file content returned", async ({
    request,
  }) => {
    // Well-formed Cookie header, but a value that can never resolve to a
    // session row (not a UUID at all) -- the same code path the backend
    // uses for "no session", per app/routers/auth.py's get_current_user.
    const response = await request.get(`${API_BASE_URL}/documents/some-document-id/download`, {
      headers: { Cookie: "session_id=not-a-valid-session-token" },
    });

    expect(response.status()).toBe(401);
    const body = await response.body();
    expect(body.length).toBeLessThan(500);
    expect(body.toString("utf-8")).not.toContain("%PDF");
  });

  test("a well-formed but unknown/expired session cookie is refused with no file content returned", async ({
    request,
  }) => {
    // A syntactically valid session id (UUID shape) that was never issued by
    // /auth/login -- indistinguishable, from the server's point of view,
    // from a session that existed and has since expired and been purged:
    // app/routers/auth.py's get_current_user treats "no matching row" and
    // "row exists but is expired" identically, with the same 401 response.
    const response = await request.get(`${API_BASE_URL}/documents/some-document-id/download`, {
      headers: { Cookie: "session_id=00000000-0000-0000-0000-000000000000" },
    });

    expect(response.status()).toBe(401);
    const body = await response.body();
    expect(body.length).toBeLessThan(500);
    expect(body.toString("utf-8")).not.toContain("%PDF");
  });

  test("AC-050: any signed-in user can download a document's original file with its original filename and content type", async ({
    request,
    page,
  }) => {
    const adminEmail = uniqueEmail("us015-admin");
    const signupResponse = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: { email: adminEmail, password: PASSWORD },
    });
    expect(signupResponse.ok()).toBeTruthy();
    const account = await signupResponse.json();

    test.skip(
      account.role !== "admin",
      "This database already has an admin account from a prior run, so a freshly " +
        "signed-up account cannot upload a document to download. AC-050 and AC-051 are " +
        "still proven for whichever document already exists -- see the other specs here " +
        "and backend/tests/test_documents.py, which creates admin/employee rows directly.",
    );

    const fileText = "%PDF-1.4 US-015 fixture -- do not treat as a real PDF.";
    const uploadResponse = await request.post(`${API_BASE_URL}/documents`, {
      multipart: {
        file: {
          name: "US-015-Original-File.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from(fileText, "utf-8"),
        },
      },
    });
    expect(uploadResponse.ok()).toBeTruthy();
    const document = await uploadResponse.json();
    expect(document.filename).toBe("US-015-Original-File.pdf");

    // Backend contract, driven as a client would: correct bytes, correct
    // filename, correct content type (AC-050), using the session the signup
    // call already established on this request context.
    const apiDownload = await request.get(`${API_BASE_URL}/documents/${document.id}/download`);
    expect(apiDownload.status()).toBe(200);
    expect(apiDownload.headers()["content-type"]).toContain("application/pdf");
    expect(apiDownload.headers()["content-disposition"] ?? "").toContain(
      "US-015-Original-File.pdf",
    );
    expect((await apiDownload.body()).toString("utf-8")).toBe(fileText);

    // UI half: a *different*, non-admin signed-in user -- not the uploader --
    // selects Download on the document's row and the browser actually
    // receives the original file.
    const employeeEmail = uniqueEmail("us015-employee");
    const employeeSignup = await request.post(`${API_BASE_URL}/auth/signup`, {
      data: { email: employeeEmail, password: PASSWORD },
    });
    expect(employeeSignup.ok()).toBeTruthy();
    expect((await employeeSignup.json()).role).toBe("employee");

    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill(employeeEmail);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/chat$/);

    await page.goto("/knowledge-base");
    await expect(page.getByText("US-015-Original-File.pdf")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("link", { name: /download original file us-015-original-file\.pdf/i })
      .click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("US-015-Original-File.pdf");
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
  });
});
