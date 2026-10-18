import { test, expect } from "@playwright/test";

test.describe("Rule Studio, Archive Registry & System Health", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="password"]').fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("TC-11: Scorecards Archive lists all audited reports and navigates to inspector", async ({
    page,
  }) => {
    await page.goto("/scorecards");

    await expect(page.locator("h1")).toContainText("Compliance Scorecards");
    const table = page.locator("table");
    await expect(table).toBeVisible();

    // Verify Inspect button is functional
    const inspectBtn = page.locator("button:has-text('Inspect')").first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // Should navigate to /scorecards/:id
    await page.waitForURL("**/scorecards/**");
    await expect(page.locator('iframe[title="Document Inspector"]')).toBeVisible();
  });

  test("TC-12: Rule Studio enables editing mandatory sections, tripwires and publishing versions", async ({
    page,
  }) => {
    await page.goto("/rules");

    await expect(page.locator("h1")).toContainText("Compliance Rule Studio");

    // Add new section
    const sectionInput = page.locator('input[placeholder="Add required section title..."]');
    await sectionInput.fill("Environmental Impact Assessment");
    await page.click("button:has-text('Add Section')");

    // Check newly added badge
    await expect(page.locator("text=Environmental Impact Assessment")).toBeVisible();

    // Add new tripwire keyword
    const tripwireInput = page.locator(
      'input[placeholder="Add tripwire phrase (e.g. litigation, crack)..."]'
    );
    await tripwireInput.fill("hazardous runoff");
    await page.click("button:has-text('Add Tripwire')");

    // Check newly added tripwire tag
    await expect(page.getByText("hazardous runoff")).toBeVisible();

    // Publish new version
    await page.click("button:has-text('Publish New Version')");

    // Success feedback
    await expect(page.locator("text=Saved v")).toBeVisible({ timeout: 10000 });
  });

  test("TC-13: System Health renders SQLite WAL telemetry and audit log history", async ({
    page,
  }) => {
    await page.goto("/settings");

    await expect(page.locator("h1")).toContainText("System Health & Audit Logs");
    await expect(page.locator("text=SQLite (WAL)")).toBeVisible();
    await expect(page.locator("text=Operator Audit Trail")).toBeVisible();

    // Check table has entries
    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
