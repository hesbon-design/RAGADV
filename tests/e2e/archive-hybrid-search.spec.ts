import { test, expect } from "@playwright/test";

test.describe("Sprint 5: Contextual Chunking & Hybrid Search Engine", () => {
  let approvedReportId: string;
  let departmentId: string = "dep_eng_01";

  test.beforeAll(async ({ request }) => {
    // 1. Authenticate session
    const loginRes = await request.post("/api/auth/login", {
      data: { password: "admin123" },
    });
    expect(loginRes.ok()).toBeTruthy();

    // 2. Fetch existing active department
    const deptRes = await request.get("/api/departments");
    expect(deptRes.ok()).toBeTruthy();
    const deptData = await deptRes.json();
    const depts = deptData.departments;
    expect(depts.length).toBeGreaterThan(0);
    departmentId = depts[0].id;

    // 3. Upload compliant operational document that triggers APPROVED status
    const compliantReportText = `
Executive Summary
Strategic Cloud Migration and Distributed Database Deployment for Core Services.
The architectural refactor is on track with zero security impediments.

Milestone Progress Matrix
Milestone Alpha: Terraform Infrastructure Provisioning - 100% complete.
Milestone Beta: High Availability PostgreSQL Replication - 100% complete.

Risk Register
No unmitigated compliance or technical risks identified during penetration testing.

Financial Expenditure Log
Infrastructure budget ceiling variance is at 1.8%, well within allowable thresholds.

Quality Assurance Sign-off
Final validation and security verification signed off by principal architect.

Environmental Impact Assessment
Comprehensive environmental evaluation conducted with zero adverse ecological findings.
`;

    const uploadRes = await request.post("/api/reports", {
      multipart: {
        file: {
          name: "Cloud_Migration_Q3_Report.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(compliantReportText, "utf-8"),
        },
        departmentId,
      },
    });

    expect(uploadRes.ok()).toBeTruthy();
    const data = await uploadRes.json();
    expect(data.success).toBeTruthy();
    expect(data.complianceStatus).toBe("APPROVED");
    approvedReportId = data.reportId;
  });

  test.beforeEach(async ({ request }) => {
    const loginRes = await request.post("/api/auth/login", {
      data: { password: "admin123" },
    });
    expect(loginRes.ok()).toBeTruthy();
  });

  test("TC-20: Approving a report automatically chunks, embeds, and indexes into archive_chunks", async ({
    request,
  }) => {
    // Search archive for content from the newly approved report
    const searchRes = await request.post("/api/archive/search", {
      data: {
        query: "Cloud_Migration_Q3_Report.txt Terraform Infrastructure Provisioning",
        departmentId,
        limit: 20,
      },
    });

    expect(searchRes.ok()).toBeTruthy();
    const searchData = await searchRes.json();

    expect(searchData.success).toBe(true);
    expect(searchData.count).toBeGreaterThan(0);
    expect(Array.isArray(searchData.results)).toBe(true);

    const matchingChunk = searchData.results.find(
      (r: any) => r.parentReportId === approvedReportId
    );
    expect(matchingChunk).toBeDefined();

    // Verify Contextual Breadcrumb Header format
    // [Document: {filename} | Dept: {departmentName} | Date: ... | Section: ...]
    expect(matchingChunk.content).toContain("[Document: Cloud_Migration_Q3_Report.txt");
    expect(matchingChunk.content).toContain("Dept:");
    expect(matchingChunk.content).toContain("Section:");

    // Verify metadata and score fields
    expect(matchingChunk.docType).toBe("raw");
    expect(matchingChunk.reflectionScore).toBe(1.0);
    expect(matchingChunk.rrfScore).toBeGreaterThan(0);
    expect(matchingChunk.sourceReferences.reportId).toBe(approvedReportId);
    expect(matchingChunk.sourceReferences.filename).toBe("Cloud_Migration_Q3_Report.txt");
  });

  test("TC-21: Hybrid search fuses vector and FTS retrieval with RRF scoring and security guards", async ({
    request,
    playwright,
  }) => {
    // 1. Dual-channel retrieval test
    const hybridRes = await request.post("/api/archive/search", {
      data: {
        query: "Strategic Cloud Migration",
        limit: 10,
      },
    });

    expect(hybridRes.ok()).toBeTruthy();
    const hybridData = await hybridRes.json();
    expect(hybridData.success).toBe(true);
    expect(hybridData.results.length).toBeGreaterThan(0);

    // Verify monotonic descending RRF score ordering
    for (let i = 0; i < hybridData.results.length - 1; i++) {
      expect(hybridData.results[i].rrfScore).toBeGreaterThanOrEqual(
        hybridData.results[i + 1].rrfScore
      );
    }

    // 2. Department isolation filter test
    const deptFilterRes = await request.post("/api/archive/search", {
      data: {
        query: "Cloud Migration",
        departmentId: "dep_non_existent",
      },
    });
    expect(deptFilterRes.ok()).toBeTruthy();
    const deptFilterData = await deptFilterRes.json();
    expect(deptFilterData.count).toBe(0);

    // 3. Input validation: Empty query returns 400
    const emptyQueryRes = await request.post("/api/archive/search", {
      data: { query: "   " },
    });
    expect(emptyQueryRes.status()).toBe(400);

    // 4. Session guard: Unauthenticated request fails with 401
    const unauthApi = await playwright.request.newContext();
    const unauthRes = await unauthApi.post("http://localhost:3000/api/archive/search", {
      data: { query: "Security Protocol" },
    });
    expect(unauthRes.status()).toBe(401);
    await unauthApi.dispose();
  });
});
