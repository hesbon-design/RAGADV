import { test, expect } from "@playwright/test";

test.describe("Single-Operator Authentication & Route Guard", () => {
  test("TC-01: Direct access to protected dashboard redirects unauthenticated visitor to /login", async ({
    page,
  }) => {
    // Clear cookies
    await page.context().clearCookies();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("text=Enterprise Document Compliance & Audit Hub")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("TC-02: Invalid master password fails with 401 and displays tactile error", async ({
    page,
  }) => {
    await page.goto("/login");

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    await passwordInput.fill("wrong_password_attempt");
    await page.click('button[type="submit"]');

    // Error alert should be visible
    const errorAlert = page.locator(".text-destructive");
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("Invalid master password");
  });

  test("TC-03: Valid master password authenticates and enters /dashboard", async ({
    page,
  }) => {
    await page.goto("/login");

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("admin123");
    await page.click('button[type="submit"]');

    // Should redirect to /dashboard
    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText("Review Command Center");
    await expect(page.getByText("Operator Session", { exact: true })).toBeVisible();
  });

  test("TC-04: Sign out clears session and redirects to /login", async ({ page }) => {
    // First login
    await page.goto("/login");
    await page.locator('input[type="password"]').fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Click Sign Out
    await page.click("button:has-text('Sign Out')");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });
});
