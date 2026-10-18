import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const report = db
      .prepare(`
        SELECT 
          r.id,
          r.filename,
          r.file_hash,
          r.storage_path,
          r.page_count,
          r.review_status,
          r.uploaded_at,
          r.reviewed_at,
          d.id as department_id,
          d.name as department_name,
          d.slug as department_slug
        FROM reports r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.id = ? AND r.deleted_at IS NULL
      `)
      .get(id) as Record<string, unknown> | undefined;

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const scorecard = db
      .prepare(`
        SELECT 
          id,
          overall_score,
          compliance_status,
          executive_summary,
          feedback_draft,
          input_tokens,
          output_tokens,
          latency_ms,
          generated_at
        FROM scorecards
        WHERE report_id = ? AND deleted_at IS NULL
      `)
      .get(id) as Record<string, unknown> | undefined;

    let ruleChecks: unknown[] = [];
    if (scorecard) {
      scorecard.executive_summary = JSON.parse(
        (scorecard.executive_summary as string) || "[]"
      );

      ruleChecks = db
        .prepare(`
          SELECT 
            id,
            rule_id,
            rule_title,
            rule_type,
            verdict,
            penalty_applied,
            finding_summary,
            cited_evidence,
            page_number
          FROM rule_checks
          WHERE scorecard_id = ?
          ORDER BY 
            CASE verdict
              WHEN 'FAIL' THEN 1
              WHEN 'WARNING' THEN 2
              WHEN 'PASS' THEN 3
              ELSE 4
            END,
            penalty_applied DESC
        `)
        .all(scorecard.id);
    }

    return NextResponse.json({
      report,
      scorecard: scorecard || null,
      ruleChecks,
    });
  } catch (error) {
    console.error("Failed to fetch report detail:", error);
    return NextResponse.json(
      { error: "Internal server error fetching report details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = db
      .prepare(`
        UPDATE reports
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `)
      .run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Report not found or already deleted" }, { status: 404 });
    }

    // Log deletion
    db.prepare(`
      INSERT INTO audit_logs (id, action, metadata)
      VALUES (?, ?, ?)
    `).run(
      `log_del_${Date.now()}`,
      "REPORT_DELETED",
      JSON.stringify({ reportId: id })
    );

    return NextResponse.json({ success: true, message: "Report soft-deleted successfully" });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json(
      { error: "Internal server error deleting report" },
      { status: 500 }
    );
  }
}
