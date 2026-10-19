import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, initDatabase } from "@/lib/db";
import { parseDocument } from "@/lib/parsers";
import { validateDocumentBudget } from "@/lib/budget";
import { saveFile } from "@/lib/storage";
import { evaluateReport } from "@/lib/evaluator";
import { ingestReportToArchive } from "@/lib/archive";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDatabase();

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    let reports;

    if (departmentId && status && status !== "ALL") {
      reports = await sql`
        SELECT 
          r.id,
          r.filename,
          r.review_status,
          r.uploaded_at,
          r.reviewed_at,
          r.page_count,
          d.id as department_id,
          d.name as department_name,
          s.id as scorecard_id,
          s.overall_score,
          s.compliance_status,
          s.latency_ms
        FROM reports r
        LEFT JOIN departments d ON r.department_id = d.id
        LEFT JOIN scorecards s ON r.id = s.report_id
        WHERE r.deleted_at IS NULL AND r.department_id = ${departmentId} AND s.compliance_status = ${status}
        ORDER BY r.uploaded_at DESC LIMIT ${limit}
      `;
    } else if (departmentId) {
      reports = await sql`
        SELECT 
          r.id,
          r.filename,
          r.review_status,
          r.uploaded_at,
          r.reviewed_at,
          r.page_count,
          d.id as department_id,
          d.name as department_name,
          s.id as scorecard_id,
          s.overall_score,
          s.compliance_status,
          s.latency_ms
        FROM reports r
        LEFT JOIN departments d ON r.department_id = d.id
        LEFT JOIN scorecards s ON r.id = s.report_id
        WHERE r.deleted_at IS NULL AND r.department_id = ${departmentId}
        ORDER BY r.uploaded_at DESC LIMIT ${limit}
      `;
    } else if (status && status !== "ALL") {
      reports = await sql`
        SELECT 
          r.id,
          r.filename,
          r.review_status,
          r.uploaded_at,
          r.reviewed_at,
          r.page_count,
          d.id as department_id,
          d.name as department_name,
          s.id as scorecard_id,
          s.overall_score,
          s.compliance_status,
          s.latency_ms
        FROM reports r
        LEFT JOIN departments d ON r.department_id = d.id
        LEFT JOIN scorecards s ON r.id = s.report_id
        WHERE r.deleted_at IS NULL AND s.compliance_status = ${status}
        ORDER BY r.uploaded_at DESC LIMIT ${limit}
      `;
    } else {
      reports = await sql`
        SELECT 
          r.id,
          r.filename,
          r.review_status,
          r.uploaded_at,
          r.reviewed_at,
          r.page_count,
          d.id as department_id,
          d.name as department_name,
          s.id as scorecard_id,
          s.overall_score,
          s.compliance_status,
          s.latency_ms
        FROM reports r
        LEFT JOIN departments d ON r.department_id = d.id
        LEFT JOIN scorecards s ON r.id = s.report_id
        WHERE r.deleted_at IS NULL
        ORDER BY r.uploaded_at DESC LIMIT ${limit}
      `;
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Failed to list reports:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDatabase();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let departmentId = (formData.get("departmentId") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    // Default to first department if none specified
    if (!departmentId) {
      const defaultDepts = await sql<{ id: string }[]>`SELECT id FROM departments ORDER BY created_at ASC LIMIT 1`;
      departmentId = defaultDepts[0]?.id || "dept-engineering";
    }

    const filename = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Text Parsing
    let extracted;
    try {
      extracted = await parseDocument(buffer, filename);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Failed to parse document format";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // 2. Token Budget Bouncer & Scanned PDF Guard
    const budgetCheck = validateDocumentBudget(extracted.text, filename);
    if (!budgetCheck.valid && budgetCheck.error) {
      const status = budgetCheck.error.code === "PAYLOAD_TOO_LARGE" ? 413 : 422;
      return NextResponse.json(
        {
          error: budgetCheck.error.message,
          code: budgetCheck.error.code,
        },
        { status }
      );
    }

    // 3. Storage Persistence
    const reportId = `rep_${crypto.randomUUID().replace(/-/g, "")}`;
    const storageMeta = await saveFile(buffer, filename, reportId);

    // 4. Retrieve Active Rule Profile Version
    const defaultVersions = await sql`
      SELECT v.id 
      FROM departments d
      JOIN rule_profiles p ON d.default_rule_profile_id = p.id
      JOIN rule_profile_versions v ON p.id = v.rule_profile_id
      WHERE d.id = ${departmentId}
      ORDER BY v.version_number DESC
      LIMIT 1
    `;

    const versionId = defaultVersions[0]?.id || null;

    // 5. Run Evaluation Engine
    const evalResult = await evaluateReport(extracted.text, departmentId, versionId || undefined);

    // 6. Atomic Database Persistence
    const scorecardId = `sc_${crypto.randomUUID().replace(/-/g, "")}`;

    await sql.begin(async (trx) => {
      // Insert report
      await trx`
        INSERT INTO reports (
          id, department_id, rule_profile_version_id, filename, file_hash,
          storage_path, page_count, review_status, uploaded_at, reviewed_at
        )
        VALUES (
          ${reportId}, ${departmentId}, ${versionId}, ${filename}, ${storageMeta.fileHash},
          ${storageMeta.storagePath}, ${extracted.pageCount}, ${evalResult.complianceStatus},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
      `;

      // Insert scorecard
      await trx`
        INSERT INTO scorecards (
          id, report_id, overall_score, compliance_status,
          executive_summary, feedback_draft, input_tokens, output_tokens, latency_ms
        )
        VALUES (
          ${scorecardId}, ${reportId}, ${evalResult.overallScore}, ${evalResult.complianceStatus},
          ${sql.json(evalResult.executiveSummary)}, ${evalResult.feedbackDraft},
          ${evalResult.inputTokens}, ${evalResult.outputTokens}, ${evalResult.latencyMs}
        );
      `;

      // Insert individual rule checks
      for (const check of evalResult.ruleChecks) {
        await trx`
          INSERT INTO rule_checks (
            id, scorecard_id, rule_id, rule_title, rule_type,
            verdict, penalty_applied, finding_summary, cited_evidence, page_number
          )
          VALUES (
            ${`chk_${crypto.randomUUID().replace(/-/g, "")}`},
            ${scorecardId},
            ${check.ruleId},
            ${check.ruleTitle},
            ${check.ruleType},
            ${check.verdict},
            ${check.penaltyApplied},
            ${check.findingSummary},
            ${check.citedEvidence || null},
            ${check.pageNumber || 1}
          );
        `;
      }

      // Log audit entry
      await trx`
        INSERT INTO audit_logs (id, department_id, action, metadata)
        VALUES (
          ${`log_${crypto.randomUUID().replace(/-/g, "")}`},
          ${departmentId},
          'REPORT_EVALUATED',
          ${sql.json({
            reportId,
            filename,
            scorecardId,
            overallScore: evalResult.overallScore,
            complianceStatus: evalResult.complianceStatus,
            latencyMs: evalResult.latencyMs,
          })}
        );
      `;
    });

    // Auto-ingest into Knowledge Archive if report is APPROVED
    if (evalResult.complianceStatus === "APPROVED") {
      try {
        await ingestReportToArchive(reportId, extracted.text);
      } catch (archiveErr) {
        console.error("Failed to auto-ingest approved report into archive:", archiveErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        reportId,
        scorecardId,
        overallScore: evalResult.overallScore,
        complianceStatus: evalResult.complianceStatus,
        filename,
        pageCount: extracted.pageCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Evaluation ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error during document evaluation" },
      { status: 500 }
    );
  }
}
