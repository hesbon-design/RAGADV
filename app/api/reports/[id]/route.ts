import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, initDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDatabase();

    const { id } = await params;

    const reports = await sql`
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
      WHERE r.id = ${id} AND r.deleted_at IS NULL
    `;

    if (reports.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = reports[0];

    const scorecards = await sql`
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
      WHERE report_id = ${id} AND deleted_at IS NULL
    `;

    let scorecard = null;
    let ruleChecks: any = [];

    if (scorecards.length > 0) {
      scorecard = scorecards[0];
      if (typeof scorecard.executive_summary === "string") {
        try {
          scorecard.executive_summary = JSON.parse(scorecard.executive_summary);
        } catch {
          scorecard.executive_summary = [];
        }
      }

      ruleChecks = await sql`
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
        WHERE scorecard_id = ${scorecard.id}
        ORDER BY 
          CASE verdict
            WHEN 'FAIL' THEN 1
            WHEN 'WARNING' THEN 2
            WHEN 'PASS' THEN 3
            ELSE 4
          END,
          penalty_applied DESC
      `;
    }

    return NextResponse.json({
      report,
      scorecard,
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

    await initDatabase();

    const { id } = await params;

    const result = await sql`
      UPDATE reports
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Report not found or already deleted" }, { status: 404 });
    }

    // Log deletion
    await sql`
      INSERT INTO audit_logs (id, action, metadata)
      VALUES (
        ${`log_del_${Date.now()}`},
        'REPORT_DELETED',
        ${sql.json({ reportId: id })}
      )
    `;

    return NextResponse.json({ success: true, message: "Report soft-deleted successfully" });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json(
      { error: "Internal server error deleting report" },
      { status: 500 }
    );
  }
}
