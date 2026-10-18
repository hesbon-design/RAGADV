import { test, expect } from "@playwright/test";

test.describe("Dashboard Metrics & Intake Dropzone", () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto("/login");
    await page.locator('input[type="password"]').fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("TC-05: Dashboard renders core operational metric cards and dropzone", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Review Command Center");
    await expect(page.locator("text=Total Audited")).toBeVisible();
    await expect(page.getByText("Approved", { exact: true })).toBeVisible();
    await expect(page.locator("text=Action Required")).toBeVisible();
    await expect(page.locator("text=Critical Rejections")).toBeVisible();
    await expect(page.locator("text=Drop operational reports here to auto-evaluate")).toBeVisible();
  });

  test("TC-06: Uploading compliant document via file picker triggers automated review", async ({
    page,
  }) => {
    // Construct compliant report buffer
    const compliantText = `
Weekly Project Operational Review
Executive Summary
Project Apollo is executing with full velocity across primary milestones.

Milestone Progress Matrix
Milestone A: Core Ingestion Service - 100% complete
Milestone B: Security Auditing Engine - 100% complete

Risk Register
Zero high-priority risks reported this sprint.

Financial Expenditure Log
Budget ceiling: $250,000. Spent: $230,000. Variance: 2.1%.

Quality Assurance Sign-off
QA Lead sign-off granted with zero blockers.
`;

    // Target the hidden file input inside dropzone
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click("text=Drop operational reports here to auto-evaluate");
    const fileChooser = await fileChooserPromise;

    const [uploadResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/reports") && res.status() === 201),
      fileChooser.setFiles({
        name: "Apollo_Sprint_Review.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(compliantText, "utf-8"),
      }),
    ]);
    expect(uploadResponse.ok()).toBeTruthy();

    // Ingestion queue item should appear
    await expect(page.locator("text=Apollo_Sprint_Review.txt").first()).toBeVisible();

    // Verify it evaluates and shows Inspect button
    await expect(page.locator("button:has-text('Inspect')").first()).toBeVisible({ timeout: 15000 });
  });

  test("TC-07: Scanned or corrupt document (<50 chars) is rejected by Token Budget Bouncer", async ({
    page,
  }) => {
    const corruptText = "Short scan";

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click("text=Drop operational reports here to auto-evaluate");
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "Scanned_Corrupt_Image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(corruptText, "utf-8"),
    });

    // Error message should be visible in the queue
    await expect(page.locator("text=Scanned_Corrupt_Image.txt")).toBeVisible();
    await expect(page.locator("text=fewer than 50 selectable characters")).toBeVisible({
      timeout: 10000,
    });
  });
});
