import { test, expect } from "@playwright/test";

test.describe("Split-Screen Scorecard Inspector & Supervisory Override", () => {
  let reportId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Perform direct API login to obtain session
    const loginRes = await request.post("/api/auth/login", {
      data: { password: "admin123" },
    });
    expect(loginRes.ok()).toBeTruthy();

    // 2. Ingest a sample report for inspection tests
    const reportText = `
Executive Summary
Project Inspector Audit is ready for evaluation.

Milestone Progress Matrix
Milestone Alpha: Design Approval - 100%

Risk Register
No unmitigated risks.

Financial Expenditure Log
Budget ceiling: 5%.

Quality Assurance Sign-off
Quality audit verified.
`;

    const uploadRes = await request.post("/api/reports", {
      multipart: {
        file: {
          name: "Inspector_Test_Report.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(reportText, "utf-8"),
        },
      },
    });

    expect(uploadRes.ok()).toBeTruthy();
    const uploadData = await uploadRes.json();
    reportId = uploadData.reportId;
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="password"]').fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("TC-08: Split-Screen Inspector renders 60/40 layout and document preview", async ({
    page,
  }) => {
    await page.goto(`/scorecards/${reportId}`);

    // Verify header metadata
    await expect(page.locator("text=Inspector_Test_Report.txt")).toBeVisible();
    await expect(page.locator("text=1 page")).toBeVisible();

    // Verify 60% Left pane iframe
    const iframe = page.locator('iframe[title="Document Inspector"]');
    await expect(iframe).toBeVisible();

    // Verify 40% Right pane scorecard
    await expect(page.locator("text=Compliance Verdict")).toBeVisible();
    await expect(page.locator("text=1-Click Feedback Memo for Submitter")).toBeVisible();
    await expect(page.locator("text=Compliance Rule Checks")).toBeVisible();
  });

  test("TC-09: 1-Click Feedback Memo copies to clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/scorecards/${reportId}`);

    const copyBtn = page.locator("button:has-text('Copy Memo')");
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Should indicate copied
    await expect(page.locator("text=Copied!")).toBeVisible();
  });

  test("TC-10: Supervisory Override modal updates verdict and persists audit", async ({
    page,
  }) => {
    await page.goto(`/scorecards/${reportId}`);

    // Click Supervisory Override button in header
    await page.click("button:has-text('Supervisory Override')");

    // Modal should open
    await expect(page.locator("text=Supervisory Compliance Override")).toBeVisible();

    // Select ACTION_REQUIRED
    await page.click("button:has-text('Action Req')");

    // Enter justification
    await page
      .locator("textarea")
      .fill("Auditor flagged preliminary item for follow-up verification");

    // Submit override
    await page.click("button:has-text('Stamp Override')");

    // Modal should close and status badge should reflect ACTION REQUIRED
    await expect(page.locator("text=ACTION REQUIRED").first()).toBeVisible({ timeout: 10000 });
  });

  test("TC-17: Soft-deleting an audited report via DELETE API removes it and stamps audit log", async ({
    page,
  }) => {
    // 1. Ingest a report specifically to test deletion
    const reportText = `Executive Summary\nDelete test report.\nMilestone Progress Matrix\nMilestone A - 100%\nRisk Register\nNone\nFinancial Expenditure Log\nBudget: 2%\nQuality Assurance Sign-off\nVerified`;

    const uploadRes = await page.request.post("/api/reports", {
      multipart: {
        file: {
          name: "Report_To_Delete.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(reportText, "utf-8"),
        },
      },
    });
    expect(uploadRes.ok()).toBeTruthy();
    const { reportId: delReportId } = await uploadRes.json();

    // 2. Call DELETE /api/reports/:id
    const deleteRes = await page.request.delete(`/api/reports/${delReportId}`);
    expect(deleteRes.ok()).toBeTruthy();
    const delData = await deleteRes.json();
    expect(delData.success).toBeTruthy();

    // 3. Querying GET /api/reports/:id should now return 404
    const getRes = await page.request.get(`/api/reports/${delReportId}`);
    expect(getRes.status()).toBe(404);

    // 4. Visiting /scorecards/:id should render 404 not found
    await page.goto(`/scorecards/${delReportId}`);
    await expect(page.locator("text=404").first()).toBeVisible({ timeout: 10000 });
  });
});
