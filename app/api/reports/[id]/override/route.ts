import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
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

    const report = db
      .prepare("SELECT id, department_id, filename FROM reports WHERE id = ? AND deleted_at IS NULL")
      .get(id) as { id: string; department_id: string; filename: string } | undefined;

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const overrideTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE reports
        SET review_status = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, id);

      db.prepare(`
        UPDATE scorecards
        SET compliance_status = ?
        WHERE report_id = ?
      `).run(newStatus, id);

      db.prepare(`
        INSERT INTO audit_logs (id, department_id, action, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        `log_ovr_${crypto.randomUUID().replace(/-/g, "")}`,
        report.department_id,
        "SUPERVISORY_OVERRIDE",
        JSON.stringify({
          reportId: id,
          filename: report.filename,
          newStatus,
          overrideReason: overrideReason || "Manual operator override",
        })
      );
    });

    overrideTransaction();

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
