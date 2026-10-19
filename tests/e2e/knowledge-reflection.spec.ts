import { test, expect } from "@playwright/test";

test.describe("Sprint 6: Knowledge Reflection & Consolidation Engine", () => {
  let departmentId: string;

  const createCompliantReport = (title: string, domainTopic: string) => `
Executive Summary
${title}: Comprehensive operational audit for ${domainTopic}.
All regulatory and technical criteria have been evaluated with complete compliance.

Milestone Progress Matrix
Milestone Alpha: Architecture Design for ${domainTopic} - 100% complete.
Milestone Beta: Staging Environment Verification - 100% complete.

Risk Register
No unmitigated compliance or technical risks identified during operational review.

Financial Expenditure Log
Budget ceiling variance is tracked at 2.1%, well within authorized limits.

Quality Assurance Sign-off
Quality audit and security baseline verified and signed off by lead architect.

Environmental Impact Assessment
Comprehensive environmental audit completed with zero adverse ecological impact.
`;

  test.beforeEach(async ({ request }) => {
    // Authenticate session
    const loginRes = await request.post("/api/auth/login", {
      data: { password: "admin123" },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Fetch active department
    const deptRes = await request.get("/api/departments");
    expect(deptRes.ok()).toBeTruthy();
    const deptData = await deptRes.json();
    departmentId = deptData.departments[0].id;
  });

  test("TC-22: Approving related reports generates a 3-sentence knowledge reflection with 1.5x boost", async ({
    request,
  }) => {
    // 1. Ingest Baseline Report A
    const reportAText = createCompliantReport(
      "High-Performance Computing Cluster A",
      "HPC Network Provisioning and InfiniBand Interconnect"
    );

    const uploadARes = await request.post("/api/reports", {
      multipart: {
        file: {
          name: "HPC_Cluster_A_Audit.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(reportAText, "utf-8"),
        },
        departmentId,
      },
    });

    expect(uploadARes.ok()).toBeTruthy();
    const dataA = await uploadARes.json();
    expect(dataA.complianceStatus).toBe("APPROVED");

    // 2. Ingest Related Report B (triggers reflection with Report A)
    const reportBText = createCompliantReport(
      "High-Performance Computing Cluster B",
      "HPC Storage Replication and Shared File Systems"
    );

    const uploadBRes = await request.post("/api/reports", {
      multipart: {
        file: {
          name: "HPC_Cluster_B_Audit.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(reportBText, "utf-8"),
        },
        departmentId,
      },
    });

    expect(uploadBRes.ok()).toBeTruthy();
    const dataB = await uploadBRes.json();
    expect(dataB.complianceStatus).toBe("APPROVED");

    // 3. Search archive specifically for reflection doc_type
    const searchRes = await request.post("/api/archive/search", {
      data: {
        query: "High-Performance Computing Cluster Interconnect Storage",
        departmentId,
        docType: "reflection",
        limit: 5,
      },
    });

    expect(searchRes.ok()).toBeTruthy();
    const searchData = await searchRes.json();
    expect(searchData.success).toBe(true);
    expect(searchData.count).toBeGreaterThan(0);

    const reflectionChunk = searchData.results.find(
      (r: any) => r.docType === "reflection"
    );
    expect(reflectionChunk).toBeDefined();

    // Verify 1.5x reflection boost and metadata
    expect(reflectionChunk.reflectionScore).toBe(1.5);
    expect(reflectionChunk.rrfScore).toBeGreaterThan(0);
    expect(reflectionChunk.content.length).toBeGreaterThan(50);
    expect(reflectionChunk.sourceReferences.relatedReportIds).toBeDefined();
  });

  test("TC-23: Accumulating 3+ reflections triggers consolidation into a cross-report summary with 1.8x boost", async ({
    request,
  }) => {
    // Ingest Report C & Report D to accumulate unconsolidated reflections past CONSOLIDATION_THRESHOLD (3)
    const reportCText = createCompliantReport(
      "High-Performance Computing Cluster C",
      "HPC Security Gateway and Perimeter Isolation"
    );

    const uploadCRes = await request.post("/api/reports", {
      multipart: {
        file: {
          name: "HPC_Cluster_C_Audit.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(reportCText, "utf-8"),
        },
        departmentId,
      },
    });
    expect(uploadCRes.ok()).toBeTruthy();

    const reportDText = createCompliantReport(
      "High-Performance Computing Cluster D",
      "HPC Disaster Recovery and Automated Failover"
    );

    const uploadDRes = await request.post("/api/reports", {
      multipart: {
        file: {
          name: "HPC_Cluster_D_Audit.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(reportDText, "utf-8"),
        },
        departmentId,
      },
    });
    expect(uploadDRes.ok()).toBeTruthy();

    // Search archive for consolidated summary
    const searchRes = await request.post("/api/archive/search", {
      data: {
        query: "High-Performance Computing Cluster Operational Governance",
        departmentId,
        docType: "summary",
        limit: 5,
      },
    });

    expect(searchRes.ok()).toBeTruthy();
    const searchData = await searchRes.json();
    expect(searchData.success).toBe(true);

    const summaryChunk = searchData.results.find((r: any) => r.docType === "summary");
    expect(summaryChunk).toBeDefined();

    // Verify 1.8x summary boost and consolidation metadata
    expect(summaryChunk.reflectionScore).toBe(1.8);
    expect(summaryChunk.rrfScore).toBeGreaterThan(0);
    expect(summaryChunk.sourceReferences.sourceReflectionIds).toBeDefined();
    expect(summaryChunk.sourceReferences.consolidationCount).toBeGreaterThanOrEqual(3);
  });
});
