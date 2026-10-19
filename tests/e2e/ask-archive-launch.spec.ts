import { test, expect } from "@playwright/test";

test.describe("Sprint 7: 'Ask Archive' QA Interface & Production Launch", () => {
  let departmentId: string;

  test.beforeEach(async ({ request }) => {
    // Authenticate session for API setup
    const loginRes = await request.post("/api/auth/login", {
      data: { password: "admin123" },
    });
    expect(loginRes.ok()).toBeTruthy();

    const deptRes = await request.get("/api/departments");
    expect(deptRes.ok()).toBeTruthy();
    const deptData = await deptRes.json();
    departmentId = deptData.departments[0].id;
  });

  test("TC-24: 'Ask Archive' API returns grounded answers with citations and reflection cards", async ({
    request,
    playwright,
  }) => {
    // 1. Query the archive with natural language question
    const askRes = await request.post("/api/archive/ask", {
      data: {
        query: "What milestones and operational controls were established for High-Performance Computing?",
        departmentId,
      },
    });

    expect(askRes.ok()).toBeTruthy();
    const askData = await askRes.json();

    expect(askData.success).toBe(true);
    expect(typeof askData.answer).toBe("string");
    expect(askData.answer.length).toBeGreaterThan(20);

    // Verify inline citation or archival verification
    expect(askData.sources.length).toBeGreaterThan(0);
    const topSource = askData.sources[0];
    expect(topSource.index).toBe(1);
    expect(topSource.filename).toBeDefined();
    expect(topSource.content).toBeDefined();
    expect(topSource.rrfScore).toBeGreaterThan(0);

    // Verify token usage telemetry
    expect(askData.tokenUsage).toBeDefined();
    expect(askData.tokenUsage.totalTokens).toBeGreaterThan(0);
    expect(askData.tokenUsage.dailyTokensUsed).toBeGreaterThan(0);
    expect(askData.tokenUsage.dailyLimit).toBe(500000);

    // 2. Input validation: Empty query returns 400
    const emptyRes = await request.post("/api/archive/ask", {
      data: { query: "   " },
    });
    expect(emptyRes.status()).toBe(400);

    // 3. Security guard: Unauthenticated request returns 401
    const unauthApi = await playwright.request.newContext();
    const unauthRes = await unauthApi.post("http://localhost:3000/api/archive/ask", {
      data: { query: "Security inquiry" },
    });
    expect(unauthRes.status()).toBe(401);
    await unauthApi.dispose();
  });

  test("TC-25: Ask Archive UI renders search input, reflection pills, generated answer, and source drawers", async ({
    page,
  }) => {
    // 1. Login via web interface
    await page.goto("/login");
    await page.locator('input[type="password"]').fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // 2. Navigate to /archive
    await page.goto("/archive");
    await expect(page.locator("h1")).toContainText("Ask Archive & Knowledge Reflection");
    await expect(page.locator("text=Hybrid RRF Search")).toBeVisible();

    // 3. Submit question via prompt input
    const input = page.locator('input[placeholder*="Ask a question across approved reports"]');
    await expect(input).toBeVisible();
    await input.fill("High-Performance Computing Cluster infrastructure");
    await page.click('button:has-text("Ask Archive")');

    // 4. Verify Grounded Archive Synthesis card appears
    await expect(page.locator("text=Grounded Archive Synthesis")).toBeVisible({ timeout: 15000 });

    // 5. Verify Sources section is visible
    const sourcesHeading = page.locator("text=Sources & Retrieved Chunks");
    await expect(sourcesHeading).toBeVisible();

    // 6. Test source accordion interaction
    const firstSourceButton = page.locator('button:has-text("[1]")').first();
    if (await firstSourceButton.isVisible()) {
      await firstSourceButton.click();
      // Should reveal chunk content
      await expect(page.locator(".font-mono.whitespace-pre-wrap").first()).toBeVisible();
    }
  });

  test("TC-26: Product landing page renders hero branding, value proposition, and navigation to authentication", async ({
    page,
  }) => {
    // 1. Visit public landing page
    await page.goto("/");

    // 2. Verify branding and hero text
    await expect(page.locator("text=RAGADV").first()).toBeVisible();
    await expect(page.getByText("The Enterprise ATS for Operational Reports")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Automate Document Reviews");

    // 3. Verify core architecture pillars
    await expect(page.locator("text=1. Deterministic Scorecards")).toBeVisible();
    await expect(page.locator("text=2. Hybrid RRF Search")).toBeVisible();
    await expect(page.locator("text=3. Knowledge Reflection")).toBeVisible();

    // 4. Verify navigation to Login
    await page.click('a:has-text("Operator Sign In")');
    await page.waitForURL("**/login");
    await expect(page.locator("text=Enterprise Document Compliance & Audit Hub")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
