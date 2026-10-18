import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, initDatabase } from "@/lib/db";
import crypto from "crypto";

export async function POST(
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
    const body = await request.json();
    const { newStatus, overrideReason } = body;

    const allowedStatuses = ["APPROVED", "ACTION_REQUIRED", "REJECTED"];
    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be APPROVED, ACTION_REQUIRED, or REJECTED" },
        { status: 400 }
      );
    }

    const reports = await sql`
      SELECT id, department_id, filename 
      FROM reports 
      WHERE id = ${id} AND deleted_at IS NULL
    `;

    if (reports.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = reports[0];

    await sql.begin(async (trx) => {
      await trx`
        UPDATE reports
        SET review_status = ${newStatus}, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      await trx`
        UPDATE scorecards
        SET compliance_status = ${newStatus}
        WHERE report_id = ${id}
      `;

      await trx`
        INSERT INTO audit_logs (id, department_id, action, metadata)
        VALUES (
          ${`log_ovr_${crypto.randomUUID().replace(/-/g, "")}`},
          ${report.department_id},
          'SUPERVISORY_OVERRIDE',
          ${sql.json({
            reportId: id,
            filename: report.filename,
            newStatus,
            overrideReason: overrideReason || "Manual operator override",
          })}
        )
      `;
    });

    return NextResponse.json({
      success: true,
      reportId: id,
      newStatus,
    });
  } catch (error) {
    console.error("Failed to perform override:", error);
    return NextResponse.json(
      { error: "Internal server error during supervisory override" },
      { status: 500 }
    );
  }
}
