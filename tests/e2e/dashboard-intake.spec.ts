import { test, expect } from "@playwright/test";

test.describe("Dashboard Metrics & Intake Dropzone", () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto("/login");
    await page.locator('input[type="password"]').fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("TC-05: Dashboard renders core operational metric cards and dropzone modal", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator("text=Total Audited")).toBeVisible();
    await expect(page.getByText("Approved", { exact: true })).toBeVisible();
    await expect(page.locator("text=Action Required")).toBeVisible();
    await expect(page.locator("text=Critical Rejections")).toBeVisible();

    // Click upload to open intake modal
    await page.locator("button:has-text('Upload')").first().click();
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

    // Open upload modal
    await page.locator("button:has-text('Upload')").first().click();

    // Target the hidden file input inside dropzone modal
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

    // Open upload modal
    await page.locator("button:has-text('Upload')").first().click();

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

  test("TC-14: Document exceeding token ceiling (>32,000 tokens) is rejected with 413", async ({
    page,
  }) => {
    // Generate text with 27,000 words (> 35,000 estimated tokens)
    const largeText = "Executive Summary\n" + "compliance metric variance ".repeat(9000);

    // Open upload modal
    await page.locator("button:has-text('Upload')").first().click();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click("text=Drop operational reports here to auto-evaluate");
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "Massive_Corrupt_Log.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(largeText, "utf-8"),
    });

    await expect(page.locator("text=Massive_Corrupt_Log.txt").first()).toBeVisible();
    await expect(
      page.locator("text=exceeding the single-document ceiling").first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("TC-15: Non-compliant document with missing sections triggers REJECTED status", async ({
    page,
  }) => {
    const nonCompliantText = `
Weekly Briefing Notes
Executive Summary
Project is missing major matrices and financial sign-offs.
Notes on current progress without required sections.
`;

    // Open upload modal
    await page.locator("button:has-text('Upload')").first().click();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click("text=Drop operational reports here to auto-evaluate");
    const fileChooser = await fileChooserPromise;

    const [uploadResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/reports") && res.status() === 201
      ),
      fileChooser.setFiles({
        name: "Non_Compliant_Brief.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(nonCompliantText, "utf-8"),
      }),
    ]);
    expect(uploadResponse.ok()).toBeTruthy();
    const data = await uploadResponse.json();
    expect(data.complianceStatus).toBe("REJECTED");

    await expect(page.locator("text=REJECTED").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("TC-16: Binary PDF document ingestion parses correctly via unpdf", async ({
    page,
  }) => {
    const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 260 >>
stream
BT
/F1 12 Tf
72 712 Td
(Executive Summary) Tj
0 -20 Td
(Project Binary PDF is compliant and progressing across milestones.) Tj
0 -20 Td
(Milestone Progress Matrix) Tj
0 -20 Td
(Risk Register) Tj
0 -20 Td
(Financial Expenditure Log) Tj
0 -20 Td
(Quality Assurance Sign-off) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000555 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
628
%%EOF`;

    // Open upload modal
    await page.locator("button:has-text('Upload')").first().click();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click("text=Drop operational reports here to auto-evaluate");
    const fileChooser = await fileChooserPromise;

    const [uploadResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/reports") && res.status() === 201
      ),
      fileChooser.setFiles({
        name: "Standard_Architecture_Audit.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(minimalPdf, "utf-8"),
      }),
    ]);
    expect(uploadResponse.ok()).toBeTruthy();

    await expect(
      page.locator("text=Standard_Architecture_Audit.pdf").first()
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Inspect')").first()
    ).toBeVisible({ timeout: 15000 });
  });
});
